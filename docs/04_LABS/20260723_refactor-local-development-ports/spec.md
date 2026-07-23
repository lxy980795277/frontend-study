# Local Development Ports

## Intent

将 AI Frontend Engineering Lab 的本地 Web 与 API 默认端口从常见的 `3000/3001` 迁移到
`3100/3101`，避免与其他本地项目冲突，同时保持开发、测试、CI 和文档中的端口配置一致。

## Constraints

- Web 默认端口固定为 `3100`。
- NestJS API 默认端口固定为 `3101`。
- Swagger 地址随 API 端口迁移到 `http://localhost:3101/api/docs`。
- Next.js 后端代理、CORS、Playwright、Vitest、CI 和文档必须同步更新。
- 本地真实环境配置继续读取被 Git 忽略的 `apps/server/env/.env.dev`。
- 不修改 MySQL、Redis、API Prefix 或任何业务逻辑。
- 不提交真实密钥。
- 本任务作为 Project Foundation 合并前调整，继续使用 `feat/project-foundation` 分支。

## Acceptance Criteria

1. `pnpm dev` 同时在 Web `3100` 和 API `3101` 启动。
2. `http://localhost:3100` 可以访问 Home 和 Labs。
3. `http://localhost:3100/backend/health` 可以代理到 `http://localhost:3101/api/health`。
4. `http://localhost:3101/api/docs` 可以访问 Swagger。
5. Web 端到端测试使用 `3100`，不再占用 `3000`。
6. 后端 CORS 默认允许 `http://localhost:3100`。
7. 除迁移记录外，运行配置和使用文档中不再残留旧端口 `3000/3001`。
8. 真实 `.env.dev` 仍被 Git 忽略。

## UseCase

### 主路径

开发者同时运行其他占用 `3000/3001` 的项目和本仓库。本仓库通过 `pnpm dev` 使用
`3100/3101` 启动，Home、Labs、健康代理和 Swagger 均可正常访问。

### 异常与边界

- Web 或 API 新端口被占用时，启动过程明确失败，不静默回退到其他端口。
- 通过环境变量覆盖 Server API 地址时，Next.js 继续优先使用显式配置。
- CI 使用相同默认端口，避免本地与 CI 出现不同配置路径。
- 端口迁移不得改变远程 MySQL 和 Redis 连接行为。

## Tasks

- [x] 更新 Web 开发和生产启动端口
- [x] 更新 NestJS 默认端口、CORS 与本地环境配置
- [x] 更新 Next.js 后端代理默认地址
- [x] 更新 Playwright、Vitest 与相关测试数据
- [x] 更新 CI、README、架构和 API 文档
- [x] 扫描受控文件中的旧端口残留
- [x] 执行完整自动化与真实服务验证
- [x] 完成用户体验验证
