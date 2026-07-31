import type { GridColumnAxis } from '../core/column-axis';
import type { GridDataSource } from './data';
import type {
  GridCanvasTheme,
  GridFrameMetrics,
  GridQueryProgress,
  GridQueryResult,
  GridRendererKind,
  GridScenario,
  GridSelectionBounds,
  GridViewport,
  GridVisibleRange,
} from './grid';
import type { GridWorkerResponse } from './worker';

export type GridCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface GridFrameSnapshot {
  activeColumnIndex: number | null;
  activeViewRowIndex: number | null;
  frameId: number;
  projection: Uint32Array | null;
  queryVersion: number;
  rowHeightCssPx: number;
  selectionBounds: GridSelectionBounds | null;
  viewport: GridViewport;
  visibleRange: GridVisibleRange;
}

export interface GridRendererMountContext {
  columnAxis: GridColumnAxis;
  dataSource: GridDataSource;
  theme: GridCanvasTheme;
}

export interface GridRendererCallbacks {
  onError: (reason: string) => void;
  onFrameDrawn: (metrics: GridFrameMetrics) => void;
  onReady: () => void;
}

export interface GridRenderer {
  readonly kind: GridRendererKind;
  dispose: () => void;
  mount: (context: GridRendererMountContext) => void;
  update: (snapshot: GridFrameSnapshot) => void;
}

export interface PaintGridFrameOptions {
  columnAxis: GridColumnAxis;
  context: GridCanvasContext;
  dataSource: GridDataSource;
  snapshot: GridFrameSnapshot;
  theme: GridCanvasTheme;
}

export interface PaintBodyOptions extends PaintGridFrameOptions {
  onText: (text: string) => void;
}

export interface FrameClock {
  cancel: (frameId: number) => void;
  request: (callback: (timestamp: number) => void) => number;
}

export interface VisibleRangeOptions {
  columnAxis: GridColumnAxis;
  columnOverscan: number;
  rowCount: number;
  rowHeightCssPx: number;
  rowOverscan: number;
  viewport: GridViewport;
}

export interface WorkerOffscreenCallbacks {
  onFailure: (reason: string) => void;
  onFrameDrawn: (
    response: Extract<
      GridWorkerResponse,
      {
        type: 'frame-drawn';
      }
    >,
  ) => void;
  onQueryProgress: (progress: GridQueryProgress, queryVersion: number) => void;
  onQueryResult: (result: GridQueryResult) => void;
  onReady: () => void;
}

export interface MountWorkerOffscreenOptions {
  canvas: HTMLCanvasElement;
  scenario: GridScenario;
  theme: GridCanvasTheme;
  widthOverrides: Readonly<Record<string, number>>;
}
