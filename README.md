# AI Frontend Engineering Lab

面向 AI 应用时代的前端高阶工程实验仓库。项目不是零散 Demo 集合，而是一套长期演进、可运行、可测试、可验证、可用于简历展示的全栈技术实验平台。

## 技术栈

- Monorepo：pnpm Workspace + Turborepo
- 前端：Next.js + React + Tailwind CSS + shadcn/ui + Lucide + Zustand
- 后端：NestJS + Prisma + MySQL + node-redis
- 质量：TypeScript + ESLint + Prettier + Vitest + Playwright + Knip

## 本地开发

项目要求 Node.js 24 LTS 和 pnpm 11。

```bash
pnpm install
pnpm dev
```

- Web：<http://localhost:3000>
- API：<http://localhost:3001/api>
- Swagger：<http://localhost:3001/api/docs>

真实连接信息只允许写入 `apps/server/env/.env.dev`，不得提交到 Git。

## 文档

所有架构、开发流程、编码约束、实验 Spec 和验证记录均位于 [`docs/`](./docs/)。
