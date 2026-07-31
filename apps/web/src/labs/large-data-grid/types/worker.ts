import type {
  GridCanvasTheme,
  GridFrameMetrics,
  GridQuery,
  GridQueryProgress,
  GridQueryResult,
  GridScenario,
} from './grid';
import type { GridColumnAxis } from '../core/column-axis';
import type { DeterministicGridDataSource } from '../core/data-source';
import type { GridFrameSnapshot } from './renderer';

export interface GridWorkerEnvelope {
  protocolVersion: 1;
  requestId: number;
  rendererId: string;
  sessionId: number;
}

export type GridWorkerFrame = Omit<GridFrameSnapshot, 'projection'>;

export type GridWorkerRequest =
  | (GridWorkerEnvelope & {
      canvas?: OffscreenCanvas;
      scenario: GridScenario;
      theme?: GridCanvasTheme;
      type: 'init';
      widthOverrides: Readonly<Record<string, number>>;
    })
  | (GridWorkerEnvelope & {
      frame: GridWorkerFrame;
      type: 'frame';
      widthOverrides: Readonly<Record<string, number>>;
    })
  | (GridWorkerEnvelope & {
      query: GridQuery;
      queryVersion: number;
      type: 'query';
    })
  | (GridWorkerEnvelope & {
      type: 'simulate-failure';
    })
  | (GridWorkerEnvelope & {
      type: 'dispose';
    });

export type GridWorkerResponse =
  | (GridWorkerEnvelope & {
      mode: 'query' | 'render';
      type: 'ready';
    })
  | (GridWorkerEnvelope & {
      metrics: GridFrameMetrics;
      queryVersion: number;
      type: 'frame-drawn';
    })
  | (GridWorkerEnvelope & {
      progress: GridQueryProgress;
      queryVersion: number;
      type: 'query-progress';
    })
  | (GridWorkerEnvelope & {
      projectionBuffer: ArrayBuffer | null;
      queryVersion: number;
      summary: {
        digest: string;
        firstRowId: string | null;
        lastRowId: string | null;
        rowCount: number;
      };
      type: 'query-result';
    })
  | (GridWorkerEnvelope & {
      reason: string;
      type: 'runtime-error';
    })
  | (GridWorkerEnvelope & {
      type: 'disposed';
    });

export interface GridQueryWorkerCallbacks {
  onError: (reason: string) => void;
  onProgress: (progress: GridQueryProgress, queryVersion: number) => void;
  onResult: (result: GridQueryResult) => void;
}

export interface WorkerRuntime {
  columnAxis: GridColumnAxis;
  context: OffscreenCanvasRenderingContext2D | null;
  dataSource: DeterministicGridDataSource;
  latestQueryVersion: number;
  mode: 'query' | 'render';
  pendingFrame: GridWorkerFrame | null;
  projection: Uint32Array | null;
  scheduledFrame: number | null;
  theme: GridCanvasTheme | null;
}
