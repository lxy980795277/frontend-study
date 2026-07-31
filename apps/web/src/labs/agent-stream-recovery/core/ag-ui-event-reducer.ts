import {
  EventType,
  type AGUIEvent,
  type Message,
  type ThreadMessage,
  type ToolCall,
} from '@frontend-study/shared-types';
import type { ChatMessageView, ConversationProjection, ProtocolLogEntry, ToolCallView } from '../types/conversation';

const MAX_PROCESSED_STREAM_IDS = 1000;
const MAX_PROTOCOL_LOG_ENTRIES = 200;
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
export const createEmptyProjection = (): ConversationProjection => {
  return {
    duplicateEvents: 0,
    messages: [],
    processedStreamIds: [],
    protocolLog: [],
    terminal: null,
  };
};
const readContent = (message: Message): string => {
  const content: unknown = 'content' in message ? message.content : '';
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (isRecord(part) && part.type === 'text' && typeof part.text === 'string') {
          return part.text;
        }
        if (isRecord(part) && typeof part.type === 'string') {
          return `[${part.type}]`;
        }
        return '[content]';
      })
      .join('');
  }
  return '';
};
const mapToolCall = (toolCall: ToolCall, parentMessageId: string): ToolCallView => {
  return {
    argumentsText: toolCall.function.arguments,
    id: toolCall.id,
    name: toolCall.function.name,
    parentMessageId,
    result: null,
    status: 'complete',
  };
};
const mapMessage = (message: Message, status: ChatMessageView['status'] = 'complete'): ChatMessageView => {
  return {
    content: readContent(message),
    id: message.id,
    role: message.role,
    status,
    toolCallId: message.role === 'tool' ? message.toolCallId : null,
    toolCalls:
      message.role === 'assistant'
        ? (message.toolCalls?.map((toolCall) => {
            return mapToolCall(toolCall, message.id);
          }) ?? [])
        : [],
  };
};
const attachToolResults = (messages: ChatMessageView[], sourceMessages: Message[]): ChatMessageView[] => {
  return sourceMessages.reduce((currentMessages, sourceMessage) => {
    if (sourceMessage.role !== 'tool') {
      return currentMessages;
    }
    const toolCallId = sourceMessage.toolCallId;
    const result = readContent(sourceMessage);
    return updateToolCall(currentMessages, toolCallId, (toolCall) => {
      return {
        ...toolCall,
        result,
        status: 'complete',
      };
    });
  }, messages);
};
export const createProjectionFromHistory = (messages: ThreadMessage[]): ConversationProjection => {
  const projection = createEmptyProjection();
  const sourceMessages = messages.map((item) => {
    return item.message;
  });
  const mappedMessages = messages.map((item) => {
    return mapMessage(item.message, item.status === 'INTERRUPTED' ? 'interrupted' : 'complete');
  });
  projection.messages = attachToolResults(mappedMessages, sourceMessages);
  return projection;
};
const addProcessedStreamId = (ids: string[], streamId: string): string[] => {
  return [...ids, streamId].slice(-MAX_PROCESSED_STREAM_IDS);
};
const addProtocolLog = (log: ProtocolLogEntry[], streamId: string, event: AGUIEvent): ProtocolLogEntry[] => {
  return [...log, { event, receivedAt: Date.now(), streamId }].slice(-MAX_PROTOCOL_LOG_ENTRIES);
};
const upsertMessage = (
  messages: ChatMessageView[],
  messageId: string,
  update: (message: ChatMessageView) => ChatMessageView,
): ChatMessageView[] => {
  const existingIndex = messages.findIndex((message) => {
    return message.id === messageId;
  });
  if (existingIndex === -1) {
    return [
      ...messages,
      update({
        content: '',
        id: messageId,
        role: 'assistant',
        status: 'streaming',
        toolCallId: null,
        toolCalls: [],
      }),
    ];
  }
  return messages.map((message, index) => {
    return index === existingIndex ? update(message) : message;
  });
};
const updateToolCall = (
  messages: ChatMessageView[],
  toolCallId: string,
  update: (toolCall: ToolCallView) => ToolCallView,
): ChatMessageView[] => {
  return messages.map((message) => {
    return {
      ...message,
      toolCalls: message.toolCalls.map((toolCall) => {
        return toolCall.id === toolCallId ? update(toolCall) : toolCall;
      }),
    };
  });
};
const isAbortedResult = (result: unknown): boolean => {
  return typeof result === 'object' && result !== null && 'status' in result && result.status === 'aborted';
};
export const applyAgentStreamEvent = (
  projection: ConversationProjection,
  streamId: string,
  event: AGUIEvent,
): ConversationProjection => {
  // 重连会从 lastEventId 边界重复投递事件；streamId 是投影层唯一的幂等键。
  if (projection.processedStreamIds.includes(streamId)) {
    return {
      ...projection,
      duplicateEvents: projection.duplicateEvents + 1,
    };
  }
  let messages = projection.messages;
  let terminal = projection.terminal;

  // Reducer 只把协议事件投影成 UI 状态，不在这里触发网络或 Store 副作用。
  switch (event.type) {
    case EventType.MESSAGES_SNAPSHOT:
      messages = attachToolResults(
        event.messages.map((message) => {
          return mapMessage(message);
        }),
        event.messages,
      );
      break;
    case EventType.TEXT_MESSAGE_START:
      messages = upsertMessage(messages, event.messageId, (message) => {
        return {
          ...message,
          role: event.role,
          status: 'streaming',
        };
      });
      break;
    case EventType.TEXT_MESSAGE_CONTENT:
      messages = upsertMessage(messages, event.messageId, (message) => {
        return {
          ...message,
          content: `${message.content}${event.delta}`,
          status: 'streaming',
        };
      });
      break;
    case EventType.TEXT_MESSAGE_END:
      messages = upsertMessage(messages, event.messageId, (message) => {
        return {
          ...message,
          status: 'complete',
        };
      });
      break;
    case EventType.TOOL_CALL_START:
      messages = upsertMessage(messages, event.parentMessageId ?? 'orphan-tool-calls', (message) => {
        if (
          message.toolCalls.some((toolCall) => {
            return toolCall.id === event.toolCallId;
          })
        ) {
          return message;
        }
        return {
          ...message,
          toolCalls: [
            ...message.toolCalls,
            {
              argumentsText: '',
              id: event.toolCallId,
              name: event.toolCallName,
              parentMessageId: event.parentMessageId ?? null,
              result: null,
              status: 'running',
            },
          ],
        };
      });
      break;
    case EventType.TOOL_CALL_ARGS:
      messages = updateToolCall(messages, event.toolCallId, (toolCall) => {
        return {
          ...toolCall,
          argumentsText: `${toolCall.argumentsText}${event.delta}`,
          status: 'arguments-streaming',
        };
      });
      break;
    case EventType.TOOL_CALL_END:
      messages = updateToolCall(messages, event.toolCallId, (toolCall) => {
        return { ...toolCall, status: 'running' };
      });
      break;
    case EventType.TOOL_CALL_RESULT:
      messages = updateToolCall(messages, event.toolCallId, (toolCall) => {
        return {
          ...toolCall,
          result: event.content,
          status: 'complete',
        };
      });
      break;
    case EventType.RUN_FINISHED:
      terminal = isAbortedResult(event.result) ? 'aborted' : 'succeeded';
      break;
    case EventType.RUN_ERROR:
      terminal = 'failed';
      break;
    default:
      break;
  }
  return {
    ...projection,
    messages,
    processedStreamIds: addProcessedStreamId(projection.processedStreamIds, streamId),
    protocolLog: addProtocolLog(projection.protocolLog, streamId, event),
    terminal,
  };
};
export const appendOptimisticUserMessage = (
  projection: ConversationProjection,
  message: Extract<
    Message,
    {
      role: 'user';
    }
  >,
): ConversationProjection => {
  if (
    projection.messages.some((item) => {
      return item.id === message.id;
    })
  ) {
    return projection;
  }
  return {
    ...projection,
    messages: [...projection.messages, mapMessage(message)],
  };
};
export const toAgUiMessages = (projection: ConversationProjection): Message[] => {
  return projection.messages
    .filter((message) => {
      return message.status !== 'streaming';
    })
    .map((message): Message => {
      if (message.role === 'user') {
        return { content: message.content, id: message.id, role: 'user' };
      }
      if (message.role === 'assistant') {
        return {
          content: message.content,
          id: message.id,
          role: 'assistant',
          ...(message.toolCalls.length > 0
            ? {
                toolCalls: message.toolCalls.map((toolCall) => {
                  return {
                    function: {
                      arguments: toolCall.argumentsText,
                      name: toolCall.name,
                    },
                    id: toolCall.id,
                    type: 'function' as const,
                  };
                }),
              }
            : {}),
        };
      }
      if (message.role === 'tool') {
        return {
          content: message.content,
          id: message.id,
          role: 'tool',
          toolCallId: message.toolCallId ?? message.id,
        };
      }
      return {
        content: message.content,
        id: message.id,
        role: message.role,
      } as Message;
    });
};
