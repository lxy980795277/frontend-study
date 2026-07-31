import type { LabRunAgentInput } from '@frontend-study/shared-types';

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
  | {
      runId: string;
      type: 'CONNECT';
    }
  | {
      type: 'CONNECTED';
    }
  | {
      streamId: string;
      terminal?: 'aborted' | 'failed' | 'succeeded';
      type: 'EVENT_APPLIED';
    }
  | {
      type: 'MANUAL_DISCONNECTED';
    }
  | {
      type: 'RECONNECT_REQUESTED';
    }
  | {
      message: string;
      type: 'INTERRUPTED';
    }
  | {
      attempt: number;
      nextRetryAt: number;
      type: 'RETRY_SCHEDULED';
    }
  | {
      message: string;
      type: 'FATAL';
    }
  | {
      type: 'ABORT_REQUESTED';
    }
  | {
      message: string;
      type: 'ABORT_TIMEOUT';
    }
  | {
      type: 'RESET';
    };

export interface RuntimeEntry extends StreamRuntimeState {
  input: LabRunAgentInput | null;
  lastHeartbeatAt: number | null;
}

export type RecoveryDecision = 'fatal' | 'refresh-history' | 'retry';

export type LocalDisconnectReason = 'manual' | 'navigation' | 'stop-timeout';

export interface ActiveConnection {
  controller: AbortController;
  disconnectReason: LocalDisconnectReason | null;
  runId: string;
}
