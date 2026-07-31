import type { LabRunAgentInput, ThreadDetail, ThreadSummary, UserMessage } from '@frontend-study/shared-types';

import type { ReceivedAgentStreamEvent } from '@/services/agent-stream';

import type { ConversationProjection } from './conversation';
import type { RuntimeEntry, StreamRuntimeAction } from './runtime';

export type LoadStatus = 'error' | 'idle' | 'loading' | 'ready';

export interface RuntimeStoreState {
  runtimeByThreadId: Record<string, RuntimeEntry>;
}

export interface RuntimeStoreActions {
  dispatch: (threadId: string, action: StreamRuntimeAction) => void;
  reset: (threadId: string) => void;
  setHeartbeat: (threadId: string, timestamp: number) => void;
  setInput: (threadId: string, input: LabRunAgentInput) => void;
}

export interface ThreadStoreState {
  activeThreadId: string | null;
  detailStatusByThreadId: Record<string, LoadStatus>;
  listStatus: LoadStatus;
  projectionByThreadId: Record<string, ConversationProjection>;
  threadOrder: string[];
  threadsById: Record<string, ThreadSummary>;
}

export interface ThreadStoreActions {
  applyStreamEvent: (threadId: string, received: ReceivedAgentStreamEvent) => void;
  appendUserMessage: (threadId: string, message: UserMessage) => void;
  hydrateThread: (detail: ThreadDetail) => void;
  removeThread: (threadId: string) => void;
  setActiveThreadId: (threadId: string | null) => void;
  setDetailStatus: (threadId: string, status: LoadStatus) => void;
  setListStatus: (status: LoadStatus) => void;
  setThreadList: (threads: ThreadSummary[]) => void;
  upsertThread: (thread: ThreadSummary) => void;
}
