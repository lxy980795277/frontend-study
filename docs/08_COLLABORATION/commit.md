# 提交规范

禁止手动绕过流程提交。用户说“提交本次改动”后，AI 必须按顺序执行以下八步，并在对话中逐步播报。

## Step 1 · 了解改动全貌

执行 `git status --short`、`git diff --stat` 和 `git diff`，理解每处改动。

播报：`Step 1 完成 · 共 {N} 个文件变更`

## Step 2 · 精确暂存代码文件

只暂存本次代码和配置，暂不暂存 docs 与根 package.json。

播报：`Step 2 完成 · 已暂存 {N} 个代码文件`

## Step 3 · 分模块总结

按前端、后端、共享包、工程化等顶层职责归类，并归入：

- 新增功能
- 改进优化
- 问题修复

播报：`Step 3 完成 · {N} 个模块`

## Step 4 · 生成 Commit 标题

格式：

```text
<type>(<scope>): <中文简述>
```

允许的 type：`feat`、`fix`、`refactor`、`docs`、`chore`、`test`、`perf`、`build`、`ci`、`revert`。

播报完整标题。

## Step 5 · 编码规范自查

先读取 `docs/05_CONSTRAINTS/overview.md`，再按 Diff 读取：

| 变更             | 读取          |
| ---------------- | ------------- |
| `apps/web/`      | `frontend.md` |
| `apps/server/`   | `backend.md`  |
| `prisma/`、Redis | `database.md` |
| 测试文件         | `testing.md`  |

逐条检查真实 Diff。明显违规直接修复；歧义停止并询问；未覆盖的新问题写入 `docs/09_TECHNICAL/lessons.md` 并同步约束。

播报：`Step 5 完成 · 无违规` 或修复摘要。

## Step 6 · 文档同步判断

影响后续理解的改动必须同步：

- API → `docs/03_API/`
- 架构、路由、模块、Store → `docs/01_ARCHITECTURE/`
- Lab → `docs/04_LABS/`
- 规范 → `docs/05_CONSTRAINTS/`
- 非显然选型 → `docs/09_TECHNICAL/decisions.md`

播报更新结论。

## Step 7 · 版本与 Release Note

读取根版本，根据 SemVer 判断：

- 破坏性变更：major
- 用户可感知新能力：minor
- 修复、重构、配置：patch

用户指定版本时以用户为准。

生成 `docs/06_RELEASES/<version>.md`，并且只更新根 `package.json` 版本。

播报：`Step 7 完成 · {旧版本} → {新版本}`

## Step 8 · 本地提交

暂存 Release Note、根版本和 Step 6 文档，执行 Conventional Commit。

- Commit 内容使用中文。
- 检测到 IDE 时追加对应 `Co-authored-by`。
- 无法识别时注明 `AI-assisted: unknown IDE`。
- 只本地提交，禁止 Push。

播报 Commit Hash 和标题。

## pre-commit

按顺序执行：

1. lint-staged
2. Web 与 Server TypeScript 检查
3. 全部单元测试
4. 文件行数检测

500 行警告，1000 行阻止提交。任一检查失败都拒绝提交。
