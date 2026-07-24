import { v7 as uuidv7 } from 'uuid';

import { hashRunInput, normalizeRunInput } from '../run-input.js';

const createInput = () => {
  return {
    context: [],
    forwardedProps: {},
    messages: [
      {
        content: '  测试断线恢复  ',
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

describe('normalizeRunInput', () => {
  it('normalizes plain text and simulation defaults', () => {
    const input = normalizeRunInput(createInput());

    expect(input.messages.at(-1)).toMatchObject({
      content: '测试断线恢复',
      role: 'user',
    });
    expect(input.forwardedProps.simulation).toEqual({});
  });

  it('rejects context and non-whitelisted simulation fields', () => {
    expect(() => {
      normalizeRunInput({ ...createInput(), context: [{ description: 'x', value: 'x' }] });
    }).toThrow('context 和 tools 必须为空数组');

    expect(() => {
      normalizeRunInput({
        ...createInput(),
        forwardedProps: { simulation: { unknown: true } },
      });
    }).toThrow('包含未知字段');
  });

  it('creates a stable hash after normalization', () => {
    const rawInput = createInput();
    const first = normalizeRunInput(rawInput);
    const second = normalizeRunInput({ ...rawInput, forwardedProps: { simulation: {} } });

    expect(hashRunInput(first)).toBe(hashRunInput(second));
  });

  it('rejects client-controlled chunk timing and tool-call switches', () => {
    expect(() => {
      normalizeRunInput({
        ...createInput(),
        forwardedProps: { simulation: { chunkDelayMs: 120 } },
      });
    }).toThrow('包含未知字段');

    expect(() => {
      normalizeRunInput({
        ...createInput(),
        forwardedProps: { simulation: { includeToolCall: false } },
      });
    }).toThrow('包含未知字段');
  });
});
