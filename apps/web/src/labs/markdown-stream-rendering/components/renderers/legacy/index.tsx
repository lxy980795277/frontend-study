'use client';

import type { FC } from 'react';
import { useLayoutEffect, useRef } from 'react';
import type { RendererCommit } from '@/labs/markdown-stream-rendering/types/renderer';
import type { LegacySample } from '@/labs/markdown-stream-rendering/types/renderer';
import { sanitizeMarkdownHtml } from '@/labs/markdown-stream-rendering/security/sanitize';
import { renderMarkdown } from '@/labs/markdown-stream-rendering/worker/markdown-parser';
interface LegacyRendererProps {
  content: string;
  onCommit?: (commit: RendererCommit) => void;
  onSample: (sample: LegacySample) => void;
}
export const LegacyRenderer: FC<LegacyRendererProps> = ({ content, onCommit, onSample }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || content.length === 0) {
      return;
    }
    const startedAt = performance.now();
    const html = sanitizeMarkdownHtml(renderMarkdown(content));
    container.innerHTML = html;
    onSample({
      mainMs: performance.now() - startedAt,
    });
    onCommit?.({
      committedAt: performance.now(),
      contentLength: content.length,
    });
  }, [content, onCommit, onSample]);
  return <div ref={containerRef} className="msr-markdown size-full" data-testid="legacy-renderer" />;
};
