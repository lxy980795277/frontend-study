import { ArrowRight, Layers3 } from 'lucide-react';
import type { FC } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export const EmptyLabs: FC = () => {
  return (
    <Card className="overflow-hidden border-dashed shadow-none">
      <CardContent className="relative p-8 sm:p-10">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-accent/70 to-transparent lg:block" />
        <div className="relative max-w-2xl">
          <div className="mb-5 flex size-11 items-center justify-center rounded-xl border bg-card shadow-sm">
            <Layers3 aria-hidden className="size-5 text-primary" />
          </div>
          <Badge className="mb-4" variant="secondary">
            Lab registry is ready
          </Badge>
          <h2 className="text-xl font-semibold tracking-tight">实验工作台已就绪</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            当前尚未收录实验模块。每个 Lab 都会拥有独立页面、核心实现、异常场景、自动化测试和完整技术文档。
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
            <span>下一步：选择首个高阶主题</span>
            <ArrowRight aria-hidden className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
