# Web 架构

## 分层

- `app/`：Next.js 路由、Layout、Error Boundary
- `labs/`：独立实验实现
- `components/ui/`：shadcn 公共组件
- `components/layout/`：平台布局
- `services/`：API 调用
- `stores/`：跨组件客户端状态
- `utils/`：无业务语义工具

## Lab 约定

每个 Lab 可拥有自己的 `components/`、`core/`、`adapters/`、`hooks/`、`store/`、`fixtures/` 和 `__tests__/`。

Lab 独立是设计原则，不通过 ESLint 强制隔离。真正稳定的通用能力经过评审后再提取到公共层。

## 路由与布局

```text
RootLayout
├── /                  HomePage（独立首页，无侧边栏）
└── /labs              LabsLayout → LabsShell
    ├── /labs          实验工作台概览
    └── /labs/<slug>   薄路由 → src/labs/<slug>
```

- `app/layout.tsx` 只负责 HTML、Body、全局字体和样式，不承载业务导航。
- `/` 使用独立的 Home Header，展示项目定位、系统状态和 Labs 入口。
- `/labs` 及其子路由共享 `app/labs/layout.tsx`，由 `LabsShell` 提供模块导航和工作区。
- 桌面端 Labs 使用可折叠侧边栏；移动端使用横向模块导航。
- Labs 导航由 `config/lab-registry.ts` 单一数据源生成，页面不得维护重复模块清单。

侧边栏折叠状态由 Zustand 管理。新增实验时，路由文件只负责加载 `src/labs/<slug>/` 中的独立实现。
