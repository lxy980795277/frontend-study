import { ArrowRight, Layers3 } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LAB_REGISTRY } from '@/config/lab-registry';

export const LabsEntryCard: FC = () => {
  return (
    <Card className="overflow-hidden border-primary/15 bg-primary/[0.035] shadow-none">
      <CardContent className="relative grid gap-8 p-7 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-accent/80 to-transparent lg:block" />
        <div className="relative max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl border bg-card shadow-sm">
              <Layers3 aria-hidden className="size-5 text-primary" />
            </span>
            <Badge variant="secondary">{LAB_REGISTRY.length} 个实验模块</Badge>
          </div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Laboratory workspace</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight" id="labs-entry-title">
            在独立工作台中探索每一个前端难题
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Labs 入口以卡片集中展示所有模块。每个实验保持独立路由、独立实现、独立测试与完整技术文档。
          </p>
        </div>

        <Button asChild className="relative w-full sm:w-auto" size="lg">
          <Link href="/labs">
            进入 Labs 工作台
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
