# Local Development Ports · Technical Design

## 配置数据流

```text
Web 3100
├── package.json dev/start
├── Playwright baseURL/webServer
├── Vitest jsdom URL
└── NestJS WEB_ORIGIN / CORS

API 3101
├── APP_PORT 默认值与 .env.dev
├── SERVER_API_BASE_URL
├── Next.js /backend rewrite
└── README / Swagger / CI
```

## 实现原则

- 端口仍由应用现有配置入口管理，不新增端口常量包。
- Web 启动脚本显式指定 `3100`，防止 Next.js 自动寻找空闲端口。
- API 继续允许通过 `APP_PORT` 覆盖，默认值调整为 `3101`。
- Next.js 继续允许通过 `SERVER_API_BASE_URL` 覆盖，默认地址调整为 API `3101`。
- 被忽略的 `.env.dev` 与受控 `.env.example` 同步修改，但真实配置不进入 Git。
- 测试只迁移基础地址，不改变断言和业务场景。

## 验证矩阵

| 范围      | 验证方式                                            |
| --------- | --------------------------------------------------- |
| 静态配置  | 扫描运行配置与使用文档，确认无旧端口残留            |
| Web       | Home、Labs 与移动端 Playwright                      |
| API       | `/api/health` 与 Swagger HTTP Smoke Test            |
| Web → API | `/backend/health` 代理 Smoke Test                   |
| 基础设施  | MySQL `SELECT 1`、Redis `PING`                      |
| 工程质量  | Format、Lint、TypeScript、Vitest、Build、Knip、Diff |
