# 设计规范

## 视觉方向

- 专业、克制、偏工程工具感。
- 使用 shadcn `new-york` 风格和中性色语义 Token。
- 所有颜色通过 CSS 变量表达，支持明暗主题扩展。
- 图标统一使用 Lucide。

## 页面结构

- Home 是独立入口页，使用顶部 Header 和居中内容区，不展示 Labs 侧边栏。
- Labs 是所有实验模块的统一入口页，使用 1280px 最大宽度容器、双插画 Hero 和桌面端四列模块卡片网格。
- Hero 与模块卡片网格共享同一容器宽度和左右边界，插画使用透明背景 PNG。
- Labs Hero 使用黑色手绘线稿与系统 Primary 强调色表达“搭建系统”和“可靠流式链路”两个主题。
- Labs 入口页除 Hero 与模块卡片外不增加数量、目录标题、搜索或平台导航信息。
- Labs 已完成模块卡片不展示难度、完成状态或额外入口文案；只有构建中模块展示“开发中”状态。卡片 Hover 使用
  300ms 缓出上移和阴影过渡，并在用户开启减少动态效果时取消位移。
- Lab 详情页不展示平台侧边栏或移动端模块导航，直接使用完整视口承载模块自身界面，并在右上角统一提供“返回
  Labs”入口。
- Lab 详情页由公共 Route Group Layout 统一提供响应式外边距：移动端 20px、平板 24px、桌面端水平 32px / 垂直
  28px，模块页面不重复声明外层 Padding。
- Agent 对话区统一使用 12px 字号；不显示用户与 Agent 角色标签，Agent 消息不使用外边框，用户消息使用 4px
  圆角紧凑气泡。
- Markdown 流式增量渲染 Lab 保留 Legacy / Incremental 等宽双栏：桌面端固定在可用视口内，Renderer、指标与
  Patch 日志分别局部滚动；移动端改为上下排列并允许页面纵向滚动。
- Markdown 流式增量渲染控制台下方使用紧凑状态条展示基准 Loading、Error、Preparing、Ready 与运行阶段；未完成
  基线确认时禁用播放，加载失败时在原位提供重试。
- 大数据表格 Lab 使用“紧凑操作栏 → 文本状态条 → 自适应 Grid Viewport → 单行实时指标”的纵向工作台。页面固定
  在可用视口内，Grid 自动占满其余高度并独立承担横纵滚动；一亿逻辑单元格和 Benchmark 固定视口都不得撑开页面。
- 大数据表格的常用操作默认保持单行，数据规模、列数、Overscan、排序和故障注入收纳在可展开的高级设置区；窄屏
  工具栏与指标条在自身容器横向滚动，不通过增加页面高度换行。
- 大数据表格的 DOM、主线程 Canvas 和 Worker OffscreenCanvas 共用相同表头、行号、选区与活动单元格视觉语义；
  Canvas 交互通过有界 SVG/DOM Overlay 完成，不为每个逻辑单元格创建隐藏节点。
- 大数据表格的运行状态必须同时显示 Ready/Fallback/Error 文本、实际 Renderer、逻辑规模、显示行数、可见范围和
  活动单元格；Worker 降级不能只靠颜色表达。固定 Benchmark 在自身容器横向滚动，完整报告使用模式内容区局部纵向
  滚动。
- 大数据表格的隔离 Benchmark 任意时刻只展示一个 Renderer，运行中锁定模式与配置；报告使用可横向滚动表格，
  明确展示执行顺序、状态、初始化/首帧/Commit 分位数、Long Task、摘要和 JSON 导出。
- 流式 Renderer 默认自动跟随最新内容；用户主动向上阅读时不得抢夺滚动位置，重新滚到底部后自动恢复跟随。多个
  Renderer 实例必须分别维护该交互状态。
- 所有高密度 Lab 的 Grid/Flex 子项必须设置 `min-w-0` 和 `min-h-0`；长单词允许换行，代码块和表格只在自身
  Content Host 内滚动，禁止撑宽页面；超长代码块统一限制为 22rem 高度并保留横向、纵向滚动。
- Home 与 Labs 通过明确入口互相跳转，不共享业务 Layout。
- Loading、Error、Empty 必须作为一等状态设计。

## 可访问性

- 交互元素必须有可读名称和键盘操作能力。
- 状态不仅依赖颜色表达。
- 保持可见 Focus Ring 和足够对比度。
- Canvas 型 Grid 使用可聚焦的 `role="grid"` Host、`aria-activedescendant` 和有界活动 `row/gridcell` 镜像，
  不创建百万行无障碍 DOM；键盘支持方向键、Page、Home/End、Shift 扩选和复制快捷键。
