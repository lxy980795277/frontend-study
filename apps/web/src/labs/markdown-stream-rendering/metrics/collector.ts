import type {
  IncrementalMetricsSnapshot,
  IncrementalSample,
  LegacyMetricsSnapshot,
  LegacySample,
  RunMetricsSnapshot,
} from './types';

export class MarkdownMetricsCollector {
  private applyMs = 0;
  private coalescedFrames = 0;
  private incrementalCommits = 0;
  private incrementalMainMax = 0;
  private incrementalMainTotal = 0;
  private inputFrames = 0;
  private legacyCommits = 0;
  private legacyMainMax = 0;
  private legacyMainTotal = 0;
  private mountMs = 0;
  private patchOperations = 0;
  private runtimeFallbacks = 0;
  private startedAt: number | null = null;
  private stoppedAt: number | null = null;
  private tailAppends = 0;
  private fallbackPatches = 0;
  private workerDiffMs = 0;
  private workerParseMs = 0;
  private workerRequests = 0;

  recordInputFrame(): void {
    this.inputFrames += 1;
  }

  start(): void {
    if (this.startedAt === null) {
      this.startedAt = performance.now();
      this.stoppedAt = null;
    }
  }

  finish(): void {
    if (this.startedAt !== null && this.stoppedAt === null) {
      this.stoppedAt = performance.now();
    }
  }

  recordLegacy(sample: LegacySample): void {
    this.legacyCommits += 1;
    this.legacyMainTotal += sample.mainMs;
    this.legacyMainMax = Math.max(this.legacyMainMax, sample.mainMs);
  }

  recordWorkerRequest(): void {
    this.workerRequests += 1;
  }

  recordCoalescedFrame(): void {
    this.coalescedFrames += 1;
  }

  recordRuntimeFallback(): void {
    this.runtimeFallbacks += 1;
  }

  recordIncremental(sample: IncrementalSample): void {
    const mainMs = sample.applyMs + sample.mountMs;
    this.incrementalCommits += 1;
    this.incrementalMainTotal += mainMs;
    this.incrementalMainMax = Math.max(this.incrementalMainMax, mainMs);
    this.applyMs += sample.applyMs;
    this.mountMs += sample.mountMs;
    this.workerParseMs += sample.parseMs;
    this.workerDiffMs += sample.diffMs;

    sample.patchOps.forEach((operation) => {
      this.patchOperations += 1;

      if (operation === 'tailAppendText') {
        this.tailAppends += 1;
      }

      if (operation === 'tailAppendFallbackHtml' || sample.usedSnapshotFallback) {
        this.fallbackPatches += 1;
      }
    });
  }

  reset(): void {
    this.applyMs = 0;
    this.coalescedFrames = 0;
    this.incrementalCommits = 0;
    this.incrementalMainMax = 0;
    this.incrementalMainTotal = 0;
    this.inputFrames = 0;
    this.legacyCommits = 0;
    this.legacyMainMax = 0;
    this.legacyMainTotal = 0;
    this.mountMs = 0;
    this.patchOperations = 0;
    this.runtimeFallbacks = 0;
    this.startedAt = null;
    this.stoppedAt = null;
    this.tailAppends = 0;
    this.fallbackPatches = 0;
    this.workerDiffMs = 0;
    this.workerParseMs = 0;
    this.workerRequests = 0;
  }

  snapshot(): RunMetricsSnapshot {
    const elapsedMs = this.startedAt === null ? 0 : (this.stoppedAt ?? performance.now()) - this.startedAt;

    return {
      elapsedMs,
      incremental: this.createIncrementalSnapshot(),
      inputFrames: this.inputFrames,
      legacy: this.createLegacySnapshot(),
    };
  }

  private createLegacySnapshot(): LegacyMetricsSnapshot {
    return {
      commits: this.legacyCommits,
      mainAverageMs: this.legacyCommits === 0 ? 0 : this.legacyMainTotal / this.legacyCommits,
      mainMaxMs: this.legacyMainMax,
      mainTotalMs: this.legacyMainTotal,
    };
  }

  private createIncrementalSnapshot(): IncrementalMetricsSnapshot {
    return {
      applyMs: this.applyMs,
      coalescedFrames: this.coalescedFrames,
      commits: this.incrementalCommits,
      fallbackPatchRate: this.patchOperations === 0 ? 0 : this.fallbackPatches / this.patchOperations,
      mainAverageMs: this.incrementalCommits === 0 ? 0 : this.incrementalMainTotal / this.incrementalCommits,
      mainMaxMs: this.incrementalMainMax,
      mainTotalMs: this.incrementalMainTotal,
      mountMs: this.mountMs,
      runtimeFallbacks: this.runtimeFallbacks,
      tailAppendRate: this.patchOperations === 0 ? 0 : this.tailAppends / this.patchOperations,
      workerDiffMs: this.workerDiffMs,
      workerParseMs: this.workerParseMs,
      workerRequests: this.workerRequests,
    };
  }
}
