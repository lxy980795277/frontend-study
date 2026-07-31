import type { FC } from 'react';

import type { GridColumnAxis } from '@/labs/large-data-grid/core/column-axis';
import { GRID_HEADER_HEIGHT_CSS_PX, GRID_ROW_HEADER_WIDTH_CSS_PX } from '@/labs/large-data-grid/core/constants';
import { type GridSelectionBounds, type GridViewport, type GridVisibleRange } from '@/labs/large-data-grid/types/grid';
interface GridSelectionOverlayProps {
  activeColumnIndex: number | null;
  activeText: string | null;
  activeViewRowIndex: number | null;
  bounds: GridSelectionBounds | null;
  columnAxis: GridColumnAxis;
  range: GridVisibleRange;
  rowHeightCssPx: number;
  viewport: GridViewport;
}
export const GridSelectionOverlay: FC<GridSelectionOverlayProps> = ({
  activeColumnIndex,
  activeText,
  activeViewRowIndex,
  bounds,
  columnAxis,
  range,
  rowHeightCssPx,
  viewport,
}) => {
  if (!bounds && (activeColumnIndex === null || activeText === null || activeViewRowIndex === null)) {
    return null;
  }
  const selectionRectangle = bounds ? getSelectionRectangle(bounds, columnAxis, range, rowHeightCssPx, viewport) : null;
  const activeRectangle =
    activeColumnIndex !== null &&
    activeViewRowIndex !== null &&
    activeColumnIndex >= range.columnStart &&
    activeColumnIndex <= range.columnEnd &&
    activeViewRowIndex >= range.rowStart &&
    activeViewRowIndex <= range.rowEnd
      ? {
          height: rowHeightCssPx,
          width: columnAxis.getWidthCssPx(activeColumnIndex),
          x:
            GRID_ROW_HEADER_WIDTH_CSS_PX +
            columnAxis.getOffsetCssPx(activeColumnIndex) -
            viewport.logicalScrollLeftCssPx,
          y: GRID_HEADER_HEIGHT_CSS_PX + activeViewRowIndex * rowHeightCssPx - viewport.logicalScrollTopCssPx,
        }
      : null;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 block overflow-hidden"
      data-testid="large-data-grid-selection-overlay"
      height={viewport.heightCssPx}
      width={viewport.widthCssPx}
    >
      {selectionRectangle ? (
        <rect
          className="fill-primary/10 stroke-primary"
          height={selectionRectangle.height}
          vectorEffect="non-scaling-stroke"
          width={selectionRectangle.width}
          x={selectionRectangle.x}
          y={selectionRectangle.y}
        />
      ) : null}
      {activeRectangle && activeText ? (
        <foreignObject
          className="pointer-events-auto"
          height={activeRectangle.height}
          width={activeRectangle.width}
          x={activeRectangle.x}
          y={activeRectangle.y}
        >
          <div className="size-full" data-testid="large-data-grid-active-overlay" title={activeText} />
        </foreignObject>
      ) : null}
    </svg>
  );
};
const getSelectionRectangle = (
  bounds: GridSelectionBounds,
  columnAxis: GridColumnAxis,
  range: GridVisibleRange,
  rowHeightCssPx: number,
  viewport: GridViewport,
): {
  height: number;
  width: number;
  x: number;
  y: number;
} | null => {
  const rowStart = Math.max(bounds.rowStart, range.rowStart);
  const rowEnd = Math.min(bounds.rowEnd, range.rowEnd);
  const columnStart = Math.max(bounds.columnStart, range.columnStart);
  const columnEnd = Math.min(bounds.columnEnd, range.columnEnd);
  if (rowStart > rowEnd || columnStart > columnEnd) {
    return null;
  }
  return {
    height: (rowEnd - rowStart + 1) * rowHeightCssPx,
    width: columnAxis.getOffsetCssPx(columnEnd + 1) - columnAxis.getOffsetCssPx(columnStart),
    x: GRID_ROW_HEADER_WIDTH_CSS_PX + columnAxis.getOffsetCssPx(columnStart) - viewport.logicalScrollLeftCssPx,
    y: GRID_HEADER_HEIGHT_CSS_PX + rowStart * rowHeightCssPx - viewport.logicalScrollTopCssPx,
  };
};
