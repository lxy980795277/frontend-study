import {
  AGENT_STREAM_ERROR_CODES,
  RunAgentInputSchema,
  type AgentSimulationOptions,
  type LabRunAgentInput,
  type UserMessage,
} from '@frontend-study/shared-types';
import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { validate as validateUuid, version as getUuidVersion } from 'uuid';

const MAX_FAIL_AFTER_CHUNKS = 500;
const MAX_INPUT_MESSAGES = 200;
const MAX_PROMPT_LENGTH = 4_000;

export type PlainTextUserMessage = UserMessage & { content: string };

const createInvalidInputError = (message: string): BadRequestException => {
  return new BadRequestException({
    code: AGENT_STREAM_ERROR_CODES.INVALID_STREAM_INPUT,
    message,
    statusCode: 400,
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isUuidV7 = (value: string): boolean => {
  return validateUuid(value) && getUuidVersion(value) === 7;
};

const normalizeSimulation = (value: unknown): AgentSimulationOptions => {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw createInvalidInputError('forwardedProps.simulation 必须是对象');
  }

  const allowedKeys = new Set(['failAfterChunks']);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw createInvalidInputError('forwardedProps.simulation 包含未知字段');
  }

  let failAfterChunks: number | undefined;
  if (value.failAfterChunks !== undefined) {
    if (
      typeof value.failAfterChunks !== 'number' ||
      !Number.isInteger(value.failAfterChunks) ||
      value.failAfterChunks < 1 ||
      value.failAfterChunks > MAX_FAIL_AFTER_CHUNKS
    ) {
      throw createInvalidInputError(`failAfterChunks 必须是 1～${MAX_FAIL_AFTER_CHUNKS} 的整数`);
    }
    failAfterChunks = value.failAfterChunks;
  }

  return {
    ...(failAfterChunks ? { failAfterChunks } : {}),
  };
};

const validateMessageIds = (input: LabRunAgentInput): void => {
  input.messages.forEach((message) => {
    if (!isUuidV7(message.id)) {
      throw createInvalidInputError('所有 messageId 必须是 UUIDv7');
    }

    if (message.role === 'assistant') {
      message.toolCalls?.forEach((toolCall) => {
        if (!isUuidV7(toolCall.id)) {
          throw createInvalidInputError('所有 toolCallId 必须是 UUIDv7');
        }
      });
    }

    if (message.role === 'tool' && !isUuidV7(message.toolCallId)) {
      throw createInvalidInputError('Tool Message 的 toolCallId 必须是 UUIDv7');
    }
  });
};

export const normalizeRunInput = (value: unknown): LabRunAgentInput => {
  const result = RunAgentInputSchema.safeParse(value);
  if (!result.success) {
    throw createInvalidInputError('请求体不符合 AG-UI RunAgentInput');
  }

  if (!isUuidV7(result.data.threadId) || !isUuidV7(result.data.runId)) {
    throw createInvalidInputError('threadId 和 runId 必须是 UUIDv7');
  }
  if (result.data.parentRunId !== undefined) {
    throw createInvalidInputError('本 Lab 暂不支持 parentRunId');
  }
  if (!isRecord(result.data.state) || Object.keys(result.data.state).length > 0) {
    throw createInvalidInputError('state 必须是空对象');
  }
  if (result.data.context.length > 0 || result.data.tools.length > 0) {
    throw createInvalidInputError('本 Lab 的 context 和 tools 必须为空数组');
  }
  if (result.data.messages.length === 0 || result.data.messages.length > MAX_INPUT_MESSAGES) {
    throw createInvalidInputError(`messages 数量必须是 1～${MAX_INPUT_MESSAGES}`);
  }

  const lastMessage = result.data.messages.at(-1);
  if (!lastMessage || lastMessage.role !== 'user' || typeof lastMessage.content !== 'string') {
    throw createInvalidInputError('最后一条消息必须是纯文本 User Message');
  }
  const normalizedPrompt = lastMessage.content.trim();
  if (!normalizedPrompt || normalizedPrompt.length > MAX_PROMPT_LENGTH) {
    throw createInvalidInputError(`用户输入长度必须是 1～${MAX_PROMPT_LENGTH}`);
  }

  const forwardedProps: unknown = result.data.forwardedProps;
  if (!isRecord(forwardedProps)) {
    throw createInvalidInputError('forwardedProps 必须是对象');
  }
  if (Object.keys(forwardedProps).some((key) => key !== 'simulation')) {
    throw createInvalidInputError('forwardedProps 包含未知字段');
  }

  const normalizedMessages = [...result.data.messages];
  normalizedMessages[normalizedMessages.length - 1] = {
    ...lastMessage,
    content: normalizedPrompt,
  };
  const normalizedInput: LabRunAgentInput = {
    context: [],
    forwardedProps: {
      simulation: normalizeSimulation(forwardedProps.simulation),
    },
    messages: normalizedMessages,
    runId: result.data.runId,
    state: {},
    threadId: result.data.threadId,
    tools: [],
  };
  validateMessageIds(normalizedInput);
  return normalizedInput;
};

const canonicalize = (value: unknown): string => {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  if (isRecord(value)) {
    const entries = Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => {
        return `${JSON.stringify(key)}:${canonicalize(value[key])}`;
      });
    return `{${entries.join(',')}}`;
  }

  throw createInvalidInputError('RunAgentInput 包含不可序列化字段');
};

export const hashRunInput = (input: LabRunAgentInput): string => {
  return createHash('sha256').update(canonicalize(input), 'utf8').digest('hex');
};

export const getInputUserMessage = (input: LabRunAgentInput): PlainTextUserMessage => {
  const message = input.messages.at(-1);
  if (!message || message.role !== 'user' || typeof message.content !== 'string') {
    throw createInvalidInputError('最后一条消息必须是纯文本 User Message');
  }

  return message as PlainTextUserMessage;
};
