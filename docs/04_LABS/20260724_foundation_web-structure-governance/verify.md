# Web Structure Governance Verification

## 1. Result

前端结构治理通过。源码目录、文件命名、导入路径和工程约束已按规范收敛，URL、运行行为与模块边界未发生变化。

## 2. Migration Coverage

- 22 个普通 React 组件使用 `<component-name>/index.tsx`，其中 Home 私有组件收敛到 `home/components`。
- 2 个组件测试迁移到对应组件目录的 `__tests__`。
- 3 个前端 Service 移除 `.service` 后缀。
- 2 个 Zustand Store 移除 `.store` 后缀。
- `labs/README.md` 改为小写 `labs/readme.md`。
- App Router 局部组件 `LabFallback` 补充显式 `FC` 类型。
- 后端 NestJS 的 `*.service.ts`、`*.controller.ts`、`*.module.ts` 保持不变。

## 3. Static Audit

- 普通 `*.tsx` 均以组件目录中的 `index.tsx` 作为入口。
- App Router 特殊文件和 `*.spec.tsx` 仅保留约定内例外。
- 前端源码不存在 `*.service.ts` 或 `*.store.ts`。
- 不存在旧前端 Service/Store 导入路径。
- 不存在 App Router 之外的默认导出。
- 不存在 `any`、完整 Zustand Store 订阅、JSX 内复杂三元表达式、内联样式或硬编码设计色。
- `fetch` 仅存在于公共请求层 `base-request.ts` 和 `base-sse.ts`。

## 4. Automated Verification

以下检查全部通过：

```text
pnpm check:structure
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm knip
git diff --check
```

测试结果：

- Server：10 个测试文件，22 个测试通过。
- Web：5 个测试文件，17 个测试通过。

生产构建在不复制 `.env` 的隔离工作树中完成：

- Shared Types TypeScript 构建通过。
- NestJS 构建与 Prisma Client 生成通过。
- Next.js 生产构建通过。
- `/`、`/home`、`/labs`、`/labs/agent-stream-recovery` 路由生成通过。

## 5. Browser Verification

Playwright E2E：6 个场景全部通过，包括：

- Home → Labs → 模块页。
- 移动端 Labs 入口。
- 模拟断线后手动重连且文本不重复。
- 页面刷新后恢复 active run。
- Producer 故障收敛到 `RUN_ERROR`。
- Abort 不进入重连循环。

Playwright CLI 使用隔离生产构建完成真实浏览器回归：

```text
/ → /home → Labs → Agent 流式断线恢复 → 返回 Labs
```

页面标题、模块卡片、模块工作台和返回入口均正常。控制台仅出现隔离环境未启动 3101 后端导致的预期代理错误，不存在组件解析或模块导入错误。
