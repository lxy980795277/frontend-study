import type { GridQuery } from '@/labs/large-data-grid/types/grid';
import type { GridFrameSnapshot } from '@/labs/large-data-grid/types/renderer';
import type { MountWorkerOffscreenOptions, WorkerOffscreenCallbacks } from '../types/renderer';
import type { GridWorkerRequest } from '../types/worker';
import { GRID_WORKER_PROTOCOL_VERSION, isGridWorkerResponse } from '../worker/protocol';

const WORKER_INITIALIZATION_TIMEOUT_MS = 3000;

export class WorkerOffscreenRenderer {
  readonly kind = 'worker-offscreen' as const;
  private disposed = false;
  private initializationTimer: number | null = null;
  private requestId = 0;
  private readonly rendererId: string;
  private readonly sessionId: number;
  private worker: Worker | null = null;
  constructor(private readonly callbacks: WorkerOffscreenCallbacks) {
    this.rendererId = `worker-grid-${crypto.randomUUID()}`;
    this.sessionId = Date.now();
  }
  mount = (options: MountWorkerOffscreenOptions): void => {
    try {
      const offscreen = options.canvas.transferControlToOffscreen();
      const worker = new Worker(new URL('../worker/grid-worker.ts', import.meta.url), {
        type: 'module',
      });
      this.worker = worker;
      worker.onmessage = (event: MessageEvent<unknown>) => {
        this.handleMessage(event.data);
      };
      worker.onerror = (event) => {
        event.preventDefault();
        this.fail('Worker 运行时错误。');
      };
      worker.onmessageerror = () => {
        this.fail('Worker 消息无法反序列化。');
      };
      const request = this.createRequest({
        canvas: offscreen,
        scenario: options.scenario,
        theme: options.theme,
        type: 'init',
        widthOverrides: options.widthOverrides,
      });
      worker.postMessage(request, [offscreen]);
      this.initializationTimer = window.setTimeout(() => {
        this.fail('Worker 初始化超时。');
      }, WORKER_INITIALIZATION_TIMEOUT_MS);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'OffscreenCanvas 初始化失败。');
    }
  };
  update = (snapshot: GridFrameSnapshot, widthOverrides: Readonly<Record<string, number>>): void => {
    const { projection: _projection, ...frame } = snapshot;
    this.post(
      this.createRequest({
        frame,
        type: 'frame',
        widthOverrides,
      }),
    );
  };
  query = (query: GridQuery, queryVersion: number): void => {
    this.post(
      this.createRequest({
        query,
        queryVersion,
        type: 'query',
      }),
    );
  };
  simulateFailure = (): void => {
    this.post(
      this.createRequest({
        type: 'simulate-failure',
      }),
    );
  };
  dispose = (): void => {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.clearInitializationTimer();
    if (this.worker) {
      try {
        this.worker.postMessage(
          this.createRequest({
            type: 'dispose',
          }),
        );
      } catch {
        // Worker termination below is authoritative.
      }
      this.worker.terminate();
      this.worker = null;
    }
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
      this.callbacks.onReady();
      return;
    }
    if (value.type === 'frame-drawn') {
      this.callbacks.onFrameDrawn(value);
      return;
    }
    if (value.type === 'query-progress') {
      this.callbacks.onQueryProgress(value.progress, value.queryVersion);
      return;
    }
    if (value.type === 'query-result') {
      this.callbacks.onQueryResult({
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
  private post = (request: GridWorkerRequest): void => {
    if (this.disposed || !this.worker) {
      return;
    }
    try {
      this.worker.postMessage(request);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Worker 消息发送失败。');
    }
  };
  private fail = (reason: string): void => {
    if (this.disposed) {
      return;
    }
    this.dispose();
    this.callbacks.onFailure(reason);
  };
  private clearInitializationTimer = (): void => {
    if (this.initializationTimer !== null) {
      window.clearTimeout(this.initializationTimer);
      this.initializationTimer = null;
    }
  };
}
