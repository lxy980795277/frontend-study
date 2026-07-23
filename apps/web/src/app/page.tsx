import { Activity, Braces, DatabaseZap, ShieldCheck } from 'lucide-react';

import { HealthPanel } from '@/components/home/health-panel';
import { HomeHeader } from '@/components/home/home-header';
import { LabsEntryCard } from '@/components/home/labs-entry-card';
import { Badge } from '@/components/ui/badge';

const CAPABILITIES = [
  {
    description: '可观测、可恢复、可压测的真实交互链路',
    icon: Activity,
    title: '工程难点',
  },
  {
    description: '浏览器、React、协议与算法分层实现',
    icon: Braces,
    title: '前端内核',
  },
  {
    description: 'NestJS、MySQL 与 Redis 的完整支撑',
    icon: DatabaseZap,
    title: '全栈路径',
  },
  {
    description: 'Spec、测试、验证与 Release 全程留痕',
    icon: ShieldCheck,
    title: '交付标准',
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <HomeHeader />

      <main className="mx-auto w-full max-w-7xl space-y-12 px-5 py-10 lg:px-8 lg:py-16">
        <section className="max-w-4xl">
          <Badge className="mb-5" variant="outline">
            Foundation · Ready for advanced labs
          </Badge>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
            把前端难题，做成
            <span className="text-primary"> 可证明的工程能力</span>
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            AI Frontend Engineering Lab 不是代码片段集合，而是一套长期演进、可运行、可测试、可写进简历的高阶实验仓库。
          </p>
        </section>

        <section aria-labelledby="capabilities-title">
          <h2 className="sr-only" id="capabilities-title">
            平台能力
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {CAPABILITIES.map((capability) => {
              const Icon = capability.icon;
              return (
                <div key={capability.title} className="rounded-xl border bg-card/70 p-4 backdrop-blur">
                  <Icon aria-hidden className="mb-4 size-5 text-primary" />
                  <p className="text-sm font-medium">{capability.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{capability.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="system-status-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Infrastructure</p>
              <h2 className="mt-1 text-xl font-semibold" id="system-status-title">
                系统状态
              </h2>
            </div>
            <p className="hidden text-sm text-muted-foreground sm:block">实时探测 API、MySQL 与 Redis</p>
          </div>
          <HealthPanel />
        </section>

        <section aria-labelledby="labs-entry-title">
          <LabsEntryCard />
        </section>
      </main>
    </div>
  );
}
