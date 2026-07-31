import type { GridQuery, GridScenario } from '@/labs/large-data-grid/types/grid';
import type { GridQueryWorkerCallbacks, GridWorkerRequest } from '../types/worker';
import { GRID_WORKER_PROTOCOL_VERSION, isGridWorkerResponse } from '../worker/protocol';

const QUERY_WORKER_INITIALIZATION_TIMEOUT_MS = 3000;
export class GridQueryWorkerHost {
  private disposed = false;
  private initializationTimer: number | null = null;
  private requestId = 0;
  private readonly rendererId = `query-grid-${crypto.randomUUID()}`;
  private readonly sessionId = Date.now();
  private readonly worker: Worker;
  constructor(
    scenario: GridScenario,
    widthOverrides: Readonly<Record<string, number>>,
    private readonly callbacks: GridQueryWorkerCallbacks,
  ) {
    this.worker = new Worker(new URL('../worker/grid-worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      this.handleMessage(event.data);
    };
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.fail('查询 Worker 运行失败。');
    };
    this.worker.onmessageerror = () => {
      this.fail('查询 Worker 消息无法反序列化。');
    };
    try {
      this.worker.postMessage(
        this.createRequest({
          scenario,
          type: 'init',
          widthOverrides,
        }),
      );
    } catch (error) {
      this.dispose();
      throw error;
    }
    this.initializationTimer = window.setTimeout(() => {
      this.fail('查询 Worker 初始化超时。');
    }, QUERY_WORKER_INITIALIZATION_TIMEOUT_MS);
  }
  query = (query: GridQuery, queryVersion: number): void => {
    if (this.disposed) {
      return;
    }
    try {
      this.worker.postMessage(
        this.createRequest({
          query,
          queryVersion,
          type: 'query',
        }),
      );
    } catch {
      this.fail('查询 Worker 消息发送失败。');
    }
  };
  dispose = (): void => {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.clearInitializationTimer();
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.onmessageerror = null;
    this.worker.terminate();
  };
  private createRequest = <
    T extends Omit<GridWorkerRequest, 'protocolVersion' | 'rendererId' | 'requestId' | 'sessionId'>,
  >(
    payload: T,
  ): T & {
    protocolVersion: 1;
    rendererId: string;
    requestId: number;
    sessionId: number;
  } => {
    this.requestId += 1;
    return {
      ...payload,
      protocolVersion: GRID_WORKER_PROTOCOL_VERSION,
      rendererId: this.rendererId,
      requestId: this.requestId,
      sessionId: this.sessionId,
    };
  };
  private handleMessage = (value: unknown): void => {
    if (!isGridWorkerResponse(value) || this.disposed) {
      return;
    }
    if (value.rendererId !== this.rendererId || value.sessionId !== this.sessionId) {
      return;
    }
    if (value.type === 'ready') {
      this.clearInitializationTimer();
      return;
    }
    if (value.type === 'query-progress') {
      this.callbacks.onProgress(value.progress, value.queryVersion);
      return;
    }
    if (value.type === 'query-result') {
      this.callbacks.onResult({
        projection: value.projectionBuffer ? new Uint32Array(value.projectionBuffer) : null,
        queryVersion: value.queryVersion,
        summary: value.summary,
      });
      return;
    }
    if (value.type === 'runtime-error') {
      this.fail(value.reason);
    }
  };
  private fail = (reason: string): void => {
    if (this.disposed) {
      return;
    }
    this.dispose();
    this.callbacks.onError(reason);
  };
  private clearInitializationTimer = (): void => {
    if (this.initializationTimer !== null) {
      window.clearTimeout(this.initializationTimer);
      this.initializationTimer = null;
    }
  };
}
