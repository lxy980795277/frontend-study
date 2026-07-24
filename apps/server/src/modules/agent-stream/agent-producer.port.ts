import type { AGUIEvent, LabRunAgentInput, Message } from '@frontend-study/shared-types';

export type ProducerStopReason = 'abort' | 'lock-lost' | null;

export interface ProducerContext {
  emit: (event: AGUIEvent) => Promise<void>;
  getStopReason: () => Promise<ProducerStopReason>;
}

export type AgentProducerResult =
  | {
      messages: Message[];
      status: 'ABORTED' | 'SUCCEEDED';
    }
  | {
      errorCode: string;
      errorMessage: string;
      messages: Message[];
      status: 'FAILED';
    };

export abstract class AgentProducer {
  abstract run(input: LabRunAgentInput, context: ProducerContext): Promise<AgentProducerResult>;
}
