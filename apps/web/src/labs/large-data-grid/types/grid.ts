export type GridRendererKind = 'dom' | 'main-canvas' | 'worker-offscreen';
export type GridCellKind = 'decimal' | 'id' | 'integer' | 'status' | 'text' | 'timestamp';

export interface GridColumn {
  filterable: boolean;
  id: string;
  kind: GridCellKind;
  label: string;
  maxWidthCssPx: number;
  minWidthCssPx: number;
  sortable: boolean;
  widthCssPx: number;
}

export interface GridScenario {
  columnCount: number;
  defaultColumnWidthCssPx: number;
  id: string;
  rowCount: number;
  rowHeightCssPx: number;
  seed: number;
}

export interface GridViewport {
  devicePixelRatio: number;
  heightCssPx: number;
  logicalScrollLeftCssPx: number;
  logicalScrollTopCssPx: number;
  widthCssPx: number;
}

export interface GridVisibleRange {
  columnEnd: number;
  columnStart: number;
  rowEnd: number;
  rowStart: number;
}

export interface GridCellRef {
  columnId: string;
  rowId: string;
}

export interface GridSelection {
  anchor: GridCellRef;
  focus: GridCellRef;
  queryVersion: number;
}

export interface GridSelectionBounds {
  columnEnd: number;
  columnStart: number;
  rowEnd: number;
  rowStart: number;
}

export interface GridCopyLimits {
  maximumBytes: number;
  maximumCells: number;
}

export type GridViewRowLookup = Int32Array;

export type GridCopyResult =
  | {
      cellCount: number;
      kind: 'success';
      text: string;
    }
  | {
      estimatedCells: number;
      kind: 'too-large';
      reason: string;
    };

export interface GridSort {
  columnId: string;
  direction: 'ascending' | 'descending';
}

export interface GridFilter {
  columnIds: readonly string[];
  text: string;
}

export interface GridQuery {
  filter: GridFilter | null;
  sort: GridSort | null;
}

export interface GridProjectionSummary {
  digest: string;
  firstRowId: string | null;
  lastRowId: string | null;
  rowCount: number;
}

export interface GridQueryProgress {
  completedRows: number;
  phase: 'filtering' | 'sorting';
  totalRows: number;
}

export interface GridQueryResult {
  projection: Uint32Array | null;
  queryVersion: number;
  summary: GridProjectionSummary;
}

export interface GridCanvasTheme {
  accent: string;
  background: string;
  border: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  selection: string;
}

export interface GridFrameMetrics {
  drawnCellCount: number;
  drawMs: number;
  frameId: number;
  range: GridVisibleRange;
  visibleTextDigest: string;
}

export interface GridRuntimeStatus {
  fallbackReason: string | null;
  frameMetrics: GridFrameMetrics | null;
  phase: 'error' | 'fallback' | 'loading' | 'ready';
  renderer: GridRendererKind;
}

export interface GridJumpRequest {
  id: number;
  viewRowIndex: number;
}

export interface DragState {
  columnId: string;
  maximum: number;
  minimum: number;
  startPointerX: number;
  startWidth: number;
}
