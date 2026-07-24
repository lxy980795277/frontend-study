import type { LabRunAgentInput } from '@frontend-study/shared-types';
import { create } from 'zustand';

import {
  createIdleRuntime,
  reduceStreamRuntime,
  type StreamRuntimeAction,
  type StreamRuntimeState,
} from '../core/stream-state-machine';

export interface RuntimeEntry extends StreamRuntimeState {
  input: LabRunAgentInput | null;
  lastHeartbeatAt: number | null;
}

interface RuntimeStoreState {
  runtimeByThreadId: Record<string, RuntimeEntry>;
}

interface RuntimeStoreActions {
  dispatch: (threadId: string, action: StreamRuntimeAction) => void;
  reset: (threadId: string) => void;
  setHeartbeat: (threadId: string, timestamp: number) => void;
  setInput: (threadId: string, input: LabRunAgentInput) => void;
}

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
