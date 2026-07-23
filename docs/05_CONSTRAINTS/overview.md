# 编码约束

本目录定义所有代码红线。编码前读取对应文件，提交前必须根据真实 Diff 逐条复查。

| 文件           | 范围                        |
| -------------- | --------------------------- |
| `forbidden.md` | 全项目禁止事项              |
| `frontend.md`  | Next.js、React、状态与样式  |
| `backend.md`   | NestJS、DTO、日志与基础设施 |
| `database.md`  | Prisma、MySQL、Redis        |
| `testing.md`   | 单元、集成与 E2E            |

通用约定：

- 文件和目录使用 kebab-case。
- 类型、接口、组件和 Class 使用 PascalCase。
- 函数和变量使用 camelCase。
- 常量对象使用 UPPER_SNAKE_CASE。
- Git Hook 必须使用项目锁定的 Node.js 与 pnpm 版本；本地工具优先调用仓库 `node_modules/.bin/`，避免嵌套包管理器污染版本解析。
