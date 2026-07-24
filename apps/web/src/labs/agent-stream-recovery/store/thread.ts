import type { ThreadDetail, ThreadSummary, UserMessage } from '@frontend-study/shared-types';
import { create } from 'zustand';

import type { ReceivedAgentStreamEvent } from '@/services/agent-stream';

import {
  applyAgentStreamEvent,
  appendOptimisticUserMessage,
  createEmptyProjection,
  createProjectionFromHistory,
  type ConversationProjection,
} from '../core/ag-ui-event-reducer';

type LoadStatus = 'error' | 'idle' | 'loading' | 'ready';

interface ThreadStoreState {
  activeThreadId: string | null;
  detailStatusByThreadId: Record<string, LoadStatus>;
  listStatus: LoadStatus;
  projectionByThreadId: Record<string, ConversationProjection>;
  threadOrder: string[];
  threadsById: Record<string, ThreadSummary>;
}

interface ThreadStoreActions {
  applyStreamEvent: (threadId: string, received: ReceivedAgentStreamEvent) => void;
  appendUserMessage: (threadId: string, message: UserMessage) => void;
  hydrateThread: (detail: ThreadDetail) => void;
  removeThread: (threadId: string) => void;
  setActiveThreadId: (threadId: string | null) => void;
  setDetailStatus: (threadId: string, status: LoadStatus) => void;
  setThreadList: (threads: ThreadSummary[]) => void;
  setListStatus: (status: LoadStatus) => void;
  upsertThread: (thread: ThreadSummary) => void;
}

const upsertOrder = (order: string[], threadId: string): string[] => {
  return [threadId, ...order.filter((id) => id !== threadId)];
};

export const useAgentThreadStore = create<ThreadStoreActions & ThreadStoreState>((set) => {
  return {
    activeThreadId: null,
    applyStreamEvent: (threadId, received) => {
      set((state) => {
        const projection = state.projectionByThreadId[threadId] ?? createEmptyProjection();
        return {
          projectionByThreadId: {
            ...state.projectionByThreadId,
            [threadId]: applyAgentStreamEvent(projection, received.streamId, received.event),
          },
        };
      });
    },
    appendUserMessage: (threadId, message) => {
      set((state) => {
        const projection = state.projectionByThreadId[threadId] ?? createEmptyProjection();
        return {
          projectionByThreadId: {
            ...state.projectionByThreadId,
            [threadId]: appendOptimisticUserMessage(projection, message),
          },
        };
      });
    },
    detailStatusByThreadId: {},
    hydrateThread: (detail) => {
      const summary: ThreadSummary = {
        activeRun: detail.activeRun
          ? {
              runId: detail.activeRun.runId,
              startedAt: detail.activeRun.startedAt,
              status: detail.activeRun.status,
            }
          : null,
        createdAt: detail.createdAt,
        id: detail.id,
        title: detail.title,
        updatedAt: detail.updatedAt,
      };
      set((state) => {
        return {
          detailStatusByThreadId: {
            ...state.detailStatusByThreadId,
            [detail.id]: 'ready',
          },
          projectionByThreadId: {
            ...state.projectionByThreadId,
            [detail.id]: createProjectionFromHistory(detail.messages),
          },
          threadOrder: upsertOrder(state.threadOrder, detail.id),
          threadsById: {
            ...state.threadsById,
            [detail.id]: summary,
          },
        };
      });
    },
    listStatus: 'idle',
    projectionByThreadId: {},
    removeThread: (threadId) => {
      set((state) => {
        const { [threadId]: _removedDetailStatus, ...detailStatusByThreadId } = state.detailStatusByThreadId;
        const { [threadId]: _removedProjection, ...projectionByThreadId } = state.projectionByThreadId;
        const { [threadId]: _removedThread, ...threadsById } = state.threadsById;
        return {
          activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
          detailStatusByThreadId,
          projectionByThreadId,
          threadOrder: state.threadOrder.filter((id) => id !== threadId),
          threadsById,
        };
      });
    },
    setActiveThreadId: (threadId) => {
      set({ activeThreadId: threadId });
    },
    setDetailStatus: (threadId, status) => {
      set((state) => {
        return {
          detailStatusByThreadId: {
            ...state.detailStatusByThreadId,
            [threadId]: status,
          },
        };
      });
    },
    setListStatus: (listStatus) => {
      set({ listStatus });
    },
    setThreadList: (threads) => {
      set((state) => {
        const threadsById = { ...state.threadsById };
        threads.forEach((thread) => {
          threadsById[thread.id] = thread;
        });
        return {
          listStatus: 'ready',
          threadOrder: threads.map((thread) => thread.id),
          threadsById,
        };
      });
    },
    threadOrder: [],
    threadsById: {},
    upsertThread: (thread) => {
      set((state) => {
        return {
          threadOrder: upsertOrder(state.threadOrder, thread.id),
          threadsById: {
            ...state.threadsById,
            [thread.id]: thread,
          },
        };
      });
    },
  };
});
