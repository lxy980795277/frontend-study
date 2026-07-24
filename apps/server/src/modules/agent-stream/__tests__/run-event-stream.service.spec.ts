import { isCursorWithinRange } from '../run-event-stream.service.js';

describe('isCursorWithinRange', () => {
  it('accepts cursors at or between retained stream boundaries', () => {
    expect(isCursorWithinRange('100-0', '100-0', '120-2')).toBe(true);
    expect(isCursorWithinRange('110-7', '100-0', '120-2')).toBe(true);
    expect(isCursorWithinRange('120-2', '100-0', '120-2')).toBe(true);
  });

  it('rejects trimmed, future and malformed cursors', () => {
    expect(isCursorWithinRange('99-9', '100-0', '120-2')).toBe(false);
    expect(isCursorWithinRange('121-0', '100-0', '120-2')).toBe(false);
    expect(isCursorWithinRange('invalid', '100-0', '120-2')).toBe(false);
  });
});
