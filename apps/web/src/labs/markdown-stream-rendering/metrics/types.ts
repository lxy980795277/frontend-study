import type { MarkdownPatch } from '../core/patch/types';

export type RuntimeMode = 'fallback' | 'incremental';
export type RuntimePhase = 'applying' | 'fallback' | 'idle' | 'requesting';

export interface RuntimeStatus {
  committedContentLength?: number;
  fallbackReason?: string;
  mode: RuntimeMode;
  phase: RuntimePhase;
}

export interface LegacySample {
  mainMs: number;
}

export interface IncrementalSample {
  applyMs: number;
  diffMs: number;
  mountMs: number;
  parseMs: number;
  patchOps: MarkdownPatch['op'][];
  usedSnapshotFallback: boolean;
}

export interface LegacyMetricsSnapshot {
  commits: number;
  mainAverageMs: number;
  mainMaxMs: number;
  mainTotalMs: number;
}

export interface IncrementalMetricsSnapshot {
  applyMs: number;
  coalescedFrames: number;
  commits: number;
  fallbackPatchRate: number;
  mainAverageMs: number;
  mainMaxMs: number;
  mainTotalMs: number;
  mountMs: number;
  runtimeFallbacks: number;
  tailAppendRate: number;
  workerDiffMs: number;
  workerParseMs: number;
  workerRequests: number;
}

export interface RunMetricsSnapshot {
  elapsedMs: number;
  incremental: IncrementalMetricsSnapshot;
  inputFrames: number;
  legacy: LegacyMetricsSnapshot;
}
