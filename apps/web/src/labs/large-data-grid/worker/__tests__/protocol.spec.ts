import { isGridWorkerResponse } from '../protocol';
const envelope = {
  protocolVersion: 1,
  rendererId: 'renderer-1',
  requestId: 4,
  sessionId: 9,
} as const;
describe('isGridWorkerResponse', () => {
  it('accepts a valid ready response', () => {
    expect(
      isGridWorkerResponse({
        ...envelope,
        mode: 'render',
        type: 'ready',
      }),
    ).toBe(true);
  });
  it('rejects a response from an unknown protocol', () => {
    expect(
      isGridWorkerResponse({
        ...envelope,
        protocolVersion: 2,
        type: 'disposed',
      }),
    ).toBe(false);
  });
  it('rejects a known type with a malformed payload', () => {
    expect(
      isGridWorkerResponse({
        ...envelope,
        projectionBuffer: 'not-an-array-buffer',
        queryVersion: 3,
        summary: {
          digest: 'abc',
          rowCount: 1,
        },
        type: 'query-result',
      }),
    ).toBe(false);
  });
  it('rejects malformed frame metrics and misaligned projection buffers', () => {
    expect(
      isGridWorkerResponse({
        ...envelope,
        metrics: {
          drawMs: Number.NaN,
        },
        queryVersion: 1,
        type: 'frame-drawn',
      }),
    ).toBe(false);
    expect(
      isGridWorkerResponse({
        ...envelope,
        projectionBuffer: new ArrayBuffer(3),
        queryVersion: 3,
        summary: {
          digest: 'abc',
          firstRowId: null,
          lastRowId: null,
          rowCount: 0,
        },
        type: 'query-result',
      }),
    ).toBe(false);
  });
});
