import type { StreamConfiguration } from '../fixtures/streamer';
import type { RunMetricsSnapshot } from '../metrics/types';

export type BenchmarkRenderer = 'incremental' | 'legacy';
export type IsolatedBenchmarkPhase =
  'completed' | 'error' | 'idle' | 'measuring' | 'preparing' | 'settling' | 'stopped';

export interface IsolatedBenchmarkConfiguration {
  chunkRange: StreamConfiguration['chunkRange'];
  fixtureId: string;
  fps: number;
  instanceCount: 1;
  mode: StreamConfiguration['mode'];
  roundCount: number;
  seed: number;
}

export interface BenchmarkExecution {
  id: string;
  order: number;
  renderer: BenchmarkRenderer;
  round: number;
}

export interface BenchmarkPlan {
  configuration: IsolatedBenchmarkConfiguration;
  executions: BenchmarkExecution[];
}

export interface BenchmarkLatencySummary {
  averageMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  sampleCount: number;
}

export interface BenchmarkLongTaskSummary {
  count: number;
  maxMs: number;
  supported: boolean;
  totalMs: number;
}

export interface BenchmarkExecutionResult {
  committedFrames: number;
  contentHash: string;
  contentMatchesExpectedLength: boolean;
  execution: BenchmarkExecution;
  finalContentLength: number;
  frameLatency: BenchmarkLatencySummary;
  frameLatencySamples: number[];
  inputFrames: number;
  longTasks: BenchmarkLongTaskSummary;
  metrics: RunMetricsSnapshot;
  wallMs: number;
}

export interface BenchmarkRendererSummary {
  committedFrames: number;
  executions: number;
  frameLatency: BenchmarkLatencySummary;
  inputFrames: number;
  longTasks: BenchmarkLongTaskSummary;
  mainAverageMs: number;
  mainMaxMs: number;
  mainTotalMs: number;
  wallAverageMs: number;
  wallMaxMs: number;
  wallMinMs: number;
  workerRequests: number;
  coalescedFrames: number;
}

export interface BenchmarkConsistency {
  incrementalHashes: string[];
  legacyHashes: string[];
  passed: boolean;
}

export interface BenchmarkEnvironment {
  deviceMemoryGb: number | null;
  hardwareConcurrency: number | null;
  userAgent: string;
}

export interface IsolatedBenchmarkReport {
  configuration: IsolatedBenchmarkConfiguration;
  consistency: BenchmarkConsistency;
  environment: BenchmarkEnvironment;
  executions: BenchmarkExecutionResult[];
  generatedAt: string;
  schemaVersion: 1;
  status: 'completed' | 'stopped';
  summary: Record<BenchmarkRenderer, BenchmarkRendererSummary>;
}

export interface BenchmarkActiveExecution {
  execution: BenchmarkExecution;
  finalContentLength: number;
  rendererKey: string;
}

export interface BenchmarkLiveState {
  activeExecution: BenchmarkActiveExecution | null;
  completedExecutions: number;
  errorMessage: string;
  metrics: RunMetricsSnapshot;
  phase: IsolatedBenchmarkPhase;
  totalExecutions: number;
}

export interface RendererCommit {
  committedAt: number;
  contentLength: number;
}

export interface BenchmarkRendererCommit extends RendererCommit {
  contentHash: string | null;
}
