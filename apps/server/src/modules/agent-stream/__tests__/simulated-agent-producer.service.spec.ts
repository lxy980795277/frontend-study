import { EventType, type AGUIEvent, type LabRunAgentInput } from '@frontend-study/shared-types';
import { v7 as uuidv7 } from 'uuid';

import { SimulatedAgentProducerService } from '../simulated-agent-producer.service.js';

const createInput = (simulation: LabRunAgentInput['forwardedProps']['simulation'] = {}): LabRunAgentInput => {
  return {
    context: [],
    forwardedProps: { simulation },
    messages: [
      {
        content: '验证 Producer',
        id: uuidv7(),
        role: 'user',
      },
    ],
    runId: uuidv7(),
    state: {},
    threadId: uuidv7(),
    tools: [],
  };
};

describe('SimulatedAgentProducerService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('emits a long response with random-sized deltas and a default tool lifecycle', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.99).mockReturnValue(0.5);
    const producer = new SimulatedAgentProducerService();
    const events: AGUIEvent[] = [];
    const resultPromise = producer.run(createInput(), {
      emit: (event) => {
        events.push(event);
        return Promise.resolve();
      },
      getStopReason: () => {
        return Promise.resolve(null);
      },
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe('SUCCEEDED');
    expect(events[0]?.type).toBe(EventType.RUN_STARTED);
    expect(events[1]?.type).toBe(EventType.MESSAGES_SNAPSHOT);
    expect(events[2]?.type).toBe(EventType.TEXT_MESSAGE_START);
    expect(events.at(-1)?.type).toBe(EventType.TEXT_MESSAGE_END);
    const contentEvents = events.filter((event) => event.type === EventType.TEXT_MESSAGE_CONTENT);
    const content = contentEvents.map((event) => event.delta).join('');
    const chunkLengths = contentEvents.map((event) => Array.from(event.delta).length);
    expect(content.length).toBeGreaterThan(1_000);
    expect(chunkLengths[0]).toBe(2);
    expect(chunkLengths[1]).toBe(12);
    expect(events.some((event) => event.type === EventType.TOOL_CALL_START)).toBe(true);
    expect(events.some((event) => event.type === EventType.TOOL_CALL_RESULT)).toBe(true);
  });

  it('returns ABORTED and closes an opened message', async () => {
    const producer = new SimulatedAgentProducerService();
    const events: AGUIEvent[] = [];

    const result = await producer.run(createInput(), {
      emit: (event) => {
        events.push(event);
        return Promise.resolve();
      },
      getStopReason: () => {
        return Promise.resolve('abort');
      },
    });

    expect(result.status).toBe('ABORTED');
    expect(events.at(-1)?.type).toBe(EventType.TEXT_MESSAGE_END);
  });
});
