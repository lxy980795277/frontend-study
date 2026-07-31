'use client';

import type { FC } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { RendererCommit } from '@/labs/markdown-stream-rendering/types/renderer';
import { IncrementalMarkdownRenderer } from '@/labs/markdown-stream-rendering/browser/incremental-renderer';
import type { PatchResult } from '@/labs/markdown-stream-rendering/types/markdown';
import type { IncrementalSample, RuntimeStatus } from '@/labs/markdown-stream-rendering/types/renderer';
import { sanitizeMarkdownHtml } from '@/labs/markdown-stream-rendering/security/sanitize';
import { renderMarkdown } from '@/labs/markdown-stream-rendering/worker/markdown-parser';
interface IncrementalRendererProps {
  content: string;
  failureSignal: number;
  onCoalescedFrame: () => void;
  onCommit?: (commit: RendererCommit) => void;
  onFallback: () => void;
  onPatch: (result: PatchResult) => void;
  onSample: (sample: IncrementalSample) => void;
  onStatus: (status: RuntimeStatus) => void;
  onWorkerRequest: () => void;
}
export const IncrementalRenderer: FC<IncrementalRendererProps> = ({
  content,
  failureSignal,
  onCoalescedFrame,
  onCommit,
  onFallback,
  onPatch,
  onSample,
  onStatus,
  onWorkerRequest,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<IncrementalMarkdownRenderer | null>(null);
  const handledFailureSignal = useRef(failureSignal);
  const handleCommit = useCallback(
    (contentLength: number) => {
      onCommit?.({
        committedAt: performance.now(),
        contentLength,
      });
    },
    [onCommit],
  );
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const renderer = new IncrementalMarkdownRenderer({
      container,
      onCoalescedFrame,
      onCommit: handleCommit,
      onFallback,
      onMetrics: onSample,
      onPatch,
      onRuntimeStatus: onStatus,
      onWorkerRequest,
      renderFull: renderMarkdown,
      sanitize: sanitizeMarkdownHtml,
    });
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [handleCommit, onCoalescedFrame, onFallback, onPatch, onSample, onStatus, onWorkerRequest]);
  useEffect(() => {
    if (content.length > 0) {
      rendererRef.current?.push(content);
    }
  }, [content]);
  useEffect(() => {
    if (failureSignal > handledFailureSignal.current) {
      handledFailureSignal.current = failureSignal;
      rendererRef.current?.simulateWorkerFailure();
    }
  }, [failureSignal]);
  return <div ref={containerRef} className="msr-markdown size-full" data-testid="incremental-renderer" />;
};
