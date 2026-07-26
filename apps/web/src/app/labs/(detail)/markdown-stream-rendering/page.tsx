import type { Metadata } from 'next';

import { MarkdownStreamRenderingLab } from '@/labs/markdown-stream-rendering/components/markdown-stream-rendering-lab';

export const metadata: Metadata = {
  description: '基于 Web Worker、块级 Diff 与最小 DOM Patch 的 Markdown 流式增量渲染实验',
  title: 'Markdown 流式增量渲染 · Frontend Lab',
};

export default function MarkdownStreamRenderingPage() {
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] xl:h-dvh xl:min-h-0">
      <MarkdownStreamRenderingLab />
    </main>
  );
}
