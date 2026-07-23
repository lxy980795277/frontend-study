# 禁止事项

| 编号 | 禁止事项                                   | 处理方式                            |
| ---- | ------------------------------------------ | ----------------------------------- |
| F-01 | 业务核心使用 `any`                         | 使用明确类型或 `unknown` + 类型守卫 |
| F-02 | 在代码、日志、文档、测试中硬编码密钥       | 使用环境变量并脱敏                  |
| F-03 | 前后端重复定义 API 类型                    | 移入 `packages/shared-types`        |
| F-04 | 在仓库根目录创建业务源码                   | 移入对应 App                        |
| F-05 | 单文件超过 1000 行                         | 提交前拆分                          |
| F-06 | 提交 backup、deprecated、unused 文件       | 删除，使用 Git 历史                 |
| F-07 | 未经确认修改远程数据库结构                 | 停止并取得授权                      |
| F-08 | 执行 `prisma db push` 修改远程库           | 使用受控 Migration 流程             |
| F-09 | 执行 Redis `FLUSHDB` 或 `FLUSHALL`         | 禁止执行                            |
| F-10 | Redis Key 或 Channel 缺少项目前缀          | 使用 `frontend-study:`              |
| F-11 | Controller 直接注入 Prisma 或 Redis        | 通过 Service                        |
| F-12 | 在组件中无 Selector 读取完整 Zustand Store | 使用 Selector                       |
| F-13 | 内联样式或硬编码设计颜色                   | 使用 Tailwind 和语义 Token          |
| F-14 | 未写 Spec 直接开始 Lab 编码                | 先完成 Step 1/2                     |
| F-15 | 自动执行 Git Push                          | 只允许本地 Commit                   |
