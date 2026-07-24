import { EventType } from '@frontend-study/shared-types';

import { encodeSseEvent, encodeSseHeartbeat } from '../sse-encoder.js';

describe('SSE encoder', () => {
  it('keeps transport id outside the AG-UI payload', () => {
    const frame = encodeSseEvent('10-0', {
      delta: 'hello',
      messageId: 'message-id',
      type: EventType.TEXT_MESSAGE_CONTENT,
    });

    expect(frame).toBe('id: 10-0\ndata: {"delta":"hello","messageId":"message-id","type":"TEXT_MESSAGE_CONTENT"}\n\n');
    expect(frame).not.toContain('streamEventId');
  });

  it('encodes heartbeats as SSE comments', () => {
    expect(encodeSseHeartbeat()).toBe(': heartbeat\n\n');
  });
});
