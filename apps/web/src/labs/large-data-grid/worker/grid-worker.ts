/// <reference lib="webworker" />
import { paintGridFrame } from '../core/canvas-painter';
import { GridColumnAxis } from '../core/column-axis';
import { DeterministicGridDataSource } from '../core/data-source';
import { GridQueryCancelledError, runGridQuery } from '../core/query-engine';
import type { GridFrameSnapshot } from '@/labs/large-data-grid/types/renderer';
import type { GridWorkerFrame, GridWorkerRequest, GridWorkerResponse, WorkerRuntime } from '../types/worker';
import { GRID_WORKER_PROTOCOL_VERSION } from './protocol';

const workerScope = self as DedicatedWorkerGlobalScope;
let runtime: WorkerRuntime | null = null;
let currentEnvelope: {
  rendererId: string;
  sessionId: number;
} | null = null;
workerScope.onmessage = (event: MessageEvent<GridWorkerRequest>) => {
  const request = event.data;
  if (request.protocolVersion !== GRID_WORKER_PROTOCOL_VERSION) {
    return;
  }
  currentEnvelope = {
    rendererId: request.rendererId,
    sessionId: request.sessionId,
  };
  if (request.type === 'init') {
    handleInit(request);
    return;
  }
  if (!runtime) {
    postRuntimeError(request, 'Worker 尚未初始化。');
    return;
  }
  if (request.type === 'frame') {
    runtime.columnAxis = new GridColumnAxis(runtime.dataSource.columns, request.widthOverrides);
    runtime.pendingFrame = request.frame;
    scheduleLatestFrame(request);
    return;
  }
  if (request.type === 'query') {
    runtime.latestQueryVersion = request.queryVersion;
    void handleQuery(request);
    return;
  }
  if (request.type === 'simulate-failure') {
    throw new Error('Simulated Large Data Grid Worker failure');
  }
  disposeRuntime();
  postResponse({
    ...createResponseEnvelope(request),
    type: 'disposed',
  });
  workerScope.close();
};
const handleInit = (
  request: Extract<
    GridWorkerRequest,
    {
      type: 'init';
    }
  >,
): void => {
  disposeRuntime();
  const dataSource = new DeterministicGridDataSource(request.scenario);
  const context =
    request.canvas?.getContext('2d', {
      alpha: false,
    }) ?? null;
  const mode = request.canvas ? 'render' : 'query';
  if (mode === 'render' && (!context || !request.theme)) {
    postRuntimeError(request, 'Worker 无法创建 OffscreenCanvas 2D Context。');
    return;
  }
  runtime = {
    columnAxis: new GridColumnAxis(dataSource.columns, request.widthOverrides),
    context,
    dataSource,
    latestQueryVersion: 0,
    mode,
    pendingFrame: null,
    projection: null,
    scheduledFrame: null,
    theme: request.theme ?? null,
  };
  postResponse({
    ...createResponseEnvelope(request),
    mode,
    type: 'ready',
  });
};
const scheduleLatestFrame = (
  request: Extract<
    GridWorkerRequest,
    {
      type: 'frame';
    }
  >,
): void => {
  if (!runtime || runtime.scheduledFrame !== null) {
    return;
  }
  const callback = (): void => {
    if (!runtime) {
      return;
    }
    runtime.scheduledFrame = null;
    const frame = runtime.pendingFrame;
    runtime.pendingFrame = null;
    if (!frame) {
      return;
    }
    drawFrame(request, frame);
    if (runtime?.pendingFrame) {
      scheduleLatestFrame(request);
    }
  };
  try {
    runtime.scheduledFrame = workerScope.requestAnimationFrame(callback);
  } catch {
    runtime.scheduledFrame = workerScope.setTimeout(callback, 16);
  }
};
const drawFrame = (
  request: Extract<
    GridWorkerRequest,
    {
      type: 'frame';
    }
  >,
  frame: GridWorkerFrame,
): void => {
  if (!runtime?.context || !runtime.theme) {
    postRuntimeError(request, 'Worker Renderer 缺少 Canvas Context。');
    return;
  }
  const canvas = runtime.context.canvas;
  const backingWidth = Math.max(1, Math.round(frame.viewport.widthCssPx * frame.viewport.devicePixelRatio));
  const backingHeight = Math.max(1, Math.round(frame.viewport.heightCssPx * frame.viewport.devicePixelRatio));
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }
  const snapshot: GridFrameSnapshot = {
    ...frame,
    projection: runtime.projection,
  };
  const metrics = paintGridFrame({
    columnAxis: runtime.columnAxis,
    context: runtime.context,
    dataSource: runtime.dataSource,
    snapshot,
    theme: runtime.theme,
  });
  postResponse({
    ...createResponseEnvelope(request),
    metrics,
    queryVersion: frame.queryVersion,
    type: 'frame-drawn',
  });
};
const handleQuery = async (
  request: Extract<
    GridWorkerRequest,
    {
      type: 'query';
    }
  >,
): Promise<void> => {
  const activeRuntime = runtime;
  if (!activeRuntime) {
    return;
  }
  try {
    const result = await runGridQuery({
      dataSource: activeRuntime.dataSource,
      isCancelled: () => {
        return runtime !== activeRuntime || activeRuntime.latestQueryVersion !== request.queryVersion;
      },
      onProgress: (progress) => {
        if (activeRuntime.latestQueryVersion !== request.queryVersion) {
          return;
        }
        postResponse({
          ...createResponseEnvelope(request),
          progress,
          queryVersion: request.queryVersion,
          type: 'query-progress',
        });
      },
      query: request.query,
      queryVersion: request.queryVersion,
    });
    if (runtime !== activeRuntime || activeRuntime.latestQueryVersion !== request.queryVersion) {
      return;
    }
    activeRuntime.projection = result.projection;
    const transferableProjection = result.projection === null ? null : new Uint32Array(result.projection);
    const response: GridWorkerResponse = {
      ...createResponseEnvelope(request),
      projectionBuffer: transferableProjection?.buffer ?? null,
      queryVersion: result.queryVersion,
      summary: result.summary,
      type: 'query-result',
    };
    if (transferableProjection) {
      workerScope.postMessage(response, [transferableProjection.buffer]);
    } else {
      workerScope.postMessage(response);
    }
  } catch (error) {
    if (error instanceof GridQueryCancelledError) {
      return;
    }
    postRuntimeError(request, error instanceof Error ? error.message : 'Worker 查询失败。');
  }
};
const disposeRuntime = (): void => {
  if (runtime?.scheduledFrame !== null && runtime?.scheduledFrame !== undefined) {
    try {
      workerScope.cancelAnimationFrame(runtime.scheduledFrame);
    } catch {
      workerScope.clearTimeout(runtime.scheduledFrame);
    }
  }
  runtime = null;
};
const postRuntimeError = (request: GridWorkerRequest, reason: string): void => {
  postResponse({
    ...createResponseEnvelope(request),
    reason,
    type: 'runtime-error',
  });
};
const createResponseEnvelope = (
  request: GridWorkerRequest,
): {
  protocolVersion: 1;
  rendererId: string;
  requestId: number;
  sessionId: number;
} => {
  return {
    protocolVersion: request.protocolVersion,
    rendererId: request.rendererId,
    requestId: request.requestId,
    sessionId: request.sessionId,
  };
};
const postResponse = (response: GridWorkerResponse): void => {
  if (
    currentEnvelope &&
    (response.rendererId !== currentEnvelope.rendererId || response.sessionId !== currentEnvelope.sessionId)
  ) {
    return;
  }
  workerScope.postMessage(response);
};
export {};
