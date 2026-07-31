import type { GridDataSource } from '../types/data';
import type {
  GridCellRef,
  GridCopyLimits,
  GridCopyResult,
  GridSelection,
  GridSelectionBounds,
  GridViewRowLookup,
} from '../types/grid';
import { sourceIndexAt } from './data-source';

export const createGridCellRef = (
  dataSource: GridDataSource,
  sourceRowIndex: number,
  columnIndex: number,
): GridCellRef => {
  const column = dataSource.columns[columnIndex];
  if (!column) {
    throw new RangeError('column does not exist');
  }
  return {
    columnId: column.id,
    rowId: dataSource.getRowId(sourceRowIndex),
  };
};
export const normalizeSelectionBounds = (
  selection: GridSelection,
  dataSource: GridDataSource,
  projection: Uint32Array | null,
  viewRowLookup: GridViewRowLookup | null = null,
): GridSelectionBounds | null => {
  const anchorRow = findViewRowById(selection.anchor.rowId, dataSource, projection, viewRowLookup);
  const focusRow = findViewRowById(selection.focus.rowId, dataSource, projection, viewRowLookup);
  const anchorColumn = dataSource.columns.findIndex((column) => {
    return column.id === selection.anchor.columnId;
  });
  const focusColumn = dataSource.columns.findIndex((column) => {
    return column.id === selection.focus.columnId;
  });
  if (anchorRow < 0 || focusRow < 0 || anchorColumn < 0 || focusColumn < 0) {
    return null;
  }
  return {
    columnEnd: Math.max(anchorColumn, focusColumn),
    columnStart: Math.min(anchorColumn, focusColumn),
    rowEnd: Math.max(anchorRow, focusRow),
    rowStart: Math.min(anchorRow, focusRow),
  };
};
export const serializeSelectionToTsv = (
  bounds: GridSelectionBounds,
  dataSource: GridDataSource,
  projection: Uint32Array | null,
  limits: GridCopyLimits,
): GridCopyResult => {
  const rowCount = bounds.rowEnd - bounds.rowStart + 1;
  const columnCount = bounds.columnEnd - bounds.columnStart + 1;
  const cellCount = rowCount * columnCount;
  if (cellCount > limits.maximumCells) {
    return {
      estimatedCells: cellCount,
      kind: 'too-large',
      reason: `选区包含 ${String(cellCount)} 个单元格，超过 ${String(limits.maximumCells)} 个的复制上限。`,
    };
  }
  const rows: string[] = [];
  let estimatedBytes = 0;
  const textEncoder = new TextEncoder();
  for (let viewRow = bounds.rowStart; viewRow <= bounds.rowEnd; viewRow += 1) {
    const sourceRow = sourceIndexAt(projection, viewRow);
    const cells: string[] = [];
    for (let columnIndex = bounds.columnStart; columnIndex <= bounds.columnEnd; columnIndex += 1) {
      const value = escapeTsvCell(dataSource.getCellText(sourceRow, columnIndex));
      estimatedBytes += textEncoder.encode(value).byteLength;
      cells.push(value);
    }
    estimatedBytes += Math.max(0, columnCount - 1) + 1;
    if (estimatedBytes > limits.maximumBytes) {
      return {
        estimatedCells: cellCount,
        kind: 'too-large',
        reason: `选区文本超过 ${String(limits.maximumBytes)} 字节的复制上限。`,
      };
    }
    rows.push(cells.join('\t'));
  }
  return {
    cellCount,
    kind: 'success',
    text: rows.join('\n'),
  };
};
export const findViewRowById = (
  rowId: string,
  dataSource: GridDataSource,
  projection: Uint32Array | null,
  viewRowLookup: GridViewRowLookup | null = null,
): number => {
  const sourceRowIndex = parseRowId(rowId);
  if (sourceRowIndex < 0 || sourceRowIndex >= dataSource.rowCount) {
    return -1;
  }
  if (projection === null) {
    return sourceRowIndex;
  }
  if (viewRowLookup && viewRowLookup.length === dataSource.rowCount) {
    return viewRowLookup[sourceRowIndex] ?? -1;
  }
  return projection.indexOf(sourceRowIndex);
};
export const createViewRowLookup = (rowCount: number, projection: Uint32Array | null): GridViewRowLookup | null => {
  if (projection === null) {
    return null;
  }
  const lookup = new Int32Array(rowCount);
  lookup.fill(-1);
  projection.forEach((sourceRowIndex, viewRowIndex) => {
    if (sourceRowIndex < rowCount) {
      lookup[sourceRowIndex] = viewRowIndex;
    }
  });
  return lookup;
};
const parseRowId = (rowId: string): number => {
  if (!/^row-\d{7}$/u.test(rowId)) {
    return -1;
  }
  const parsed = Number.parseInt(rowId.slice(4), 10) - 1;
  return Number.isInteger(parsed) ? parsed : -1;
};
const escapeTsvCell = (value: string): string => {
  if (!/[\t\n\r"]/u.test(value)) {
    return value;
  }
  return `"${value.replaceAll('"', '""')}"`;
};
