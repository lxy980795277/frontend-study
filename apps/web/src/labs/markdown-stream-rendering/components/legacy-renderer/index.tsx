'use client';

import type { FC } from 'react';
import { useLayoutEffect, useRef } from 'react';

import { renderMarkdown } from '../../worker/markdown-parser';
import { sanitizeMarkdownHtml } from '../../security/sanitize';
import type { LegacySample } from '../../metrics/types';

interface LegacyRendererProps {
  content: string;
  onSample: (sample: LegacySample) => void;
}

export const LegacyRenderer: FC<LegacyRendererProps> = ({ content, onSample }) => {
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
  }, [content, onSample]);

  return <div ref={containerRef} className="msr-markdown size-full" data-testid="legacy-renderer" />;
};
