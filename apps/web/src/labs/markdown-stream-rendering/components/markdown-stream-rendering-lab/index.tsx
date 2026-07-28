'use client';

import { Columns2, Gauge } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { FC } from 'react';
import { useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { parseMarkdownRenderingLabMode, type MarkdownRenderingLabMode } from '../../benchmark/mode';
import { ConcurrentComparison } from '../concurrent-comparison';
import { IsolatedBenchmark } from '../isolated-benchmark';

export const MarkdownStreamRenderingLab: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseMarkdownRenderingLabMode(searchParams.get('mode'));
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const handleBenchmarkRunningChange = useCallback((isRunning: boolean) => {
    setBenchmarkRunning(isRunning);
  }, []);
  const changeMode = useCallback(
    (value: string) => {
      if (benchmarkRunning) {
        return;
      }

      const nextMode = parseMarkdownRenderingLabMode(value);
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set('mode', nextMode);
      router.replace(`${pathname}?${nextSearchParams.toString()}`, {
        scroll: false,
      });
    },
    [benchmarkRunning, pathname, router, searchParams],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4 xl:h-full">
      <header className="shrink-0 pr-0 sm:pr-32">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Markdown 流式增量渲染</h1>
          <Badge variant="secondary">Web Worker</Badge>
          <Badge variant="outline">Block Diff</Badge>
        </div>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
          同步观察两种渲染策略的功能差异，或通过串行单挂载的隔离基准测量各自真实的提交成本。
        </p>
      </header>

      <Tabs value={mode} onValueChange={changeMode}>
        <TabsList aria-label="Markdown 渲染实验模式" className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger disabled={benchmarkRunning} value="compare">
            <Columns2 aria-hidden className="mr-1.5 size-3.5" />
            同步对比
          </TabsTrigger>
          <TabsTrigger disabled={benchmarkRunning} value="benchmark">
            <Gauge aria-hidden className="mr-1.5 size-3.5" />
            隔离基准
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ModeContent mode={mode} onBenchmarkRunningChange={handleBenchmarkRunningChange} />
    </div>
  );
};

interface ModeContentProps {
  mode: MarkdownRenderingLabMode;
  onBenchmarkRunningChange: (isRunning: boolean) => void;
}

const ModeContent: FC<ModeContentProps> = ({ mode, onBenchmarkRunningChange }) => {
  if (mode === 'benchmark') {
    return <IsolatedBenchmark onRunningChange={onBenchmarkRunningChange} />;
  }

  return <ConcurrentComparison />;
};
