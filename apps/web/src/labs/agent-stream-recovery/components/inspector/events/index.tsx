import type { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ProtocolLogEntry } from '@/labs/agent-stream-recovery/types/conversation';
interface EventLogProps {
  entries: ProtocolLogEntry[];
}
export const EventLog: FC<EventLogProps> = ({ entries }) => {
  return (
    <ScrollArea className="h-[25rem] min-h-0 xl:h-full" data-testid="event-scroll-area">
      <div className="space-y-2 pr-3" data-testid="event-log">
        {entries.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs leading-5 text-muted-foreground">
            尚未收到 AG-UI 事件
          </div>
        )}
        {[...entries].reverse().map((entry) => {
          return (
            <details key={entry.streamId} className="group rounded-lg border bg-muted/20 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="min-w-0 truncate font-mono text-xs">{entry.streamId}</span>
                <Badge variant="secondary">{entry.event.type}</Badge>
              </summary>
              <pre className="mt-3 overflow-x-auto border-t pt-3 text-[0.6875rem] leading-5 whitespace-pre-wrap text-muted-foreground">
                {JSON.stringify(entry.event, null, 2)}
              </pre>
            </details>
          );
        })}
      </div>
    </ScrollArea>
  );
};
