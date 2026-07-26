import type { FC } from 'react';

import { Badge } from '@/components/ui/badge';

import type { RuntimeStatus } from '../../metrics/types';

interface RuntimePanelProps {
  instanceCount: 1 | 4;
  statuses: Readonly<Record<number, RuntimeStatus>>;
}

export const RuntimePanel: FC<RuntimePanelProps> = ({ instanceCount, statuses }) => {
  const instances = Array.from({ length: instanceCount }, (_, index) => index);

  return (
    <div className="space-y-2" data-testid="runtime-panel">
      {instances.map((instance) => {
        const status = statuses[instance] ?? {
          mode: 'incremental',
          phase: 'idle',
        };
        const destructive = status.mode === 'fallback';

        return (
          <article key={instance} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs">instance-{instance + 1}</span>
              <Badge className={destructive ? 'text-destructive' : 'text-success'} variant="outline">
                {status.mode}
              </Badge>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">phase</dt>
                <dd className="font-mono">{status.phase}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">committed chars</dt>
                <dd className="font-mono">{status.committedContentLength ?? 0}</dd>
              </div>
              {status.fallbackReason && (
                <div className="space-y-1 border-t pt-2">
                  <dt className="text-muted-foreground">fallback reason</dt>
                  <dd className="font-mono break-all text-destructive">{status.fallbackReason}</dd>
                </div>
              )}
            </dl>
          </article>
        );
      })}
    </div>
  );
};
