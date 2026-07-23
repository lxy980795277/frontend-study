# Project Foundation

## Intent

建立 AI Frontend Engineering Lab 的全栈 Monorepo 基础，使后续高阶前端实验能够在统一架构、规范、测试和文档体系中独立演进。

## Constraints

- 保留参考仓库中经确认的通用工程规范、工作流和提交流程。
- 删除所有企业私有依赖和原项目业务专属内容。
- 前端使用 Next.js、React、Tailwind CSS、shadcn、Lucide、Zustand。
- 后端使用 NestJS、Prisma、MySQL、node-redis。
- MySQL 使用远程独立数据库 `frontend_study`。
- Redis 使用远程实例 DB 1 和 `frontend-study:` 前缀。
- 本次不实现任何具体 Lab。
- Home 与 Labs 使用不同的路由级布局，Home 不显示实验侧边栏。
- Labs 是实验主工作区，侧边栏负责展示和切换实验模块。
- 禁止提交真实密钥，禁止执行数据库结构变更和 Redis 清库命令。

## Acceptance Criteria

1. pnpm Workspace 与 Turborepo 正常工作。
2. Web 和 Server 可以同时启动。
3. `/` 是独立 Home 页面，展示产品定位、系统状态和 Labs 入口，不显示侧边栏。
4. `/labs` 是实验主工作区，桌面端显示实验模块侧边栏和独立内容区。
5. Home 与 Labs 布局互不污染，Lab 页面只接入对应实验模块。
6. `/api/health` 可以探测 MySQL `SELECT 1` 和 Redis `PING`。
7. Swagger 可访问。
8. ESLint、Prettier、TypeScript、Vitest、Playwright、Knip 和构建流程可运行。
9. AGENTS、约束、架构、API、协作和 Release 文档完整。
10. 真实环境变量不进入 Git。

## UseCase

### 主路径

开发者启动项目后访问 Home，可以看到平台定位、Web、API、MySQL、Redis 状态以及进入 Labs 的入口。Home
不显示实验侧边栏。

进入 `/labs` 后，开发者通过左侧实验导航查看已有模块，并在右侧工作区切换实验页面。Foundation
阶段没有具体实验时，工作区展示明确的 Empty 状态。

### 异常路径

- 后端不可访问：首页展示连接失败。
- MySQL 或 Redis 不可访问：健康接口返回 HTTP 503，页面标识对应依赖异常。
- Redis DB 1 不可用：服务拒绝静默回退到 DB 0。
- 配置缺失：后端启动失败并输出不包含密钥的配置错误。
- 没有实验模块：Labs 侧边栏和工作区均展示可理解的空状态，不生成虚假示例模块。

## Tasks

- [x] 确认产品定位、技术栈和基础设施方案
- [x] 创建开发分支与 Foundation Spec
- [x] 初始化 Monorepo 根配置
- [x] 创建共享 ESLint、TypeScript 和类型包
- [x] 创建 Next.js 前端骨架
- [x] 创建 NestJS 后端骨架
- [x] 接入 Prisma、MySQL 和 node-redis
- [x] 实现健康接口与前端状态页
- [x] 配置测试、CI、Husky、Knip
- [x] 完成项目文档
- [x] 执行自动化自测
- [x] 将 Home 重构为无侧边栏的独立路由布局
- [x] 创建带实验侧边栏的 Labs 路由布局
- [x] 增加 Home → Labs 的清晰入口
- [x] 补充 Home/Labs 布局与路由测试
- [x] 同步设计、Web 架构和技术文档
- [x] 重新执行完整自动化自测
- [x] 完成用户体验验证
