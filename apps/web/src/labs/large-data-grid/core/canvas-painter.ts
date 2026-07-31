import { createTextDigest } from './consistency';
import { sourceIndexAt } from './data-source';
import type { GridFrameMetrics } from '../types/grid';
import type { GridCanvasContext, PaintBodyOptions, PaintGridFrameOptions } from '../types/renderer';
import { GRID_HEADER_HEIGHT_CSS_PX, GRID_ROW_HEADER_WIDTH_CSS_PX } from './constants';

export const paintGridFrame = (options: PaintGridFrameOptions): GridFrameMetrics => {
  const startedAt = performance.now();
  const { columnAxis, context, dataSource, snapshot, theme } = options;
  const { viewport, visibleRange } = snapshot;
  const dpr = Math.max(1, viewport.devicePixelRatio);
  const visibleTexts: string[] = [];
  let drawnCellCount = 0;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, viewport.widthCssPx, viewport.heightCssPx);
  context.fillStyle = theme.background;
  context.fillRect(0, 0, viewport.widthCssPx, viewport.heightCssPx);
  context.font = '12px sans-serif';
  context.textBaseline = 'middle';
  paintBody({
    columnAxis,
    context,
    dataSource,
    onText: (text) => {
      drawnCellCount += 1;
      if (visibleTexts.length < 8) {
        visibleTexts.push(text);
      }
    },
    snapshot,
    theme,
  });
  paintHeaders(options);
  return {
    drawnCellCount,
    drawMs: performance.now() - startedAt,
    frameId: snapshot.frameId,
    range: visibleRange,
    visibleTextDigest: createTextDigest(visibleTexts),
  };
};
const paintBody = (options: PaintBodyOptions): void => {
  const { columnAxis, context, dataSource, snapshot, theme } = options;
  const { viewport, visibleRange } = snapshot;
  const rowHeight = snapshot.rowHeightCssPx;
  context.save();
  context.beginPath();
  context.rect(
    GRID_ROW_HEADER_WIDTH_CSS_PX,
    GRID_HEADER_HEIGHT_CSS_PX,
    Math.max(0, viewport.widthCssPx - GRID_ROW_HEADER_WIDTH_CSS_PX),
    Math.max(0, viewport.heightCssPx - GRID_HEADER_HEIGHT_CSS_PX),
  );
  context.clip();
  for (let viewRow = visibleRange.rowStart; viewRow <= visibleRange.rowEnd; viewRow += 1) {
    const sourceRow = sourceIndexAt(snapshot.projection, viewRow);
    if (sourceRow < 0) {
      continue;
    }
    const y = GRID_HEADER_HEIGHT_CSS_PX + viewRow * rowHeight - viewport.logicalScrollTopCssPx;
    const isActiveRow = snapshot.activeViewRowIndex === viewRow;
    if (isActiveRow) {
      context.fillStyle = theme.selection;
      context.fillRect(GRID_ROW_HEADER_WIDTH_CSS_PX, y, viewport.widthCssPx - GRID_ROW_HEADER_WIDTH_CSS_PX, rowHeight);
    }
    for (let columnIndex = visibleRange.columnStart; columnIndex <= visibleRange.columnEnd; columnIndex += 1) {
      const x = GRID_ROW_HEADER_WIDTH_CSS_PX + columnAxis.getOffsetCssPx(columnIndex) - viewport.logicalScrollLeftCssPx;
      const width = columnAxis.getWidthCssPx(columnIndex);
      const text = dataSource.getCellText(sourceRow, columnIndex);
      context.fillStyle = theme.foreground;
      context.fillText(truncateCanvasText(context, text, width - 16), x + 8, y + rowHeight / 2);
      context.strokeStyle = theme.border;
      context.strokeRect(x, y, width, rowHeight);
      if (isActiveRow && snapshot.activeColumnIndex === columnIndex) {
        context.strokeStyle = theme.primary;
        context.lineWidth = 2;
        context.strokeRect(x + 1, y + 1, Math.max(0, width - 2), Math.max(0, rowHeight - 2));
        context.lineWidth = 1;
      }
      options.onText(text);
    }
  }
  context.restore();
  paintRowHeaders(options, rowHeight);
};
const paintRowHeaders = (options: PaintBodyOptions, rowHeight: number): void => {
  const { context, snapshot, theme } = options;
  const { viewport, visibleRange } = snapshot;
  context.save();
  context.beginPath();
  context.rect(0, GRID_HEADER_HEIGHT_CSS_PX, GRID_ROW_HEADER_WIDTH_CSS_PX, viewport.heightCssPx);
  context.clip();
  context.fillStyle = theme.muted;
  context.fillRect(
    0,
    GRID_HEADER_HEIGHT_CSS_PX,
    GRID_ROW_HEADER_WIDTH_CSS_PX,
    viewport.heightCssPx - GRID_HEADER_HEIGHT_CSS_PX,
  );
  for (let viewRow = visibleRange.rowStart; viewRow <= visibleRange.rowEnd; viewRow += 1) {
    const y = GRID_HEADER_HEIGHT_CSS_PX + viewRow * rowHeight - viewport.logicalScrollTopCssPx;
    context.fillStyle = theme.mutedForeground;
    context.textAlign = 'right';
    context.fillText(String(viewRow + 1), GRID_ROW_HEADER_WIDTH_CSS_PX - 8, y + rowHeight / 2);
    context.strokeStyle = theme.border;
    context.strokeRect(0, y, GRID_ROW_HEADER_WIDTH_CSS_PX, rowHeight);
  }
  context.textAlign = 'left';
  context.restore();
};
const paintHeaders = (options: PaintGridFrameOptions): void => {
  const { columnAxis, context, dataSource, snapshot, theme } = options;
  const { viewport, visibleRange } = snapshot;
  context.fillStyle = theme.muted;
  context.fillRect(0, 0, viewport.widthCssPx, GRID_HEADER_HEIGHT_CSS_PX);
  context.strokeStyle = theme.border;
  context.strokeRect(0, 0, GRID_ROW_HEADER_WIDTH_CSS_PX, GRID_HEADER_HEIGHT_CSS_PX);
  context.fillStyle = theme.mutedForeground;
  context.fillText('#', 12, GRID_HEADER_HEIGHT_CSS_PX / 2);
  context.save();
  context.beginPath();
  context.rect(
    GRID_ROW_HEADER_WIDTH_CSS_PX,
    0,
    viewport.widthCssPx - GRID_ROW_HEADER_WIDTH_CSS_PX,
    GRID_HEADER_HEIGHT_CSS_PX,
  );
  context.clip();
  for (let columnIndex = visibleRange.columnStart; columnIndex <= visibleRange.columnEnd; columnIndex += 1) {
    const column = dataSource.columns[columnIndex]!;
    const x = GRID_ROW_HEADER_WIDTH_CSS_PX + columnAxis.getOffsetCssPx(columnIndex) - viewport.logicalScrollLeftCssPx;
    const width = columnAxis.getWidthCssPx(columnIndex);
    context.fillStyle = theme.muted;
    context.fillRect(x, 0, width, GRID_HEADER_HEIGHT_CSS_PX);
    context.fillStyle = theme.foreground;
    context.fillText(truncateCanvasText(context, column.label, width - 16), x + 8, GRID_HEADER_HEIGHT_CSS_PX / 2);
    context.strokeStyle = theme.border;
    context.strokeRect(x, 0, width, GRID_HEADER_HEIGHT_CSS_PX);
  }
  context.restore();
};
const truncateCanvasText = (context: GridCanvasContext, value: string, maximumWidth: number): string => {
  if (maximumWidth <= 0 || context.measureText(value).width <= maximumWidth) {
    return value;
  }
  let low = 0;
  let high = value.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (context.measureText(`${value.slice(0, middle)}…`).width <= maximumWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return `${value.slice(0, low)}…`;
};
