import { describe, expect, it } from 'vitest';
import { SseProtocolError, SseTextParser } from '../base-sse';
describe('SseTextParser', () => {
  it('parses an event split across CRLF and chunk boundaries', () => {
    const parser = new SseTextParser();
    const first = parser.feed('id: 10-0\r');
    const second = parser.feed('\nevent: message\r\ndata: {"text":"你');
    const third = parser.feed('好"}\r\n\r\n');
    expect(first).toEqual([]);
    expect(second).toEqual([]);
    expect(third).toEqual([
      {
        data: '{"text":"你好"}',
        event: 'message',
        id: '10-0',
        kind: 'event',
        retry: null,
      },
    ]);
  });
  it('joins multiline data and emits comments independently', () => {
    const parser = new SseTextParser();
    const records = parser.feed(': heartbeat\nid: 11-0\ndata: first\ndata: second\nretry: 500\n\n');
    expect(records).toEqual([
      { comment: 'heartbeat', kind: 'comment' },
      {
        data: 'first\nsecond',
        event: null,
        id: '11-0',
        kind: 'event',
        retry: 500,
      },
    ]);
  });
  it('flushes the final event at EOF', () => {
    const parser = new SseTextParser();
    parser.feed('id: 12-0\ndata: {"done":true}');
    expect(parser.finish()).toEqual([
      {
        data: '{"done":true}',
        event: null,
        id: '12-0',
        kind: 'event',
        retry: null,
      },
    ]);
  });
  it('rejects oversized events', () => {
    const parser = new SseTextParser(8);
    expect(() => {
      parser.feed('data: 123456789');
    }).toThrow(SseProtocolError);
  });
});
