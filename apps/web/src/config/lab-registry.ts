export interface LabDefinition {
  category: string;
  description: string;
  difficulty: 'advanced' | 'expert';
  route: string;
  slug: string;
  status: 'planned' | 'building' | 'ready';
  title: string;
}

export const LAB_REGISTRY: readonly LabDefinition[] = [
  {
    category: 'AI Streaming',
    description: '基于 AG-UI、SSE 与 Redis Stream 验证断线续传、刷新恢复和事件幂等。',
    difficulty: 'expert',
    route: '/labs/agent-stream-recovery',
    slug: 'agent-stream-recovery',
    status: 'ready',
    title: 'Agent 流式断线恢复',
  },
  {
    category: 'Rendering Performance',
    description: '基于 Web Worker、块级 Diff 与最小 DOM Patch 验证高频 Markdown 增量渲染。',
    difficulty: 'expert',
    route: '/labs/markdown-stream-rendering',
    slug: 'markdown-stream-rendering',
    status: 'ready',
    title: 'Markdown 流式增量渲染',
  },
];
