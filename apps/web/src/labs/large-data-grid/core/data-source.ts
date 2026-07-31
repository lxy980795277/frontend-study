import type { GridDataSource, GridComparableValue } from '../types/data';
import type { GridCellKind, GridColumn, GridScenario } from '../types/grid';
const STATUS_VALUES = ['ready', 'running', 'queued', 'warning', 'failed'] as const;
const COLUMN_KINDS: readonly GridCellKind[] = [
  'id',
  'status',
  'text',
  'integer',
  'decimal',
  'timestamp',
  'text',
  'integer',
];
export const createGridColumns = (columnCount: number, defaultWidthCssPx: number): readonly GridColumn[] => {
  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const kind = COLUMN_KINDS[columnIndex % COLUMN_KINDS.length]!;
    return {
      filterable: kind === 'id' || kind === 'status' || kind === 'text',
      id: `column-${String(columnIndex + 1)}`,
      kind,
      label: createColumnLabel(kind, columnIndex),
      maxWidthCssPx: 360,
      minWidthCssPx: 88,
      sortable: true,
      widthCssPx: defaultWidthCssPx,
    };
  });
};
export class DeterministicGridDataSource implements GridDataSource {
  readonly columns: readonly GridColumn[];
  readonly rowCount: number;
  private readonly seed: number;
  constructor(scenario: GridScenario) {
    this.columns = createGridColumns(scenario.columnCount, scenario.defaultColumnWidthCssPx);
    this.rowCount = scenario.rowCount;
    this.seed = scenario.seed;
  }
  getRowId = (sourceRowIndex: number): string => {
    assertCoordinate(sourceRowIndex, this.rowCount, 'row');
    return `row-${String(sourceRowIndex + 1).padStart(7, '0')}`;
  };
  getCellText = (sourceRowIndex: number, columnIndex: number): string => {
    const value = this.getComparableValue(sourceRowIndex, columnIndex);
    const kind = this.columns[columnIndex]?.kind;
    if (kind === 'decimal' && typeof value === 'number') {
      return value.toFixed(2);
    }
    if (kind === 'timestamp' && typeof value === 'number') {
      return new Date(value).toISOString().replace('.000Z', 'Z');
    }
    return String(value);
  };
  getComparableValue = (sourceRowIndex: number, columnIndex: number): GridComparableValue => {
    assertCoordinate(sourceRowIndex, this.rowCount, 'row');
    assertCoordinate(columnIndex, this.columns.length, 'column');
    const kind = this.columns[columnIndex]!.kind;
    const hash = hashCoordinate(this.seed, sourceRowIndex, columnIndex);
    if (kind === 'id') {
      return this.getRowId(sourceRowIndex);
    }
    if (kind === 'integer') {
      return hash % 100000;
    }
    if (kind === 'decimal') {
      return (hash % 1000000) / 100;
    }
    if (kind === 'timestamp') {
      return Date.UTC(2025, 0, 1) + (hash % 31536000) * 1000;
    }
    if (kind === 'status') {
      return STATUS_VALUES[hash % STATUS_VALUES.length]!;
    }
    const shard = hash % 128;
    const trace = (hash >>> 7) % 10000;
    return `Trace ${String(sourceRowIndex + 1)} · shard-${String(shard)} · value-${String(trace)}`;
  };
}
export const sourceIndexAt = (projection: Uint32Array | null, viewRowIndex: number): number => {
  if (projection === null) {
    return viewRowIndex;
  }
  return projection[viewRowIndex] ?? -1;
};
export const viewRowCount = (dataSource: GridDataSource, projection: Uint32Array | null): number => {
  return projection?.length ?? dataSource.rowCount;
};
const createColumnLabel = (kind: GridCellKind, columnIndex: number): string => {
  const labels: Record<GridCellKind, string> = {
    decimal: 'Score',
    id: 'Row ID',
    integer: 'Duration',
    status: 'Status',
    text: 'Trace',
    timestamp: 'Updated',
  };
  return `${labels[kind]} ${String(columnIndex + 1)}`;
};
const hashCoordinate = (seed: number, rowIndex: number, columnIndex: number): number => {
  let value = (seed ^ Math.imul(rowIndex + 1, 0x9e3779b1) ^ Math.imul(columnIndex + 1, 0x85ebca6b)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
};
const assertCoordinate = (value: number, upperBound: number, name: string): void => {
  if (!Number.isInteger(value) || value < 0 || value >= upperBound) {
    throw new RangeError(`${name} coordinate is outside the data source`);
  }
};
