import {
  EventType,
  type AGUIEvent,
  type AssistantMessage,
  type LabRunAgentInput,
  type Message,
  type ToolCall,
  type ToolMessage,
} from '@frontend-study/shared-types';
import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';

import {
  AgentProducer,
  type AgentProducerResult,
  type ProducerContext,
  type ProducerStopReason,
} from './agent-producer.port.js';
import { getInputUserMessage } from './run-input.js';

const ABORT_POLL_INTERVAL_CHUNKS = 10;
const CHUNK_INTERVAL_MS = 20;
const MAX_CONTENT_CHUNK_SIZE = 12;
const MIN_CONTENT_CHUNK_SIZE = 2;

const sleep = async (delayMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

const getRandomChunkSize = (): number => {
  return MIN_CONTENT_CHUNK_SIZE + Math.floor(Math.random() * (MAX_CONTENT_CHUNK_SIZE - MIN_CONTENT_CHUNK_SIZE + 1));
};

const splitIntoRandomChunks = (content: string): string[] => {
  const characters = Array.from(content);
  const chunks: string[] = [];
  let index = 0;
  while (index < characters.length) {
    const chunkSize = getRandomChunkSize();
    chunks.push(characters.slice(index, index + chunkSize).join(''));
    index += chunkSize;
  }
  return chunks;
};

const buildResponse = (prompt: string): string => {
  return [
    '# Agent 流式工程分析',
    '',
    `你输入的是：“${prompt}”。这次回复仍由模拟 Agent 生成，但它会通过完整的生产化链路传输：Run 在 MySQL 中持久化，事件先进入 Redis Stream，再由 NestJS SSE Consumer 交付给浏览器。模拟的只是推理内容，不是网络、协议、状态机或恢复过程。`,
    '',
    '## 1. 为什么流式输出不能只理解为逐字打印',
    '',
    '真正的流式系统同时包含执行流、事件流和展示流。执行流负责驱动 Agent、工具与模型；事件流负责赋予每次变化稳定的顺序、身份和终态；展示流则把协议事件归并成用户看到的消息。如果三层混在一个请求回调中，浏览器一旦断线，执行任务也会被误杀，恢复只能重新生成，重复内容和重复扣费都难以避免。',
    '',
    '## 2. 这条请求经过的完整数据路径',
    '',
    '前端先创建 threadId、runId 和 user messageId，然后向统一的 POST /api/stream 发送 AG-UI RunAgentInput。服务端验证输入并在事务中创建 Run，随后获取分布式 Producer Lock。Producer 产生 RUN_STARTED、MESSAGES_SNAPSHOT、文本增量、工具调用和终态事件。每条事件写入 Redis Stream 后获得单调递增的 Stream ID，SSE 层把它放入 id 字段交给浏览器，前端最后通过 Reducer 投影为消息和连接状态。',
    '',
    '## 3. 标识符为什么必须分层',
    '',
    'threadId 表达长期会话，runId 表达一次执行，messageId 表达可归并的消息，toolCallId 表达一次工具调用。Redis Stream ID 只用于传输断点，不应该冒充业务 ID。这样设计后，同一个 Run 可以拥有多个消费者，同一条 Message 可以跨多次连接继续增量更新，而基础设施游标过期也不会破坏业务历史。',
    '',
    '## 4. 断线恢复的关键不是重试，而是续传',
    '',
    '页面内断线时，前端在内存保存最后成功应用的 Stream ID。重连仍使用相同的 threadId、runId 和规范化输入，只额外携带 Last-Event-ID。服务端不会创建第二个 Producer，而是从 Redis Stream 中读取游标之后的事件。如果 SSE 在没有 RUN_FINISHED 或 RUN_ERROR 的情况下结束，前端必须把它判定为异常 EOF，进入有上限的退避重试，不能误报完成。',
    '',
    '## 5. 页面刷新为什么走另一条恢复路径',
    '',
    '完整刷新会丢失内存游标，因此新页面只从 URL 读取 threadId，然后请求 Thread 详情。MySQL 返回已经持久化的消息以及结构化 activeRun；若仍有运行中的 Run，前端使用 activeRun.input 从 Redis Stream 起点重放。这个过程不依赖 localStorage，也不从最后一条消息猜 runId。历史事实来自数据库，活跃增量来自事件流，两者通过消息身份进行幂等归并。',
    '',
    '## 6. 去重需要同时覆盖事件和内容',
    '',
    '只比较文本内容并不可靠，因为模型可能合法地重复词句。前端首先使用 Redis Stream ID 去掉重复投递，再依据 messageId、toolCallId 和事件类型更新投影。MESSAGES_SNAPSHOT 用于建立基线，TEXT_MESSAGE_CONTENT 只追加到对应消息，TOOL_CALL_ARGS 只更新对应工具参数。重复连接、全量重放和历史水合因此可以收敛到同一个 UI 状态。',
    '',
    '## 7. 工具调用是默认协议节点',
    '',
    '本次 Run 会默认执行一次 searchKnowledge 模拟工具。你会依次看到 TOOL_CALL_START、一个或多个 TOOL_CALL_ARGS、TOOL_CALL_END 和 TOOL_CALL_RESULT。工具结果最终也会作为 Tool Message 持久化。这样可以验证文本生成与工具调用交错时，父消息、参数增量、执行结果和历史恢复是否仍保持一致，而不是只覆盖最简单的纯文本路径。',
    '',
    '## 8. 主动停止与网络中断是两种完全不同的语义',
    '',
    '网络中断只代表某个 Consumer 离开，Producer 应继续运行；主动停止则代表用户要求终止 Run。Abort Signal 先把状态推进到 CANCELLING，Producer 有机会关闭已开始的消息并保存部分内容。如果原进程已经退出，服务端还必须在有界宽限期后把孤儿 Run 强制收敛为 ABORTED，并发布唯一终态。只有收到标准终态事件，前端才能展示 aborted。',
    '',
    '## 9. 背压和资源释放决定系统能否长期运行',
    '',
    'SSE Response 写入返回 false 时，服务端需要等待 drain，同时与 close 信号竞速；否则慢客户端断开后，Handler 可能永久挂起。每个阻塞式 Redis XREAD 使用隔离连接，并在 HTTP Abort 时显式销毁。Producer Lock 需要续租和所有者 Token，Stream、Abort Key、Runtime Key 与 Terminal Marker 都必须设置 TTL，避免实验环境逐渐积累不可回收资源。',
    '',
    '## 10. 可观察性应该帮助定位状态，而不是泄露内容',
    '',
    '页面展示 threadId、runId、Last-Event-ID、重连次数、心跳时间和重复事件计数，事件面板保留最近的协议日志。服务端日志记录阶段、身份和稳定错误码，但不记录完整 Prompt、凭据或连接串。出现问题时，应能回答“Producer 是否还活着、终态是否落库、事件是否已写入、浏览器应用到哪个游标”，而不是依赖猜测。',
    '',
    '## 11. 一组可执行的生产检查清单',
    '',
    '- 同一 threadId 是否只允许一个活跃 Run。',
    '- 相同 runId 携带不同输入时是否返回明确冲突。',
    '- Consumer 断开后 Producer 是否继续写入事件。',
    '- 重连是否从最后已确认游标之后继续，而不是重新生成。',
    '- 页面刷新是否只依赖 URL、历史接口和 activeRun。',
    '- 任何成功、失败、停止路径是否都产生唯一终态。',
    '- Redis 事件过期后是否能回退到 MySQL 历史，而不是无限重试。',
    '- 慢客户端、服务重启和重复 Abort 是否都能最终收敛。',
    '',
    '## 12. 结论',
    '',
    '一个可信的流式前端，不是把 fetch 的响应逐段塞进 state，而是实现一套可以中断、重放、去重、终止和审计的事件驱动客户端。后端也不能把浏览器连接当作任务生命周期。把协议身份、持久化状态、短期回放与 UI 投影分离后，今天的模拟 Producer 可以替换成真实 Agent、模型网关或工作流引擎，而前端恢复机制无需推倒重来。',
  ].join('\n');
};

const createTextEndEvent = (messageId: string): AGUIEvent => {
  return {
    messageId,
    timestamp: Date.now(),
    type: EventType.TEXT_MESSAGE_END,
  };
};

@Injectable()
export class SimulatedAgentProducerService extends AgentProducer {
  async run(input: LabRunAgentInput, context: ProducerContext): Promise<AgentProducerResult> {
    const userMessage = getInputUserMessage(input);
    const prompt = userMessage.content;
    const assistantMessageId = uuidv7();
    const toolCallId = uuidv7();
    const toolMessageId = uuidv7();
    const simulation = input.forwardedProps.simulation ?? {};
    const chunks = splitIntoRandomChunks(buildResponse(prompt));
    const emittedContent: string[] = [];
    const persistedMessages: Message[] = [];
    const pendingEmissions: Promise<void>[] = [];
    let emissionError: Error | null = null;
    let toolCall: ToolCall | null = null;
    let toolMessage: ToolMessage | null = null;

    const queueEmission = (event: AGUIEvent): void => {
      const emission = context.emit(event).catch((error: unknown) => {
        emissionError ??= error instanceof Error ? error : new Error('AG-UI event emission failed', { cause: error });
      });
      pendingEmissions.push(emission);
    };
    const queuedContext: ProducerContext = {
      emit: (event) => {
        queueEmission(event);
        return Promise.resolve();
      },
      getStopReason: context.getStopReason,
    };
    const flushEmissions = async (): Promise<void> => {
      await Promise.all(pendingEmissions);
      if (emissionError) {
        throw emissionError;
      }
    };

    await context.emit({
      runId: input.runId,
      threadId: input.threadId,
      timestamp: Date.now(),
      type: EventType.RUN_STARTED,
    });
    await context.emit({
      messages: input.messages,
      timestamp: Date.now(),
      type: EventType.MESSAGES_SNAPSHOT,
    });
    await context.emit({
      messageId: assistantMessageId,
      role: 'assistant',
      timestamp: Date.now(),
      type: EventType.TEXT_MESSAGE_START,
    });

    for (const [index, chunk] of chunks.entries()) {
      const stopReason = index % ABORT_POLL_INTERVAL_CHUNKS === 0 ? await context.getStopReason() : null;
      if (stopReason) {
        queueEmission(createTextEndEvent(assistantMessageId));
        await flushEmissions();
        return this.createStoppedResult(stopReason, assistantMessageId, emittedContent.join(''), toolCall, toolMessage);
      }

      if (simulation.failAfterChunks && index >= simulation.failAfterChunks) {
        queueEmission(createTextEndEvent(assistantMessageId));
        await flushEmissions();
        return {
          errorCode: 'SIMULATED_PRODUCER_FAILURE',
          errorMessage: '模拟 Producer 在指定 Chunk 处失败',
          messages: this.createMessages(assistantMessageId, emittedContent.join(''), toolCall, toolMessage),
          status: 'FAILED',
        };
      }

      if (index === Math.floor(chunks.length / 3)) {
        const toolResult = await this.emitToolCall(
          queuedContext,
          assistantMessageId,
          toolCallId,
          toolMessageId,
          prompt,
        );
        toolCall = toolResult.toolCall;
        toolMessage = toolResult.toolMessage;
      }

      queueEmission({
        delta: chunk,
        messageId: assistantMessageId,
        timestamp: Date.now(),
        type: EventType.TEXT_MESSAGE_CONTENT,
      });
      emittedContent.push(chunk);
      await sleep(CHUNK_INTERVAL_MS);
    }

    queueEmission(createTextEndEvent(assistantMessageId));
    await flushEmissions();
    persistedMessages.push(...this.createMessages(assistantMessageId, emittedContent.join(''), toolCall, toolMessage));
    return {
      messages: persistedMessages,
      status: 'SUCCEEDED',
    };
  }

  private createMessages(
    assistantMessageId: string,
    content: string,
    toolCall: ToolCall | null,
    toolMessage: ToolMessage | null,
  ): Message[] {
    const assistantMessage: AssistantMessage = {
      content,
      id: assistantMessageId,
      role: 'assistant',
      ...(toolCall ? { toolCalls: [toolCall] } : {}),
    };
    return toolMessage ? [assistantMessage, toolMessage] : [assistantMessage];
  }

  private createStoppedResult(
    stopReason: ProducerStopReason,
    assistantMessageId: string,
    content: string,
    toolCall: ToolCall | null,
    toolMessage: ToolMessage | null,
  ): AgentProducerResult {
    const messages = content ? this.createMessages(assistantMessageId, content, toolCall, toolMessage) : [];
    if (stopReason === 'abort') {
      return { messages, status: 'ABORTED' };
    }

    return {
      errorCode: 'PRODUCER_LOCK_LOST',
      errorMessage: 'Producer 分布式锁已失效',
      messages,
      status: 'FAILED',
    };
  }

  private async emitToolCall(
    context: ProducerContext,
    parentMessageId: string,
    toolCallId: string,
    toolMessageId: string,
    prompt: string,
  ): Promise<{ toolCall: ToolCall; toolMessage: ToolMessage }> {
    const argumentsJson = JSON.stringify({ query: prompt.slice(0, 40) });
    const result = JSON.stringify({ matches: 3, source: 'simulated-index' });
    await context.emit({
      parentMessageId,
      timestamp: Date.now(),
      toolCallId,
      toolCallName: 'searchKnowledge',
      type: EventType.TOOL_CALL_START,
    });
    for (const chunk of splitIntoRandomChunks(argumentsJson)) {
      await context.emit({
        delta: chunk,
        timestamp: Date.now(),
        toolCallId,
        type: EventType.TOOL_CALL_ARGS,
      });
    }
    await context.emit({
      timestamp: Date.now(),
      toolCallId,
      type: EventType.TOOL_CALL_END,
    });
    await context.emit({
      content: result,
      messageId: toolMessageId,
      role: 'tool',
      timestamp: Date.now(),
      toolCallId,
      type: EventType.TOOL_CALL_RESULT,
    });

    return {
      toolCall: {
        function: {
          arguments: argumentsJson,
          name: 'searchKnowledge',
        },
        id: toolCallId,
        type: 'function',
      },
      toolMessage: {
        content: result,
        id: toolMessageId,
        role: 'tool',
        toolCallId,
      },
    };
  }
}
