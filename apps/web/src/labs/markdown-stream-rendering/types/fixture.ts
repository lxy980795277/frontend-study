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

export interface MarkdownFixture {
  content: string;
  description: string;
  id: string;
  label: string;
  seed: number;
}

export interface BenchmarkInspection {
  characters: number;
  codeBlockCount: number;
  codeBlockLineCounts: number[];
}

export interface OpenFence {
  character: '`' | '~';
  length: number;
  lineCount: number;
}
