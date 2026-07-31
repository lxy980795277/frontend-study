import type { MarkdownFixture } from '../types/fixture';

const LONG_PARAGRAPHS = Array.from({ length: 12 }, (_, index) => {
  const paragraphNumber = index + 1;
  return `## 渲染阶段 ${paragraphNumber}

流式 Markdown 的第 ${paragraphNumber} 个阶段持续追加中文、English words 与 Emoji 🚀。这一段用于观察普通文本的尾部追加命中率，同时验证自动换行、长内容滚动和 Unicode 边界不会破坏最终结果。`;
}).join('\n\n');
const INLINE = `# 内联结构边界

这是普通文本，随后形成 **加粗内容**，然后继续追加普通尾部。

链接会从不完整状态逐步形成：[Frontend Lab](https://example.com/docs)，链接之后仍然存在新的文本。

行内代码也会逐步完成：\`const answer = 42\`，结尾继续追加 & < > 等需要转义的字符。

> 引用中包含 **强调**、[链接](https://example.com) 和尾部文本，用于验证嵌套根节点不会成为错误的追加目标。`;
const CODE = `# 代码块流式边界

\`\`\`ts
interface StreamFrame {
  delta: string;
  cumulative: string;
  done: boolean;
}

export function consume(frame: StreamFrame): string {
  return frame.cumulative;
}
\`\`\`

代码围栏闭合时应触发快照回退，闭合后继续生成新的段落。

\`\`\`css
.streaming-panel {
  min-width: 0;
  overflow: hidden;
}
\`\`\``;
const TABLE_ROWS = Array.from({ length: 18 }, (_, index) => {
  return `| ${index + 1} | block-${index + 1} | ${index % 3 === 0 ? 'fallback' : 'tail append'} |`;
}).join('\n');
const TABLE = `# 表格延迟成形

| 序号 | Block | Strategy |
| ---: | :---- | :------- |
${TABLE_ROWS}

表格结束后继续输出普通文本，验证宽表格只在自己的内容区域横向滚动。`;
const UNSAFE = `# 不可信内容

下面的内容必须经过统一安全边界：

<script>window.__unsafe_markdown_executed__ = true</script>

<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onerror="window.__unsafe_markdown_executed__ = true">

<a href="javascript:alert('xss')">危险链接</a>

<a href="https://example.com">安全链接</a>

正常的 **Markdown** 必须继续渲染。`;
const MIXED = `# AI 报告：高频流式渲染链路

本文档模拟真实 Agent 输出，包含长文本、内联结构、列表、引用、代码与表格。

## 关键结论

1. Worker 负责解析与块级 Diff。
2. 主线程只应用带 Revision 的最小 Patch。
3. React 只挂载代码块和表格工具。
4. Worker 异常时降级到安全全量渲染。

> 正确性优先于快路径命中率。无法证明文本锚点安全时，必须使用 Snapshot Fallback。

${INLINE}

${CODE}

${TABLE}

${LONG_PARAGRAPHS}`;
export const MARKDOWN_FIXTURES = [
  {
    content: LONG_PARAGRAPHS,
    description: '长段落与 Unicode 尾部追加基线',
    id: 'plain',
    label: '长文本',
    seed: 1001,
  },
  {
    content: INLINE,
    description: '强调、链接和行内代码结构跳变',
    id: 'inline',
    label: '内联结构',
    seed: 2002,
  },
  {
    content: CODE,
    description: '代码围栏闭合与交互工具挂载',
    id: 'code',
    label: '代码块',
    seed: 3003,
  },
  {
    content: TABLE,
    description: '表格延迟成形与宽内容滚动',
    id: 'table',
    label: '表格',
    seed: 4004,
  },
  {
    content: MIXED,
    description: '接近真实 Agent 长回复的混合重型文档',
    id: 'mixed',
    label: '综合重型',
    seed: 5005,
  },
  {
    content: UNSAFE,
    description: '脚本、事件属性和危险 URL 安全验证',
    id: 'unsafe',
    label: 'XSS 安全',
    seed: 6006,
  },
] as const satisfies readonly MarkdownFixture[];
