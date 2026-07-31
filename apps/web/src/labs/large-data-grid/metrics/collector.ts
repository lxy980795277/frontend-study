import type { GridFrameMetrics, GridRendererKind } from '@/labs/large-data-grid/types/grid';
import type { GridLiveMetrics, GridMetricAccumulator } from '../types/metrics';
export const createMetricAccumulator = (): GridMetricAccumulator => {
  return {
    commitCount: 0,
    fallbackCount: 0,
    lastFrame: null,
    maxDrawMs: 0,
    totalDrawMs: 0,
  };
};
export const recordGridFrame = (accumulator: GridMetricAccumulator, frame: GridFrameMetrics): GridMetricAccumulator => {
  return {
    ...accumulator,
    commitCount: accumulator.commitCount + 1,
    lastFrame: frame,
    maxDrawMs: Math.max(accumulator.maxDrawMs, frame.drawMs),
    totalDrawMs: accumulator.totalDrawMs + frame.drawMs,
  };
};
export const recordGridFallback = (accumulator: GridMetricAccumulator): GridMetricAccumulator => {
  return {
    ...accumulator,
    fallbackCount: accumulator.fallbackCount + 1,
  };
};
export const snapshotGridMetrics = (
  accumulator: GridMetricAccumulator,
  renderer: GridRendererKind,
): GridLiveMetrics => {
  return {
    averageDrawMs: accumulator.commitCount === 0 ? 0 : accumulator.totalDrawMs / accumulator.commitCount,
    commitCount: accumulator.commitCount,
    fallbackCount: accumulator.fallbackCount,
    lastDrawnCellCount: accumulator.lastFrame?.drawnCellCount ?? 0,
    lastRange: accumulator.lastFrame?.range ?? null,
    maxDrawMs: accumulator.maxDrawMs,
    renderer,
    visibleTextDigest: accumulator.lastFrame?.visibleTextDigest ?? null,
  };
};
