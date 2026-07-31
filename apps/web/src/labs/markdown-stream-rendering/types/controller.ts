import type { BenchmarkLoadStatus } from './benchmark';
import type { MarkdownFixture, StreamConfiguration } from './fixture';
import type { PatchResult } from './markdown';
import type { IncrementalSample, LegacySample, RunMetricsSnapshot, RuntimeStatus } from './renderer';

export type BenchmarkPhase = 'completed' | 'error' | 'loading' | 'paused' | 'preparing' | 'ready' | 'running';
export type MarkdownRenderingLabMode = 'benchmark' | 'compare';

export interface PatchLogEntry {
  baseRevision: number;
  block: string;
  id: number;
  nextRevision: number;
  operation: PatchResult['patches'][number]['op'];
  rendererId: string;
  reqId: number;
}

export interface MarkdownStreamBenchmarkState {
  codeBlockCount: number;
  copyCount: number;
  errorMessage: string;
  phase: BenchmarkPhase;
  sourceCharacters: number;
  status: BenchmarkLoadStatus;
  totalCharacters: number;
}

export interface MarkdownStreamLabState {
  benchmark: MarkdownStreamBenchmarkState;
  configuration: StreamConfiguration;
  content: string;
  failureSignal: number;
  fixtureId: string;
  instanceCount: 1 | 4;
  isPlaying: boolean;
  metrics: RunMetricsSnapshot;
  patchLog: PatchLogEntry[];
  runId: number;
  runtimeStatuses: Readonly<Record<number, RuntimeStatus>>;
}

export interface MarkdownStreamLabActions {
  injectWorkerFailure: () => void;
  onCoalescedFrame: () => void;
  onIncrementalSample: (sample: IncrementalSample) => void;
  onLegacySample: (sample: LegacySample) => void;
  onPatch: (result: PatchResult) => void;
  onRuntimeStatus: (instance: number, status: RuntimeStatus) => void;
  onWorkerRequest: () => void;
  reset: () => void;
  retryBaseline: () => void;
  selectFixture: (fixtureId: string) => void;
  setFps: (fps: number) => void;
  setInstanceCount: (count: 1 | 4) => void;
  setSplitMode: (mode: StreamConfiguration['mode']) => void;
  togglePlayback: () => void;
}

export interface MarkdownStreamLabController {
  actions: MarkdownStreamLabActions;
  activeFixture: MarkdownFixture;
  state: MarkdownStreamLabState;
}
