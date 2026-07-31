import type { RunMetricsSnapshot } from '@/labs/markdown-stream-rendering/types/renderer';
export const createEmptyMetricsSnapshot = (): RunMetricsSnapshot => {
  return {
    elapsedMs: 0,
    incremental: {
      applyMs: 0,
      coalescedFrames: 0,
      commits: 0,
      fallbackPatchRate: 0,
      mainAverageMs: 0,
      mainMaxMs: 0,
      mainTotalMs: 0,
      mountMs: 0,
      runtimeFallbacks: 0,
      tailAppendRate: 0,
      workerDiffMs: 0,
      workerParseMs: 0,
      workerRequests: 0,
    },
    inputFrames: 0,
    legacy: {
      commits: 0,
      mainAverageMs: 0,
      mainMaxMs: 0,
      mainTotalMs: 0,
    },
  };
};
