import type {
  GridCellKind,
  GridColumn,
  GridProjectionSummary,
  GridQuery,
  GridQueryProgress,
  GridQueryResult,
} from './grid';

export type GridComparableValue = number | string;

export interface GridDataSource {
  readonly columns: readonly GridColumn[];
  readonly rowCount: number;
  getCellText: (sourceRowIndex: number, columnIndex: number) => string;
  getComparableValue: (sourceRowIndex: number, columnIndex: number) => GridComparableValue;
  getRowId: (sourceRowIndex: number) => string;
}

export interface RunGridQueryOptions {
  dataSource: GridDataSource;
  isCancelled: () => boolean;
  onProgress: (progress: GridQueryProgress) => void;
  query: GridQuery;
  queryVersion: number;
}

export interface DomCell {
  columnIndex: number;
  key: string;
  text: string;
  width: number;
  x: number;
}

export interface DomColumnHeader {
  columnIndex: number;
  key: string;
  label: string;
  width: number;
  x: number;
}

export interface DomRow {
  cells: DomCell[];
  key: string;
  label: string;
  viewRowIndex: number;
  y: number;
}

export interface DomFrame {
  cellCount: number;
  columnHeaders: DomColumnHeader[];
  rows: DomRow[];
  visibleTextSample: string[];
}

export interface GridDataTypeMap {
  comparable: GridComparableValue;
  kind: GridCellKind;
  queryResult: GridQueryResult;
  summary: GridProjectionSummary;
}
