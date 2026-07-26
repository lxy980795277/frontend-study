export const BENCHMARK_COPY_COUNT = 10;
export const BENCHMARK_SEPARATOR = '\n\n---\n\n';

const MINIMUM_CODE_BLOCK_COUNT = 2;
const MINIMUM_CODE_BLOCK_LINE_COUNT = 300;

export interface BenchmarkInspection {
  characters: number;
  codeBlockCount: number;
  codeBlockLineCounts: number[];
}

interface OpenFence {
  character: '`' | '~';
  length: number;
  lineCount: number;
}

export function createBenchmarkBaseline(source: string, copyCount = BENCHMARK_COPY_COUNT): string {
  const normalizedSource = source.trim();

  if (normalizedSource.length === 0) {
    throw new Error('Benchmark Markdown 不能为空。');
  }

  if (!Number.isInteger(copyCount) || copyCount < 1) {
    throw new Error('Benchmark Markdown 复制次数必须是正整数。');
  }

  return Array.from({ length: copyCount }, () => {
    return normalizedSource;
  }).join(BENCHMARK_SEPARATOR);
}

export function inspectBenchmarkMarkdown(source: string): BenchmarkInspection {
  const codeBlockLineCounts = collectCodeBlockLineCounts(source);

  if (codeBlockLineCounts.length < MINIMUM_CODE_BLOCK_COUNT) {
    throw new Error(
      `Benchmark Markdown 至少需要 ${MINIMUM_CODE_BLOCK_COUNT} 个 fenced code block，且每个代码块至少 ${MINIMUM_CODE_BLOCK_LINE_COUNT} 行。`,
    );
  }

  const undersizedBlock = codeBlockLineCounts.find((lineCount) => {
    return lineCount < MINIMUM_CODE_BLOCK_LINE_COUNT;
  });

  if (undersizedBlock !== undefined) {
    throw new Error(
      `Benchmark Markdown 的每个代码块至少需要 ${MINIMUM_CODE_BLOCK_LINE_COUNT} 行，当前最短代码块仅 ${undersizedBlock} 行。`,
    );
  }

  return {
    characters: Array.from(source).length,
    codeBlockCount: codeBlockLineCounts.length,
    codeBlockLineCounts,
  };
}

function collectCodeBlockLineCounts(source: string): number[] {
  const lineCounts: number[] = [];
  let openFence: OpenFence | null = null;

  source.split(/\r?\n/u).forEach((line) => {
    if (openFence === null) {
      const opening = line.match(/^\s*(`{3,}|~{3,})/u);
      const marker = opening?.[1];

      if (marker) {
        openFence = {
          character: marker[0] as OpenFence['character'],
          length: marker.length,
          lineCount: 0,
        };
      }
      return;
    }

    const normalizedLine = line.trim();
    const isClosingFence =
      normalizedLine.length >= openFence.length &&
      Array.from(normalizedLine).every((character) => {
        return character === openFence?.character;
      });

    if (isClosingFence) {
      lineCounts.push(openFence.lineCount);
      openFence = null;
      return;
    }

    openFence.lineCount += 1;
  });

  return lineCounts;
}
