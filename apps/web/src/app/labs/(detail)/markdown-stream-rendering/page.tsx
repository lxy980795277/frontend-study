import type { Metadata } from 'next';
import { Suspense } from 'react';

import { MarkdownStreamRenderingLab } from '@/labs/markdown-stream-rendering/components';

export const metadata: Metadata = {
  description: '基于 Web Worker、块级 Diff 与最小 DOM Patch 的 Markdown 流式增量渲染实验',
  title: 'Markdown 流式增量渲染 · Frontend Lab',
};
export const MarkdownStreamRenderingPage = () => {
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] xl:h-dvh xl:min-h-0">
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-xl bg-muted/30" />}>
        <MarkdownStreamRenderingLab />
      </Suspense>
    </main>
  );
};
export default MarkdownStreamRenderingPage;
