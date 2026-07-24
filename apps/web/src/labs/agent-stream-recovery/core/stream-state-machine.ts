export type ConnectionPhase =
  | 'aborted'
  | 'aborting'
  | 'completed'
  | 'connecting'
  | 'disconnected'
  | 'failed'
  | 'idle'
  | 'reconnect-wait'
  | 'streaming';

export interface StreamRuntimeState {
  abortRequested: boolean;
  error: string | null;
  lastEventId: string | null;
  nextRetryAt: number | null;
  phase: ConnectionPhase;
  reconnectAttempt: number;
  runId: string | null;
  terminalEventReceived: boolean;
}

export type StreamRuntimeAction =
  | { runId: string; type: 'CONNECT' }
  | { type: 'CONNECTED' }
  | { streamId: string; terminal?: 'aborted' | 'failed' | 'succeeded'; type: 'EVENT_APPLIED' }
  | { type: 'MANUAL_DISCONNECTED' }
  | { type: 'RECONNECT_REQUESTED' }
  | { message: string; type: 'INTERRUPTED' }
  | { attempt: number; nextRetryAt: number; type: 'RETRY_SCHEDULED' }
  | { message: string; type: 'FATAL' }
  | { type: 'ABORT_REQUESTED' }
  | { message: string; type: 'ABORT_TIMEOUT' }
  | { type: 'RESET' };

export const createIdleRuntime = (): StreamRuntimeState => {
  return {
    abortRequested: false,
    error: null,
    lastEventId: null,
    nextRetryAt: null,
    phase: 'idle',
    reconnectAttempt: 0,
    runId: null,
    terminalEventReceived: false,
  };
};

export const reduceStreamRuntime = (state: StreamRuntimeState, action: StreamRuntimeAction): StreamRuntimeState => {
  switch (action.type) {
    case 'CONNECT':
      return {
        ...state,
        error: null,
        nextRetryAt: null,
        phase: 'connecting',
        runId: action.runId,
      };
    case 'CONNECTED':
      return {
        ...state,
        phase: 'streaming',
      };
    case 'EVENT_APPLIED': {
      if (!action.terminal) {
        return {
          ...state,
          lastEventId: action.streamId,
          phase: state.abortRequested ? 'aborting' : 'streaming',
        };
      }

      const phaseByTerminal = {
        aborted: 'aborted',
        failed: 'failed',
        succeeded: 'completed',
      } as const;
      return {
        ...state,
        lastEventId: action.streamId,
        phase: phaseByTerminal[action.terminal],
        terminalEventReceived: true,
      };
    }
    case 'MANUAL_DISCONNECTED':
      if (state.phase !== 'streaming' || state.terminalEventReceived || state.abortRequested) {
        return state;
      }
      return {
        ...state,
        error: null,
        nextRetryAt: null,
        phase: 'disconnected',
      };
    case 'RECONNECT_REQUESTED':
      if (state.phase !== 'disconnected' || state.terminalEventReceived || state.abortRequested) {
        return state;
      }
      return {
        ...state,
        error: null,
        nextRetryAt: null,
        phase: 'connecting',
        reconnectAttempt: state.reconnectAttempt + 1,
      };
    case 'INTERRUPTED':
      if (state.terminalEventReceived || state.abortRequested) {
        return state;
      }
      return {
        ...state,
        error: action.message,
        phase: 'reconnect-wait',
      };
    case 'RETRY_SCHEDULED':
      return {
        ...state,
        nextRetryAt: action.nextRetryAt,
        phase: 'reconnect-wait',
        reconnectAttempt: action.attempt,
      };
    case 'FATAL':
      return {
        ...state,
        error: action.message,
        nextRetryAt: null,
        phase: 'failed',
      };
    case 'ABORT_REQUESTED':
      if (state.terminalEventReceived) {
        return state;
      }
      return {
        ...state,
        abortRequested: true,
        phase: 'aborting',
      };
    case 'ABORT_TIMEOUT':
      return {
        ...state,
        error: action.message,
        phase: 'failed',
      };
    case 'RESET':
      return createIdleRuntime();
  }
};
