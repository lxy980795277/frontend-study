import type { GridColumnAxis } from './column-axis';
import { GRID_HEADER_HEIGHT_CSS_PX, GRID_ROW_HEADER_WIDTH_CSS_PX } from './constants';
import { jumpToLogicalScroll } from './scroll-model';
import type { GridViewport } from '../types/grid';
import type { GridLogicalScrollSetter, GridScrollState } from '../types/scroll';

export const ensureCellVisible = (
  viewRowIndex: number,
  columnIndex: number,
  host: HTMLDivElement | null,
  scrollStateRef: {
    current: GridScrollState;
  },
  columnAxis: GridColumnAxis,
  rowHeightCssPx: number,
  viewport: GridViewport,
  setLogicalScroll: GridLogicalScrollSetter,
): void => {
  if (!host) {
    return;
  }

  const rowTop = viewRowIndex * rowHeightCssPx;
  const rowBottom = rowTop + rowHeightCssPx;
  const bodyHeight = viewport.heightCssPx - GRID_HEADER_HEIGHT_CSS_PX;
  let targetLogicalTop = viewport.logicalScrollTopCssPx;
  if (rowTop < targetLogicalTop) {
    targetLogicalTop = rowTop;
  } else if (rowBottom > targetLogicalTop + bodyHeight) {
    targetLogicalTop = rowBottom - bodyHeight;
  }
  if (targetLogicalTop !== viewport.logicalScrollTopCssPx) {
    const update = jumpToLogicalScroll(scrollStateRef.current, targetLogicalTop);
    scrollStateRef.current = update.state;
    host.scrollTop = update.state.physicalScrollCssPx;
    setLogicalScroll((current) => {
      return {
        leftCssPx: current.leftCssPx,
        topCssPx: update.state.logicalScrollCssPx,
      };
    });
  }

  const columnLeft = columnAxis.getOffsetCssPx(columnIndex);
  const columnRight = columnLeft + columnAxis.getWidthCssPx(columnIndex);
  const bodyWidth = viewport.widthCssPx - GRID_ROW_HEADER_WIDTH_CSS_PX;
  let targetLeft = viewport.logicalScrollLeftCssPx;
  if (columnLeft < targetLeft) {
    targetLeft = columnLeft;
  } else if (columnRight > targetLeft + bodyWidth) {
    targetLeft = columnRight - bodyWidth;
  }
  if (targetLeft !== viewport.logicalScrollLeftCssPx) {
    host.scrollLeft = targetLeft;
    setLogicalScroll((current) => {
      return {
        leftCssPx: targetLeft,
        topCssPx: current.topCssPx,
      };
    });
  }
};

export const createFrameId = (
  viewport: GridViewport,
  queryVersion: number,
  activeViewRowIndex: number | null,
  activeColumnIndex: number | null,
  totalWidthCssPx: number,
  requestId = 0,
): number => {
  const values = [
    Math.round(viewport.logicalScrollTopCssPx),
    Math.round(viewport.logicalScrollLeftCssPx),
    Math.round(viewport.widthCssPx),
    Math.round(viewport.heightCssPx),
    Math.round(viewport.devicePixelRatio * 100),
    queryVersion,
    activeViewRowIndex ?? -1,
    activeColumnIndex ?? -1,
    Math.round(totalWidthCssPx),
    requestId,
  ];
  let hash = 2166136261;
  values.forEach((value) => {
    hash ^= value;
    hash = Math.imul(hash, 16777619);
  });
  return hash >>> 0;
};
