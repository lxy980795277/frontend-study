# Project Foundation · Verification

## 环境

- 验证日期：2026-07-23
- 分支：`feat/project-foundation`
- 本地环境：macOS、pnpm 11.16.0
- 项目目标运行时：Node.js 24.18.0
- 当前验证 Shell：Node.js 25.2.1，存在 Engine Warning，但未影响本轮检查结果
- 基础设施：远程独立 MySQL 数据库、远程 Redis DB 1

## 主路径

- 从 Monorepo 根目录可以同时启动 Next.js Web 与 NestJS Server。
- `/` 展示独立 Home、平台定位、系统状态与 Labs 入口，不包含实验侧边栏。
- Home 可以进入 `/labs`。
- `/labs` 使用独立工作区布局，桌面端展示可折叠侧边栏和内容区。
- Foundation 尚无具体实验模块时，模块导航和内容区均展示明确 Empty 状态。
- `/backend/health` 经 Next.js 代理访问 NestJS 健康接口。
- MySQL `SELECT 1` 与 Redis `PING` 探测成功。
- Swagger 文档可以访问。

## 异常路径

- 健康状态 UI 的 Loading、Success、Error 和 Retry 行为由 Vitest 与 MSW 覆盖。
- MySQL 或 Redis 不可用时的降级状态与 HTTP 503 行为由 Server 单元测试覆盖。
- 配置缺失、Redis DB 错误和 key 前缀错误由环境配置测试覆盖。
- Labs Registry 为空时不生成虚假模块，桌面侧边栏和工作区均显示空状态。

## 自动化验证

- `pnpm format:check`：通过。
- `pnpm lint`：通过。
- `pnpm type-check`：通过。
- `pnpm test`：通过，共 14 个单元测试。
- `pnpm build`：通过，`/` 与 `/labs` 均完成静态构建。
- `pnpm knip`：通过，无阻断问题。
- Playwright：通过，共 2 个端到端测试，覆盖桌面 Home → Labs、侧边栏折叠和移动端导航。
- HTTP Smoke Test：`/`、`/labs`、`/backend/health`、`/api/docs` 均返回 200。
- 浏览器控制台：无 Error 或 React Warning。
- `git diff --check`：通过。

## 用户体验确认

用户于 2026-07-23 确认 Home 与 Labs 布局体验通过。

## 结论

Project Foundation 满足 Spec 的全部验收标准，可以进入提交前检查阶段。真实环境变量仍处于 Git
忽略范围，本轮未执行提交和推送。
