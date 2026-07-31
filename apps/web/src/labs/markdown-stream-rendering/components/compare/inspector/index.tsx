import { Activity, Braces, Cpu } from 'lucide-react';
import type { FC } from 'react';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PatchLogEntry } from '@/labs/markdown-stream-rendering/types/controller';
import type { MarkdownFixture } from '@/labs/markdown-stream-rendering/types/fixture';
import type { RunMetricsSnapshot, RuntimeStatus } from '@/labs/markdown-stream-rendering/types/renderer';

import { MetricsPanel } from './metrics';
import { PatchLog } from './patches';
import { RuntimePanel } from './runtime';

interface InspectorProps {
  fixture: MarkdownFixture;
  instanceCount: 1 | 4;
  metrics: RunMetricsSnapshot;
  patchLog: PatchLogEntry[];
  runtimeStatuses: Readonly<Record<number, RuntimeStatus>>;
}

export const Inspector: FC<InspectorProps> = ({ fixture, instanceCount, metrics, patchLog, runtimeStatuses }) => {
  return (
    <Card className="flex min-h-[32rem] min-w-0 flex-col overflow-hidden p-3 xl:min-h-0">
      <div className="shrink-0 rounded-lg border bg-muted/20 p-3">
        <p className="truncate text-xs font-medium" title={fixture.label}>
          {fixture.label}
        </p>
        <p className="mt-1 line-clamp-2 text-[0.6875rem] leading-5 text-muted-foreground">{fixture.description}</p>
      </div>

      <Tabs className="mt-3 flex min-h-0 flex-1 flex-col" defaultValue="metrics">
        <TabsList className="grid w-full shrink-0 grid-cols-3">
          <TabsTrigger value="metrics">
            <Activity aria-hidden className="mr-1 size-3.5" />
            指标
          </TabsTrigger>
          <TabsTrigger value="patches">
            <Braces aria-hidden className="mr-1 size-3.5" />
            Patch
          </TabsTrigger>
          <TabsTrigger value="runtime">
            <Cpu aria-hidden className="mr-1 size-3.5" />
            运行时
          </TabsTrigger>
        </TabsList>

        <TabsContent className="min-h-0 flex-1 overflow-y-auto pr-1" value="metrics">
          <MetricsPanel metrics={metrics} />
        </TabsContent>
        <TabsContent className="min-h-0 flex-1 overflow-y-auto" value="patches">
          <PatchLog entries={patchLog} />
        </TabsContent>
        <TabsContent className="min-h-0 flex-1 overflow-y-auto pr-1" value="runtime">
          <RuntimePanel instanceCount={instanceCount} statuses={runtimeStatuses} />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
