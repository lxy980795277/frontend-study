'use client';

import type { AgentSimulationOptions } from '@frontend-study/shared-types';
import { Activity, Braces, Network } from 'lucide-react';
import type { Dispatch, FC, SetStateAction } from 'react';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { ProtocolLogEntry } from '@/labs/agent-stream-recovery/types/conversation';
import type { RuntimeEntry } from '@/labs/agent-stream-recovery/types/runtime';
import { ConnectionInspector } from './connection';
import { EventLog } from './events';
import { FaultControls } from './faults';

interface InspectorProps {
  busy: boolean;
  duplicateEvents: number;
  entries: ProtocolLogEntry[];
  runtime: RuntimeEntry;
  simulation: AgentSimulationOptions;
  threadId: string | null;
  onSimulationChange: Dispatch<SetStateAction<AgentSimulationOptions>>;
}

export const Inspector: FC<InspectorProps> = ({
  busy,
  duplicateEvents,
  entries,
  onSimulationChange,
  runtime,
  simulation,
  threadId,
}) => {
  return (
    <Card
      className="min-w-0 p-4 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden"
      data-testid="inspector-card"
    >
      <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="connection">
        <TabsList className="grid w-full shrink-0 grid-cols-3">
          <TabsTrigger value="connection">
            <Activity aria-hidden className="mr-1 size-3.5" />
            连接
          </TabsTrigger>
          <TabsTrigger value="events">
            <Braces aria-hidden className="mr-1 size-3.5" />
            事件
          </TabsTrigger>
          <TabsTrigger value="faults">
            <Network aria-hidden className="mr-1 size-3.5" />
            故障
          </TabsTrigger>
        </TabsList>
        <TabsContent value="connection">
          <ConnectionInspector duplicateEvents={duplicateEvents} runtime={runtime} threadId={threadId} />
        </TabsContent>
        <TabsContent className="min-h-0 flex-1" value="events">
          <EventLog entries={entries} />
        </TabsContent>
        <TabsContent value="faults">
          <FaultControls busy={busy} simulation={simulation} onSimulationChange={onSimulationChange} />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
