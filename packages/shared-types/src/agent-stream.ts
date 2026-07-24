import type { Message, RunAgentInput } from '@ag-ui/core';

export {
  EventSchemas,
  EventType,
  MessageSchema,
  RunAgentInputSchema,
  type AGUIEvent,
  type AssistantMessage,
  type BaseEvent,
  type Message,
  type MessagesSnapshotEvent,
  type RunAgentInput,
  type RunErrorEvent,
  type RunFinishedEvent,
  type RunStartedEvent,
  type TextMessageContentEvent,
  type TextMessageEndEvent,
  type TextMessageStartEvent,
  type ToolCallArgsEvent,
  type ToolCall,
  type ToolCallEndEvent,
  type ToolCallResultEvent,
  type ToolCallStartEvent,
  type ToolMessage,
  type UserMessage,
} from '@ag-ui/core';

export const AGENT_RUN_STATUSES = ['PENDING', 'RUNNING', 'CANCELLING', 'SUCCEEDED', 'FAILED', 'ABORTED'] as const;

export const ACTIVE_AGENT_RUN_STATUSES = ['PENDING', 'RUNNING', 'CANCELLING'] as const;

export const MESSAGE_PERSISTENCE_STATUSES = ['COMPLETED', 'INTERRUPTED'] as const;

export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];
export type ActiveAgentRunStatus = (typeof ACTIVE_AGENT_RUN_STATUSES)[number];
export type MessagePersistenceStatus = (typeof MESSAGE_PERSISTENCE_STATUSES)[number];

export interface AgentSimulationOptions {
  failAfterChunks?: number;
}

export interface AgentStreamForwardedProps {
  simulation?: AgentSimulationOptions;
}

export interface LabRunAgentInput extends Omit<RunAgentInput, 'context' | 'forwardedProps' | 'state' | 'tools'> {
  context: [];
  forwardedProps: AgentStreamForwardedProps;
  state: Record<string, never>;
  tools: [];
}

export interface ThreadActiveRunSummary {
  runId: string;
  startedAt: string | null;
  status: ActiveAgentRunStatus;
}

export interface ThreadActiveRun extends ThreadActiveRunSummary {
  input: LabRunAgentInput;
}

export interface ThreadSummary {
  activeRun: ThreadActiveRunSummary | null;
  createdAt: string;
  id: string;
  title: string | null;
  updatedAt: string;
}

export interface ThreadMessage {
  createdAt: string;
  message: Message;
  runId: string;
  status: MessagePersistenceStatus;
  updatedAt: string;
}

export interface ThreadDetail extends Omit<ThreadSummary, 'activeRun'> {
  activeRun: ThreadActiveRun | null;
  messages: ThreadMessage[];
}

export interface CreateThreadRequest {
  title?: string;
}

export interface ThreadListQuery {
  cursor?: string;
  limit?: number;
}

export interface ThreadListResponse {
  items: ThreadSummary[];
  nextCursor: string | null;
}

export interface AbortAgentRunRequest {
  runId: string;
  threadId: string;
}

export interface AbortAgentRunResponse {
  runId: string;
  status: AgentRunStatus;
  threadId: string;
}

export interface AgentRunResult {
  status: 'aborted' | 'succeeded';
}

export const AGENT_STREAM_ERROR_CODES = {
  ACTIVE_RUN_NOT_FOUND: 'ACTIVE_RUN_NOT_FOUND',
  INVALID_STREAM_CURSOR: 'INVALID_STREAM_CURSOR',
  INVALID_STREAM_INPUT: 'INVALID_STREAM_INPUT',
  RUN_INPUT_CONFLICT: 'RUN_INPUT_CONFLICT',
  RUN_NOT_FOUND: 'RUN_NOT_FOUND',
  STREAM_EXPIRED: 'STREAM_EXPIRED',
  THREAD_BUSY: 'THREAD_BUSY',
  THREAD_HAS_ACTIVE_RUN: 'THREAD_HAS_ACTIVE_RUN',
  THREAD_NOT_FOUND: 'THREAD_NOT_FOUND',
} as const;

export type AgentStreamErrorCode = (typeof AGENT_STREAM_ERROR_CODES)[keyof typeof AGENT_STREAM_ERROR_CODES];

export interface ApiErrorBody {
  code?: string;
  message: string | string[];
  statusCode: number;
}
