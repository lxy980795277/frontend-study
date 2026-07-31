'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { GridWorkbenchController } from '../types/controller';
import type { GridMetricAccumulator } from '../types/metrics';
import { GridQueryWorkerHost } from '../browser/query-worker-host';
import { GridColumnAxis } from '../core/column-axis';
import { DeterministicGridDataSource } from '../core/data-source';
import { findViewRowById } from '../core/selection';
import type {
  GridCellRef,
  GridFrameMetrics,
  GridJumpRequest,
  GridProjectionSummary,
  GridQuery,
  GridQueryProgress,
  GridQueryResult,
  GridRendererKind,
  GridRuntimeStatus,
  GridScenario,
  GridSelection,
} from '@/labs/large-data-grid/types/grid';
import { DEFAULT_COLUMN_OVERSCAN, DEFAULT_GRID_SCENARIO, DEFAULT_ROW_OVERSCAN } from '../fixtures/default-scenario';
import {
  createMetricAccumulator,
  recordGridFallback,
  recordGridFrame,
  snapshotGridMetrics,
} from '../metrics/collector';
import type { GridLiveMetrics } from '@/labs/large-data-grid/types/metrics';

const EMPTY_QUERY: GridQuery = {
  filter: null,
  sort: null,
};
const EMPTY_SUMMARY: GridProjectionSummary = {
  digest: 'identity',
  firstRowId: 'row-0000001',
  lastRowId: 'row-1000000',
  rowCount: DEFAULT_GRID_SCENARIO.rowCount,
};

export const useGridWorkbench = (): GridWorkbenchController => {
  const [rowCount, setRowCountState] = useState<number>(DEFAULT_GRID_SCENARIO.rowCount);
  const [columnCount, setColumnCountState] = useState<number>(DEFAULT_GRID_SCENARIO.columnCount);
  const [renderer, setRendererState] = useState<GridRendererKind>('worker-offscreen');
  const [rowOverscan, setRowOverscanState] = useState(DEFAULT_ROW_OVERSCAN);
  const [columnOverscan, setColumnOverscanState] = useState(DEFAULT_COLUMN_OVERSCAN);
  const [widthOverrides, setWidthOverrides] = useState<Readonly<Record<string, number>>>({});
  const [activeCell, setActiveCellState] = useState<GridCellRef | null>(null);
  const [selection, setSelectionState] = useState<GridSelection | null>(null);
  const [projection, setProjection] = useState<Uint32Array | null>(null);
  const [projectionSummary, setProjectionSummary] = useState<GridProjectionSummary>(EMPTY_SUMMARY);
  const [query, setQuery] = useState<GridQuery>(EMPTY_QUERY);
  const [queryVersion, setQueryVersion] = useState(0);
  const [queryProgress, setQueryProgress] = useState<GridQueryProgress | null>(null);
  const [feedback, setFeedback] = useState('使用方向键导航，Shift 扩展选区，Ctrl/⌘ + C 复制。');
  const [jumpRequest, setJumpRequest] = useState<GridJumpRequest | null>(null);
  const [copyRequestId, setCopyRequestId] = useState(0);
  const [selectAllRequestId, setSelectAllRequestId] = useState(0);
  const [faultRequestId, setFaultRequestId] = useState(0);
  const [runtimeGeneration, setRuntimeGeneration] = useState(0);
  const [runtimeStatus, setRuntimeStatus] = useState<GridRuntimeStatus>({
    fallbackReason: null,
    frameMetrics: null,
    phase: 'loading',
    renderer,
  });
  const metricAccumulatorRef = useRef<GridMetricAccumulator>(createMetricAccumulator());
  const lastMetricUiUpdateRef = useRef(0);
  const activeCellRef = useRef<GridCellRef | null>(null);
  const selectionRef = useRef<GridSelection | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<GridLiveMetrics>(
    snapshotGridMetrics(createMetricAccumulator(), renderer),
  );
  const scenario = useMemo<GridScenario>(() => {
    return {
      ...DEFAULT_GRID_SCENARIO,
      columnCount,
      id: `${String(rowCount)}-by-${String(columnCount)}`,
      rowCount,
    };
  }, [columnCount, rowCount]);
  const dataSource = useMemo(() => {
    return new DeterministicGridDataSource(scenario);
  }, [scenario]);
  const columnAxis = useMemo(() => {
    return new GridColumnAxis(dataSource.columns, widthOverrides);
  }, [dataSource.columns, widthOverrides]);
  const setActiveCell = useCallback((cell: GridCellRef | null) => {
    activeCellRef.current = cell;
    setActiveCellState(cell);
  }, []);
  const setSelection = useCallback((nextSelection: GridSelection | null) => {
    selectionRef.current = nextSelection;
    setSelectionState(nextSelection);
  }, []);
  const handleQueryProgress = useCallback(
    (progress: GridQueryProgress, resultVersion: number) => {
      setQueryProgress((current) => {
        if (resultVersion !== queryVersion) {
          return current;
        }
        return progress;
      });
    },
    [queryVersion],
  );
  const handleQueryResult = useCallback(
    (result: GridQueryResult) => {
      if (result.queryVersion !== queryVersion) {
        return;
      }
      setProjection(result.projection);
      setProjectionSummary(result.summary);
      setQueryProgress(null);
      const currentActiveCell = activeCellRef.current;
      const currentSelection = selectionRef.current;
      const activeCellWasRemoved =
        currentActiveCell !== null && findViewRowById(currentActiveCell.rowId, dataSource, result.projection) < 0;
      const selectionWasRemoved =
        currentSelection !== null &&
        (findViewRowById(currentSelection.anchor.rowId, dataSource, result.projection) < 0 ||
          findViewRowById(currentSelection.focus.rowId, dataSource, result.projection) < 0);
      if (activeCellWasRemoved) {
        setActiveCell(null);
      }
      if (selectionWasRemoved) {
        setSelection(null);
      } else if (currentSelection) {
        setSelection({
          ...currentSelection,
          queryVersion,
        });
      }
      const completionMessage =
        result.summary.rowCount === 0
          ? '查询完成，没有匹配行。'
          : `查询完成，共 ${result.summary.rowCount.toLocaleString('zh-CN')} 行。`;
      setFeedback(
        activeCellWasRemoved || selectionWasRemoved
          ? `${completionMessage} 原活动单元格不在结果中，已清除无效选区。`
          : completionMessage,
      );
    },
    [dataSource, queryVersion, setActiveCell, setSelection],
  );
  useEffect(() => {
    if (runtimeStatus.renderer === 'worker-offscreen' || queryVersion === 0) {
      return;
    }
    let host: GridQueryWorkerHost;
    try {
      host = new GridQueryWorkerHost(
        scenario,
        {},
        {
          onError: (reason) => {
            setQueryProgress(null);
            setFeedback(reason);
          },
          onProgress: handleQueryProgress,
          onResult: handleQueryResult,
        },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : '无法创建查询 Worker。';
      const feedbackTimer = window.setTimeout(() => {
        setQueryProgress(null);
        setFeedback(reason);
      }, 0);
      return () => {
        window.clearTimeout(feedbackTimer);
      };
    }
    host.query(query, queryVersion);
    return () => {
      host.dispose();
    };
  }, [handleQueryProgress, handleQueryResult, query, queryVersion, runtimeStatus.renderer, scenario]);
  const resetRuntimeMetrics = useCallback((nextRenderer: GridRendererKind) => {
    metricAccumulatorRef.current = createMetricAccumulator();
    setLiveMetrics(snapshotGridMetrics(metricAccumulatorRef.current, nextRenderer));
    setRuntimeStatus({
      fallbackReason: null,
      frameMetrics: null,
      phase: 'loading',
      renderer: nextRenderer,
    });
  }, []);
  const restartRuntime = useCallback(
    (nextRenderer: GridRendererKind) => {
      setRuntimeGeneration((current) => {
        return current + 1;
      });
      resetRuntimeMetrics(nextRenderer);
    },
    [resetRuntimeMetrics],
  );
  const resetDataState = useCallback((nextRowCount: number) => {
    setProjection(null);
    setProjectionSummary({
      digest: 'identity',
      firstRowId: nextRowCount > 0 ? 'row-0000001' : null,
      lastRowId: nextRowCount > 0 ? `row-${String(nextRowCount).padStart(7, '0')}` : null,
      rowCount: nextRowCount,
    });
    setQuery(EMPTY_QUERY);
    setQueryVersion(0);
    setQueryProgress(null);
    setActiveCell(null);
    setSelection(null);
    setWidthOverrides({});
  }, []);
  const setRenderer = useCallback(
    (nextRenderer: GridRendererKind) => {
      setRendererState(nextRenderer);
      restartRuntime(nextRenderer);
    },
    [restartRuntime],
  );
  const setRowCount = useCallback(
    (nextRowCount: number) => {
      setRowCountState(nextRowCount);
      resetDataState(nextRowCount);
      restartRuntime(renderer);
    },
    [renderer, resetDataState, restartRuntime],
  );
  const setColumnCount = useCallback(
    (nextColumnCount: number) => {
      setColumnCountState(nextColumnCount);
      resetDataState(rowCount);
      restartRuntime(renderer);
    },
    [renderer, resetDataState, restartRuntime, rowCount],
  );
  const applyQuery = useCallback(
    (nextQuery: GridQuery) => {
      setQuery(nextQuery);
      setQueryVersion((current) => {
        return current + 1;
      });
      setQueryProgress({
        completedRows: 0,
        phase: nextQuery.filter ? 'filtering' : 'sorting',
        totalRows: rowCount,
      });
      setFeedback('正在 Worker 中计算最新查询…');
    },
    [rowCount],
  );
  const reset = useCallback(() => {
    resetDataState(rowCount);
    restartRuntime(renderer);
    setFeedback('已重置查询、选区、列宽和运行指标。');
  }, [renderer, resetDataState, restartRuntime, rowCount]);
  const setColumnWidth = useCallback((columnId: string, widthCssPx: number) => {
    setWidthOverrides((current) => {
      return {
        ...current,
        [columnId]: widthCssPx,
      };
    });
  }, []);
  const jumpToRow = useCallback((oneBasedRow: number) => {
    setJumpRequest((current) => {
      return {
        id: (current?.id ?? 0) + 1,
        viewRowIndex: Math.max(0, oneBasedRow - 1),
      };
    });
  }, []);
  const copySelection = useCallback(() => {
    setCopyRequestId((current) => {
      return current + 1;
    });
  }, []);
  const selectAll = useCallback(() => {
    setSelectAllRequestId((current) => {
      return current + 1;
    });
  }, []);
  const injectWorkerFailure = useCallback(() => {
    setFaultRequestId((current) => {
      return current + 1;
    });
  }, []);
  const setRowOverscan = useCallback((overscan: number) => {
    setRowOverscanState(Math.min(20, Math.max(0, Math.round(overscan))));
  }, []);
  const setColumnOverscan = useCallback((overscan: number) => {
    setColumnOverscanState(Math.min(10, Math.max(0, Math.round(overscan))));
  }, []);
  const onFrameDrawn = useCallback(
    (metrics: GridFrameMetrics) => {
      metricAccumulatorRef.current = recordGridFrame(metricAccumulatorRef.current, metrics);
      setRuntimeStatus((current) => {
        if (current.frameMetrics?.frameId === metrics.frameId) {
          return current;
        }
        return {
          ...current,
          frameMetrics: metrics,
        };
      });
      const now = performance.now();
      if (now - lastMetricUiUpdateRef.current >= 200) {
        lastMetricUiUpdateRef.current = now;
        setLiveMetrics(snapshotGridMetrics(metricAccumulatorRef.current, renderer));
      }
    },
    [renderer],
  );
  const onRuntimeReady = useCallback((effectiveRenderer: GridRendererKind) => {
    setRuntimeStatus((current) => {
      if (current.phase === 'fallback' && effectiveRenderer === 'main-canvas') {
        return {
          ...current,
          renderer: effectiveRenderer,
        };
      }
      return {
        fallbackReason: null,
        frameMetrics: null,
        phase: 'ready',
        renderer: effectiveRenderer,
      };
    });
  }, []);
  const onRuntimeFallback = useCallback((reason: string) => {
    metricAccumulatorRef.current = recordGridFallback(metricAccumulatorRef.current);
    setLiveMetrics(snapshotGridMetrics(metricAccumulatorRef.current, 'main-canvas'));
    setRuntimeStatus({
      fallbackReason: reason,
      frameMetrics: null,
      phase: 'fallback',
      renderer: 'main-canvas',
    });
    setFeedback(`Worker 已安全降级：${reason}`);
  }, []);
  const onRuntimeError = useCallback((reason: string) => {
    setRuntimeStatus((current) => {
      return {
        ...current,
        fallbackReason: reason,
        phase: 'error',
      };
    });
    setFeedback(reason);
  }, []);
  return {
    actions: {
      applyQuery,
      copySelection,
      injectWorkerFailure,
      jumpToRow,
      reset,
      selectAll,
      setActiveCell,
      setColumnCount,
      setColumnOverscan,
      setColumnWidth,
      setFeedback,
      setRenderer,
      setRowCount,
      setRowOverscan,
      setSelection,
    },
    model: {
      activeCell,
      columnAxis,
      columnCount,
      columnOverscan,
      copyRequestId,
      dataSource,
      faultRequestId,
      feedback,
      jumpRequest,
      liveMetrics,
      projection,
      projectionSummary,
      query,
      queryProgress,
      queryVersion,
      renderer,
      rowCount,
      rowOverscan,
      runtimeGeneration,
      runtimeStatus,
      scenario,
      selectAllRequestId,
      selection,
      widthOverrides,
    },
    viewportCallbacks: {
      onFrameDrawn,
      onQueryProgress: handleQueryProgress,
      onQueryResult: handleQueryResult,
      onRuntimeError,
      onRuntimeFallback,
      onRuntimeReady,
    },
  };
};
