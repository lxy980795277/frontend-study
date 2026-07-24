'use client';

import {
  EventType,
  type AgentSimulationOptions,
  type AGUIEvent,
  type LabRunAgentInput,
  type ThreadSummary,
  type UserMessage,
} from '@frontend-study/shared-types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v7 as uuidv7 } from 'uuid';

import { abortAgentRun, openAgentStream } from '@/services/agent-stream';
import { RequestError } from '@/services/base-request';
import { threadsService } from '@/services/threads';

import { createEmptyProjection, toAgUiMessages } from '../core/ag-ui-event-reducer';
import { getReconnectDelay, getRecoveryDecision } from '../core/reconnect-policy';
import { createIdleRuntimeEntry, useAgentRuntimeStore } from '../store/runtime';
import { useAgentThreadStore } from '../store/thread';

const LAB_ROUTE = '/labs/agent-stream-recovery';
const ABORT_GRACE_PERIOD_MS = 5_000;

type LocalDisconnectReason = 'manual' | 'navigation' | 'stop-timeout';

interface ActiveConnection {
  controller: AbortController;
  disconnectReason: LocalDisconnectReason | null;
  runId: string;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return '未知错误';
};

const getTerminalKind = (event: AGUIEvent): 'aborted' | 'failed' | 'succeeded' | null => {
  if (event.type === EventType.RUN_ERROR) {
    return 'failed';
  }
  if (event.type !== EventType.RUN_FINISHED) {
    return null;
  }

  const result = event.result as unknown;
  if (typeof result === 'object' && result !== null && 'status' in result && result.status === 'aborted') {
    return 'aborted';
  }
  return 'succeeded';
};

const wait = async (delayMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
};

const isDefinedThread = (thread: ThreadSummary | undefined): thread is ThreadSummary => {
  return thread !== undefined;
};

const BUSY_PHASES = new Set(['aborting', 'connecting', 'disconnected', 'reconnect-wait', 'streaming']);

export const useAgentStreamLab = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedThreadId = searchParams.get('threadId');
  const activeThreadId = useAgentThreadStore((state) => state.activeThreadId);
  const detailStatusByThreadId = useAgentThreadStore((state) => state.detailStatusByThreadId);
  const listStatus = useAgentThreadStore((state) => state.listStatus);
  const projectionByThreadId = useAgentThreadStore((state) => state.projectionByThreadId);
  const threadOrder = useAgentThreadStore((state) => state.threadOrder);
  const threadsById = useAgentThreadStore((state) => state.threadsById);
  const applyStreamEvent = useAgentThreadStore((state) => state.applyStreamEvent);
  const appendUserMessage = useAgentThreadStore((state) => state.appendUserMessage);
  const hydrateThread = useAgentThreadStore((state) => state.hydrateThread);
  const removeThread = useAgentThreadStore((state) => state.removeThread);
  const setActiveThreadId = useAgentThreadStore((state) => state.setActiveThreadId);
  const setDetailStatus = useAgentThreadStore((state) => state.setDetailStatus);
  const setListStatus = useAgentThreadStore((state) => state.setListStatus);
  const setThreadList = useAgentThreadStore((state) => state.setThreadList);
  const upsertThread = useAgentThreadStore((state) => state.upsertThread);
  const runtimeByThreadId = useAgentRuntimeStore((state) => state.runtimeByThreadId);
  const dispatchRuntime = useAgentRuntimeStore((state) => state.dispatch);
  const resetRuntime = useAgentRuntimeStore((state) => state.reset);
  const setHeartbeat = useAgentRuntimeStore((state) => state.setHeartbeat);
  const setRuntimeInput = useAgentRuntimeStore((state) => state.setInput);
  const [pageError, setPageError] = useState<string | null>(null);
  const activeConnectionRef = useRef<ActiveConnection | null>(null);
  const abortGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionGenerationRef = useRef(0);
  const terminalRunIdsRef = useRef(new Set<string>());

  const threads = useMemo(() => {
    return threadOrder.map((threadId) => threadsById[threadId]).filter(isDefinedThread);
  }, [threadOrder, threadsById]);
  const activeProjection = activeThreadId
    ? (projectionByThreadId[activeThreadId] ?? createEmptyProjection())
    : createEmptyProjection();
  const activeRuntime = activeThreadId
    ? (runtimeByThreadId[activeThreadId] ?? createIdleRuntimeEntry())
    : createIdleRuntimeEntry();
  const activeThread = activeThreadId ? (threadsById[activeThreadId] ?? null) : null;
  const activeDetailStatus = activeThreadId ? (detailStatusByThreadId[activeThreadId] ?? 'idle') : 'idle';

  const disconnectCurrent = useCallback((reason: LocalDisconnectReason): void => {
    const activeConnection = activeConnectionRef.current;
    if (!activeConnection) {
      return;
    }

    activeConnection.disconnectReason = reason;
    activeConnection.controller.abort(reason);
  }, []);

  const refreshThreadList = useCallback(async (): Promise<void> => {
    setListStatus('loading');
    try {
      const response = await threadsService.list({ limit: 30 });
      setThreadList(response.items);
    } catch (error) {
      setListStatus('error');
      setPageError(getErrorMessage(error));
    }
  }, [setListStatus, setThreadList]);

  const startSession = useCallback(
    (threadId: string, initialInput: LabRunAgentInput, initialCursor?: string): void => {
      connectionGenerationRef.current += 1;
      const generation = connectionGenerationRef.current;
      disconnectCurrent('navigation');
      setRuntimeInput(threadId, initialInput);

      void (async () => {
        let attempt = 0;
        let cursor = initialCursor;
        let input = initialInput;

        while (generation === connectionGenerationRef.current) {
          let terminal: 'aborted' | 'failed' | 'succeeded' | null = null;
          const controller = new AbortController();
          const connection: ActiveConnection = {
            controller,
            disconnectReason: null,
            runId: input.runId,
          };
          activeConnectionRef.current = connection;
          dispatchRuntime(threadId, { runId: input.runId, type: 'CONNECT' });

          try {
            const completion = await openAgentStream({
              input,
              ...(cursor ? { lastEventId: cursor } : {}),
              onEvent: (received) => {
                if (generation !== connectionGenerationRef.current) {
                  return;
                }
                applyStreamEvent(threadId, received);
                terminal = getTerminalKind(received.event);
                dispatchRuntime(threadId, {
                  streamId: received.streamId,
                  ...(terminal ? { terminal } : {}),
                  type: 'EVENT_APPLIED',
                });
                cursor = received.streamId;
                if (terminal) {
                  terminalRunIdsRef.current.add(input.runId);
                }
              },
              onHeartbeat: () => {
                setHeartbeat(threadId, Date.now());
              },
              onOpen: () => {
                dispatchRuntime(threadId, { type: 'CONNECTED' });
              },
              signal: controller.signal,
            });

            if (generation !== connectionGenerationRef.current) {
              return;
            }
            if (terminal) {
              await refreshThreadList();
              return;
            }
            if (completion.reason === 'aborted') {
              if (connection.disconnectReason === 'stop-timeout') {
                dispatchRuntime(threadId, {
                  message: '服务端未在停止宽限时间内返回终态',
                  type: 'ABORT_TIMEOUT',
                });
              }
              return;
            }

            throw new RequestError({
              code: 'PREMATURE_EOF',
              message: 'SSE 在收到 AG-UI 终态前结束',
              retryable: true,
              status: 0,
            });
          } catch (error) {
            if (generation !== connectionGenerationRef.current) {
              return;
            }

            const decision = getRecoveryDecision(error);
            if (decision === 'refresh-history') {
              try {
                const detail = await threadsService.detail(threadId);
                hydrateThread(detail);
                if (!detail.activeRun) {
                  resetRuntime(threadId);
                  await refreshThreadList();
                  return;
                }
                input = detail.activeRun.input;
                setRuntimeInput(threadId, input);
                cursor = undefined;
                continue;
              } catch (historyError) {
                dispatchRuntime(threadId, {
                  message: getErrorMessage(historyError),
                  type: 'FATAL',
                });
                return;
              }
            }

            if (decision === 'retry') {
              attempt += 1;
              const delayMs = getReconnectDelay(attempt);
              if (delayMs !== null) {
                dispatchRuntime(threadId, {
                  message: getErrorMessage(error),
                  type: 'INTERRUPTED',
                });
                dispatchRuntime(threadId, {
                  attempt,
                  nextRetryAt: Date.now() + delayMs,
                  type: 'RETRY_SCHEDULED',
                });
                await wait(delayMs);
                continue;
              }
            }

            dispatchRuntime(threadId, {
              message: getErrorMessage(error),
              type: 'FATAL',
            });
            return;
          } finally {
            if (activeConnectionRef.current === connection) {
              activeConnectionRef.current = null;
            }
          }
        }
      })();
    },
    [
      applyStreamEvent,
      disconnectCurrent,
      dispatchRuntime,
      hydrateThread,
      refreshThreadList,
      resetRuntime,
      setHeartbeat,
      setRuntimeInput,
    ],
  );

  useEffect(() => {
    void Promise.resolve().then(refreshThreadList);
  }, [refreshThreadList]);

  useEffect(() => {
    if (!requestedThreadId) {
      connectionGenerationRef.current += 1;
      disconnectCurrent('navigation');
      setActiveThreadId(null);
      return;
    }

    const currentThreadState = useAgentThreadStore.getState();
    const requestedDetailStatus = currentThreadState.detailStatusByThreadId[requestedThreadId] ?? 'idle';
    if (requestedThreadId === currentThreadState.activeThreadId && requestedDetailStatus !== 'idle') {
      return;
    }

    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      connectionGenerationRef.current += 1;
      disconnectCurrent('navigation');
      setActiveThreadId(requestedThreadId);
      setDetailStatus(requestedThreadId, 'loading');
      setPageError(null);

      try {
        const detail = await threadsService.detail(requestedThreadId, controller.signal);
        hydrateThread(detail);
        if (detail.activeRun) {
          startSession(requestedThreadId, detail.activeRun.input);
        } else {
          resetRuntime(requestedThreadId);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setDetailStatus(requestedThreadId, 'error');
        setPageError(getErrorMessage(error));
      }
    });

    return () => {
      controller.abort();
    };
  }, [
    disconnectCurrent,
    hydrateThread,
    requestedThreadId,
    resetRuntime,
    setActiveThreadId,
    setDetailStatus,
    startSession,
  ]);

  useEffect(() => {
    return () => {
      connectionGenerationRef.current += 1;
      disconnectCurrent('navigation');
      if (abortGraceTimerRef.current) {
        clearTimeout(abortGraceTimerRef.current);
      }
    };
  }, [disconnectCurrent]);

  const sendMessage = useCallback(
    async (content: string, simulation: AgentSimulationOptions): Promise<void> => {
      const prompt = content.trim();
      if (!prompt) {
        return;
      }
      if (BUSY_PHASES.has(activeRuntime.phase)) {
        setPageError('当前会话仍有运行中的请求，请等待终态或先停止运行');
        return;
      }

      setPageError(null);
      let threadId = activeThreadId;
      let projection = activeProjection;
      if (!threadId) {
        try {
          const created = await threadsService.create();
          threadId = created.id;
          projection = createEmptyProjection();
          upsertThread(created);
          setActiveThreadId(threadId);
          setDetailStatus(threadId, 'ready');
          router.replace(`${LAB_ROUTE}?threadId=${threadId}`, { scroll: false });
        } catch (error) {
          setPageError(getErrorMessage(error));
          return;
        }
      }

      const userMessage: UserMessage = {
        content: prompt,
        id: uuidv7(),
        role: 'user',
      };
      const input: LabRunAgentInput = {
        context: [],
        forwardedProps: { simulation },
        messages: [...toAgUiMessages(projection), userMessage],
        runId: uuidv7(),
        state: {},
        threadId,
        tools: [],
      };
      appendUserMessage(threadId, userMessage);
      startSession(threadId, input);
    },
    [
      activeProjection,
      activeRuntime.phase,
      activeThreadId,
      appendUserMessage,
      router,
      setActiveThreadId,
      setDetailStatus,
      startSession,
      upsertThread,
    ],
  );

  const abortRun = useCallback(async (): Promise<void> => {
    if (!activeThreadId || !activeRuntime.runId) {
      return;
    }

    const runId = activeRuntime.runId;
    dispatchRuntime(activeThreadId, { type: 'ABORT_REQUESTED' });
    try {
      await abortAgentRun({ runId, threadId: activeThreadId });
      if (abortGraceTimerRef.current) {
        clearTimeout(abortGraceTimerRef.current);
      }
      abortGraceTimerRef.current = setTimeout(() => {
        if (!terminalRunIdsRef.current.has(runId)) {
          disconnectCurrent('stop-timeout');
        }
      }, ABORT_GRACE_PERIOD_MS);
    } catch (error) {
      dispatchRuntime(activeThreadId, {
        message: getErrorMessage(error),
        type: 'FATAL',
      });
    }
  }, [activeRuntime.runId, activeThreadId, disconnectCurrent, dispatchRuntime]);

  const deleteThread = useCallback(
    async (threadId: string): Promise<void> => {
      try {
        await threadsService.delete(threadId);
        removeThread(threadId);
        if (threadId === activeThreadId) {
          connectionGenerationRef.current += 1;
          disconnectCurrent('navigation');
          router.replace(LAB_ROUTE, { scroll: false });
        }
      } catch (error) {
        setPageError(getErrorMessage(error));
      }
    },
    [activeThreadId, disconnectCurrent, removeThread, router],
  );

  const newThread = useCallback((): void => {
    connectionGenerationRef.current += 1;
    disconnectCurrent('navigation');
    setActiveThreadId(null);
    router.replace(LAB_ROUTE, { scroll: false });
  }, [disconnectCurrent, router, setActiveThreadId]);

  const selectThread = useCallback(
    (threadId: string): void => {
      router.replace(`${LAB_ROUTE}?threadId=${threadId}`, { scroll: false });
    },
    [router],
  );

  const retry = useCallback((): void => {
    if (!activeThreadId || !activeRuntime.input || !activeRuntime.runId) {
      return;
    }
    startSession(activeThreadId, activeRuntime.input, activeRuntime.lastEventId ?? undefined);
  }, [activeRuntime.input, activeRuntime.lastEventId, activeRuntime.runId, activeThreadId, startSession]);

  const disconnect = useCallback((): void => {
    if (!activeThreadId || activeRuntime.phase !== 'streaming') {
      return;
    }
    dispatchRuntime(activeThreadId, { type: 'MANUAL_DISCONNECTED' });
    disconnectCurrent('manual');
  }, [activeRuntime.phase, activeThreadId, disconnectCurrent, dispatchRuntime]);

  const reconnect = useCallback((): void => {
    if (!activeThreadId || !activeRuntime.input || !activeRuntime.runId || activeRuntime.phase !== 'disconnected') {
      return;
    }
    dispatchRuntime(activeThreadId, { type: 'RECONNECT_REQUESTED' });
    startSession(activeThreadId, activeRuntime.input, activeRuntime.lastEventId ?? undefined);
  }, [
    activeRuntime.input,
    activeRuntime.lastEventId,
    activeRuntime.phase,
    activeRuntime.runId,
    activeThreadId,
    dispatchRuntime,
    startSession,
  ]);

  return {
    abortRun,
    activeDetailStatus,
    activeProjection,
    activeRuntime,
    activeThread,
    deleteThread,
    disconnect,
    listStatus,
    newThread,
    pageError,
    refreshThreadList,
    reconnect,
    retry,
    selectThread,
    sendMessage,
    threads,
  };
};
