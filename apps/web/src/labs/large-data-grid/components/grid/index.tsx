'use client';

import type { FC, KeyboardEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { probeSafeScrollExtentCssPx } from '@/labs/large-data-grid/browser/scroll-dimension-probe';
import type { GridColumnAxis } from '@/labs/large-data-grid/core/column-axis';
import { GRID_HEADER_HEIGHT_CSS_PX, GRID_ROW_HEADER_WIDTH_CSS_PX } from '@/labs/large-data-grid/core/constants';
import { sourceIndexAt, viewRowCount } from '@/labs/large-data-grid/core/data-source';
import { createFrameId, ensureCellVisible } from '@/labs/large-data-grid/core/viewport-navigation';
import type { GridDataSource } from '@/labs/large-data-grid/types/data';
import {
  type GridCellRef,
  type GridFrameMetrics,
  type GridQuery,
  type GridQueryProgress,
  type GridQueryResult,
  type GridRendererKind,
  type GridScenario,
  type GridSelection,
  type GridViewport as GridViewportModel,
  type GridJumpRequest,
} from '@/labs/large-data-grid/types/grid';
import type { GridFrameSnapshot } from '@/labs/large-data-grid/types/renderer';
import {
  DEFAULT_SAFE_SCROLL_EXTENT_CSS_PX,
  createGridScrollState,
  jumpToLogicalScroll,
  updatePhysicalScroll,
} from '@/labs/large-data-grid/core/scroll-model';
import type { GridScrollState } from '@/labs/large-data-grid/types/scroll';
import {
  createGridCellRef,
  createViewRowLookup,
  findViewRowById,
  normalizeSelectionBounds,
  serializeSelectionToTsv,
} from '@/labs/large-data-grid/core/selection';
import { calculateVisibleRange } from '@/labs/large-data-grid/core/viewport-range';
import { GridRendererLayer } from '@/labs/large-data-grid/components/grid/renderers';
import { GRID_ACTIVE_CELL_ID, GridAccessibilityLayer } from '@/labs/large-data-grid/components/grid/overlays/a11y';
import { GridColumnResizeOverlay } from '@/labs/large-data-grid/components/grid/overlays/resize';
import { GridSelectionOverlay } from '@/labs/large-data-grid/components/grid/overlays/selection';
const GRID_VIEWPORT_HEIGHT_CSS_PX = 560;
const COPY_LIMITS = {
  maximumBytes: 2000000,
  maximumCells: 50000,
} as const;
interface GridViewportProps {
  activeCell: GridCellRef | null;
  columnAxis: GridColumnAxis;
  columnOverscan: number;
  copyRequestId: number;
  dataSource: GridDataSource;
  faultRequestId: number;
  jumpRequest: GridJumpRequest | null;
  onActiveCellChange: (cell: GridCellRef) => void;
  onColumnResize: (columnId: string, widthCssPx: number) => void;
  onFeedback: (message: string) => void;
  onFrameDrawn: (metrics: GridFrameMetrics) => void;
  onQueryProgress: (progress: GridQueryProgress, queryVersion: number) => void;
  onQueryResult: (result: GridQueryResult) => void;
  onRuntimeError: (reason: string) => void;
  onRuntimeFallback: (reason: string) => void;
  onRuntimeReady: (effectiveRenderer: GridRendererKind) => void;
  onSelectionChange: (selection: GridSelection | null) => void;
  projection: Uint32Array | null;
  query: GridQuery;
  queryVersion: number;
  renderer: GridRendererKind;
  rowOverscan: number;
  runtimeGeneration: number;
  scenario: GridScenario;
  selectAllRequestId: number;
  selection: GridSelection | null;
  widthOverrides: Readonly<Record<string, number>>;
}
export const GridViewport: FC<GridViewportProps> = ({
  activeCell,
  columnAxis,
  columnOverscan,
  copyRequestId,
  dataSource,
  faultRequestId,
  jumpRequest,
  onActiveCellChange,
  onColumnResize,
  onFeedback,
  onFrameDrawn,
  onQueryProgress,
  onQueryResult,
  onRuntimeError,
  onRuntimeFallback,
  onRuntimeReady,
  onSelectionChange,
  projection,
  query,
  queryVersion,
  renderer,
  rowOverscan,
  runtimeGeneration,
  scenario,
  selectAllRequestId,
  selection,
  widthOverrides,
}) => {
  const scrollHostRef = useRef<HTMLDivElement | null>(null);

  // 视口只保存逻辑坐标；DOM scrollTop 只是跨浏览器安全的输入载体。
  const scrollStateRef = useRef<GridScrollState>(
    createGridScrollState(scenario.rowCount * scenario.rowHeightCssPx, GRID_VIEWPORT_HEIGHT_CSS_PX),
  );
  const handledJumpRef = useRef(0);
  const handledCopyRef = useRef(copyRequestId);
  const handledSelectAllRef = useRef(selectAllRequestId);
  const [viewportSize, setViewportSize] = useState({
    heightCssPx: GRID_VIEWPORT_HEIGHT_CSS_PX,
    widthCssPx: 960,
  });
  const [logicalScroll, setLogicalScroll] = useState({
    leftCssPx: 0,
    topCssPx: 0,
  });
  const [physicalExtentCssPx, setPhysicalExtentCssPx] = useState(
    Math.min(scenario.rowCount * scenario.rowHeightCssPx, DEFAULT_SAFE_SCROLL_EXTENT_CSS_PX),
  );
  const currentViewRowCount = viewRowCount(dataSource, projection);
  useEffect(() => {
    if (renderer === 'dom') {
      onRuntimeReady('dom');
    }
  }, [onRuntimeReady, renderer]);
  useEffect(() => {
    const host = scrollHostRef.current;
    if (!host) {
      return;
    }
    const updateSize = (): void => {
      setViewportSize({
        heightCssPx: host.clientHeight || GRID_VIEWPORT_HEIGHT_CSS_PX,
        widthCssPx: host.clientWidth || 960,
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(host);
    return () => {
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    const host = scrollHostRef.current;
    const nextState = createGridScrollState(
      Math.max(1, currentViewRowCount) * scenario.rowHeightCssPx,
      viewportSize.heightCssPx,
      probeSafeScrollExtentCssPx(),
    );
    scrollStateRef.current = nextState;
    if (host) {
      host.scrollTop = 0;
    }
    const resetTimer = window.setTimeout(() => {
      setPhysicalExtentCssPx(nextState.physicalExtentCssPx);
      setLogicalScroll((current) => {
        return {
          leftCssPx: current.leftCssPx,
          topCssPx: 0,
        };
      });
    }, 0);
    return () => {
      window.clearTimeout(resetTimer);
    };
  }, [currentViewRowCount, scenario.rowHeightCssPx, viewportSize.heightCssPx]);
  const viewport: GridViewportModel = useMemo(() => {
    return {
      devicePixelRatio: typeof window === 'undefined' ? 1 : Math.max(1, window.devicePixelRatio),
      heightCssPx: viewportSize.heightCssPx,
      logicalScrollLeftCssPx: logicalScroll.leftCssPx,
      logicalScrollTopCssPx: logicalScroll.topCssPx,
      widthCssPx: viewportSize.widthCssPx,
    };
  }, [logicalScroll.leftCssPx, logicalScroll.topCssPx, viewportSize.heightCssPx, viewportSize.widthCssPx]);
  const visibleRange = useMemo(() => {
    return calculateVisibleRange({
      columnAxis,
      columnOverscan,
      rowCount: currentViewRowCount,
      rowHeightCssPx: scenario.rowHeightCssPx,
      rowOverscan,
      viewport,
    });
  }, [columnAxis, columnOverscan, currentViewRowCount, rowOverscan, scenario.rowHeightCssPx, viewport]);
  const viewRowLookup = useMemo(() => {
    return createViewRowLookup(dataSource.rowCount, projection);
  }, [dataSource.rowCount, projection]);
  const activeViewRowIndex = useMemo(() => {
    if (!activeCell) {
      return null;
    }
    const rowIndex = findViewRowById(activeCell.rowId, dataSource, projection, viewRowLookup);
    return rowIndex < 0 ? null : rowIndex;
  }, [activeCell, dataSource, projection, viewRowLookup]);
  const activeColumnIndex = useMemo(() => {
    if (!activeCell) {
      return null;
    }
    const columnIndex = dataSource.columns.findIndex((column) => {
      return column.id === activeCell.columnId;
    });
    return columnIndex < 0 ? null : columnIndex;
  }, [activeCell, dataSource.columns]);
  const activeText = useMemo(() => {
    if (activeViewRowIndex === null || activeColumnIndex === null) {
      return null;
    }
    const sourceRow = sourceIndexAt(projection, activeViewRowIndex);
    return dataSource.getCellText(sourceRow, activeColumnIndex);
  }, [activeColumnIndex, activeViewRowIndex, dataSource, projection]);
  const selectionBounds = useMemo(() => {
    if (!selection) {
      return null;
    }
    return normalizeSelectionBounds(selection, dataSource, projection, viewRowLookup);
  }, [dataSource, projection, selection, viewRowLookup]);
  const snapshot = useMemo<GridFrameSnapshot>(() => {
    return {
      activeColumnIndex,
      activeViewRowIndex,
      frameId: createFrameId(
        viewport,
        queryVersion,
        activeViewRowIndex,
        activeColumnIndex,
        columnAxis.totalWidthCssPx(),
        jumpRequest?.id,
      ),
      projection,
      queryVersion,
      rowHeightCssPx: scenario.rowHeightCssPx,
      selectionBounds,
      viewport,
      visibleRange,
    };
  }, [
    activeColumnIndex,
    activeViewRowIndex,
    columnAxis.totalWidthCssPx,
    jumpRequest?.id,
    projection,
    queryVersion,
    scenario.rowHeightCssPx,
    selectionBounds,
    viewport,
    visibleRange,
  ]);
  const jumpToViewRow = useCallback(
    (viewRowIndex: number) => {
      const host = scrollHostRef.current;
      if (!host || currentViewRowCount === 0) {
        return;
      }
      const clampedRow = Math.min(currentViewRowCount - 1, Math.max(0, viewRowIndex));
      const update = jumpToLogicalScroll(scrollStateRef.current, clampedRow * scenario.rowHeightCssPx);
      scrollStateRef.current = update.state;
      host.scrollTop = update.state.physicalScrollCssPx;
      setLogicalScroll((current) => {
        return {
          leftCssPx: current.leftCssPx,
          topCssPx: update.state.logicalScrollCssPx,
        };
      });
    },
    [currentViewRowCount, scenario.rowHeightCssPx],
  );
  useEffect(() => {
    if (!jumpRequest || jumpRequest.id === handledJumpRef.current) {
      return;
    }
    handledJumpRef.current = jumpRequest.id;
    jumpToViewRow(jumpRequest.viewRowIndex);
  }, [jumpRequest, jumpToViewRow]);
  const updateActivePosition = useCallback(
    (viewRowIndex: number, columnIndex: number, extendSelection: boolean) => {
      if (currentViewRowCount === 0) {
        return;
      }
      const targetRow = Math.min(currentViewRowCount - 1, Math.max(0, viewRowIndex));
      const targetColumn = Math.min(dataSource.columns.length - 1, Math.max(0, columnIndex));
      const sourceRow = sourceIndexAt(projection, targetRow);
      const nextCell = createGridCellRef(dataSource, sourceRow, targetColumn);
      onActiveCellChange(nextCell);
      if (extendSelection && selection) {
        onSelectionChange({
          anchor: selection.anchor,
          focus: nextCell,
          queryVersion,
        });
      } else {
        onSelectionChange({
          anchor: nextCell,
          focus: nextCell,
          queryVersion,
        });
      }
      ensureCellVisible(
        targetRow,
        targetColumn,
        scrollHostRef.current,
        scrollStateRef,
        columnAxis,
        scenario.rowHeightCssPx,
        viewport,
        setLogicalScroll,
      );
    },
    [
      columnAxis,
      currentViewRowCount,
      dataSource,
      onActiveCellChange,
      onSelectionChange,
      projection,
      queryVersion,
      scenario.rowHeightCssPx,
      selection,
      viewport,
    ],
  );
  const selectAll = useCallback(() => {
    if (currentViewRowCount === 0 || dataSource.columns.length === 0) {
      return;
    }
    const firstCell = createGridCellRef(dataSource, sourceIndexAt(projection, 0), 0);
    const lastCell = createGridCellRef(
      dataSource,
      sourceIndexAt(projection, currentViewRowCount - 1),
      dataSource.columns.length - 1,
    );
    onActiveCellChange(firstCell);
    onSelectionChange({
      anchor: firstCell,
      focus: lastCell,
      queryVersion,
    });
    onFeedback('已选择全部逻辑单元格；复制仍受安全上限保护。');
  }, [currentViewRowCount, dataSource, onActiveCellChange, onFeedback, onSelectionChange, projection, queryVersion]);
  const copySelection = useCallback(async () => {
    let bounds = selectionBounds;
    if (!bounds && activeViewRowIndex !== null && activeColumnIndex !== null) {
      bounds = {
        columnEnd: activeColumnIndex,
        columnStart: activeColumnIndex,
        rowEnd: activeViewRowIndex,
        rowStart: activeViewRowIndex,
      };
    }
    if (!bounds) {
      onFeedback('请先选择要复制的单元格。');
      return;
    }
    const result = serializeSelectionToTsv(bounds, dataSource, projection, COPY_LIMITS);
    if (result.kind === 'too-large') {
      onFeedback(result.reason);
      return;
    }
    try {
      await navigator.clipboard.writeText(result.text);
      onFeedback(`已复制 ${String(result.cellCount)} 个单元格为 TSV。`);
    } catch {
      onFeedback('剪贴板写入失败，请检查浏览器权限后重试。');
    }
  }, [activeColumnIndex, activeViewRowIndex, dataSource, onFeedback, projection, selectionBounds]);
  useEffect(() => {
    if (selectAllRequestId === handledSelectAllRef.current) {
      return;
    }
    handledSelectAllRef.current = selectAllRequestId;
    selectAll();
  }, [selectAll, selectAllRequestId]);
  useEffect(() => {
    if (copyRequestId === handledCopyRef.current) {
      return;
    }
    handledCopyRef.current = copyRequestId;
    void copySelection();
  }, [copyRequestId, copySelection]);
  const handleScroll = (): void => {
    const host = scrollHostRef.current;
    if (!host) {
      return;
    }
    const update = updatePhysicalScroll(scrollStateRef.current, host.scrollTop);
    scrollStateRef.current = update.state;
    if (update.didRebase && Math.abs(host.scrollTop - update.state.physicalScrollCssPx) > 0.5) {
      host.scrollTop = update.state.physicalScrollCssPx;
    }
    setLogicalScroll({
      leftCssPx: Math.max(0, host.scrollLeft),
      topCssPx: update.state.logicalScrollCssPx,
    });
  };
  const handlePointer = (event: MouseEvent<HTMLDivElement>): void => {
    const host = scrollHostRef.current;
    if (!host || event.clientY < host.getBoundingClientRect().top + GRID_HEADER_HEIGHT_CSS_PX) {
      return;
    }
    const bounds = host.getBoundingClientRect();
    const bodyY = event.clientY - bounds.top - GRID_HEADER_HEIGHT_CSS_PX;
    const viewRow = Math.floor((logicalScroll.topCssPx + Math.max(0, bodyY)) / scenario.rowHeightCssPx);
    const dataX = logicalScroll.leftCssPx + Math.max(0, event.clientX - bounds.left - GRID_ROW_HEADER_WIDTH_CSS_PX);
    const columnIndex = columnAxis.findColumnAt(dataX);
    updateActivePosition(viewRow, columnIndex, event.shiftKey);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const currentRow = activeViewRowIndex ?? Math.floor(logicalScroll.topCssPx / scenario.rowHeightCssPx);
    const currentColumn = activeColumnIndex ?? columnAxis.findColumnAt(logicalScroll.leftCssPx);
    let nextRow = currentRow;
    let nextColumn = currentColumn;
    const pageSize = Math.max(
      1,
      Math.floor((viewport.heightCssPx - GRID_HEADER_HEIGHT_CSS_PX) / scenario.rowHeightCssPx),
    );
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'a') {
      event.preventDefault();
      selectAll();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'c') {
      event.preventDefault();
      void copySelection();
      return;
    }
    if (event.key === 'ArrowDown') {
      nextRow += 1;
    } else if (event.key === 'ArrowUp') {
      nextRow -= 1;
    } else if (event.key === 'ArrowRight') {
      nextColumn += 1;
    } else if (event.key === 'ArrowLeft') {
      nextColumn -= 1;
    } else if (event.key === 'PageDown') {
      nextRow += pageSize;
    } else if (event.key === 'PageUp') {
      nextRow -= pageSize;
    } else if (event.key === 'Home' && (event.metaKey || event.ctrlKey)) {
      nextRow = 0;
      nextColumn = 0;
    } else if (event.key === 'End' && (event.metaKey || event.ctrlKey)) {
      nextRow = currentViewRowCount - 1;
      nextColumn = dataSource.columns.length - 1;
    } else if (event.key === 'Home') {
      nextColumn = 0;
    } else if (event.key === 'End') {
      nextColumn = dataSource.columns.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    updateActivePosition(nextRow, nextColumn, event.shiftKey);
  };
  const physicalHeight = Math.max(viewportSize.heightCssPx, physicalExtentCssPx);
  const physicalWidth = Math.max(viewportSize.widthCssPx, GRID_ROW_HEADER_WIDTH_CSS_PX + columnAxis.totalWidthCssPx());
  const activeDescendant = activeCell ? GRID_ACTIVE_CELL_ID : undefined;
  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-lg border bg-background">
      <div
        ref={scrollHostRef}
        aria-activedescendant={activeDescendant}
        aria-colcount={dataSource.columns.length}
        aria-label="百万行大数据表格"
        aria-multiselectable="true"
        aria-readonly="true"
        aria-rowcount={currentViewRowCount}
        className="relative h-full min-h-0 w-full overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        data-testid="large-data-grid-viewport"
        role="grid"
        tabIndex={0}
        title={activeText ?? undefined}
        onClick={handlePointer}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
      >
        <div className="sticky top-0 left-0 z-10 h-0 w-full overflow-visible">
          <div
            className="pointer-events-none absolute top-0 left-0 overflow-hidden bg-background"
            data-testid="large-data-grid-renderer-surface"
            style={{
              height: viewportSize.heightCssPx,
              width: viewportSize.widthCssPx,
            }}
          >
            <GridRendererLayer
              key={`${renderer}-${String(runtimeGeneration)}`}
              columnAxis={columnAxis}
              dataSource={dataSource}
              faultRequestId={faultRequestId}
              query={query}
              renderer={renderer}
              scenario={scenario}
              snapshot={snapshot}
              widthOverrides={widthOverrides}
              onFallback={onRuntimeFallback}
              onFrameDrawn={onFrameDrawn}
              onQueryProgress={onQueryProgress}
              onQueryResult={onQueryResult}
              onRuntimeError={onRuntimeError}
              onRuntimeReady={onRuntimeReady}
            />
            <GridColumnResizeOverlay
              columnAxis={columnAxis}
              range={visibleRange}
              viewport={viewport}
              onResize={onColumnResize}
            />
            <GridSelectionOverlay
              activeColumnIndex={activeColumnIndex}
              activeText={activeText}
              activeViewRowIndex={activeViewRowIndex}
              bounds={selectionBounds}
              columnAxis={columnAxis}
              range={visibleRange}
              rowHeightCssPx={scenario.rowHeightCssPx}
              viewport={viewport}
            />
            <GridAccessibilityLayer
              activeCell={activeCell}
              activeColumnIndex={activeColumnIndex}
              activeText={activeText}
              activeViewRowIndex={activeViewRowIndex}
            />
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none block max-w-none opacity-0"
          data-testid="large-data-grid-scroll-spacer"
          style={{
            height: physicalHeight,
            width: physicalWidth,
          }}
        />
      </div>
      <div aria-live="polite" className="sr-only">
        {activeText}
      </div>
    </div>
  );
};
