import { EventType } from '@frontend-study/shared-types';
import { v7 as uuidv7 } from 'uuid';

import type { AgentProducer } from '../agent-producer.port.js';
import { AgentStreamService } from '../agent-stream.service.js';
import type { RunCoordinatorService } from '../run-coordinator.service.js';
import type { RunEventStreamService } from '../run-event-stream.service.js';

describe('AgentStreamService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('force-finishes an orphaned CANCELLING run as ABORTED', async () => {
    vi.useFakeTimers();
    const threadId = uuidv7();
    const runId = uuidv7();
    const coordinator = {
      forceAbort: vi.fn().mockResolvedValue('ABORTED'),
      getRun: vi.fn().mockResolvedValue({
        errorCode: null,
        errorMessage: null,
        status: 'ABORTED',
        threadId,
      }),
      requestAbort: vi.fn().mockResolvedValue('CANCELLING'),
    };
    const eventStream = {
      publishTerminal: vi.fn().mockResolvedValue('100-0'),
      setAbortSignal: vi.fn().mockResolvedValue(undefined),
      setRuntime: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AgentStreamService(
      coordinator as unknown as RunCoordinatorService,
      eventStream as unknown as RunEventStreamService,
      {} as AgentProducer,
    );

    const resultPromise = service.abort(threadId, runId);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(coordinator.forceAbort).toHaveBeenCalledWith(threadId, runId);
    expect(eventStream.publishTerminal).toHaveBeenCalledWith(
      runId,
      expect.objectContaining({
        result: { status: 'aborted' },
        runId,
        threadId,
        type: EventType.RUN_FINISHED,
      }),
    );
    expect(result).toEqual({ runId, status: 'ABORTED', threadId });
  });
});
