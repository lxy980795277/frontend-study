# AI Frontend Engineering Lab

面向 AI 应用时代的前端高阶工程实验平台。TypeScript 全栈 Monorepo（Next.js + NestJS + Prisma + MySQL + Redis）。

## 工作流（严禁跳步）

所有编码任务必须严格按以下 7 步执行。每个 `*` 节点必须输出结论并等待用户确认，禁止跳步。

```text
Step 1 接任务 ──* 需求确认──► Step 2 规划方案 ──* 设计确认──► Step 3 编码
                                                                         │
Step 7 多人协作 ◄── Step 6 提交 ◄── Step 5 验证 ──* 体验确认── Step 4 自测
```

详细规则见 `docs/00_OVERVIEW/workflow.md`，每次接任务前必须重新阅读。

## 首次进入项目

按以下顺序完整阅读：

1. `docs/00_OVERVIEW/`
2. `docs/01_ARCHITECTURE/overview.md`
3. `docs/05_CONSTRAINTS/`

## 每次接任务

| 目录                     | 作用                           | 何时读取             | 要求     |
| ------------------------ | ------------------------------ | -------------------- | -------- |
| `docs/00_OVERVIEW/`      | 项目定位、文档地图、开发工作流 | 每次新任务前         | 必须     |
| `docs/01_ARCHITECTURE/`  | Monorepo、前后端与数据架构     | 涉及架构改动时       | 必须     |
| `docs/02_DESIGN/`        | UI、布局、组件与交互规范       | 涉及页面设计时       | 必须     |
| `docs/03_API/`           | REST API 规范与接口清单        | 涉及接口时           | 必须     |
| `docs/04_LABS/`          | Lab Spec、Technical、Verify    | 新增或修改实验时     | 必须     |
| `docs/05_CONSTRAINTS/`   | 编码红线                       | 全程                 | 必须     |
| `docs/06_RELEASES/`      | 版本发布记录                   | 提交时               | 必须     |
| `docs/07_USER_GUIDE/`    | 用户视角说明                   | 体验验证时           | 参考     |
| `docs/08_COLLABORATION/` | Commit、分支与协作             | 提交或协作时         | 必须     |
| `docs/09_TECHNICAL/`     | ADR、研究和踩坑记录            | 技术选型或疑难问题时 | 必须同步 |
| `docs/10_GOVERNANCE/`    | 代码治理                       | 定期治理时           | 按需     |

## 基础行为规范

- 每次回答用户问题，开头必须加一句：`got it！`
- 回答必须客观，不迎合用户；存在更优方案时说明依据和取舍。
- 所有改动以长期扩展性、业界最佳实践和优秀开源项目质量为标准。
- 不以最小改动为目标迁就错误结构。
- 删除数据、修改远程基础设施或执行不可逆操作前必须获得明确授权。
- 文档是 AI 的项目知识库，不得凭记忆假设项目结构。

## 项目结构

- 使用 pnpm Workspace + Turborepo。
- 业务代码只放在 `apps/`，共享能力只放在 `packages/`。
- 前端业务代码放在 `apps/web/src/`。
- 后端业务代码放在 `apps/server/src/`。
- Lab 实现放在 `apps/web/src/labs/<lab-name>/`。
- 路由放在 `apps/web/src/app/`，路由文件只负责页面接入。
- 文件和目录统一使用 kebab-case。
- Lab 文档目录：`docs/04_LABS/YYYYMMDD_<category>_<name>/`。

## 共享类型

- 前后端共用类型的唯一事实来源是 `packages/shared-types/`。
- API 请求/响应、共享业务模型、枚举和常量类型必须放入共享类型包。
- 禁止在前后端重复定义 API 类型。
- 禁止共享 Prisma Entity、后端内部实现类型、环境变量或密钥类型。

## 前端规范摘要

- 详细规范以 `docs/05_CONSTRAINTS/frontend.md` 和 `docs/02_DESIGN/` 为准。
- 禁止使用 `any`；函数参数和返回值必须明确。
- React 组件使用函数组件与 `FC<Props>`，普通组件使用命名导出。
- 箭头函数不得省略函数体和 `return`。
- App Router 默认使用 Server Component，Client Component 必须声明 `'use client'`。
- Zustand 必须使用 Selector，禁止组件中无参读取完整 Store。
- 复杂业务逻辑拆为 Hook，纯算法拆到 `core/` 或 `utils/`。
- 公共 UI 优先使用 `components/ui/` 下的 shadcn 组件。
- 图标统一使用 Lucide。
- 禁止内联样式；优先 Tailwind CSS 和语义化 CSS 变量。
- JSX 条件渲染禁止三目表达式，多条件样式和文本使用映射对象。

## 后端规范摘要

- 详细规范以 `docs/05_CONSTRAINTS/backend.md` 和 `docs/03_API/` 为准。
- NestJS 按功能模块组织。
- Controller 只处理 HTTP 参数、响应和 Service 调用。
- Service 实现业务逻辑，不直接操作 HTTP Request/Response。
- Prisma 和 Redis 只能通过注入的 Service 使用。
- DTO 使用 `class-validator` 和 Swagger 装饰器。
- REST API 使用复数名词、kebab-case 和 `/api` 前缀。
- 日志统一使用 NestJS `Logger`，禁止记录敏感信息。
- 多实例共享状态必须使用 Redis 等外部存储。

## 数据库与 Redis

- Prisma Schema 位于 `apps/server/prisma/`。
- Prisma DI 模块位于 `apps/server/src/prisma/`。
- 业务层只持有标准 UTC `Date`，禁止手动时区偏移。
- 数据库结构变更必须同步 Schema、SQL 和架构文档。
- 禁止对未确认的数据库执行 Migration 或 `prisma db push`。
- Redis 使用 DB 1，所有 Key、Stream、锁和 Channel 使用 `frontend-study:` 前缀。
- 禁止执行 `FLUSHDB` 和 `FLUSHALL`。

## 测试

- 全项目统一使用 Vitest，不引入 Jest。
- 后端业务判断、Guard、配置解析和工具函数必须写单测。
- 前端复杂算法、Store、Hook 和工具函数必须写单测。
- 页面主流程和用户体验通过 Playwright 验证。
- 修复 Bug 时先写失败测试，再实现修复。

## 提交

- 用户说“提交改动”“提交本次改动”或“commit”时，必须立即读取 `docs/08_COLLABORATION/commit.md`。
- 严格执行完整八步流程，不得简化。
- 每次提交必须完成规范自查、文档同步、版本判断和 Release Note。
- 只本地提交，禁止自动 push。
