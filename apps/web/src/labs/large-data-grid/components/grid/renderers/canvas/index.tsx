'use client';

import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { readGridCanvasTheme, supportsWorkerOffscreenCanvas } from '@/labs/large-data-grid/browser/capability';
import type { GridColumnAxis } from '@/labs/large-data-grid/core/column-axis';
import type { GridDataSource } from '@/labs/large-data-grid/types/data';
import type {
  GridFrameMetrics,
  GridQuery,
  GridQueryProgress,
  GridQueryResult,
  GridRendererKind,
  GridScenario,
} from '@/labs/large-data-grid/types/grid';
import type { GridFrameSnapshot } from '@/labs/large-data-grid/types/renderer';
import { MainCanvasRenderer } from '@/labs/large-data-grid/renderers/main-canvas-renderer';
import { WorkerOffscreenRenderer } from '@/labs/large-data-grid/renderers/worker-offscreen-renderer';
interface CanvasGridRendererProps {
  columnAxis: GridColumnAxis;
  dataSource: GridDataSource;
  faultRequestId: number;
  onFallback: (reason: string) => void;
  onFrameDrawn: (metrics: GridFrameMetrics) => void;
  onQueryProgress: (progress: GridQueryProgress, queryVersion: number) => void;
  onQueryResult: (result: GridQueryResult) => void;
  onRuntimeError: (reason: string) => void;
  onRuntimeReady: (effectiveRenderer: GridRendererKind) => void;
  query: GridQuery;
  renderer: Exclude<GridRendererKind, 'dom'>;
  scenario: GridScenario;
  snapshot: GridFrameSnapshot;
  widthOverrides: Readonly<Record<string, number>>;
}
export const CanvasGridRenderer: FC<CanvasGridRendererProps> = ({
  columnAxis,
  dataSource,
  faultRequestId,
  onFallback,
  onFrameDrawn,
  onQueryProgress,
  onQueryResult,
  onRuntimeError,
  onRuntimeReady,
  query,
  renderer,
  scenario,
  snapshot,
  widthOverrides,
}) => {
  const [fallbackGeneration, setFallbackGeneration] = useState(0);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mainRendererRef = useRef<MainCanvasRenderer | null>(null);
  const workerRendererRef = useRef<WorkerOffscreenRenderer | null>(null);
  const latestFrameRef = useRef(snapshot);
  const lastFaultRequestRef = useRef(faultRequestId);
  const latestColumnAxisRef = useRef(columnAxis);
  const latestDataSourceRef = useRef(dataSource);
  const latestScenarioRef = useRef(scenario);
  const latestWidthOverridesRef = useRef(widthOverrides);
  const latestCallbacksRef = useRef({
    onFallback,
    onFrameDrawn,
    onQueryProgress,
    onQueryResult,
    onRuntimeError,
    onRuntimeReady,
  });
  const effectiveRenderer = renderer === 'worker-offscreen' && fallbackReason === null ? renderer : 'main-canvas';
  const canvasKey = `${renderer}-${String(fallbackGeneration)}-${scenario.id}`;
  useEffect(() => {
    latestFrameRef.current = snapshot;
  }, [snapshot]);
  useEffect(() => {
    latestColumnAxisRef.current = columnAxis;
    latestDataSourceRef.current = dataSource;
    latestScenarioRef.current = scenario;
    latestWidthOverridesRef.current = widthOverrides;
  }, [columnAxis, dataSource, scenario, widthOverrides]);
  useEffect(() => {
    latestCallbacksRef.current = {
      onFallback,
      onFrameDrawn,
      onQueryProgress,
      onQueryResult,
      onRuntimeError,
      onRuntimeReady,
    };
  }, [onFallback, onFrameDrawn, onQueryProgress, onQueryResult, onRuntimeError, onRuntimeReady]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let active = true;
    let pendingPresentationFrame = 0;
    const theme = readGridCanvasTheme(canvas);
    const reportFrame = (metrics: GridFrameMetrics): void => {
      window.cancelAnimationFrame(pendingPresentationFrame);
      pendingPresentationFrame = window.requestAnimationFrame(() => {
        if (active && metrics.frameId === latestFrameRef.current.frameId) {
          latestCallbacksRef.current.onFrameDrawn(metrics);
        }
      });
    };
    if (effectiveRenderer === 'worker-offscreen') {
      if (!supportsWorkerOffscreenCanvas(canvas)) {
        setFallbackReason('当前浏览器不支持 Worker OffscreenCanvas。');
        setFallbackGeneration((current) => {
          return current + 1;
        });
        latestCallbacksRef.current.onFallback('当前浏览器不支持 Worker OffscreenCanvas。');
        return;
      }
      const workerRenderer = new WorkerOffscreenRenderer({
        onFailure: (reason) => {
          if (!active) {
            return;
          }
          setFallbackReason(reason);
          setFallbackGeneration((current) => {
            return current + 1;
          });
          latestCallbacksRef.current.onFallback(reason);
        },
        onFrameDrawn: (response) => {
          reportFrame(response.metrics);
        },
        onQueryProgress: (progress, queryVersion) => {
          latestCallbacksRef.current.onQueryProgress(progress, queryVersion);
        },
        onQueryResult: (result) => {
          latestCallbacksRef.current.onQueryResult(result);
        },
        onReady: () => {
          latestCallbacksRef.current.onRuntimeReady('worker-offscreen');
        },
      });
      workerRendererRef.current = workerRenderer;
      workerRenderer.mount({
        canvas,
        scenario: latestScenarioRef.current,
        theme,
        widthOverrides: latestWidthOverridesRef.current,
      });
      return () => {
        active = false;
        window.cancelAnimationFrame(pendingPresentationFrame);
        workerRenderer.dispose();
        workerRendererRef.current = null;
      };
    }
    const mainRenderer = new MainCanvasRenderer(canvas, {
      onError: (reason) => {
        latestCallbacksRef.current.onRuntimeError(reason);
      },
      onFrameDrawn: reportFrame,
      onReady: () => {
        latestCallbacksRef.current.onRuntimeReady('main-canvas');
      },
    });
    mainRendererRef.current = mainRenderer;
    mainRenderer.mount({
      columnAxis: latestColumnAxisRef.current,
      dataSource: latestDataSourceRef.current,
      theme,
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(pendingPresentationFrame);
      mainRenderer.dispose();
      mainRendererRef.current = null;
    };
  }, [canvasKey, effectiveRenderer]);
  useEffect(() => {
    mainRendererRef.current?.updateContext({
      columnAxis,
      dataSource,
    });
  }, [columnAxis, dataSource]);
  useEffect(() => {
    mainRendererRef.current?.update(snapshot);
    workerRendererRef.current?.update(snapshot, widthOverrides);
  }, [canvasKey, snapshot, widthOverrides]);
  useEffect(() => {
    if (renderer !== 'worker-offscreen' || fallbackReason !== null || snapshot.queryVersion === 0) {
      return;
    }
    workerRendererRef.current?.query(query, snapshot.queryVersion);
  }, [canvasKey, fallbackReason, query, renderer, snapshot.queryVersion]);
  useEffect(() => {
    if (faultRequestId === lastFaultRequestRef.current) {
      return;
    }
    lastFaultRequestRef.current = faultRequestId;
    workerRendererRef.current?.simulateFailure();
  }, [faultRequestId]);
  return (
    <canvas
      key={canvasKey}
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 block size-full bg-background"
      data-effective-renderer={effectiveRenderer}
    />
  );
};
