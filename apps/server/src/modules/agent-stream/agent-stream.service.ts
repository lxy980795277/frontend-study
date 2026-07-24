import {
  AGENT_STREAM_ERROR_CODES,
  EventType,
  type AGUIEvent,
  type AbortAgentRunResponse,
  type LabRunAgentInput,
} from '@frontend-study/shared-types';
import { BadRequestException, GoneException, Injectable, Logger } from '@nestjs/common';

import { AgentProducer, type AgentProducerResult, type ProducerStopReason } from './agent-producer.port.js';
import { RunCoordinatorService } from './run-coordinator.service.js';
import { type ProducerLock, RunEventStreamService, type RunStreamRecord } from './run-event-stream.service.js';

const ABORT_COOPERATIVE_GRACE_MS = 750;
const REDIS_STREAM_ID_PATTERN = /^\d+-\d+$/;

export type AgentStreamDelivery =
  | {
      kind: 'event';
      record: RunStreamRecord;
    }
  | {
      kind: 'heartbeat';
    };

export interface OpenedAgentStream {
  input: LabRunAgentInput;
  runId: string;
}

const createApiError = (statusCode: number, code: string, message: string): Record<string, unknown> => {
  return { code, message, statusCode };
};

const isTerminalEvent = (event: AGUIEvent): boolean => {
  return event.type === EventType.RUN_FINISHED || event.type === EventType.RUN_ERROR;
};

const wait = async (delayMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

@Injectable()
export class AgentStreamService {
  private readonly logger = new Logger(AgentStreamService.name);

  constructor(
    private readonly coordinator: RunCoordinatorService,
    private readonly eventStream: RunEventStreamService,
    private readonly producer: AgentProducer,
  ) {}

  async abort(threadId: string, runId: string): Promise<AbortAgentRunResponse> {
    let status = await this.coordinator.requestAbort(threadId, runId);
    if (status === 'CANCELLING') {
      await this.eventStream.setAbortSignal(runId);
      await this.eventStream.setRuntime(runId, threadId, status);
      await wait(ABORT_COOPERATIVE_GRACE_MS);
      status = await this.coordinator.forceAbort(threadId, runId);
    }
    await this.ensureTerminalEvent(runId);
    await this.eventStream.setRuntime(runId, threadId, status);

    return { runId, status, threadId };
  }

  async *consume(
    runId: string,
    lastEventId: string | undefined,
    signal: AbortSignal,
  ): AsyncGenerator<AgentStreamDelivery> {
    const reader = await this.eventStream.createReader();
    let cursor = lastEventId ?? '0-0';
    const handleAbort = (): void => {
      this.eventStream.destroyReader(reader);
    };
    signal.addEventListener('abort', handleAbort, { once: true });

    try {
      while (!signal.aborted) {
        const records = await this.eventStream.readBatch(reader, runId, cursor);
        if (records.length === 0) {
          yield { kind: 'heartbeat' };
          continue;
        }

        for (const record of records) {
          cursor = record.id;
          yield { kind: 'event', record };
          if (isTerminalEvent(record.event)) {
            return;
          }
        }
      }
    } catch (error) {
      if (!signal.aborted) {
        throw error;
      }
    } finally {
      signal.removeEventListener('abort', handleAbort);
      await this.eventStream.closeReader(reader);
    }
  }

  async open(value: unknown, lastEventId?: string): Promise<OpenedAgentStream> {
    if (lastEventId && !REDIS_STREAM_ID_PATTERN.test(lastEventId)) {
      throw new BadRequestException(
        createApiError(400, AGENT_STREAM_ERROR_CODES.INVALID_STREAM_CURSOR, 'Last-Event-ID 不是有效的 Redis Stream ID'),
      );
    }

    const prepared = await this.coordinator.prepare(value);
    if (lastEventId && !(await this.eventStream.isCursorAvailable(prepared.input.runId, lastEventId))) {
      throw new GoneException(
        createApiError(410, AGENT_STREAM_ERROR_CODES.STREAM_EXPIRED, '断点之前的 Stream Event 已过期'),
      );
    }

    if (prepared.status === 'PENDING') {
      await this.tryStartProducer(prepared.input);
    } else if (prepared.status === 'ABORTED' || prepared.status === 'FAILED' || prepared.status === 'SUCCEEDED') {
      const firstEventId = await this.eventStream.getFirstEventId(prepared.input.runId);
      if (!firstEventId) {
        throw new GoneException(
          createApiError(410, AGENT_STREAM_ERROR_CODES.STREAM_EXPIRED, 'Run 已结束且 Stream Event 已过期'),
        );
      }
      await this.ensureTerminalEvent(prepared.input.runId);
    }

    return {
      input: prepared.input,
      runId: prepared.input.runId,
    };
  }

  private async ensureTerminalEvent(runId: string): Promise<void> {
    const run = await this.coordinator.getRun(runId);
    if (!run) {
      return;
    }

    let event: AGUIEvent;
    if (run.status === 'FAILED') {
      event = {
        code: run.errorCode ?? 'AGENT_RUN_FAILED',
        message: run.errorMessage ?? 'Agent Run 执行失败',
        timestamp: Date.now(),
        type: EventType.RUN_ERROR,
      };
    } else {
      event = {
        ...(run.status === 'SUCCEEDED' ? { outcome: { type: 'success' as const } } : {}),
        result: { status: run.status === 'ABORTED' ? 'aborted' : 'succeeded' },
        runId,
        threadId: run.threadId,
        timestamp: Date.now(),
        type: EventType.RUN_FINISHED,
      };
    }

    await this.eventStream.publishTerminal(runId, event);
  }

  private async executeProducer(input: LabRunAgentInput, lock: ProducerLock): Promise<void> {
    let lockLost = false;
    let renewalInFlight = false;
    const renewTimer = setInterval(() => {
      if (renewalInFlight) {
        return;
      }
      renewalInFlight = true;
      void this.eventStream
        .renewProducerLock(lock)
        .then((renewed) => {
          if (!renewed) {
            lockLost = true;
          }
        })
        .catch(() => {
          lockLost = true;
        })
        .finally(() => {
          renewalInFlight = false;
        });
    }, lock.renewIntervalMs);

    try {
      const currentStatus = await this.coordinator.markRunning(input.runId);
      await this.eventStream.setRuntime(input.runId, input.threadId, currentStatus);
      const result = await this.producer.run(input, {
        emit: async (event) => {
          await this.eventStream.append(input.runId, event);
        },
        getStopReason: async (): Promise<ProducerStopReason> => {
          if (lockLost) {
            return 'lock-lost';
          }
          return (await this.eventStream.hasAbortSignal(input.runId)) ? 'abort' : null;
        },
      });

      const status = await this.coordinator.finalize(input.runId, input.threadId, result);
      await this.ensureTerminalEvent(input.runId);
      await this.eventStream.setRuntime(input.runId, input.threadId, status);
    } catch (error) {
      const cause = error instanceof Error ? error.name : typeof error;
      this.logger.error(`Producer failed: threadId=${input.threadId} runId=${input.runId} cause=${cause}`);
      const failedResult: AgentProducerResult = {
        errorCode: 'PRODUCER_EXECUTION_FAILED',
        errorMessage: 'Producer 执行失败',
        messages: [],
        status: 'FAILED',
      };
      try {
        const status = await this.coordinator.finalize(input.runId, input.threadId, failedResult);
        await this.ensureTerminalEvent(input.runId);
        await this.eventStream.setRuntime(input.runId, input.threadId, status);
      } catch (finalizeError) {
        const cause = finalizeError instanceof Error ? finalizeError.name : typeof finalizeError;
        this.logger.error(`Producer finalize failed: threadId=${input.threadId} runId=${input.runId} cause=${cause}`);
      }
    } finally {
      clearInterval(renewTimer);
      try {
        await this.eventStream.releaseProducerLock(lock);
      } catch (error) {
        const cause = error instanceof Error ? error.name : typeof error;
        this.logger.error(
          `Producer lock release failed: threadId=${input.threadId} runId=${input.runId} cause=${cause}`,
        );
      }
    }
  }

  private async tryStartProducer(input: LabRunAgentInput): Promise<void> {
    const lock = await this.eventStream.acquireProducerLock(input.runId);
    if (!lock) {
      return;
    }

    void this.executeProducer(input, lock);
  }
}
