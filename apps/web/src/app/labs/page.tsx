import { Badge } from '@/components/ui/badge';
import { EmptyLabs } from '@/components/home/empty-labs';
import { LAB_REGISTRY } from '@/config/lab-registry';

export default function LabsPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <Badge className="mb-4" variant="outline">
          {LAB_REGISTRY.length} modules
        </Badge>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Labs 工作台</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          每个模块拥有独立路由、实现边界、异常场景、自动化测试与技术文档。通过模块导航进入具体实验。
        </p>
      </section>

      <section aria-labelledby="lab-catalog-title">
        <div className="mb-4">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Module catalog</p>
          <h2 className="mt-1 text-xl font-semibold" id="lab-catalog-title">
            实验模块
          </h2>
        </div>
        <EmptyLabs />
      </section>
    </div>
  );
}
