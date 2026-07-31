'use client';

import type { FC, PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useState } from 'react';
import type { GridColumnAxis } from '@/labs/large-data-grid/core/column-axis';
import { GRID_HEADER_HEIGHT_CSS_PX, GRID_ROW_HEADER_WIDTH_CSS_PX } from '@/labs/large-data-grid/core/constants';
import { type DragState, type GridViewport, type GridVisibleRange } from '@/labs/large-data-grid/types/grid';
interface GridColumnResizeOverlayProps {
  columnAxis: GridColumnAxis;
  onResize: (columnId: string, widthCssPx: number) => void;
  range: GridVisibleRange;
  viewport: GridViewport;
}
export const GridColumnResizeOverlay: FC<GridColumnResizeOverlayProps> = ({
  columnAxis,
  onResize,
  range,
  viewport,
}) => {
  const [drag, setDrag] = useState<DragState | null>(null);
  useEffect(() => {
    if (!drag) {
      return;
    }
    const handlePointerMove = (event: PointerEvent): void => {
      const width = Math.min(
        drag.maximum,
        Math.max(drag.minimum, drag.startWidth + event.clientX - drag.startPointerX),
      );
      onResize(drag.columnId, width);
    };
    const handlePointerUp = (): void => {
      setDrag(null);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, {
      once: true,
    });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [drag, onResize]);
  const startResize = (columnIndex: number, event: ReactPointerEvent<HTMLButtonElement>): void => {
    const column = columnAxis.columns[columnIndex];
    if (!column) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setDrag({
      columnId: column.id,
      maximum: column.maxWidthCssPx,
      minimum: column.minWidthCssPx,
      startPointerX: event.clientX,
      startWidth: columnAxis.getWidthCssPx(columnIndex),
    });
  };
  const handleCount = Math.max(0, range.columnEnd - range.columnStart + 1);
  const handles = Array.from({ length: handleCount }, (_, offset) => {
    const columnIndex = range.columnStart + offset;
    const column = columnAxis.columns[columnIndex];
    if (!column) {
      return null;
    }
    const x =
      GRID_ROW_HEADER_WIDTH_CSS_PX +
      columnAxis.getOffsetCssPx(columnIndex) +
      columnAxis.getWidthCssPx(columnIndex) -
      viewport.logicalScrollLeftCssPx -
      5;
    return (
      <foreignObject key={column.id} height={GRID_HEADER_HEIGHT_CSS_PX} width={10} x={x} y={0}>
        <button
          aria-label={`调整 ${column.label} 列宽`}
          className="pointer-events-auto h-full w-full cursor-col-resize touch-none bg-transparent outline-none hover:bg-primary/20 focus-visible:bg-primary/25"
          type="button"
          onPointerDown={(event) => {
            startResize(columnIndex, event);
          }}
        />
      </foreignObject>
    );
  });
  return (
    <svg
      aria-hidden={false}
      className="pointer-events-none absolute inset-0 z-20 block overflow-hidden"
      height={viewport.heightCssPx}
      width={viewport.widthCssPx}
    >
      {handles}
    </svg>
  );
};
