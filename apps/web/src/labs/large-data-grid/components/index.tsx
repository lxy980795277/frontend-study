'use client';

import { Gauge, TableProperties } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseLargeDataGridLabMode } from '@/labs/large-data-grid/benchmark/mode';
import { IsolatedLargeDataGridBenchmark } from '@/labs/large-data-grid/components/benchmark';
import { LargeDataGridWorkbench } from '@/labs/large-data-grid/components/workbench';
export const LargeDataGridLab: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseLargeDataGridLabMode(searchParams.get('mode'));
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const changeMode = useCallback(
    (value: string) => {
      if (benchmarkRunning) {
        return;
      }
      const nextMode = parseLargeDataGridLabMode(value);
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set('mode', nextMode);
      router.replace(`${pathname}?${nextSearchParams.toString()}`, {
        scroll: false,
      });
    },
    [benchmarkRunning, pathname, router, searchParams],
  );
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
      <header className="grid shrink-0 gap-2 pr-0 sm:pr-32 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.025em]">大数据表格离屏渲染</h1>
            <Badge variant="secondary">1,000,000 × 100</Badge>
            <Badge variant="outline">OffscreenCanvas</Badge>
            <Badge variant="outline">2D Virtualization</Badge>
          </div>
          <p className="mt-1 max-w-5xl text-xs leading-5 text-muted-foreground">
            同一套惰性数据与二维几何，对比 DOM 虚拟化、主线程 Canvas 和 Worker
            离屏绘制，并验证百万行滚动、查询、选择与安全降级。
          </p>
        </div>

        <Tabs className="min-w-0 xl:justify-self-end" value={mode} onValueChange={changeMode}>
          <TabsList aria-label="大数据表格实验模式" className="grid w-full max-w-sm grid-cols-2 xl:w-96">
            <TabsTrigger disabled={benchmarkRunning} value="workbench">
              <TableProperties aria-hidden className="mr-1.5 size-3.5" />
              交互工作台
            </TabsTrigger>
            <TabsTrigger disabled={benchmarkRunning} value="benchmark">
              <Gauge aria-hidden className="mr-1.5 size-3.5" />
              隔离基准
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <LargeDataGridModeContent mode={mode} onBenchmarkRunningChange={setBenchmarkRunning} />
    </div>
  );
};
interface LargeDataGridModeContentProps {
  mode: ReturnType<typeof parseLargeDataGridLabMode>;
  onBenchmarkRunningChange: (running: boolean) => void;
}
const LargeDataGridModeContent: FC<LargeDataGridModeContentProps> = ({ mode, onBenchmarkRunningChange }) => {
  if (mode === 'benchmark') {
    return <IsolatedLargeDataGridBenchmark onRunningChange={onBenchmarkRunningChange} />;
  }
  return <LargeDataGridWorkbench />;
};
