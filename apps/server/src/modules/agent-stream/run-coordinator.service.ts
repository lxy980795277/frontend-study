import {
  ACTIVE_AGENT_RUN_STATUSES,
  AGENT_RUN_STATUSES,
  AGENT_STREAM_ERROR_CODES,
  MessageSchema,
  type AgentRunStatus,
  type LabRunAgentInput,
  type Message,
} from '@frontend-study/shared-types';
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { getInputUserMessage, hashRunInput, normalizeRunInput } from './run-input.js';

const ACTIVE_STATUS_VALUES: AgentRunStatus[] = [...ACTIVE_AGENT_RUN_STATUSES];
const TERMINAL_STATUS_VALUES: AgentRunStatus[] = ['ABORTED', 'FAILED', 'SUCCEEDED'];

const createApiError = (statusCode: number, code: string, message: string): Record<string, unknown> => {
  return { code, message, statusCode };
};

const toInputJson = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const createTitle = (content: string): string => {
  return Array.from(content).slice(0, 40).join('');
};

export interface PreparedRun {
  created: boolean;
  input: LabRunAgentInput;
  status: AgentRunStatus;
}

export interface PersistRunResult {
  errorCode?: string;
  errorMessage?: string;
  messages: Message[];
  status: 'ABORTED' | 'FAILED' | 'SUCCEEDED';
}

@Injectable()
export class RunCoordinatorService {
  constructor(private readonly prisma: PrismaService) {}

  async finalize(runId: string, threadId: string, result: PersistRunResult): Promise<AgentRunStatus> {
    const messageStatus = result.status === 'SUCCEEDED' ? 'COMPLETED' : 'INTERRUPTED';

    return this.prisma.$transaction(async (transaction) => {
      const runRows = await transaction.$queryRaw<Array<{ status: string; threadId: string }>>`
        SELECT status, thread_id AS threadId
        FROM t_agent_runs
        WHERE id = ${runId}
        FOR UPDATE
      `;
      const run = runRows[0];
      if (!run || run.threadId !== threadId) {
        throw new NotFoundException(createApiError(404, AGENT_STREAM_ERROR_CODES.RUN_NOT_FOUND, 'Run 不存在'));
      }
      const persistedStatus = run.status as AgentRunStatus;
      if (TERMINAL_STATUS_VALUES.includes(persistedStatus) && persistedStatus !== result.status) {
        return persistedStatus;
      }

      for (const message of result.messages) {
        const messageResult = MessageSchema.safeParse(message);
        if (!messageResult.success) {
          throw new InternalServerErrorException('Producer result contains an invalid AG-UI message');
        }

        await transaction.message.upsert({
          create: {
            id: message.id,
            payload: toInputJson(messageResult.data),
            role: message.role,
            runId,
            status: messageStatus,
            threadId,
          },
          update: {
            payload: toInputJson(messageResult.data),
            role: message.role,
            status: messageStatus,
          },
          where: { id: message.id },
        });
      }

      if (!TERMINAL_STATUS_VALUES.includes(persistedStatus)) {
        await transaction.agentRun.update({
          data: {
            errorCode: result.errorCode ?? null,
            errorMessage: result.errorMessage?.slice(0, 512) ?? null,
            finishedAt: new Date(),
            status: result.status,
          },
          where: { id: runId },
        });
      }
      await transaction.thread.update({
        data: { updatedAt: new Date() },
        where: { id: threadId },
      });

      return TERMINAL_STATUS_VALUES.includes(persistedStatus) ? persistedStatus : result.status;
    });
  }

  async forceAbort(threadId: string, runId: string): Promise<AgentRunStatus> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.agentRun.updateMany({
        data: {
          errorCode: null,
          errorMessage: null,
          finishedAt: new Date(),
          status: 'ABORTED',
        },
        where: {
          id: runId,
          status: { in: ACTIVE_STATUS_VALUES },
          threadId,
        },
      });
      const run = await transaction.agentRun.findUnique({
        select: { status: true, threadId: true },
        where: { id: runId },
      });
      if (!run || run.threadId !== threadId) {
        throw new NotFoundException(createApiError(404, AGENT_STREAM_ERROR_CODES.RUN_NOT_FOUND, 'Run 不存在'));
      }
      if (!(AGENT_RUN_STATUSES as readonly string[]).includes(run.status)) {
        throw new InternalServerErrorException('Run 状态非法');
      }
      if (result.count > 0) {
        await transaction.thread.update({
          data: { updatedAt: new Date() },
          where: { id: threadId },
        });
      }

      return run.status as AgentRunStatus;
    });
  }

  async getRun(runId: string): Promise<{
    errorCode: string | null;
    errorMessage: string | null;
    status: AgentRunStatus;
    threadId: string;
  } | null> {
    const run = await this.prisma.agentRun.findUnique({
      select: {
        errorCode: true,
        errorMessage: true,
        status: true,
        threadId: true,
      },
      where: { id: runId },
    });
    if (!run || !(AGENT_RUN_STATUSES as readonly string[]).includes(run.status)) {
      return null;
    }

    return {
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
      status: run.status as AgentRunStatus,
      threadId: run.threadId,
    };
  }

  async markRunning(runId: string): Promise<AgentRunStatus> {
    await this.prisma.agentRun.updateMany({
      data: {
        startedAt: new Date(),
        status: 'RUNNING',
      },
      where: {
        id: runId,
        status: 'PENDING',
      },
    });

    const run = await this.getRun(runId);
    if (!run) {
      throw new NotFoundException(createApiError(404, AGENT_STREAM_ERROR_CODES.RUN_NOT_FOUND, 'Run 不存在'));
    }
    return run.status;
  }

  async prepare(value: unknown): Promise<PreparedRun> {
    const input = normalizeRunInput(value);
    const inputHash = hashRunInput(input);
    const userMessage = getInputUserMessage(input);

    return this.prisma.$transaction(async (transaction) => {
      const threadRows = await transaction.$queryRaw<Array<{ id: string; title: string | null }>>`
        SELECT id, title
        FROM t_threads
        WHERE id = ${input.threadId}
        FOR UPDATE
      `;
      const thread = threadRows[0];
      if (!thread) {
        throw new NotFoundException(createApiError(404, AGENT_STREAM_ERROR_CODES.THREAD_NOT_FOUND, 'Thread 不存在'));
      }

      const existingRun = await transaction.agentRun.findUnique({
        select: {
          inputHash: true,
          inputSnapshot: true,
          status: true,
          threadId: true,
        },
        where: { id: input.runId },
      });
      if (existingRun) {
        if (existingRun.threadId !== input.threadId || existingRun.inputHash !== inputHash) {
          throw new ConflictException(
            createApiError(409, AGENT_STREAM_ERROR_CODES.RUN_INPUT_CONFLICT, 'runId 已绑定其他输入'),
          );
        }

        return {
          created: false,
          input: normalizeRunInput(existingRun.inputSnapshot),
          status: existingRun.status as AgentRunStatus,
        };
      }

      const activeRun = await transaction.agentRun.findFirst({
        select: { id: true },
        where: {
          status: { in: ACTIVE_STATUS_VALUES },
          threadId: input.threadId,
        },
      });
      if (activeRun) {
        throw new ConflictException(createApiError(409, AGENT_STREAM_ERROR_CODES.THREAD_BUSY, 'Thread 已存在活跃 Run'));
      }

      const existingMessage = await transaction.message.findUnique({
        select: { id: true },
        where: { id: userMessage.id },
      });
      if (existingMessage) {
        throw new ConflictException(
          createApiError(409, AGENT_STREAM_ERROR_CODES.RUN_INPUT_CONFLICT, 'messageId 已被使用'),
        );
      }

      await transaction.agentRun.create({
        data: {
          id: input.runId,
          inputHash,
          inputSnapshot: toInputJson(input),
          status: 'PENDING',
          threadId: input.threadId,
        },
      });
      await transaction.message.create({
        data: {
          id: userMessage.id,
          payload: toInputJson(userMessage),
          role: 'user',
          runId: input.runId,
          status: 'COMPLETED',
          threadId: input.threadId,
        },
      });
      await transaction.thread.update({
        data: {
          ...(thread.title ? {} : { title: createTitle(userMessage.content) }),
          updatedAt: new Date(),
        },
        where: { id: input.threadId },
      });

      return {
        created: true,
        input,
        status: 'PENDING',
      };
    });
  }

  async requestAbort(threadId: string, runId: string): Promise<AgentRunStatus> {
    const run = await this.prisma.agentRun.findUnique({
      select: { status: true, threadId: true },
      where: { id: runId },
    });
    if (!run || run.threadId !== threadId) {
      throw new NotFoundException(createApiError(404, AGENT_STREAM_ERROR_CODES.RUN_NOT_FOUND, 'Run 不存在'));
    }
    if (TERMINAL_STATUS_VALUES.includes(run.status as AgentRunStatus)) {
      return run.status as AgentRunStatus;
    }

    const result = await this.prisma.agentRun.updateMany({
      data: { status: 'CANCELLING' },
      where: {
        id: runId,
        status: { in: ACTIVE_STATUS_VALUES },
      },
    });
    if (result.count > 0) {
      return 'CANCELLING';
    }

    const latestRun = await this.getRun(runId);
    if (!latestRun || latestRun.threadId !== threadId) {
      throw new NotFoundException(createApiError(404, AGENT_STREAM_ERROR_CODES.RUN_NOT_FOUND, 'Run 不存在'));
    }
    return latestRun.status;
  }
}
