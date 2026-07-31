import type { GridVisibleRange } from '../types/grid';
import { GRID_HEADER_HEIGHT_CSS_PX, GRID_ROW_HEADER_WIDTH_CSS_PX } from './constants';
import type { VisibleRangeOptions } from '../types/renderer';

export const calculateVisibleRange = (options: VisibleRangeOptions): GridVisibleRange => {
  if (options.rowCount <= 0 || options.columnAxis.columns.length === 0) {
    return {
      columnEnd: -1,
      columnStart: 0,
      rowEnd: -1,
      rowStart: 0,
    };
  }
  const bodyHeight = Math.max(0, options.viewport.heightCssPx - GRID_HEADER_HEIGHT_CSS_PX);
  const rowStart = Math.floor(options.viewport.logicalScrollTopCssPx / options.rowHeightCssPx);
  const rowEnd = Math.max(
    rowStart,
    Math.ceil((options.viewport.logicalScrollTopCssPx + bodyHeight) / options.rowHeightCssPx) - 1,
  );
  const columnStart = options.columnAxis.findColumnAt(options.viewport.logicalScrollLeftCssPx);
  const columnEnd = options.columnAxis.findColumnAt(
    options.viewport.logicalScrollLeftCssPx + Math.max(0, options.viewport.widthCssPx - GRID_ROW_HEADER_WIDTH_CSS_PX),
  );
  return {
    columnEnd: Math.min(options.columnAxis.columns.length - 1, columnEnd + options.columnOverscan),
    columnStart: Math.max(0, columnStart - options.columnOverscan),
    rowEnd: Math.min(options.rowCount - 1, rowEnd + options.rowOverscan),
    rowStart: Math.max(0, rowStart - options.rowOverscan),
  };
};
export const countCellsInRange = (range: GridVisibleRange): number => {
  if (range.rowEnd < range.rowStart || range.columnEnd < range.columnStart) {
    return 0;
  }
  return (range.rowEnd - range.rowStart + 1) * (range.columnEnd - range.columnStart + 1);
};
