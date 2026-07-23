# Local Development Ports · Verification

## 环境

- 验证日期：2026-07-23
- 分支：`feat/project-foundation`
- Node.js：24.11.0
- pnpm：11.16.0

## 主路径

- Web 在 `http://localhost:3100` 启动。
- API 在 `http://localhost:3101/api` 启动。
- Home、Labs、健康代理、API Health 与 Swagger 均返回 HTTP 200。
- MySQL `SELECT 1` 与 Redis `PING` 正常。

## 异常与边界

- 旧端口只保留在本次迁移记录中，运行配置与使用文档无旧端口残留。
- 被忽略的 `.env.dev` 已同步新端口，未进入 Git。
- Next.js 代理与 NestJS CORS 使用新的 Web/API 地址。

## 自动化验证

- Format、ESLint、TypeScript、Build 与 Knip：通过。
- Vitest：14 个单元测试通过。
- Playwright：2 个桌面与移动端测试通过。
- 浏览器控制台：无 Error 或 React Warning。
- `git diff --check`：通过。

## 用户体验确认

用户于 2026-07-23 确认 `3100/3101` 端口调整体验通过。

## 结论

本任务满足全部验收标准，可以进入提交阶段。
