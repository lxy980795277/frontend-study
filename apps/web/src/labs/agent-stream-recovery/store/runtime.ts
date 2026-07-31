import { create } from 'zustand';
import { createIdleRuntime, reduceStreamRuntime } from '../core/stream-state-machine';
import type { RuntimeEntry } from '../types/runtime';
import type { RuntimeStoreActions, RuntimeStoreState } from '../types/store';

export const createIdleRuntimeEntry = (): RuntimeEntry => {
  return {
    ...createIdleRuntime(),
    input: null,
    lastHeartbeatAt: null,
  };
};
export const useAgentRuntimeStore = create<RuntimeStoreActions & RuntimeStoreState>((set) => {
  return {
    dispatch: (threadId, action) => {
      set((state) => {
        const current = state.runtimeByThreadId[threadId] ?? createIdleRuntimeEntry();
        return {
          runtimeByThreadId: {
            ...state.runtimeByThreadId,
            [threadId]: {
              ...current,
              ...reduceStreamRuntime(current, action),
            },
          },
        };
      });
    },
    reset: (threadId) => {
      set((state) => {
        return {
          runtimeByThreadId: {
            ...state.runtimeByThreadId,
            [threadId]: createIdleRuntimeEntry(),
          },
        };
      });
    },
    runtimeByThreadId: {},
    setHeartbeat: (threadId, timestamp) => {
      set((state) => {
        const current = state.runtimeByThreadId[threadId] ?? createIdleRuntimeEntry();
        return {
          runtimeByThreadId: {
            ...state.runtimeByThreadId,
            [threadId]: {
              ...current,
              lastHeartbeatAt: timestamp,
            },
          },
        };
      });
    },
    setInput: (threadId, input) => {
      set((state) => {
        const current = state.runtimeByThreadId[threadId] ?? createIdleRuntimeEntry();
        return {
          runtimeByThreadId: {
            ...state.runtimeByThreadId,
            [threadId]: {
              ...current,
              input,
            },
          },
        };
      });
    },
  };
});
