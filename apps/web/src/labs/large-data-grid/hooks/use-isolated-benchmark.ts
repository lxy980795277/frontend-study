'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createGridBenchmarkPlan, createGridScrollTrace } from '../benchmark/plan';
import { createGridBenchmarkReport } from '../benchmark/report';
import { summarizeGridLatency } from '../benchmark/statistics';
import type {
  GridBenchmarkConfiguration,
  GridBenchmarkExecution,
  GridBenchmarkExecutionResult,
  GridBenchmarkPhase,
  GridBenchmarkReport,
  ActiveExecutionRuntime,
  IsolatedBenchmarkController,
} from '@/labs/large-data-grid/types/benchmark';
import { startGridLongTaskMonitor } from '../browser/long-task-monitor';
import type { GridFrameMetrics, GridJumpRequest, GridRendererKind } from '@/labs/large-data-grid/types/grid';
import { DEFAULT_BENCHMARK_ROUNDS, DEFAULT_GRID_SCENARIO } from '../fixtures/default-scenario';

export const DEFAULT_GRID_BENCHMARK_CONFIGURATION: GridBenchmarkConfiguration = {
  columnCount: DEFAULT_GRID_SCENARIO.columnCount,
  roundCount: DEFAULT_BENCHMARK_ROUNDS,
  rowCount: DEFAULT_GRID_SCENARIO.rowCount,
  traceLength: 180,
  viewportHeightCssPx: 560,
  viewportWidthCssPx: 960,
};

export const useIsolatedBenchmark = (): IsolatedBenchmarkController => {
  const [configuration, setConfiguration] = useState(DEFAULT_GRID_BENCHMARK_CONFIGURATION);
  const executions = useMemo(() => {
    return createGridBenchmarkPlan(configuration);
  }, [configuration]);
  const [activeExecution, setActiveExecution] = useState<GridBenchmarkExecution | null>(null);
  const [executionIndex, setExecutionIndex] = useState(0);
  const [traceIndex, setTraceIndex] = useState(0);
  const [phase, setPhase] = useState<GridBenchmarkPhase>('idle');
  const [jumpRequest, setJumpRequest] = useState<GridJumpRequest | null>(null);
  const [results, setResults] = useState<readonly GridBenchmarkExecutionResult[]>([]);
  const [report, setReport] = useState<GridBenchmarkReport | null>(null);
  const activeRuntimeRef = useRef<ActiveExecutionRuntime | null>(null);
  const resultsRef = useRef<readonly GridBenchmarkExecutionResult[]>([]);
  const runTokenRef = useRef(0);
  const beginExecution = useCallback(
    (index: number, token: number) => {
      if (token !== runTokenRef.current) {
        return;
      }
      const execution = executions[index];
      if (!execution) {
        const finalReport = createGridBenchmarkReport(configuration, resultsRef.current, 'completed');
        setReport(finalReport);
        setPhase('completed');
        setActiveExecution(null);
        return;
      }
      const trace = createGridScrollTrace(configuration.rowCount, configuration.traceLength);
      activeRuntimeRef.current = {
        drawSamples: [],
        effectiveRenderer: execution.renderer,
        emittedAt: null,
        execution,
        fallbackReason: null,
        firstFrameAt: null,
        initializationAt: null,
        latencies: [],
        longTaskMonitor: startGridLongTaskMonitor(),
        pendingTarget: null,
        scheduledFrame: null,
        startedAt: performance.now(),
        trace,
        traceIndex: 0,
        visibleTextDigest: '',
      };
      setExecutionIndex(index);
      setTraceIndex(0);
      setJumpRequest(null);
      setActiveExecution(execution);
      setPhase('preparing');
    },
    [configuration, executions],
  );
  const finishActiveExecution = useCallback((status: GridBenchmarkExecutionResult['status']) => {
    const runtime = activeRuntimeRef.current;
    if (!runtime) {
      return;
    }
    if (runtime.scheduledFrame !== null) {
      window.cancelAnimationFrame(runtime.scheduledFrame);
    }
    const finishedAt = performance.now();
    const latency = summarizeGridLatency(runtime.latencies);
    const draw = summarizeGridLatency(runtime.drawSamples);
    const result: GridBenchmarkExecutionResult = {
      averageDrawMs: draw.average,
      averageScrollCommitMs: latency.average,
      commitCount: runtime.latencies.length,
      effectiveRenderer: runtime.effectiveRenderer,
      execution: runtime.execution,
      fallbackReason: runtime.fallbackReason,
      firstFrameMs:
        runtime.firstFrameAt === null
          ? Math.max(0, finishedAt - runtime.startedAt)
          : Math.max(0, runtime.firstFrameAt - runtime.startedAt),
      initializationMs:
        runtime.initializationAt === null
          ? Math.max(0, finishedAt - runtime.startedAt)
          : Math.max(0, runtime.initializationAt - runtime.startedAt),
      longTasks: runtime.longTaskMonitor.finish(),
      maximumDrawMs: draw.maximum,
      maximumScrollCommitMs: latency.maximum,
      p50ScrollCommitMs: latency.p50,
      p95ScrollCommitMs: latency.p95,
      status,
      visibleTextDigest: runtime.visibleTextDigest,
    };
    const nextResults = [...resultsRef.current, result];
    resultsRef.current = nextResults;
    setResults(nextResults);
    activeRuntimeRef.current = null;
    setActiveExecution(null);
    setPhase('settling');
  }, []);
  const scheduleNextTrace = useCallback(() => {
    const runtime = activeRuntimeRef.current;
    if (!runtime || runtime.scheduledFrame !== null) {
      return;
    }
    runtime.scheduledFrame = window.requestAnimationFrame(() => {
      const current = activeRuntimeRef.current;
      if (!current || current !== runtime) {
        return;
      }
      current.scheduledFrame = null;
      const target = current.trace[current.traceIndex];
      if (target === undefined) {
        finishActiveExecution(current.fallbackReason ? 'fallback' : 'completed');
        return;
      }
      current.pendingTarget = target;
      current.emittedAt = performance.now();
      setJumpRequest((previous) => {
        return {
          id: (previous?.id ?? 0) + 1,
          viewRowIndex: target,
        };
      });
    });
  }, [finishActiveExecution]);
  const onFrameDrawn = useCallback(
    (metrics: GridFrameMetrics) => {
      const runtime = activeRuntimeRef.current;
      if (!runtime) {
        return;
      }
      const now = performance.now();
      runtime.visibleTextDigest = metrics.visibleTextDigest;
      runtime.drawSamples.push(metrics.drawMs);
      if (runtime.firstFrameAt === null) {
        runtime.firstFrameAt = now;
        setPhase('measuring');
        scheduleNextTrace();
        return;
      }
      if (
        runtime.pendingTarget === null ||
        runtime.emittedAt === null ||
        runtime.pendingTarget < metrics.range.rowStart ||
        runtime.pendingTarget > metrics.range.rowEnd
      ) {
        return;
      }
      runtime.latencies.push(Math.max(0, now - runtime.emittedAt));
      runtime.pendingTarget = null;
      runtime.emittedAt = null;
      runtime.traceIndex += 1;
      setTraceIndex(runtime.traceIndex);
      if (runtime.traceIndex >= runtime.trace.length) {
        finishActiveExecution(runtime.fallbackReason ? 'fallback' : 'completed');
        return;
      }
      scheduleNextTrace();
    },
    [finishActiveExecution, scheduleNextTrace],
  );
  const onRuntimeReady = useCallback((effectiveRenderer: GridRendererKind) => {
    const runtime = activeRuntimeRef.current;
    if (!runtime) {
      return;
    }
    runtime.effectiveRenderer = effectiveRenderer;
    runtime.initializationAt = performance.now();
  }, []);
  const onRuntimeFallback = useCallback((reason: string) => {
    const runtime = activeRuntimeRef.current;
    if (!runtime) {
      return;
    }
    runtime.effectiveRenderer = 'main-canvas';
    runtime.fallbackReason = reason;
  }, []);
  const onRuntimeError = useCallback(
    (reason: string) => {
      const runtime = activeRuntimeRef.current;
      if (!runtime) {
        return;
      }
      runtime.fallbackReason = reason;
      finishActiveExecution('failed');
    },
    [finishActiveExecution],
  );
  useEffect(() => {
    if (phase !== 'settling') {
      return;
    }
    const token = runTokenRef.current;
    let firstFrame = 0;
    let secondFrame = 0;
    let settleTimer = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        settleTimer = window.setTimeout(() => {
          beginExecution(executionIndex + 1, token);
        }, 0);
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
    };
  }, [beginExecution, executionIndex, phase]);
  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
      const runtime = activeRuntimeRef.current;
      if (runtime?.scheduledFrame !== null && runtime?.scheduledFrame !== undefined) {
        window.cancelAnimationFrame(runtime.scheduledFrame);
      }
      runtime?.longTaskMonitor.finish();
      activeRuntimeRef.current = null;
    };
  }, []);
  const start = useCallback(() => {
    runTokenRef.current += 1;
    const token = runTokenRef.current;
    resultsRef.current = [];
    setResults([]);
    setReport(null);
    beginExecution(0, token);
  }, [beginExecution]);
  const stop = useCallback(() => {
    runTokenRef.current += 1;
    const runtime = activeRuntimeRef.current;
    if (runtime?.scheduledFrame !== null && runtime?.scheduledFrame !== undefined) {
      window.cancelAnimationFrame(runtime.scheduledFrame);
    }
    runtime?.longTaskMonitor.finish();
    activeRuntimeRef.current = null;
    setActiveExecution(null);
    setPhase('stopped');
    setReport(createGridBenchmarkReport(configuration, resultsRef.current, 'stopped'));
  }, [configuration]);
  const setRoundCount = useCallback((roundCount: number) => {
    setConfiguration((current) => {
      return {
        ...current,
        roundCount,
      };
    });
  }, []);
  return {
    actions: {
      onFrameDrawn,
      onRuntimeError,
      onRuntimeFallback,
      onRuntimeReady,
      setRoundCount,
      start,
      stop,
    },
    model: {
      activeExecution,
      configuration,
      executionIndex,
      executions,
      jumpRequest,
      phase,
      report,
      results,
      traceIndex,
    },
  };
};
