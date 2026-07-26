import type { FC } from 'react';

import { Badge } from '@/components/ui/badge';

import type { PatchLogEntry } from '../../hooks/use-markdown-stream-lab';

interface PatchLogProps {
  entries: PatchLogEntry[];
}

export const PatchLog: FC<PatchLogProps> = ({ entries }) => {
  return (
    <div className="space-y-2 pr-2" data-testid="patch-log">
      {entries.length === 0 && (
        <div className="rounded-lg border border-dashed p-5 text-center text-xs leading-5 text-muted-foreground">
          开始流式输出后，这里会展示带 Revision 的 Patch。
        </div>
      )}

      {entries.map((entry) => {
        return (
          <article key={entry.id} className="rounded-lg border bg-muted/20 p-3">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <Badge variant="secondary">{formatOperation(entry.operation)}</Badge>
              <span className="truncate font-mono text-[0.625rem] text-muted-foreground">req #{entry.reqId}</span>
            </div>
            <p className="mt-2 truncate font-mono text-xs" title={entry.block}>
              {entry.block}
            </p>
            <p className="mt-1 truncate font-mono text-[0.625rem] text-muted-foreground">
              r{entry.baseRevision} → r{entry.nextRevision} · {entry.rendererId}
            </p>
          </article>
        );
      })}
    </div>
  );
};

function formatOperation(operation: PatchLogEntry['operation']): string {
  if (operation === 'tailAppendText') {
    return 'TAIL';
  }

  if (operation === 'tailAppendFallbackHtml') {
    return 'SNAPSHOT';
  }

  return 'RANGE';
}
