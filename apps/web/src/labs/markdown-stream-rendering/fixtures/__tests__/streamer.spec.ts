import { createStreamFrames } from '../streamer';

describe('createStreamFrames', () => {
  it('creates reproducible chunks without splitting Unicode code points', () => {
    const configuration = {
      chunkRange: [1, 3] as const,
      fps: 30,
      mode: 'char' as const,
      seed: 42,
    };

    const first = createStreamFrames('中文🚀stream', configuration);
    const second = createStreamFrames('中文🚀stream', configuration);

    expect(first).toEqual(second);
    expect(first.at(-1)?.cumulative).toBe('中文🚀stream');
    expect(first.flatMap((frame) => Array.from(frame.delta))).toEqual(Array.from('中文🚀stream'));
  });

  it('moves token mode to a readable boundary', () => {
    const frames = createStreamFrames('hello world next', {
      chunkRange: [2, 2],
      fps: 30,
      mode: 'token',
      seed: 1,
    });

    expect(frames.at(0)?.delta).toBe('hello ');
    expect(frames.at(-1)?.done).toBe(true);
  });

  it('preserves a pre-rendered benchmark prefix while only splitting the continuation', () => {
    const frames = createStreamFrames(
      'streamed tail',
      {
        chunkRange: [2, 2],
        fps: 30,
        mode: 'char',
        seed: 1,
      },
      '# Existing benchmark\n\n',
    );

    expect(frames.at(0)?.cumulative.startsWith('# Existing benchmark\n\n')).toBe(true);
    expect(frames.at(-1)?.cumulative).toBe('# Existing benchmark\n\nstreamed tail');
    expect(frames.map((frame) => frame.delta).join('')).toBe('streamed tail');
  });
});
