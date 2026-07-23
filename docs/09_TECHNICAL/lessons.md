# 踩坑记录

发现疑难问题后记录：

- 现象
- 根因
- 解决方案
- 防复发规则
- 可迁移结论

## node-redis 6 连接旧 Redis 实例

- 现象：启动阶段持续出现 `ERR unknown command 'HELLO'`。
- 根因：node-redis 6 默认使用 RESP3，当前远程 Redis 实例不支持 `HELLO`。
- 解决方案：客户端显式设置 `RESP: 2`。
- 防复发规则：更换 Redis 实例时先验证协议版本，再决定是否升级到 RESP3。
- 可迁移结论：RESP2 不影响 DB 选择、key 前缀和当前实验需要的基础命令。

同一实例使用密码认证但不支持 ACL 用户名。空的 `REDIS_USERNAME` 必须在配置校验阶段归一化为 `undefined`，否则
node-redis 会发送双参数 `AUTH` 并得到 `WRONGPASS`。

## lint-staged 嵌套 pnpm 版本污染

- 现象：外层使用 pnpm 11 执行 `pnpm lint-staged`，lint-staged 内部的 `pnpm --filter` 却被解析为 pnpm 10，触发 Engine 拒绝。
- 根因：包管理器脚本会注入 npm/pnpm 运行环境；lint-staged 再启动同名包管理器时，可能继承与项目锁定版本不一致的解析状态。
- 解决方案：Husky 直接调用 `./node_modules/.bin/lint-staged`，其内部任务再使用当前 Shell 中已锁定的 pnpm。
- 防复发规则：Git Hook 在项目要求 Node.js 24 与 pnpm 11 的环境中执行；本地二进制不通过嵌套 `pnpm` 脚本启动。
- 可迁移结论：质量门禁应减少包管理器的嵌套层级，否则外层命令版本正确也不能保证子任务版本一致。
