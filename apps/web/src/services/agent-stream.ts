import {
  EventSchemas,
  type AbortAgentRunRequest,
  type AbortAgentRunResponse,
  type AGUIEvent,
  type LabRunAgentInput,
} from '@frontend-study/shared-types';

import { post } from './base-request';
import { postSse, type SseCompletion, SseProtocolError } from './base-sse';

const AGENT_STREAM_ENDPOINT = '/backend/stream';

export interface ReceivedAgentStreamEvent {
  event: AGUIEvent;
  streamId: string;
}

export interface OpenAgentStreamOptions {
  input: LabRunAgentInput;
  lastEventId?: string;
  onEvent: (event: ReceivedAgentStreamEvent) => void;
  onHeartbeat?: () => void;
  onOpen?: () => void;
  signal: AbortSignal;
}

export const openAgentStream = async (options: OpenAgentStreamOptions): Promise<SseCompletion> => {
  const headers = new Headers();
  if (options.lastEventId) {
    headers.set('Last-Event-ID', options.lastEventId);
  }

  return postSse<unknown>(AGENT_STREAM_ENDPOINT, {
    body: options.input,
    headers,
    onComment: (comment) => {
      if (comment === 'heartbeat') {
        options.onHeartbeat?.();
      }
    },
    onEvent: (sseEvent) => {
      if (!sseEvent.id) {
        throw new SseProtocolError('AG-UI business event is missing an SSE id');
      }

      const eventResult = EventSchemas.safeParse(sseEvent.data);
      if (!eventResult.success) {
        throw new SseProtocolError('SSE data is not a valid AG-UI event');
      }

      options.onEvent({
        event: eventResult.data,
        streamId: sseEvent.id,
      });
    },
    onOpen: options.onOpen,
    signal: options.signal,
  });
};

export const abortAgentRun = (input: AbortAgentRunRequest, signal?: AbortSignal): Promise<AbortAgentRunResponse> => {
  return post<AbortAgentRunResponse>(`${AGENT_STREAM_ENDPOINT}/abort`, input, { signal });
};
