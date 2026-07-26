import type { MarkdownWorkerRequest, MarkdownWorkerResponse } from '../worker/protocol';

export type WorkerFailureReason = 'message-error' | 'worker-error' | 'worker-unavailable';

interface RendererHandler {
  onFailure: (reason: WorkerFailureReason) => void;
  onMessage: (message: MarkdownWorkerResponse) => void;
}

let sharedWorker: Worker | null = null;
const handlers = new Map<string, RendererHandler>();

export function registerRenderer(rendererId: string, handler: RendererHandler): void {
  handlers.set(rendererId, handler);

  try {
    ensureWorker();
  } catch {
    handlers.delete(rendererId);
    handler.onFailure('worker-unavailable');
  }
}

export function unregisterRenderer(rendererId: string): void {
  if (handlers.has(rendererId) && sharedWorker) {
    try {
      sharedWorker.postMessage({
        rendererId,
        type: 'reset',
      } satisfies MarkdownWorkerRequest);
    } catch {
      // Cleanup below is authoritative even if the Worker has already failed.
    }
  }

  handlers.delete(rendererId);

  if (handlers.size === 0) {
    sharedWorker?.terminate();
    sharedWorker = null;
  }
}

export function postWorkerRequest(request: MarkdownWorkerRequest): void {
  ensureWorker().postMessage(request);
}

function ensureWorker(): Worker {
  if (sharedWorker) {
    return sharedWorker;
  }

  const worker = new Worker(new URL('../worker/markdown-worker.ts', import.meta.url), {
    type: 'module',
  });

  worker.onmessage = (event: MessageEvent<MarkdownWorkerResponse>) => {
    const rendererId = event.data.type === 'patch' ? event.data.payload.rendererId : event.data.rendererId;
    handlers.get(rendererId)?.onMessage(event.data);
  };
  worker.onerror = (event) => {
    event.preventDefault();
    failWorker('worker-error');
  };
  worker.onmessageerror = () => {
    failWorker('message-error');
  };

  sharedWorker = worker;
  return worker;
}

function failWorker(reason: WorkerFailureReason): void {
  sharedWorker?.terminate();
  sharedWorker = null;
  const currentHandlers = Array.from(handlers.values());
  handlers.clear();
  currentHandlers.forEach((handler) => handler.onFailure(reason));
}
