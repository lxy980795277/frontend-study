import {
  BENCHMARK_COPY_COUNT,
  BENCHMARK_SEPARATOR,
  createBenchmarkBaseline,
  inspectBenchmarkMarkdown,
} from '../benchmark';
describe('Markdown benchmark fixture', () => {
  it('creates a deterministic ten-copy baseline without duplicating the source file', () => {
    const source = '# Report\n\nProduction content.';
    const baseline = createBenchmarkBaseline(source);
    expect(baseline.split(source)).toHaveLength(BENCHMARK_COPY_COUNT + 1);
    expect(baseline.split(BENCHMARK_SEPARATOR)).toHaveLength(BENCHMARK_COPY_COUNT);
    expect(createBenchmarkBaseline(source)).toBe(baseline);
  });
  it('reports fenced code line counts and rejects undersized code blocks', () => {
    const longCode = Array.from({ length: 300 }, (_, index) => {
      return `const line${index + 1} = ${index + 1};`;
    }).join('\n');
    const source = `# Report

\`\`\`ts
${longCode}
\`\`\`

\`\`\`ts
${longCode}
\`\`\``;
    expect(inspectBenchmarkMarkdown(source)).toMatchObject({
      codeBlockCount: 2,
      codeBlockLineCounts: [300, 300],
    });
    expect(() => {
      inspectBenchmarkMarkdown('# Report\n\n```ts\nconst short = true;\n```');
    }).toThrow(/300/u);
  });
});
