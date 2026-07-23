# 开发工作流

全流程自主完成，在以下三个节点必须输出结论并等待确认：

- Step 1 完成后：需求理解确认
- Step 2 完成后：设计方案确认
- Step 5 完成后：体验验证确认

禁止跳步。

## Step 1 · 接到任务

1. 从主分支创建符合命名规范的分支。
2. 在 `docs/04_LABS/` 创建任务目录与 `spec.md`。
3. 编写 Intent、Constraints、Acceptance Criteria。
4. 输出功能目标、用户场景、边界条件和验收标准。
5. 等待用户确认。

分支规范：

- 新能力：`feat/<name>`
- 修复：`fix/<name>`
- 重构：`refactor/<name>`

## Step 2 · 规划任务

1. 读取对应架构、设计、API 和约束文档。
2. 补全 UseCase、Tasks 和技术方案。
3. 涉及 UI 时输出布局树。
4. 涉及数据时输出完整数据流。
5. 明确 Store、接口、Service、Prisma 和 Redis 行为。
6. 等待用户确认。

## Step 3 · 编码

- 严格对照 Tasks 实现。
- 每完成一个 Task 立即补充测试。
- 新增接口同步更新 `docs/03_API/`。
- 架构变化同步更新 `docs/01_ARCHITECTURE/`。
- 技术结论和踩坑同步更新 `docs/09_TECHNICAL/`。

## Step 4 · 自测

必须运行：

```bash
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm knip
git diff --stat
git diff
```

涉及页面时补充 Playwright 验证。完成后只能告知用户启动和验证路径，不能代替用户声明体验通过。

## Step 5 · 验证

由用户对照 UseCase 验证：

- 主流程
- Loading / Error / Empty
- 控制台错误和 React Warning
- 异常与边界路径
- 响应式和可访问性

用户确认通过后生成 `verify.md`。

## Step 6 · 提交

严格执行 `docs/08_COLLABORATION/commit.md` 的八步流程。

## Step 7 · 多人协作

涉及 Review、冲突或分支合并时，读取 `docs/08_COLLABORATION/collaboration.md`。
