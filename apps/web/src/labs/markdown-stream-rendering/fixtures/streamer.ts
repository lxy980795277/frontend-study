import { createSeededRandom } from './seeded-random';

export interface StreamFrame {
  cumulative: string;
  delta: string;
  done: boolean;
  index: number;
}

export interface StreamConfiguration {
  chunkRange: readonly [number, number];
  fps: number;
  mode: 'char' | 'token';
  seed: number;
}

export function createStreamFrames(
  content: string,
  configuration: StreamConfiguration,
  initialContent = '',
): StreamFrame[] {
  const characters = Array.from(content);
  const random = createSeededRandom(configuration.seed);
  const frames: StreamFrame[] = [];
  let cumulative = initialContent;
  let cursor = 0;

  while (cursor < characters.length) {
    const [minimum, maximum] = configuration.chunkRange;
    const randomSize = minimum + Math.floor(random() * (maximum - minimum + 1));
    const nextCursor =
      configuration.mode === 'token'
        ? findTokenBoundary(characters, Math.min(characters.length, cursor + randomSize))
        : Math.min(characters.length, cursor + randomSize);
    const delta = characters.slice(cursor, nextCursor).join('');
    cumulative += delta;
    cursor = nextCursor;

    frames.push({
      cumulative,
      delta,
      done: cursor >= characters.length,
      index: frames.length,
    });
  }

  return frames;
}

export class DeterministicStreamer {
  private cursor = 0;
  private fps: number;
  private playing = false;
  private timerId: number | null = null;

  constructor(
    private readonly frames: StreamFrame[],
    fps: number,
    private readonly onFrame: (frame: StreamFrame) => void,
    private readonly onFinish: () => void,
  ) {
    this.fps = fps;
  }

  get isDone(): boolean {
    return this.cursor >= this.frames.length;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  start(): void {
    if (this.playing || this.isDone) {
      return;
    }

    this.playing = true;
    this.tick();
  }

  pause(): void {
    this.playing = false;
    this.clearTimer();
  }

  reset(): void {
    this.pause();
    this.cursor = 0;
  }

  setFps(fps: number): void {
    this.fps = fps;
  }

  private tick = (): void => {
    if (!this.playing) {
      return;
    }

    const frame = this.frames[this.cursor];
    if (!frame) {
      this.playing = false;
      this.onFinish();
      return;
    }

    this.cursor += 1;
    this.onFrame(frame);

    if (frame.done) {
      this.playing = false;
      this.onFinish();
      return;
    }

    this.timerId = window.setTimeout(this.tick, 1_000 / this.fps);
  };

  private clearTimer(): void {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}

function findTokenBoundary(characters: string[], start: number): number {
  let cursor = start;

  while (cursor < characters.length) {
    const character = characters[cursor];
    if (!character || /[\s,.;:!?，。；：！？、)\]}]/u.test(character)) {
      break;
    }
    cursor += 1;
  }

  return Math.min(characters.length, cursor + 1);
}
