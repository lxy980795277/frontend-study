import type { PatchResult } from '@/labs/markdown-stream-rendering/types/markdown';
import type {
  IncrementalRendererOptions,
  MarkdownWorkerResponse,
  RuntimeStatus,
} from '@/labs/markdown-stream-rendering/types/renderer';
import { applyPatchResult, replaceWithFullSnapshot } from './apply-patches';
import { BlockToolsManager } from './block-tools-manager';
import { postWorkerRequest, registerRenderer, unregisterRenderer } from './worker-host';
const DEFAULT_TIMEOUT_MS = 2000;
let rendererSequence = 0;
export class IncrementalMarkdownRenderer {
  private readonly id = `markdown-renderer-${++rendererSequence}`;
  private readonly options: IncrementalRendererOptions;
  private readonly tools = new BlockToolsManager();
  private applyFrameId: number | null = null;
  private currentContent = '';
  private currentReqId = 0;
  private destroyed = false;
  private inFlight = false;
  private mode: RuntimeStatus['mode'] = 'incremental';
  private pendingTarget: string | null = null;
  private registered = false;
  private requestedContent = '';
  private revision = 0;
  private timeoutId: number | null = null;
  constructor(options: IncrementalRendererOptions) {
    this.options = options;
    this.options.container.dataset.revision = '0';
    this.registerWorker();
    if (this.mode === 'incremental') {
      this.emitStatus('idle', 0);
    }
  }
  push = (content: string): void => {
    if (this.destroyed) {
      return;
    }
    this.currentContent = content;
    if (this.mode === 'fallback') {
      this.renderFallback(content);
      return;
    }
    if (this.inFlight) {
      if (content !== this.requestedContent) {
        // Worker 忙碌时只保留最新目标，主动合并已过时的中间帧。
        this.pendingTarget = content;
        this.options.onCoalescedFrame();
      }
      return;
    }
    this.request(content);
  };
  reset = (content = ''): void => {
    this.cancelPendingWork();
    this.tools.clear();
    this.options.container.replaceChildren();
    this.options.container.dataset.revision = '0';
    this.currentContent = content;
    this.pendingTarget = null;
    this.requestedContent = '';
    this.revision = 0;
    this.mode = 'incremental';
    if (this.registered) {
      unregisterRenderer(this.id);
      this.registered = false;
    }
    this.registerWorker();
    if (this.mode === 'incremental') {
      this.emitStatus('idle', 0);
    }
    if (content.length > 0) {
      this.push(content);
    }
  };
  simulateWorkerFailure = (): void => {
    if (!this.registered || this.mode === 'fallback') {
      return;
    }
    try {
      postWorkerRequest({
        rendererId: this.id,
        type: 'simulate-crash',
      });
    } catch {
      this.enterFallback('worker-unavailable');
    }
  };
  destroy = (): void => {
    this.destroyed = true;
    this.cancelPendingWork();
    this.tools.clear();
    if (this.registered) {
      unregisterRenderer(this.id);
      this.registered = false;
    }
  };
  private registerWorker = (): void => {
    this.registered = true;
    registerRenderer(this.id, {
      onFailure: (reason) => {
        this.registered = false;
        this.enterFallback(reason);
      },
      onMessage: (message) => {
        this.handleWorkerMessage(message);
      },
    });
  };
  private request = (content: string): void => {
    this.currentReqId += 1;
    this.inFlight = true;
    this.pendingTarget = null;
    this.requestedContent = content;
    this.options.onWorkerRequest();
    this.emitStatus('requesting');
    try {
      postWorkerRequest({
        baseRevision: this.revision,
        content,
        nextRevision: this.revision + 1,
        rendererId: this.id,
        reqId: this.currentReqId,
        type: 'update',
      });
    } catch {
      this.enterFallback('worker-unavailable');
      return;
    }
    this.timeoutId = window.setTimeout(() => {
      this.enterFallback('timeout');
    }, this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  };
  private handleWorkerMessage = (message: MarkdownWorkerResponse): void => {
    const reqId = message.type === 'patch' ? message.payload.reqId : message.reqId;
    if (reqId !== this.currentReqId || !this.inFlight) {
      return;
    }
    this.clearRequestTimeout();
    if (message.type === 'protocol-error') {
      this.enterFallback(`protocol:${message.reason}`);
      return;
    }
    this.emitStatus('applying');
    this.applyFrameId = window.requestAnimationFrame(() => {
      this.applyWorkerResult(message.payload);
    });
  };
  private applyWorkerResult = (result: PatchResult): void => {
    this.applyFrameId = null;
    try {
      const applyStartedAt = performance.now();
      const applied = applyPatchResult(this.options.container, result, this.options.sanitize);
      const applyMs = performance.now() - applyStartedAt;
      applied.removedBlocks.forEach((block) => {
        this.tools.unmount(block);
      });
      const mountStartedAt = performance.now();
      this.tools.sync(this.options.container);
      const mountMs = performance.now() - mountStartedAt;
      postWorkerRequest({
        rendererId: this.id,
        revision: result.nextRevision,
        type: 'commit',
      });

      // revision 只在 DOM Patch 成功后推进，Worker 才能安全释放上一版基线。
      this.revision = result.nextRevision;
      this.inFlight = false;
      this.options.onPatch(result);
      this.options.onMetrics({
        applyMs,
        diffMs: result.metrics.diffMs,
        mountMs,
        parseMs: result.metrics.parseMs,
        patchOps: result.patches.map((patch) => {
          return patch.op;
        }),
        usedSnapshotFallback: applied.usedSnapshotFallback,
      });
      this.options.onCommit(this.requestedContent.length);
      const nextTarget = this.pendingTarget;
      this.pendingTarget = null;
      if (nextTarget !== null && nextTarget !== this.requestedContent) {
        this.request(nextTarget);
        return;
      }
      this.emitStatus('idle', this.requestedContent.length);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.name : 'apply-error';
      this.enterFallback(`apply:${reason}`);
    }
  };
  private enterFallback = (reason: string): void => {
    if (this.destroyed || this.mode === 'fallback') {
      return;
    }
    this.cancelPendingWork();
    this.mode = 'fallback';
    this.inFlight = false;
    this.pendingTarget = null;
    this.options.onFallback();
    if (this.registered) {
      unregisterRenderer(this.id);
      this.registered = false;
    }
    this.renderFallback(this.currentContent);
    this.options.onRuntimeStatus({
      committedContentLength: this.currentContent.length,
      fallbackReason: reason,
      mode: 'fallback',
      phase: 'fallback',
    });
  };
  private renderFallback = (content: string): void => {
    const removed = replaceWithFullSnapshot(
      this.options.container,
      this.options.renderFull(content),
      this.options.sanitize,
    );
    removed.forEach((block) => {
      this.tools.unmount(block);
    });
    this.options.onCommit(content.length);
  };
  private emitStatus = (phase: RuntimeStatus['phase'], committedContentLength?: number): void => {
    this.options.onRuntimeStatus({
      committedContentLength,
      mode: this.mode,
      phase,
    });
  };
  private cancelPendingWork = (): void => {
    this.clearRequestTimeout();
    if (this.applyFrameId !== null) {
      window.cancelAnimationFrame(this.applyFrameId);
      this.applyFrameId = null;
    }
  };
  private clearRequestTimeout = (): void => {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  };
}
