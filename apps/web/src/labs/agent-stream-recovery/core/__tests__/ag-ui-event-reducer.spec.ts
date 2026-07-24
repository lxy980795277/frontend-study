import { EventType } from '@frontend-study/shared-types';
import { v7 as uuidv7 } from 'uuid';

import { applyAgentStreamEvent, createEmptyProjection } from '../ag-ui-event-reducer';

describe('AG-UI event reducer', () => {
  it('builds streamed text and ignores a duplicated Stream ID', () => {
    const messageId = uuidv7();
    let state = createEmptyProjection();
    state = applyAgentStreamEvent(state, '1-0', {
      messageId,
      role: 'assistant',
      type: EventType.TEXT_MESSAGE_START,
    });
    state = applyAgentStreamEvent(state, '2-0', {
      delta: 'hello',
      messageId,
      type: EventType.TEXT_MESSAGE_CONTENT,
    });
    state = applyAgentStreamEvent(state, '2-0', {
      delta: 'hello',
      messageId,
      type: EventType.TEXT_MESSAGE_CONTENT,
    });

    expect(state.messages[0]?.content).toBe('hello');
    expect(state.duplicateEvents).toBe(1);
  });

  it('uses MESSAGES_SNAPSHOT as a deterministic replay baseline', () => {
    const userMessageId = uuidv7();
    let state = createEmptyProjection();
    state = applyAgentStreamEvent(state, '1-0', {
      messages: [{ content: 'old', id: userMessageId, role: 'user' }],
      type: EventType.MESSAGES_SNAPSHOT,
    });
    state = applyAgentStreamEvent(state, '2-0', {
      messages: [{ content: 'new baseline', id: userMessageId, role: 'user' }],
      type: EventType.MESSAGES_SNAPSHOT,
    });

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]?.content).toBe('new baseline');
  });

  it('treats RUN_FINISHED with aborted result as an aborted terminal', () => {
    const state = applyAgentStreamEvent(createEmptyProjection(), '1-0', {
      result: { status: 'aborted' },
      runId: uuidv7(),
      threadId: uuidv7(),
      type: EventType.RUN_FINISHED,
    });

    expect(state.terminal).toBe('aborted');
  });
});
