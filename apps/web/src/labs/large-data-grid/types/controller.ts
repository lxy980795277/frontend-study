import type { GridColumnAxis } from '../core/column-axis';
import type { DeterministicGridDataSource } from '../core/data-source';
import type {
  GridCellRef,
  GridJumpRequest,
  GridProjectionSummary,
  GridQuery,
  GridQueryProgress,
  GridQueryResult,
  GridRendererKind,
  GridScenario,
  GridSelection,
  GridFrameMetrics,
  GridRuntimeStatus,
} from './grid';
import type { GridLiveMetrics } from './metrics';

export type LargeDataGridLabMode = 'benchmark' | 'workbench';

export interface GridWorkbenchModel {
  activeCell: GridCellRef | null;
  columnAxis: GridColumnAxis;
  columnCount: number;
  columnOverscan: number;
  copyRequestId: number;
  dataSource: DeterministicGridDataSource;
  faultRequestId: number;
  feedback: string;
  jumpRequest: GridJumpRequest | null;
  liveMetrics: GridLiveMetrics;
  projection: Uint32Array | null;
  projectionSummary: GridProjectionSummary;
  query: GridQuery;
  queryProgress: GridQueryProgress | null;
  queryVersion: number;
  renderer: GridRendererKind;
  rowCount: number;
  rowOverscan: number;
  runtimeGeneration: number;
  runtimeStatus: GridRuntimeStatus;
  scenario: GridScenario;
  selectAllRequestId: number;
  selection: GridSelection | null;
  widthOverrides: Readonly<Record<string, number>>;
}

export interface GridWorkbenchActions {
  applyQuery: (query: GridQuery) => void;
  copySelection: () => void;
  injectWorkerFailure: () => void;
  jumpToRow: (oneBasedRow: number) => void;
  reset: () => void;
  selectAll: () => void;
  setActiveCell: (cell: GridCellRef) => void;
  setColumnCount: (columnCount: number) => void;
  setColumnOverscan: (overscan: number) => void;
  setColumnWidth: (columnId: string, widthCssPx: number) => void;
  setFeedback: (message: string) => void;
  setRenderer: (renderer: GridRendererKind) => void;
  setRowCount: (rowCount: number) => void;
  setRowOverscan: (overscan: number) => void;
  setSelection: (selection: GridSelection | null) => void;
}

export interface GridViewportCallbacks {
  onFrameDrawn: (metrics: GridFrameMetrics) => void;
  onQueryProgress: (progress: GridQueryProgress, queryVersion: number) => void;
  onQueryResult: (result: GridQueryResult) => void;
  onRuntimeError: (reason: string) => void;
  onRuntimeFallback: (reason: string) => void;
  onRuntimeReady: (renderer: GridRendererKind) => void;
}

export interface GridWorkbenchController {
  actions: GridWorkbenchActions;
  model: GridWorkbenchModel;
  viewportCallbacks: GridViewportCallbacks;
}
