'use client';

import type { FC } from 'react';
import { useLayoutEffect, useRef } from 'react';

import type { RendererCommit } from '../../benchmark/types';
import type { LegacySample } from '../../metrics/types';
import { sanitizeMarkdownHtml } from '../../security/sanitize';
import { renderMarkdown } from '../../worker/markdown-parser';

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
