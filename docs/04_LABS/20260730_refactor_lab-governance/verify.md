# Frontend Lab Code Governance Verification

## 环境

- 日期：2026-07-30
- 分支：`feat/large-data-grid`
- 治理范围：`apps/web/src/`、Web 测试、结构检查、ESLint 规则和对应项目文档
- 验证页面：Agent Stream Recovery、Markdown Stream Rendering、Large Data Grid

## 主路径

- 前端运行时函数统一为具有块级函数体和显式返回的箭头函数，Next.js 特殊文件使用常量后默认导出。
- `check:structure` 使用 TypeScript AST 拒绝 Function Declaration、Function Expression、运行时 Method 和隐式返回。
- Agent、Markdown 和 Large Data Grid 均建立根级 `types/`，非组件 Props 类型按领域集中管理。
- 三个 Lab 直接以 `components/index.tsx` 为入口，按 Chat、Inspector、Compare、Benchmark、Workbench、Renderer
  和 Overlay 的拥有关系组织，不增加重复的 `lab/` 目录。
- 旧平铺组件路径和兼容转发已删除，入口及测试直接引用新目录。
- 关键算法、异步协议、恢复策略和资源生命周期补充设计原因注释。
- 内部不变量上的冗余默认值、空值分支与类型兜底已移除，外部输入、Worker、安全和生命周期边界校验继续保留。

## 异常路径

- 新增函数声明、Function Expression、Class/Object Method 或隐式返回箭头函数时，Lint 或结构检查会失败。
- Lab 缺少 `components/index.tsx`、引入 `components/lab/`、缺少根级 `types/`，或在实现文件声明非 Props
  类型时，结构检查会失败。
- `types/` 内出现运行时变量、函数、Class 或 Enum 时，结构检查会失败。
- Worker 消息、网络响应、浏览器能力、复制上限和资源清理没有因防御逻辑治理而弱化。

## 自动化验证

完整工程检查通过：

```text
pnpm check:structure
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm knip
git diff --check
```

结果：

- Structure Check 通过全部函数语法、Lab 组件层级和类型归属约束。
- Web：26 个测试文件，74 条测试通过。
- Server：10 个测试文件，22 条测试通过。
- Playwright：18 条 Chromium 场景通过。
- Production Build 通过，Knip 未发现未使用代码或依赖问题。

## 用户体验确认

用户已在 2026-07-30 完成三个 Lab 的主流程、异常路径、响应式和可访问性体验，并明确确认通过。
用户随后指出 `components/lab/` 重复表达 Lab 上下文；三个模块已改为直接使用 `components/index.tsx` 和领域子目录，
并再次通过完整工程检查与 18 条 Playwright 回归。

## 结论

本轮治理满足 T-01 至 T-11 和全部 Acceptance Criteria，没有改变 API、Store、Worker、Renderer 或 Benchmark
语义，可以进入后续提交阶段。
