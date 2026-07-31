import type { DeterministicStreamer } from '../fixtures/streamer';
import type { MarkdownMetricsCollector } from '../metrics/collector';
import type { BenchmarkLoadError } from '../services/benchmark';
import type { LongTaskMonitor } from './browser';
import type { BenchmarkInspection, MarkdownFixture, StreamConfiguration, StreamFrame } from './fixture';
import type { PatchResult } from './markdown';
import type { IncrementalSample, LegacySample, RunMetricsSnapshot, RuntimeStatus } from './renderer';

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
  coalescedFrames: number;
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

export interface BenchmarkRendererCommit {
  committedAt: number;
  contentHash: string | null;
  contentLength: number;
}

export interface RunExecutionOptions {
  baseline: string;
  collector: MarkdownMetricsCollector;
  configuration: IsolatedBenchmarkConfiguration;
  execution: BenchmarkExecution;
  fixtureContent: string;
  onActiveExecution: (execution: BenchmarkActiveExecution | null) => void;
  onComplete: (result: BenchmarkExecutionResult) => void;
  onContent: (content: string) => void;
  onLongTaskMonitor: (monitor: LongTaskMonitor | null) => void;
  onPrepareMetrics: () => void;
  onStreamFrame: (frame: StreamFrame) => void;
  onStreamer: (streamer: DeterministicStreamer | null) => void;
  onTransition: (phase: IsolatedBenchmarkPhase) => void;
  readCommitState: () => {
    committedFrames: number;
    firstFrameAt: number | null;
    frameLatencies: number[];
  };
  token: number;
  waitForCommit: (contentLength: number, timeoutMs: number) => Promise<BenchmarkRendererCommit>;
}

export interface CommitWaiter {
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
  activeFixture: MarkdownFixture;
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

export type BenchmarkLoadStatus = 'error' | 'loading' | 'ready';

export interface BenchmarkBaselineState {
  baseline: string;
  copyCount: number;
  error: BenchmarkLoadError | null;
  inspection: BenchmarkInspection | null;
  retry: () => void;
  status: BenchmarkLoadStatus;
}
