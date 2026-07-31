import type { AGUIEvent, Message } from '@frontend-study/shared-types';

export interface ToolCallView {
  argumentsText: string;
  id: string;
  name: string;
  parentMessageId: string | null;
  result: string | null;
  status: 'arguments-streaming' | 'complete' | 'running';
}

export interface ChatMessageView {
  content: string;
  id: string;
  role: Message['role'];
  status: 'complete' | 'interrupted' | 'streaming';
  toolCallId: string | null;
  toolCalls: ToolCallView[];
}

export interface ProtocolLogEntry {
  event: AGUIEvent;
  receivedAt: number;
  streamId: string;
}

export interface ConversationProjection {
  duplicateEvents: number;
  messages: ChatMessageView[];
  processedStreamIds: string[];
  protocolLog: ProtocolLogEntry[];
  terminal: 'aborted' | 'failed' | 'succeeded' | null;
}
