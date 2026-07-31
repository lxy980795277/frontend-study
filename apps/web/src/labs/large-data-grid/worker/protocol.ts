import type { GridWorkerResponse } from '../types/worker';

export const GRID_WORKER_PROTOCOL_VERSION = 1;

export const isGridWorkerResponse = (value: unknown): value is GridWorkerResponse => {
  // Worker 消息跨越结构化克隆边界，进入主线程前必须完整校验协议形状。
  if (!isRecord(value)) {
    return false;
  }
  if (
    value.protocolVersion !== GRID_WORKER_PROTOCOL_VERSION ||
    typeof value.rendererId !== 'string' ||
    typeof value.sessionId !== 'number' ||
    typeof value.requestId !== 'number' ||
    typeof value.type !== 'string'
  ) {
    return false;
  }
  if (value.type === 'disposed') {
    return true;
  }
  if (value.type === 'ready') {
    return value.mode === 'query' || value.mode === 'render';
  }
  if (value.type === 'runtime-error') {
    return typeof value.reason === 'string';
  }
  if (value.type === 'frame-drawn') {
    return isGridFrameMetrics(value.metrics) && isFiniteNumber(value.queryVersion);
  }
  if (value.type === 'query-progress') {
    return isGridQueryProgress(value.progress) && isFiniteNumber(value.queryVersion);
  }
  if (value.type === 'query-result') {
    return (
      (value.projectionBuffer === null ||
        (value.projectionBuffer instanceof ArrayBuffer && value.projectionBuffer.byteLength % 4 === 0)) &&
      isFiniteNumber(value.queryVersion) &&
      isGridProjectionSummary(value.summary)
    );
  }
  return false;
};
const isGridFrameMetrics = (value: unknown): boolean => {
  if (!isRecord(value) || !isRecord(value.range)) {
    return false;
  }
  return (
    isFiniteNumber(value.drawnCellCount) &&
    isFiniteNumber(value.drawMs) &&
    isFiniteNumber(value.frameId) &&
    typeof value.visibleTextDigest === 'string' &&
    isFiniteNumber(value.range.columnEnd) &&
    isFiniteNumber(value.range.columnStart) &&
    isFiniteNumber(value.range.rowEnd) &&
    isFiniteNumber(value.range.rowStart)
  );
};
const isGridQueryProgress = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isFiniteNumber(value.completedRows) &&
    (value.phase === 'filtering' || value.phase === 'sorting') &&
    isFiniteNumber(value.totalRows)
  );
};
const isGridProjectionSummary = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.digest === 'string' &&
    (value.firstRowId === null || typeof value.firstRowId === 'string') &&
    (value.lastRowId === null || typeof value.lastRowId === 'string') &&
    isFiniteNumber(value.rowCount)
  );
};
const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};
