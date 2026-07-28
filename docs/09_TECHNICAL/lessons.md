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

## React Effect 内部状态更新导致恢复请求自取消

- 现象：带 `threadId` 刷新后页面持续 Loading，浏览器 Renderer 占满 CPU，详情请求不断 `ERR_ABORTED`。
- 根因：负责加载 Thread 的 Effect 同时订阅并更新 `activeThreadId/detailStatus`；每次写入 `loading` 都触发 Effect
  Cleanup，Cleanup 又取消刚启动的请求，形成自激循环。
- 解决方案：恢复 Effect 只由 URL `threadId` 驱动；需要读取当前 Store 状态时使用一次性快照，不把 Effect
  自己写入的状态作为依赖。
- 防复发规则：Effect 的 Cleanup 不能被同一 Effect 的同步状态写入反复触发；请求生命周期的依赖必须是外部身份，
  不是请求自身的 Loading 状态。
- 可迁移结论：URL 驱动的恢复流程应区分“恢复身份”和“恢复过程状态”，前者可以驱动 Effect，后者只用于渲染。

## SSE 写入背压必须同时等待连接关闭

- 现象：只等待 Response `drain` 时，如果慢客户端在背压期间断开，Handler 可能永久等待不会再出现的事件。
- 根因：背压 Promise 没有把 `close` 作为另一条终止路径。
- 解决方案：写入返回 false 时同时监听 `drain/close`，任一发生后清理两个 Listener；关闭时立即结束 Consumer。
- 防复发规则：所有网络背压等待都必须与连接取消信号形成竞速。
- 可迁移结论：流式响应的资源释放不仅在读取侧，写入侧的等待点同样需要可取消。

## Abort 操作不能早于 Run 被服务端接受

- 现象：发送后立即点击停止，Abort 偶发返回 `RUN_NOT_FOUND`，前端进入 Failed，但原 Stream 仍继续生成。
- 根因：前端在发起 Stream Fetch 时就进入 Connecting 并展示可点击的停止按钮；Abort Request 可能先于 Stream
  Request 完成 Run 落库。
- 解决方案：Connecting 阶段只显示不可操作的“正在建立运行”；收到 SSE HTTP Response、进入 Streaming 后才开放
  Stop。状态机在 Aborting 时忽略迟到普通事件对 Phase 的回写。
- 防复发规则：依赖服务端资源的控制动作，必须以服务端已接受主请求为可用条件，不能只以本地已发起请求为条件。
- 可迁移结论：乐观 UI 可以提前展示输入，但取消、重试、修改等控制面能力需要明确的 Server Acceptance Barrier。

## `CANCELLING` 不能依赖原进程中的 Producer 收敛

- 现象：用户点击停止后收到“服务端未在停止宽限时间内返回终态”，Thread 历史中的 Run 长期停留在
  `CANCELLING`。
- 根因：服务进程在协作式取消完成前退出；新进程可以恢复 Redis Stream Consumer，却没有原进程内存中的
  Producer，因而没有执行者负责写入 `ABORTED` 和 `RUN_FINISHED`。
- 解决方案：Abort 接口保留有界的协作宽限期，之后使用条件更新强制终结仍活跃的 Run，并根据数据库最终状态
  幂等发布 Terminal；同状态的迟到 Producer 仍可补写部分 Message。
- 防复发规则：任何中间状态都必须存在不依赖原进程内存的收敛路径；前端超时也不得伪装成已收到服务端终态。
- 可迁移结论：分布式任务的 Cancel Signal 只是意图，持久化 Terminal 才是事实；两者之间必须有 Reconciler
  或有界兜底。

## Flex 子项内部滚动必须先约束祖先高度

- 现象：消息不断追加后，Chat Card 跟随内容无限变高，页面整体滚动，Prompt Composer 被推离视口。
- 根因：Message Timeline 虽然声明了 `overflow` 和 `flex: 1`，但 Chat Card 只有最小高度而没有确定的高度上界；
  Flex 会继续扩张祖先，内部滚动容器没有产生溢出的前提。
- 解决方案：按可用视口高度约束 Chat Card，Toolbar/Composer 设置 `shrink-0`，Timeline 使用 `min-h-0 flex-1`
  承担唯一纵向滚动；通过 Viewport Ref 在用户贴近底部时跟随增量。
- 防复发规则：设计内部滚动区时必须同时验证祖先高度、Flex 收缩、`clientHeight/scrollHeight` 和固定操作区可见性。
- 可迁移结论：`overflow-y-auto` 本身不会创造滚动边界；只有尺寸受限的包含块才能把内容增长转化为内部滚动。

## 固定 Sleep 叠加远程 ACK 不等于固定推送节拍

- 现象：Producer 每个 Chunk 后 `sleep(20ms)`，但长回复在远程 Redis 环境中耗时超过 60 秒。
- 根因：每次循环先串行等待 Redis XADD 和 Abort Check 的网络 RTT，再等待 20ms；配置的是额外延迟，不是
  20ms 生产节拍。
- 解决方案：文本事件每 20ms 生成一次并按调用顺序并发入队，Run 返回前统一等待全部 Redis ACK；Abort Check
  改为每 10 个 Chunk 执行一次。远程实测长回复收敛到约 7.3 秒。
- 防复发规则：涉及外部 I/O 的节拍必须区分“生产频率”“写入吞吐”和“端到端交付时间”，并在目标网络环境测量。
- 可迁移结论：可靠流式系统可以在有界内存中解耦生产与确认，但终态发布前必须建立 Flush Barrier，不能把
  Fire-and-forget 当作持久化成功。

## lint-staged 嵌套 pnpm 版本污染

- 现象：外层使用 pnpm 11 执行 `pnpm lint-staged`，lint-staged 内部的 `pnpm --filter` 却被解析为 pnpm 10，触发 Engine 拒绝。
- 根因：包管理器脚本会注入 npm/pnpm 运行环境；lint-staged 再启动同名包管理器时，可能继承与项目锁定版本不一致的解析状态。
- 解决方案：Husky 直接调用 `./node_modules/.bin/lint-staged`，其内部任务再使用当前 Shell 中已锁定的 pnpm。
- 防复发规则：Git Hook 在项目要求 Node.js 24 与 pnpm 11 的环境中执行；本地二进制不通过嵌套 `pnpm` 脚本启动。
- 可迁移结论：质量门禁应减少包管理器的嵌套层级，否则外层命令版本正确也不能保证子任务版本一致。

## 并排渲染指标不能解释为独立性能

- 现象：Legacy 与 Incremental 各自记录了函数执行耗时，但双栏同时运行时，两侧端到端结果会随另一侧负载变化。
- 根因：两个 Renderer 共享主线程、帧预算、布局、绘制、GC 和 Worker Message 调度；一侧长任务会推迟另一侧的
  Timer、RAF 和 DOM Commit。
- 解决方案：双栏只承担一致性、Patch、降级和共存压力验证；独立性能使用单 Renderer 串行挂载，不执行预热，
  通过奇偶轮交替降低固定顺序偏差，执行间卸载并等待浏览器稳定。
- 防复发规则：流式性能完成点必须是最终内容已经提交到 DOM，不能用网络结束或最后输入帧已经发出替代。
- 可迁移结论：性能实验需要先定义隔离级别、输入、顺序和完成屏障；采样函数本身准确，不代表实验因果关系成立。
