# Web 架构

## 分层

- `app/`：Next.js 路由、Layout、Error Boundary
- `home/`：Home 页面私有组件与页面级实现
- `labs/`：独立实验实现
- `components/ui/`：shadcn 公共组件
- `components/markdown/`：跨 Lab 复用的安全 Markdown/GFM 渲染
- `services/`：API 调用
- `stores/`：跨组件客户端状态
- `utils/`：无业务语义工具

## Lab 约定

每个 Lab 可拥有自己的 `components/`、`core/`、`adapters/`、`hooks/`、`store/`、`fixtures/` 和 `__tests__/`。

Lab 独立是设计原则，不通过 ESLint 强制隔离。真正稳定的通用能力经过评审后再提取到公共层。

`components/markdown/markdown-renderer/index.tsx` 基于 `react-markdown` 和 `remark-gfm`，统一标题、列表、引用、表格、
链接与代码样式。组件不解析原始 HTML，Agent 等外部生成内容不得绕过该安全边界。

## 目录与命名

- 普通 React 组件使用 `<component-name>/index.tsx`，组件测试放在组件目录的 `__tests__/`。
- Next.js App Router 特殊文件继续使用 `page.tsx`、`layout.tsx`、`error.tsx`、`global-error.tsx` 和
  `not-found.tsx`。
- 前端 Service 和 Store 使用职责名，例如 `services/threads.ts`、`store/thread.ts`；不使用 NestJS 风格的
  `*.service.ts` 或 `*.store.ts`。
- Core、Hook 和基础 Transport 使用完整 kebab-case 职责名，例如 `stream-state-machine.ts`、
  `use-agent-stream-lab.ts` 和 `base-sse.ts`。
- 不建立跨目录聚合 Barrel；调用方通过稳定的组件目录路径导入，由 TypeScript 解析 `index.tsx`。

## 公共网络层

`services/base-request.ts` 和 `services/base-sse.ts` 是所有 Lab 可复用的无业务网络层：

- `base-request` 负责查询参数、JSON/FormData、超时取消、响应解包和稳定错误对象。
- `base-sse` 负责 POST SSE、UTF-8 增量解码、CR/LF、注释心跳、多行 data、SSE id、Buffer 上限和 Abort。
- 业务 Service 只负责 Endpoint、请求类型和协议校验，不自行重复实现 Fetch。

## Agent Stream Recovery

```text
labs/agent-stream-recovery/
├── components/   同名目录 + index.tsx，对话区、历史 Sheet、连接/事件/故障观测
├── core/         AG-UI Reducer、重连决策、连接状态机
├── hooks/        历史恢复与 SSE Session 编排
└── store/        Thread 持久投影与 Run 临时运行态
```

- URL 只保存 `threadId`，不保存 `runId` 或 Stream 游标。
- 同页断线时，游标只存在 Zustand 运行态内存中，并通过 `Last-Event-ID` 续传。
- 页面刷新先读取 Thread 详情；存在 `activeRun` 时复用服务端返回的原始 Input，从 `0-0` 重放。
- Reducer 用 Redis Stream ID 去重，用 AG-UI `messageId/toolCallId` 归并消息与工具调用。
- localStorage/sessionStorage 不参与业务恢复。

## 路由与布局

```text
RootLayout
├── /                  服务端重定向 → /home
├── /home              薄路由 → src/home（独立首页，无侧边栏）
└── /labs              LabsLayout（仅提供路由边界与全局背景）
    ├── /labs          模块卡片入口
    └── (detail)       LabDetailLayout（统一返回 Labs 入口）
        └── /labs/<slug>   薄路由 → src/labs/<slug>
```

- `app/layout.tsx` 只负责 HTML、Body、全局字体和样式，不承载业务导航。
- `/` 不渲染页面，使用 Next.js `redirect` 服务端重定向到 `/home`。
- `/home` 使用独立的 Home Header，展示项目定位、系统状态和 Labs 入口；页面私有组件统一放在
  `src/home/components/`，不进入全局 `components/`。
- `/labs` 是唯一的模块入口，只展示由 `config/lab-registry.ts` 生成的模块卡片。
- `/labs` 及其子路由不提供平台侧边栏、移动端横向模块导航或额外工作台标题。
- `/labs/<slug>` 通过无 URL 片段的 `(detail)` Route Group 继承统一“返回 Labs”入口，并使用全部视口空间渲染独立
  实验；模块内部仍按自身需求组织标题、操作区和工作区。
- 新增实验时，路由文件只负责加载 `src/labs/<slug>/` 中的独立实现，并在 Lab Registry 注册入口卡片。
