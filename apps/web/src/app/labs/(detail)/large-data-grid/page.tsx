import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LargeDataGridLab } from '@/labs/large-data-grid/components';

export const metadata: Metadata = {
  description: '百万行大数据表格的二维虚拟化、Canvas 与 Worker OffscreenCanvas 渲染实验',
  title: '大数据表格离屏渲染 · Frontend Lab',
};
export const LargeDataGridPage = () => {
  return (
    <main className="h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden sm:h-dvh">
      <Suspense fallback={<div className="h-full animate-pulse rounded-xl bg-muted/30" />}>
        <LargeDataGridLab />
      </Suspense>
    </main>
  );
};
export default LargeDataGridPage;
