'use client';

import type { FC } from 'react';
import { useLayoutEffect, useMemo } from 'react';

import type { GridColumnAxis } from '@/labs/large-data-grid/core/column-axis';
import { GRID_HEADER_HEIGHT_CSS_PX, GRID_ROW_HEADER_WIDTH_CSS_PX } from '@/labs/large-data-grid/core/constants';
import { createTextDigest } from '@/labs/large-data-grid/core/consistency';
import { sourceIndexAt } from '@/labs/large-data-grid/core/data-source';
import type { DomFrame, GridDataSource } from '@/labs/large-data-grid/types/data';
import type { GridFrameMetrics } from '@/labs/large-data-grid/types/grid';
import type { GridFrameSnapshot } from '@/labs/large-data-grid/types/renderer';
import { cn } from '@/utils/cn';

interface DomVirtualGridProps {
  columnAxis: GridColumnAxis;
  dataSource: GridDataSource;
  onFrameDrawn: (metrics: GridFrameMetrics) => void;
  snapshot: GridFrameSnapshot;
}

export const DomVirtualGrid: FC<DomVirtualGridProps> = ({ columnAxis, dataSource, onFrameDrawn, snapshot }) => {
  const frame = useMemo(() => {
    return createDomFrame(columnAxis, dataSource, snapshot);
  }, [columnAxis, dataSource, snapshot]);

  useLayoutEffect(() => {
    // React Commit 后再跨一个展示帧上报，避免把“生成虚拟节点”误记成“浏览器已经呈现”。
    const frameId = window.requestAnimationFrame(() => {
      onFrameDrawn({
        drawnCellCount: frame.cellCount,
        drawMs: 0,
        frameId: snapshot.frameId,
        range: snapshot.visibleRange,
        visibleTextDigest: createTextDigest(frame.visibleTextSample),
      });
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [frame, onFrameDrawn, snapshot.frameId, snapshot.visibleRange]);

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden bg-background"
      data-testid="dom-virtual-grid"
      style={{ contain: 'strict' }}
    >
      {frame.rows.map((row) => {
        return (
          <div
            key={row.key}
            className="absolute top-0 left-0 w-full"
            data-grid-row={row.viewRowIndex}
            style={{
              height: snapshot.rowHeightCssPx,
              transform: `translate3d(0, ${String(row.y)}px, 0)`,
            }}
          >
            <div
              className="absolute top-0 left-0 z-10 flex h-full items-center justify-end border-r border-b bg-muted px-2 font-mono text-[11px] text-muted-foreground"
              data-grid-row-header={row.viewRowIndex}
              style={{ width: GRID_ROW_HEADER_WIDTH_CSS_PX }}
            >
              {row.label}
            </div>

            {row.cells.map((cell) => {
              const isActive =
                snapshot.activeViewRowIndex === row.viewRowIndex && snapshot.activeColumnIndex === cell.columnIndex;
              return (
                <div
                  key={cell.key}
                  data-grid-cell={cell.key}
                  title={cell.text}
                  className={cn(
                    'absolute top-0 flex h-full items-center overflow-hidden border-r border-b bg-background px-2 text-xs text-ellipsis whitespace-nowrap text-foreground',
                    isActive && 'bg-accent text-accent-foreground ring-2 ring-primary ring-inset',
                  )}
                  style={{
                    transform: `translate3d(${String(cell.x)}px, 0, 0)`,
                    width: cell.width,
                  }}
                >
                  <span className="block min-w-0 overflow-hidden text-ellipsis">{cell.text}</span>
                </div>
              );
            })}
          </div>
        );
      })}

      <div
        className="absolute top-0 left-0 z-20 w-full border-b bg-muted"
        style={{ height: GRID_HEADER_HEIGHT_CSS_PX }}
      >
        {frame.columnHeaders.map((header) => {
          return (
            <div
              key={header.key}
              className="absolute top-0 flex h-full items-center overflow-hidden border-r bg-muted px-2 text-xs font-medium whitespace-nowrap text-foreground"
              data-grid-column-header={header.columnIndex}
              style={{
                transform: `translate3d(${String(header.x)}px, 0, 0)`,
                width: header.width,
              }}
            >
              <span className="block min-w-0 overflow-hidden text-ellipsis">{header.label}</span>
            </div>
          );
        })}

        <div
          className="absolute top-0 left-0 z-10 flex h-full items-center border-r bg-muted px-3 text-xs font-medium text-muted-foreground"
          style={{ width: GRID_ROW_HEADER_WIDTH_CSS_PX }}
        >
          #
        </div>
      </div>
    </div>
  );
};

const createDomFrame = (
  columnAxis: GridColumnAxis,
  dataSource: GridDataSource,
  snapshot: GridFrameSnapshot,
): DomFrame => {
  const columnHeaders: DomFrame['columnHeaders'] = [];
  const rows: DomFrame['rows'] = [];
  const visibleTextSample: string[] = [];
  const { visibleRange, viewport } = snapshot;

  // Core 已将二维范围约束到数据边界；Renderer 只投影窗口，不重复增加字段与索引兜底。
  for (let columnIndex = visibleRange.columnStart; columnIndex <= visibleRange.columnEnd; columnIndex += 1) {
    const column = dataSource.columns[columnIndex]!;
    columnHeaders.push({
      columnIndex,
      key: column.id,
      label: column.label,
      width: columnAxis.getWidthCssPx(columnIndex),
      x: GRID_ROW_HEADER_WIDTH_CSS_PX + columnAxis.getOffsetCssPx(columnIndex) - viewport.logicalScrollLeftCssPx,
    });
  }

  let cellCount = 0;
  for (let viewRowIndex = visibleRange.rowStart; viewRowIndex <= visibleRange.rowEnd; viewRowIndex += 1) {
    const sourceRowIndex = sourceIndexAt(snapshot.projection, viewRowIndex);
    const rowId = dataSource.getRowId(sourceRowIndex);
    const cells = columnHeaders.map((header) => {
      const text = dataSource.getCellText(sourceRowIndex, header.columnIndex);
      if (visibleTextSample.length < 8) {
        visibleTextSample.push(text);
      }
      return {
        columnIndex: header.columnIndex,
        key: `${rowId}:${header.key}`,
        text,
        width: header.width,
        x: header.x,
      };
    });
    cellCount += cells.length;
    rows.push({
      cells,
      key: rowId,
      label: String(viewRowIndex + 1),
      viewRowIndex,
      y: GRID_HEADER_HEIGHT_CSS_PX + viewRowIndex * snapshot.rowHeightCssPx - viewport.logicalScrollTopCssPx,
    });
  }

  return {
    cellCount,
    columnHeaders,
    rows,
    visibleTextSample,
  };
};
