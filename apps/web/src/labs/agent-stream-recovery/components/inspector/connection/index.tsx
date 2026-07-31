import type { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import type { RuntimeEntry } from '@/labs/agent-stream-recovery/types/runtime';
interface ConnectionInspectorProps {
  duplicateEvents: number;
  runtime: RuntimeEntry;
  threadId: string | null;
}
const formatTimestamp = (timestamp: number | null): string => {
  if (!timestamp) {
    return '—';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);
};
const getPhaseClassName = (phase: RuntimeEntry['phase']): string => {
  if (phase === 'completed') {
    return 'text-success';
  }
  if (phase === 'failed' || phase === 'aborted') {
    return 'text-destructive';
  }
  if (phase === 'streaming' || phase === 'connecting') {
    return 'text-primary';
  }
  return 'text-muted-foreground';
};
export const ConnectionInspector: FC<ConnectionInspectorProps> = ({ duplicateEvents, runtime, threadId }) => {
  const rows = [
    { label: 'threadId', value: threadId ?? '—' },
    { label: 'runId', value: runtime.runId ?? '—' },
    { label: 'Last-Event-ID', value: runtime.lastEventId ?? '—' },
    { label: 'reconnectAttempt', value: String(runtime.reconnectAttempt) },
    { label: 'duplicateEvents', value: String(duplicateEvents) },
    { label: 'lastHeartbeat', value: formatTimestamp(runtime.lastHeartbeatAt) },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
        <span className="text-xs text-muted-foreground">Connection phase</span>
        <Badge className={getPhaseClassName(runtime.phase)} variant="outline">
          {runtime.phase}
        </Badge>
      </div>
      <dl className="space-y-3">
        {rows.map((row) => {
          return (
            <div key={row.label} className="space-y-1">
              <dt className="text-[0.6875rem] tracking-wide text-muted-foreground">{row.label}</dt>
              <dd className="overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap" title={row.value}>
                {row.value}
              </dd>
            </div>
          );
        })}
      </dl>
      {runtime.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
          {runtime.error}
        </div>
      )}
    </div>
  );
};
