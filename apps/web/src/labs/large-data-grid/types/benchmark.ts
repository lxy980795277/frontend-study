import type { GridFrameMetrics, GridJumpRequest, GridRendererKind } from './grid';

export interface GridBenchmarkConfiguration {
  columnCount: number;
  rowCount: number;
  roundCount: number;
  traceLength: number;
  viewportHeightCssPx: number;
  viewportWidthCssPx: number;
}

export interface GridBenchmarkExecution {
  id: string;
  order: number;
  renderer: GridRendererKind;
  round: number;
}

export interface GridBenchmarkExecutionResult {
  averageDrawMs: number;
  averageScrollCommitMs: number;
  commitCount: number;
  effectiveRenderer: GridRendererKind;
  execution: GridBenchmarkExecution;
  fallbackReason: string | null;
  firstFrameMs: number;
  initializationMs: number;
  longTasks: {
    count: number;
    maximumMs: number;
    supported: boolean;
    totalMs: number;
  };
  maximumDrawMs: number;
  maximumScrollCommitMs: number;
  p50ScrollCommitMs: number;
  p95ScrollCommitMs: number;
  status: 'completed' | 'failed' | 'fallback';
  visibleTextDigest: string;
}

export type GridBenchmarkPhase = 'completed' | 'idle' | 'measuring' | 'preparing' | 'settling' | 'stopped';

export interface GridBenchmarkReport {
  configuration: GridBenchmarkConfiguration;
  environment: {
    deviceMemoryGb: number | null;
    hardwareConcurrency: number | null;
    memory: {
      reason: string;
      supported: boolean;
    };
    userAgent: string;
  };
  executions: readonly GridBenchmarkExecutionResult[];
  generatedAt: string;
  schemaVersion: 1;
  status: 'completed' | 'stopped';
}

export interface LatencySummary {
  average: number;
  maximum: number;
  p50: number;
  p95: number;
}

export interface GridLongTaskResult {
  count: number;
  maximumMs: number;
  supported: boolean;
  totalMs: number;
}

export interface GridLongTaskMonitor {
  finish: () => GridLongTaskResult;
}

export interface ActiveExecutionRuntime {
  drawSamples: number[];
  effectiveRenderer: GridRendererKind;
  emittedAt: number | null;
  execution: GridBenchmarkExecution;
  fallbackReason: string | null;
  firstFrameAt: number | null;
  initializationAt: number | null;
  latencies: number[];
  longTaskMonitor: GridLongTaskMonitor;
  pendingTarget: number | null;
  scheduledFrame: number | null;
  startedAt: number;
  trace: readonly number[];
  traceIndex: number;
  visibleTextDigest: string;
}

export interface IsolatedBenchmarkModel {
  activeExecution: GridBenchmarkExecution | null;
  configuration: GridBenchmarkConfiguration;
  executionIndex: number;
  executions: readonly GridBenchmarkExecution[];
  jumpRequest: GridJumpRequest | null;
  phase: GridBenchmarkPhase;
  report: GridBenchmarkReport | null;
  results: readonly GridBenchmarkExecutionResult[];
  traceIndex: number;
}

export interface IsolatedBenchmarkActions {
  onFrameDrawn: (metrics: GridFrameMetrics) => void;
  onRuntimeError: (reason: string) => void;
  onRuntimeFallback: (reason: string) => void;
  onRuntimeReady: (renderer: GridRendererKind) => void;
  setRoundCount: (roundCount: number) => void;
  start: () => void;
  stop: () => void;
}

export interface IsolatedBenchmarkController {
  actions: IsolatedBenchmarkActions;
  model: IsolatedBenchmarkModel;
}
