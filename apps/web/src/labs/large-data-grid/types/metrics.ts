import type { GridFrameMetrics, GridRendererKind, GridVisibleRange } from './grid';

export interface GridLiveMetrics {
  averageDrawMs: number;
  commitCount: number;
  fallbackCount: number;
  lastDrawnCellCount: number;
  lastRange: GridVisibleRange | null;
  maxDrawMs: number;
  renderer: GridRendererKind;
  visibleTextDigest: string | null;
}

export interface GridMetricAccumulator {
  commitCount: number;
  fallbackCount: number;
  lastFrame: GridFrameMetrics | null;
  maxDrawMs: number;
  totalDrawMs: number;
}
