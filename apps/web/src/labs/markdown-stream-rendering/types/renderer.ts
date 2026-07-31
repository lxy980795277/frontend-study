import type { RefObject } from 'react';

import type { MarkdownBlock, MarkdownPatch, PatchResult } from './markdown';

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

export interface RendererCommit {
  committedAt: number;
  contentLength: number;
}

export interface ApplyPatchResult {
  changedBlocks: HTMLElement[];
  removedBlocks: HTMLElement[];
  usedSnapshotFallback: boolean;
}

export interface IncrementalRendererOptions {
  container: HTMLElement;
  onCoalescedFrame: () => void;
  onCommit: (contentLength: number) => void;
  onFallback: () => void;
  onMetrics: (sample: IncrementalSample) => void;
  onPatch: (result: PatchResult) => void;
  onRuntimeStatus: (status: RuntimeStatus) => void;
  onWorkerRequest: () => void;
  renderFull: (content: string) => string;
  sanitize: (html: string) => string;
  timeoutMs?: number;
}

export type WorkerFailureReason = 'message-error' | 'worker-error' | 'worker-unavailable';

export interface RendererHandler {
  onFailure: (reason: WorkerFailureReason) => void;
  onMessage: (message: MarkdownWorkerResponse) => void;
}

export type CopyStatus = 'copied' | 'error' | 'idle';

export interface StickToBottomOptions {
  enterThreshold?: number;
  leaveThreshold?: number;
}

export interface StickToBottomRefs {
  contentRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
}

export interface WorkerBaseline {
  blocks: MarkdownBlock[];
  nextBlockSequence: number;
  pending: {
    blocks: MarkdownBlock[];
    revision: number;
  } | null;
  revision: number;
}

export type MarkdownWorkerRequest =
  | {
      baseRevision: number;
      content: string;
      nextRevision: number;
      rendererId: string;
      reqId: number;
      type: 'update';
    }
  | {
      rendererId: string;
      revision: number;
      type: 'commit';
    }
  | {
      rendererId: string;
      type: 'reset';
    }
  | {
      rendererId: string;
      type: 'simulate-crash';
    };

export type MarkdownWorkerResponse =
  | {
      payload: PatchResult;
      type: 'patch';
    }
  | {
      reason: string;
      rendererId: string;
      reqId: number;
      type: 'protocol-error';
    };
