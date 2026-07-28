'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createBenchmarkPlan } from '../benchmark/plan';
import { createIsolatedBenchmarkReport, readBenchmarkEnvironment } from '../benchmark/report';
import {
  assertActiveRun,
  BenchmarkCancelledError,
  isActiveBenchmarkPhase,
  runBenchmarkExecution,
  waitForBrowserSettle,
} from '../benchmark/runner';
import type {
  BenchmarkActiveExecution,
  BenchmarkExecution,
  BenchmarkExecutionResult,
  BenchmarkRendererCommit,
  IsolatedBenchmarkConfiguration,
  IsolatedBenchmarkPhase,
  IsolatedBenchmarkReport,
} from '../benchmark/types';
import type { LongTaskMonitor } from '../browser/long-task-monitor';
import type { PatchResult } from '../core/patch/types';
import { MARKDOWN_FIXTURES } from '../fixtures/fixtures';
import type { DeterministicStreamer } from '../fixtures/streamer';
import { MarkdownMetricsCollector } from '../metrics/collector';
import { createEmptyMetricsSnapshot } from '../metrics/empty';
import type { IncrementalSample, LegacySample, RunMetricsSnapshot, RuntimeStatus } from '../metrics/types';
import { useBenchmarkBaseline, type BenchmarkLoadStatus } from './use-benchmark-baseline';

const DEFAULT_CONFIGURATION: IsolatedBenchmarkConfiguration = {
  chunkRange: [12, 32],
  fixtureId: 'mixed',
  fps: 30,
  instanceCount: 1,
  mode: 'char',
  roundCount: 2,
  seed: 5_005,
};
interface CommitWaiter {
  reject: (reason: Error) => void;
  resolve: (commit: BenchmarkRendererCommit) => void;
  timeoutId: number;
}

export interface IsolatedBenchmarkBaseline {
  codeBlockCount: number;
  copyCount: number;
  errorMessage: string;
  sourceCharacters: number;
  status: BenchmarkLoadStatus;
  totalCharacters: number;
}

export interface IsolatedBenchmarkState {
  activeExecution: BenchmarkActiveExecution | null;
  activeFixture: (typeof MARKDOWN_FIXTURES)[number];
  baseline: IsolatedBenchmarkBaseline;
  completedExecutions: number;
  configuration: IsolatedBenchmarkConfiguration;
  content: string;
  errorMessage: string;
  isRunning: boolean;
  metrics: RunMetricsSnapshot;
  phase: IsolatedBenchmarkPhase;
  report: IsolatedBenchmarkReport | null;
  results: BenchmarkExecutionResult[];
  totalExecutions: number;
}

export interface IsolatedBenchmarkActions {
  onCoalescedFrame: () => void;
  onCommit: (commit: BenchmarkRendererCommit) => void;
  onIncrementalSample: (sample: IncrementalSample) => void;
  onLegacySample: (sample: LegacySample) => void;
  onPatch: (result: PatchResult) => void;
  onRuntimeStatus: (status: RuntimeStatus) => void;
  onWorkerRequest: () => void;
  retryBaseline: () => void;
  setFixture: (fixtureId: string) => void;
  setFps: (fps: number) => void;
  setRoundCount: (roundCount: number) => void;
  setSplitMode: (mode: IsolatedBenchmarkConfiguration['mode']) => void;
  start: () => void;
  stop: () => void;
}

export interface IsolatedBenchmarkController {
  actions: IsolatedBenchmarkActions;
  state: IsolatedBenchmarkState;
}

export function useIsolatedBenchmark(): IsolatedBenchmarkController {
  const benchmarkBaseline = useBenchmarkBaseline();
  const [configuration, setConfiguration] = useState(DEFAULT_CONFIGURATION);
  const [activeExecution, setActiveExecution] = useState<BenchmarkActiveExecution | null>(null);
  const [content, setContent] = useState('');
  const [phase, setPhase] = useState<IsolatedBenchmarkPhase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState<BenchmarkExecutionResult[]>([]);
  const [report, setReport] = useState<IsolatedBenchmarkReport | null>(null);
  const [metrics, setMetrics] = useState(createEmptyMetricsSnapshot);
  const [completedExecutions, setCompletedExecutions] = useState(0);
  const [totalExecutions, setTotalExecutions] = useState(0);

  const collectorRef = useRef(new MarkdownMetricsCollector());
  const commitWaitersRef = useRef(new Map<number, CommitWaiter>());
  const committedFrameLengthsRef = useRef(new Set<number>());
  const emittedFramesRef = useRef(new Map<number, number>());
  const firstFrameAtRef = useRef<number | null>(null);
  const frameLatenciesRef = useRef<number[]>([]);
  const longTaskMonitorRef = useRef<LongTaskMonitor | null>(null);
  const phaseRef = useRef<IsolatedBenchmarkPhase>('idle');
  const resultsRef = useRef<BenchmarkExecutionResult[]>([]);
  const runTokenRef = useRef(0);
  const settleCancelRef = useRef<(() => void) | null>(null);
  const streamerRef = useRef<DeterministicStreamer | null>(null);
  const runtimeModeRef = useRef<RuntimeStatus['mode']>('incremental');

  const activeFixture = useMemo(() => {
    return MARKDOWN_FIXTURES.find((fixture) => fixture.id === configuration.fixtureId) ?? MARKDOWN_FIXTURES[0];
  }, [configuration.fixtureId]);
  const isRunning = isActiveBenchmarkPhase(phase);

  const transitionPhase = useCallback((nextPhase: IsolatedBenchmarkPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const cancelPendingWork = useCallback(() => {
    streamerRef.current?.pause();
    streamerRef.current = null;
    settleCancelRef.current?.();
    settleCancelRef.current = null;
    longTaskMonitorRef.current?.finish();
    longTaskMonitorRef.current = null;
    commitWaitersRef.current.forEach((waiter) => {
      window.clearTimeout(waiter.timeoutId);
      waiter.reject(new BenchmarkCancelledError());
    });
    commitWaitersRef.current.clear();
  }, []);

  const waitForCommit = useCallback((contentLength: number, timeoutMs: number) => {
    return new Promise<BenchmarkRendererCommit>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        commitWaitersRef.current.delete(contentLength);
        reject(new Error(`等待 ${String(contentLength)} 字符的最终 DOM Commit 超时。`));
      }, timeoutMs);

      commitWaitersRef.current.set(contentLength, {
        reject,
        resolve,
        timeoutId,
      });
    });
  }, []);

  const onCommit = useCallback((commit: BenchmarkRendererCommit) => {
    const emittedAt = emittedFramesRef.current.get(commit.contentLength);

    if (phaseRef.current === 'measuring' && emittedAt !== undefined) {
      if (!committedFrameLengthsRef.current.has(commit.contentLength)) {
        committedFrameLengthsRef.current.add(commit.contentLength);
        frameLatenciesRef.current.push(commit.committedAt - emittedAt);
      }
    }

    const waiter = commitWaitersRef.current.get(commit.contentLength);
    if (!waiter) {
      return;
    }

    window.clearTimeout(waiter.timeoutId);
    commitWaitersRef.current.delete(commit.contentLength);
    waiter.resolve(commit);
  }, []);

  const onLegacySample = useCallback((sample: LegacySample) => {
    if (phaseRef.current === 'measuring') {
      collectorRef.current.recordLegacy(sample);
    }
  }, []);

  const onIncrementalSample = useCallback((sample: IncrementalSample) => {
    if (phaseRef.current === 'measuring') {
      collectorRef.current.recordIncremental(sample);
    }
  }, []);

  const onWorkerRequest = useCallback(() => {
    if (phaseRef.current === 'measuring') {
      collectorRef.current.recordWorkerRequest();
    }
  }, []);

  const onCoalescedFrame = useCallback(() => {
    if (phaseRef.current === 'measuring') {
      collectorRef.current.recordCoalescedFrame();
    }
  }, []);

  const onRuntimeStatus = useCallback((status: RuntimeStatus) => {
    if (phaseRef.current === 'measuring' && runtimeModeRef.current !== 'fallback' && status.mode === 'fallback') {
      collectorRef.current.recordRuntimeFallback();
    }
    runtimeModeRef.current = status.mode;
  }, []);

  const onPatch = useCallback((_result: PatchResult) => {
    return undefined;
  }, []);

  const runPlan = useCallback(
    async (
      token: number,
      runConfiguration: IsolatedBenchmarkConfiguration,
      executions: readonly BenchmarkExecution[],
      fixtureContent: string,
    ): Promise<void> => {
      try {
        for (const execution of executions) {
          assertActiveRun(token, runTokenRef.current);
          await runBenchmarkExecution({
            baseline: benchmarkBaseline.baseline,
            collector: collectorRef.current,
            configuration: runConfiguration,
            execution,
            fixtureContent,
            onActiveExecution: setActiveExecution,
            onComplete: (result) => {
              resultsRef.current = [...resultsRef.current, result];
              setResults(resultsRef.current);
              setMetrics(result.metrics);
              setCompletedExecutions((current) => {
                return current + 1;
              });
            },
            onContent: setContent,
            onLongTaskMonitor: (monitor) => {
              longTaskMonitorRef.current = monitor;
            },
            onPrepareMetrics: () => {
              committedFrameLengthsRef.current.clear();
              emittedFramesRef.current.clear();
              firstFrameAtRef.current = null;
              frameLatenciesRef.current = [];
              runtimeModeRef.current = 'incremental';
              setMetrics(createEmptyMetricsSnapshot());
            },
            onStreamFrame: (frame) => {
              const emittedAt = performance.now();
              emittedFramesRef.current.set(frame.cumulative.length, emittedAt);
              firstFrameAtRef.current ??= emittedAt;
              collectorRef.current.recordInputFrame();
              setContent(frame.cumulative);
            },
            onStreamer: (streamer) => {
              streamerRef.current = streamer;
            },
            onTransition: transitionPhase,
            readCommitState: () => {
              return {
                committedFrames: committedFrameLengthsRef.current.size,
                firstFrameAt: firstFrameAtRef.current,
                frameLatencies: [...frameLatenciesRef.current],
              };
            },
            token,
            waitForCommit,
          });

          assertActiveRun(token, runTokenRef.current);
          streamerRef.current = null;
          longTaskMonitorRef.current = null;
          transitionPhase('settling');
          setActiveExecution(null);
          await waitForBrowserSettle(settleCancelRef);
        }

        assertActiveRun(token, runTokenRef.current);
        const completedReport = createIsolatedBenchmarkReport(
          runConfiguration,
          resultsRef.current,
          readBenchmarkEnvironment(),
          'completed',
        );
        setReport(completedReport);
        transitionPhase('completed');
      } catch (cause: unknown) {
        if (cause instanceof BenchmarkCancelledError || token !== runTokenRef.current) {
          return;
        }

        const nextMessage = cause instanceof Error ? cause.message : '隔离基准运行失败。';
        setErrorMessage(nextMessage);
        transitionPhase('error');
        setActiveExecution(null);
        cancelPendingWork();
      }
    },
    [benchmarkBaseline.baseline, cancelPendingWork, transitionPhase, waitForCommit],
  );

  const start = useCallback(() => {
    if (benchmarkBaseline.status !== 'ready' || isActiveBenchmarkPhase(phaseRef.current)) {
      return;
    }

    cancelPendingWork();
    const token = runTokenRef.current + 1;
    runTokenRef.current = token;
    const runConfiguration = {
      ...configuration,
      seed: activeFixture.seed,
    };
    const plan = createBenchmarkPlan(runConfiguration);
    resultsRef.current = [];
    setResults([]);
    setReport(null);
    setErrorMessage('');
    setCompletedExecutions(0);
    setTotalExecutions(plan.executions.length);

    void runPlan(token, runConfiguration, plan.executions, activeFixture.content);
  }, [activeFixture, benchmarkBaseline.status, cancelPendingWork, configuration, runPlan]);

  const stop = useCallback(() => {
    if (!isActiveBenchmarkPhase(phaseRef.current)) {
      return;
    }

    runTokenRef.current += 1;
    cancelPendingWork();
    setActiveExecution(null);
    const stoppedReport = createIsolatedBenchmarkReport(
      configuration,
      resultsRef.current,
      readBenchmarkEnvironment(),
      'stopped',
    );
    setReport(stoppedReport);
    transitionPhase('stopped');
  }, [cancelPendingWork, configuration, transitionPhase]);

  const setFixture = useCallback((fixtureId: string) => {
    const fixture = MARKDOWN_FIXTURES.find((candidate) => candidate.id === fixtureId);
    if (!fixture || isActiveBenchmarkPhase(phaseRef.current)) {
      return;
    }

    setConfiguration((current) => {
      return {
        ...current,
        fixtureId: fixture.id,
        seed: fixture.seed,
      };
    });
  }, []);

  const setFps = useCallback((fps: number) => {
    if (isActiveBenchmarkPhase(phaseRef.current)) {
      return;
    }
    setConfiguration((current) => {
      return {
        ...current,
        fps,
      };
    });
  }, []);

  const setSplitMode = useCallback((mode: IsolatedBenchmarkConfiguration['mode']) => {
    if (isActiveBenchmarkPhase(phaseRef.current)) {
      return;
    }
    setConfiguration((current) => {
      return {
        ...current,
        mode,
      };
    });
  }, []);

  const setRoundCount = useCallback((roundCount: number) => {
    if (isActiveBenchmarkPhase(phaseRef.current)) {
      return;
    }
    setConfiguration((current) => {
      return {
        ...current,
        roundCount,
      };
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (phaseRef.current === 'measuring') {
        setMetrics(collectorRef.current.snapshot());
      }
    }, 200);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
      cancelPendingWork();
    };
  }, [cancelPendingWork]);

  return {
    actions: {
      onCoalescedFrame,
      onCommit,
      onIncrementalSample,
      onLegacySample,
      onPatch,
      onRuntimeStatus,
      onWorkerRequest,
      retryBaseline: benchmarkBaseline.retry,
      setFixture,
      setFps,
      setRoundCount,
      setSplitMode,
      start,
      stop,
    },
    state: {
      activeExecution,
      activeFixture,
      baseline: {
        codeBlockCount: benchmarkBaseline.inspection?.codeBlockCount ?? 0,
        copyCount: benchmarkBaseline.copyCount,
        errorMessage: benchmarkBaseline.error?.message ?? '',
        sourceCharacters: benchmarkBaseline.inspection?.characters ?? 0,
        status: benchmarkBaseline.status,
        totalCharacters: benchmarkBaseline.baseline.length,
      },
      completedExecutions,
      configuration,
      content,
      errorMessage,
      isRunning,
      metrics,
      phase,
      report,
      results,
      totalExecutions,
    },
  };
}
