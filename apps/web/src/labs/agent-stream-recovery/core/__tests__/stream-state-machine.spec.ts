import { createIdleRuntime, reduceStreamRuntime } from '../stream-state-machine';

describe('stream state machine', () => {
  it('does not treat EOF without a terminal event as completion', () => {
    const connecting = reduceStreamRuntime(createIdleRuntime(), {
      runId: 'run-id',
      type: 'CONNECT',
    });
    const streaming = reduceStreamRuntime(connecting, { type: 'CONNECTED' });
    const interrupted = reduceStreamRuntime(streaming, {
      message: '连接提前结束',
      type: 'INTERRUPTED',
    });

    expect(interrupted.phase).toBe('reconnect-wait');
    expect(interrupted.terminalEventReceived).toBe(false);
  });

  it('keeps an intentional disconnect idle until the user requests reconnect', () => {
    const streaming = reduceStreamRuntime(
      reduceStreamRuntime(createIdleRuntime(), {
        runId: 'run-id',
        type: 'CONNECT',
      }),
      { type: 'CONNECTED' },
    );
    const disconnected = reduceStreamRuntime(streaming, { type: 'MANUAL_DISCONNECTED' });

    expect(disconnected.phase).toBe('disconnected');
    expect(disconnected.nextRetryAt).toBeNull();
    expect(disconnected.reconnectAttempt).toBe(0);

    const reconnecting = reduceStreamRuntime(disconnected, { type: 'RECONNECT_REQUESTED' });
    expect(reconnecting.phase).toBe('connecting');
    expect(reconnecting.reconnectAttempt).toBe(1);
  });

  it('only reaches completed after a terminal event', () => {
    const completed = reduceStreamRuntime(createIdleRuntime(), {
      streamId: '10-0',
      terminal: 'succeeded',
      type: 'EVENT_APPLIED',
    });

    expect(completed.phase).toBe('completed');
    expect(completed.terminalEventReceived).toBe(true);
  });

  it('keeps the aborting phase while late non-terminal events drain', () => {
    const streaming = reduceStreamRuntime(
      reduceStreamRuntime(createIdleRuntime(), {
        runId: 'run-id',
        type: 'CONNECT',
      }),
      { type: 'CONNECTED' },
    );
    const aborting = reduceStreamRuntime(streaming, { type: 'ABORT_REQUESTED' });
    const draining = reduceStreamRuntime(aborting, {
      streamId: '11-0',
      type: 'EVENT_APPLIED',
    });

    expect(draining.phase).toBe('aborting');
    expect(draining.abortRequested).toBe(true);
  });

  it('does not overwrite an already received terminal state with a late stop click', () => {
    const completed = reduceStreamRuntime(createIdleRuntime(), {
      streamId: '12-0',
      terminal: 'succeeded',
      type: 'EVENT_APPLIED',
    });

    expect(reduceStreamRuntime(completed, { type: 'ABORT_REQUESTED' })).toEqual(completed);
  });

  it('does not claim an aborted terminal state when the stop grace period expires', () => {
    const aborting = reduceStreamRuntime(
      {
        ...createIdleRuntime(),
        abortRequested: true,
        phase: 'aborting',
        runId: 'run-id',
      },
      {
        message: '服务端未在停止宽限时间内返回终态',
        type: 'ABORT_TIMEOUT',
      },
    );

    expect(aborting.phase).toBe('failed');
    expect(aborting.terminalEventReceived).toBe(false);
  });
});
