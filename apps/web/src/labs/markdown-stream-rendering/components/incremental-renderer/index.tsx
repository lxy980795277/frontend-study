'use client';

import type { FC } from 'react';
import { useEffect, useRef } from 'react';

import { IncrementalMarkdownRenderer } from '../../browser/incremental-renderer';
import type { PatchResult } from '../../core/patch/types';
import type { IncrementalSample, RuntimeStatus } from '../../metrics/types';
import { sanitizeMarkdownHtml } from '../../security/sanitize';
import { renderMarkdown } from '../../worker/markdown-parser';

interface IncrementalRendererProps {
  content: string;
  failureSignal: number;
  onCoalescedFrame: () => void;
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
  onFallback,
  onPatch,
  onSample,
  onStatus,
  onWorkerRequest,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<IncrementalMarkdownRenderer | null>(null);
  const handledFailureSignal = useRef(failureSignal);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const renderer = new IncrementalMarkdownRenderer({
      container,
      onCoalescedFrame,
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
  }, [onCoalescedFrame, onFallback, onPatch, onSample, onStatus, onWorkerRequest]);

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
