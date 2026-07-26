# 生产级 AI 流式前端：从可用链路到可观测增量渲染

下面给出一份面向生产环境的设计评审稿。目标不是只让 Markdown “动起来”，而是让长回答在高频推送、复杂语法、主线程竞争、网络抖动和渲染器故障下仍然保持正确、可恢复、可测量。

> 核心原则：正确性是所有快路径的前置条件。只要无法证明增量补丁安全，就回退到经过净化的完整快照。

## 一、问题定义

一次真实的 LLM 会话通常会同时出现以下压力：

- 首字延迟要求低，但完整回答可能持续数十秒。
- 文本、表格、引用、链接、代码围栏会在任意字符处被截断。
- 用户会滚动阅读、复制代码、切换标签页，不能被强制拉回底部。
- 同一页面可能同时渲染多个会话，主线程预算需要按帧控制。
- Worker、协议、DOM Patch 任一环节失败后都必须有安全降级。
- 性能指标必须排除静态基线成本，才能反映真正的流式增量差异。

## 二、目标与非目标

本方案对比两条完全相同输入下的渲染链路：

| 维度 | Legacy 全量渲染 | Incremental 增量渲染 | 验收关注点 |
| --- | --- | --- | --- |
| Markdown 解析 | 主线程每帧完整解析 | Worker 解析并维护确认版本 | 主线程长任务 |
| DOM 更新 | 每帧替换全部 HTML | 块级 Diff + 最小 Patch | DOM 提交次数 |
| 安全边界 | DOMPurify | DOMPurify | 两栏最终 HTML 等价 |
| 故障策略 | 本身即全量路径 | 超时或协议错误后降级 | 内容不能丢失 |
| 滚动策略 | 用户在底部时跟随 | 用户在底部时跟随 | 上滑后暂停跟随 |

非目标包括服务端模型推理、对话持久化和网络断线恢复；它们属于其他实验模块。本实验只隔离浏览器渲染成本。

## 三、端到端数据流

1. 浏览器加载一份静态 Markdown 基准。
2. 校验器确认至少存在两个 300 行以上的代码块。
3. Builder 在内存中复制十份，形成不可变的超大基线。
4. Legacy 与 Incremental 两栏先完成相同基线渲染。
5. 基线确认后清空指标，只对后续确定性流式帧计时。
6. 两栏消费同一帧的 `cumulative` 内容，禁止各自生成随机数据。
7. Incremental Worker 返回带 Revision 的 Patch，主线程校验后提交。
8. 任一校验失败时切换到 Full Snapshot Fallback。

## 四、协议不变量

每个 Renderer 只允许一个 in-flight 请求。更晚到达的目标内容只保留最新值，从而在高推送速度下合并过时帧，但永远不会丢失最终状态。

- `baseRevision` 必须等于浏览器已提交版本。
- `nextRevision` 必须严格递增。
- Patch 必须携带 `rendererId` 与 `reqId`。
- 重复响应必须可判定并忽略。
- DOM 应用成功后才允许向 Worker 发送 `commit`。
- Patch 失败后不能猜测落点，必须使用完整安全快照。

## 五、生产代码示例：确定性帧与调度遥测

下面的 TypeScript 片段刻意包含 300 条帧记录，用于模拟长回答在高频推送下的真实追踪数据。每条记录都具有稳定序号、字节增量、调度预算和 Revision，可直接用于压测与回归对比。

```ts
export interface TraceFrame {
  frame: number;
  deltaBytes: number;
  budgetMs: number;
  revision: number;
}

export const traceFrames: readonly TraceFrame[] = [
  { frame: 1, deltaBytes: 13, budgetMs: 5, revision: 1 },
  { frame: 2, deltaBytes: 14, budgetMs: 6, revision: 2 },
  { frame: 3, deltaBytes: 15, budgetMs: 7, revision: 3 },
  { frame: 4, deltaBytes: 16, budgetMs: 8, revision: 4 },
  { frame: 5, deltaBytes: 17, budgetMs: 9, revision: 5 },
  { frame: 6, deltaBytes: 18, budgetMs: 10, revision: 6 },
  { frame: 7, deltaBytes: 19, budgetMs: 11, revision: 7 },
  { frame: 8, deltaBytes: 20, budgetMs: 12, revision: 8 },
  { frame: 9, deltaBytes: 21, budgetMs: 13, revision: 9 },
  { frame: 10, deltaBytes: 22, budgetMs: 14, revision: 10 },
  { frame: 11, deltaBytes: 23, budgetMs: 15, revision: 11 },
  { frame: 12, deltaBytes: 24, budgetMs: 16, revision: 12 },
  { frame: 13, deltaBytes: 25, budgetMs: 4, revision: 13 },
  { frame: 14, deltaBytes: 26, budgetMs: 5, revision: 14 },
  { frame: 15, deltaBytes: 27, budgetMs: 6, revision: 15 },
  { frame: 16, deltaBytes: 28, budgetMs: 7, revision: 16 },
  { frame: 17, deltaBytes: 29, budgetMs: 8, revision: 17 },
  { frame: 18, deltaBytes: 30, budgetMs: 9, revision: 18 },
  { frame: 19, deltaBytes: 31, budgetMs: 10, revision: 19 },
  { frame: 20, deltaBytes: 32, budgetMs: 11, revision: 20 },
  { frame: 21, deltaBytes: 33, budgetMs: 12, revision: 21 },
  { frame: 22, deltaBytes: 34, budgetMs: 13, revision: 22 },
  { frame: 23, deltaBytes: 35, budgetMs: 14, revision: 23 },
  { frame: 24, deltaBytes: 36, budgetMs: 15, revision: 24 },
  { frame: 25, deltaBytes: 37, budgetMs: 16, revision: 25 },
  { frame: 26, deltaBytes: 38, budgetMs: 4, revision: 26 },
  { frame: 27, deltaBytes: 39, budgetMs: 5, revision: 27 },
  { frame: 28, deltaBytes: 40, budgetMs: 6, revision: 28 },
  { frame: 29, deltaBytes: 41, budgetMs: 7, revision: 29 },
  { frame: 30, deltaBytes: 42, budgetMs: 8, revision: 30 },
  { frame: 31, deltaBytes: 43, budgetMs: 9, revision: 31 },
  { frame: 32, deltaBytes: 44, budgetMs: 10, revision: 32 },
  { frame: 33, deltaBytes: 45, budgetMs: 11, revision: 33 },
  { frame: 34, deltaBytes: 46, budgetMs: 12, revision: 34 },
  { frame: 35, deltaBytes: 47, budgetMs: 13, revision: 35 },
  { frame: 36, deltaBytes: 48, budgetMs: 14, revision: 36 },
  { frame: 37, deltaBytes: 12, budgetMs: 15, revision: 37 },
  { frame: 38, deltaBytes: 13, budgetMs: 16, revision: 38 },
  { frame: 39, deltaBytes: 14, budgetMs: 4, revision: 39 },
  { frame: 40, deltaBytes: 15, budgetMs: 5, revision: 40 },
  { frame: 41, deltaBytes: 16, budgetMs: 6, revision: 41 },
  { frame: 42, deltaBytes: 17, budgetMs: 7, revision: 42 },
  { frame: 43, deltaBytes: 18, budgetMs: 8, revision: 43 },
  { frame: 44, deltaBytes: 19, budgetMs: 9, revision: 44 },
  { frame: 45, deltaBytes: 20, budgetMs: 10, revision: 45 },
  { frame: 46, deltaBytes: 21, budgetMs: 11, revision: 46 },
  { frame: 47, deltaBytes: 22, budgetMs: 12, revision: 47 },
  { frame: 48, deltaBytes: 23, budgetMs: 13, revision: 48 },
  { frame: 49, deltaBytes: 24, budgetMs: 14, revision: 49 },
  { frame: 50, deltaBytes: 25, budgetMs: 15, revision: 50 },
  { frame: 51, deltaBytes: 26, budgetMs: 16, revision: 51 },
  { frame: 52, deltaBytes: 27, budgetMs: 4, revision: 52 },
  { frame: 53, deltaBytes: 28, budgetMs: 5, revision: 53 },
  { frame: 54, deltaBytes: 29, budgetMs: 6, revision: 54 },
  { frame: 55, deltaBytes: 30, budgetMs: 7, revision: 55 },
  { frame: 56, deltaBytes: 31, budgetMs: 8, revision: 56 },
  { frame: 57, deltaBytes: 32, budgetMs: 9, revision: 57 },
  { frame: 58, deltaBytes: 33, budgetMs: 10, revision: 58 },
  { frame: 59, deltaBytes: 34, budgetMs: 11, revision: 59 },
  { frame: 60, deltaBytes: 35, budgetMs: 12, revision: 60 },
  { frame: 61, deltaBytes: 36, budgetMs: 13, revision: 61 },
  { frame: 62, deltaBytes: 37, budgetMs: 14, revision: 62 },
  { frame: 63, deltaBytes: 38, budgetMs: 15, revision: 63 },
  { frame: 64, deltaBytes: 39, budgetMs: 16, revision: 64 },
  { frame: 65, deltaBytes: 40, budgetMs: 4, revision: 65 },
  { frame: 66, deltaBytes: 41, budgetMs: 5, revision: 66 },
  { frame: 67, deltaBytes: 42, budgetMs: 6, revision: 67 },
  { frame: 68, deltaBytes: 43, budgetMs: 7, revision: 68 },
  { frame: 69, deltaBytes: 44, budgetMs: 8, revision: 69 },
  { frame: 70, deltaBytes: 45, budgetMs: 9, revision: 70 },
  { frame: 71, deltaBytes: 46, budgetMs: 10, revision: 71 },
  { frame: 72, deltaBytes: 47, budgetMs: 11, revision: 72 },
  { frame: 73, deltaBytes: 48, budgetMs: 12, revision: 73 },
  { frame: 74, deltaBytes: 12, budgetMs: 13, revision: 74 },
  { frame: 75, deltaBytes: 13, budgetMs: 14, revision: 75 },
  { frame: 76, deltaBytes: 14, budgetMs: 15, revision: 76 },
  { frame: 77, deltaBytes: 15, budgetMs: 16, revision: 77 },
  { frame: 78, deltaBytes: 16, budgetMs: 4, revision: 78 },
  { frame: 79, deltaBytes: 17, budgetMs: 5, revision: 79 },
  { frame: 80, deltaBytes: 18, budgetMs: 6, revision: 80 },
  { frame: 81, deltaBytes: 19, budgetMs: 7, revision: 81 },
  { frame: 82, deltaBytes: 20, budgetMs: 8, revision: 82 },
  { frame: 83, deltaBytes: 21, budgetMs: 9, revision: 83 },
  { frame: 84, deltaBytes: 22, budgetMs: 10, revision: 84 },
  { frame: 85, deltaBytes: 23, budgetMs: 11, revision: 85 },
  { frame: 86, deltaBytes: 24, budgetMs: 12, revision: 86 },
  { frame: 87, deltaBytes: 25, budgetMs: 13, revision: 87 },
  { frame: 88, deltaBytes: 26, budgetMs: 14, revision: 88 },
  { frame: 89, deltaBytes: 27, budgetMs: 15, revision: 89 },
  { frame: 90, deltaBytes: 28, budgetMs: 16, revision: 90 },
  { frame: 91, deltaBytes: 29, budgetMs: 4, revision: 91 },
  { frame: 92, deltaBytes: 30, budgetMs: 5, revision: 92 },
  { frame: 93, deltaBytes: 31, budgetMs: 6, revision: 93 },
  { frame: 94, deltaBytes: 32, budgetMs: 7, revision: 94 },
  { frame: 95, deltaBytes: 33, budgetMs: 8, revision: 95 },
  { frame: 96, deltaBytes: 34, budgetMs: 9, revision: 96 },
  { frame: 97, deltaBytes: 35, budgetMs: 10, revision: 97 },
  { frame: 98, deltaBytes: 36, budgetMs: 11, revision: 98 },
  { frame: 99, deltaBytes: 37, budgetMs: 12, revision: 99 },
  { frame: 100, deltaBytes: 38, budgetMs: 13, revision: 100 },
  { frame: 101, deltaBytes: 39, budgetMs: 14, revision: 101 },
  { frame: 102, deltaBytes: 40, budgetMs: 15, revision: 102 },
  { frame: 103, deltaBytes: 41, budgetMs: 16, revision: 103 },
  { frame: 104, deltaBytes: 42, budgetMs: 4, revision: 104 },
  { frame: 105, deltaBytes: 43, budgetMs: 5, revision: 105 },
  { frame: 106, deltaBytes: 44, budgetMs: 6, revision: 106 },
  { frame: 107, deltaBytes: 45, budgetMs: 7, revision: 107 },
  { frame: 108, deltaBytes: 46, budgetMs: 8, revision: 108 },
  { frame: 109, deltaBytes: 47, budgetMs: 9, revision: 109 },
  { frame: 110, deltaBytes: 48, budgetMs: 10, revision: 110 },
  { frame: 111, deltaBytes: 12, budgetMs: 11, revision: 111 },
  { frame: 112, deltaBytes: 13, budgetMs: 12, revision: 112 },
  { frame: 113, deltaBytes: 14, budgetMs: 13, revision: 113 },
  { frame: 114, deltaBytes: 15, budgetMs: 14, revision: 114 },
  { frame: 115, deltaBytes: 16, budgetMs: 15, revision: 115 },
  { frame: 116, deltaBytes: 17, budgetMs: 16, revision: 116 },
  { frame: 117, deltaBytes: 18, budgetMs: 4, revision: 117 },
  { frame: 118, deltaBytes: 19, budgetMs: 5, revision: 118 },
  { frame: 119, deltaBytes: 20, budgetMs: 6, revision: 119 },
  { frame: 120, deltaBytes: 21, budgetMs: 7, revision: 120 },
  { frame: 121, deltaBytes: 22, budgetMs: 8, revision: 121 },
  { frame: 122, deltaBytes: 23, budgetMs: 9, revision: 122 },
  { frame: 123, deltaBytes: 24, budgetMs: 10, revision: 123 },
  { frame: 124, deltaBytes: 25, budgetMs: 11, revision: 124 },
  { frame: 125, deltaBytes: 26, budgetMs: 12, revision: 125 },
  { frame: 126, deltaBytes: 27, budgetMs: 13, revision: 126 },
  { frame: 127, deltaBytes: 28, budgetMs: 14, revision: 127 },
  { frame: 128, deltaBytes: 29, budgetMs: 15, revision: 128 },
  { frame: 129, deltaBytes: 30, budgetMs: 16, revision: 129 },
  { frame: 130, deltaBytes: 31, budgetMs: 4, revision: 130 },
  { frame: 131, deltaBytes: 32, budgetMs: 5, revision: 131 },
  { frame: 132, deltaBytes: 33, budgetMs: 6, revision: 132 },
  { frame: 133, deltaBytes: 34, budgetMs: 7, revision: 133 },
  { frame: 134, deltaBytes: 35, budgetMs: 8, revision: 134 },
  { frame: 135, deltaBytes: 36, budgetMs: 9, revision: 135 },
  { frame: 136, deltaBytes: 37, budgetMs: 10, revision: 136 },
  { frame: 137, deltaBytes: 38, budgetMs: 11, revision: 137 },
  { frame: 138, deltaBytes: 39, budgetMs: 12, revision: 138 },
  { frame: 139, deltaBytes: 40, budgetMs: 13, revision: 139 },
  { frame: 140, deltaBytes: 41, budgetMs: 14, revision: 140 },
  { frame: 141, deltaBytes: 42, budgetMs: 15, revision: 141 },
  { frame: 142, deltaBytes: 43, budgetMs: 16, revision: 142 },
  { frame: 143, deltaBytes: 44, budgetMs: 4, revision: 143 },
  { frame: 144, deltaBytes: 45, budgetMs: 5, revision: 144 },
  { frame: 145, deltaBytes: 46, budgetMs: 6, revision: 145 },
  { frame: 146, deltaBytes: 47, budgetMs: 7, revision: 146 },
  { frame: 147, deltaBytes: 48, budgetMs: 8, revision: 147 },
  { frame: 148, deltaBytes: 12, budgetMs: 9, revision: 148 },
  { frame: 149, deltaBytes: 13, budgetMs: 10, revision: 149 },
  { frame: 150, deltaBytes: 14, budgetMs: 11, revision: 150 },
  { frame: 151, deltaBytes: 15, budgetMs: 12, revision: 151 },
  { frame: 152, deltaBytes: 16, budgetMs: 13, revision: 152 },
  { frame: 153, deltaBytes: 17, budgetMs: 14, revision: 153 },
  { frame: 154, deltaBytes: 18, budgetMs: 15, revision: 154 },
  { frame: 155, deltaBytes: 19, budgetMs: 16, revision: 155 },
  { frame: 156, deltaBytes: 20, budgetMs: 4, revision: 156 },
  { frame: 157, deltaBytes: 21, budgetMs: 5, revision: 157 },
  { frame: 158, deltaBytes: 22, budgetMs: 6, revision: 158 },
  { frame: 159, deltaBytes: 23, budgetMs: 7, revision: 159 },
  { frame: 160, deltaBytes: 24, budgetMs: 8, revision: 160 },
  { frame: 161, deltaBytes: 25, budgetMs: 9, revision: 161 },
  { frame: 162, deltaBytes: 26, budgetMs: 10, revision: 162 },
  { frame: 163, deltaBytes: 27, budgetMs: 11, revision: 163 },
  { frame: 164, deltaBytes: 28, budgetMs: 12, revision: 164 },
  { frame: 165, deltaBytes: 29, budgetMs: 13, revision: 165 },
  { frame: 166, deltaBytes: 30, budgetMs: 14, revision: 166 },
  { frame: 167, deltaBytes: 31, budgetMs: 15, revision: 167 },
  { frame: 168, deltaBytes: 32, budgetMs: 16, revision: 168 },
  { frame: 169, deltaBytes: 33, budgetMs: 4, revision: 169 },
  { frame: 170, deltaBytes: 34, budgetMs: 5, revision: 170 },
  { frame: 171, deltaBytes: 35, budgetMs: 6, revision: 171 },
  { frame: 172, deltaBytes: 36, budgetMs: 7, revision: 172 },
  { frame: 173, deltaBytes: 37, budgetMs: 8, revision: 173 },
  { frame: 174, deltaBytes: 38, budgetMs: 9, revision: 174 },
  { frame: 175, deltaBytes: 39, budgetMs: 10, revision: 175 },
  { frame: 176, deltaBytes: 40, budgetMs: 11, revision: 176 },
  { frame: 177, deltaBytes: 41, budgetMs: 12, revision: 177 },
  { frame: 178, deltaBytes: 42, budgetMs: 13, revision: 178 },
  { frame: 179, deltaBytes: 43, budgetMs: 14, revision: 179 },
  { frame: 180, deltaBytes: 44, budgetMs: 15, revision: 180 },
  { frame: 181, deltaBytes: 45, budgetMs: 16, revision: 181 },
  { frame: 182, deltaBytes: 46, budgetMs: 4, revision: 182 },
  { frame: 183, deltaBytes: 47, budgetMs: 5, revision: 183 },
  { frame: 184, deltaBytes: 48, budgetMs: 6, revision: 184 },
  { frame: 185, deltaBytes: 12, budgetMs: 7, revision: 185 },
  { frame: 186, deltaBytes: 13, budgetMs: 8, revision: 186 },
  { frame: 187, deltaBytes: 14, budgetMs: 9, revision: 187 },
  { frame: 188, deltaBytes: 15, budgetMs: 10, revision: 188 },
  { frame: 189, deltaBytes: 16, budgetMs: 11, revision: 189 },
  { frame: 190, deltaBytes: 17, budgetMs: 12, revision: 190 },
  { frame: 191, deltaBytes: 18, budgetMs: 13, revision: 191 },
  { frame: 192, deltaBytes: 19, budgetMs: 14, revision: 192 },
  { frame: 193, deltaBytes: 20, budgetMs: 15, revision: 193 },
  { frame: 194, deltaBytes: 21, budgetMs: 16, revision: 194 },
  { frame: 195, deltaBytes: 22, budgetMs: 4, revision: 195 },
  { frame: 196, deltaBytes: 23, budgetMs: 5, revision: 196 },
  { frame: 197, deltaBytes: 24, budgetMs: 6, revision: 197 },
  { frame: 198, deltaBytes: 25, budgetMs: 7, revision: 198 },
  { frame: 199, deltaBytes: 26, budgetMs: 8, revision: 199 },
  { frame: 200, deltaBytes: 27, budgetMs: 9, revision: 200 },
  { frame: 201, deltaBytes: 28, budgetMs: 10, revision: 201 },
  { frame: 202, deltaBytes: 29, budgetMs: 11, revision: 202 },
  { frame: 203, deltaBytes: 30, budgetMs: 12, revision: 203 },
  { frame: 204, deltaBytes: 31, budgetMs: 13, revision: 204 },
  { frame: 205, deltaBytes: 32, budgetMs: 14, revision: 205 },
  { frame: 206, deltaBytes: 33, budgetMs: 15, revision: 206 },
  { frame: 207, deltaBytes: 34, budgetMs: 16, revision: 207 },
  { frame: 208, deltaBytes: 35, budgetMs: 4, revision: 208 },
  { frame: 209, deltaBytes: 36, budgetMs: 5, revision: 209 },
  { frame: 210, deltaBytes: 37, budgetMs: 6, revision: 210 },
  { frame: 211, deltaBytes: 38, budgetMs: 7, revision: 211 },
  { frame: 212, deltaBytes: 39, budgetMs: 8, revision: 212 },
  { frame: 213, deltaBytes: 40, budgetMs: 9, revision: 213 },
  { frame: 214, deltaBytes: 41, budgetMs: 10, revision: 214 },
  { frame: 215, deltaBytes: 42, budgetMs: 11, revision: 215 },
  { frame: 216, deltaBytes: 43, budgetMs: 12, revision: 216 },
  { frame: 217, deltaBytes: 44, budgetMs: 13, revision: 217 },
  { frame: 218, deltaBytes: 45, budgetMs: 14, revision: 218 },
  { frame: 219, deltaBytes: 46, budgetMs: 15, revision: 219 },
  { frame: 220, deltaBytes: 47, budgetMs: 16, revision: 220 },
  { frame: 221, deltaBytes: 48, budgetMs: 4, revision: 221 },
  { frame: 222, deltaBytes: 12, budgetMs: 5, revision: 222 },
  { frame: 223, deltaBytes: 13, budgetMs: 6, revision: 223 },
  { frame: 224, deltaBytes: 14, budgetMs: 7, revision: 224 },
  { frame: 225, deltaBytes: 15, budgetMs: 8, revision: 225 },
  { frame: 226, deltaBytes: 16, budgetMs: 9, revision: 226 },
  { frame: 227, deltaBytes: 17, budgetMs: 10, revision: 227 },
  { frame: 228, deltaBytes: 18, budgetMs: 11, revision: 228 },
  { frame: 229, deltaBytes: 19, budgetMs: 12, revision: 229 },
  { frame: 230, deltaBytes: 20, budgetMs: 13, revision: 230 },
  { frame: 231, deltaBytes: 21, budgetMs: 14, revision: 231 },
  { frame: 232, deltaBytes: 22, budgetMs: 15, revision: 232 },
  { frame: 233, deltaBytes: 23, budgetMs: 16, revision: 233 },
  { frame: 234, deltaBytes: 24, budgetMs: 4, revision: 234 },
  { frame: 235, deltaBytes: 25, budgetMs: 5, revision: 235 },
  { frame: 236, deltaBytes: 26, budgetMs: 6, revision: 236 },
  { frame: 237, deltaBytes: 27, budgetMs: 7, revision: 237 },
  { frame: 238, deltaBytes: 28, budgetMs: 8, revision: 238 },
  { frame: 239, deltaBytes: 29, budgetMs: 9, revision: 239 },
  { frame: 240, deltaBytes: 30, budgetMs: 10, revision: 240 },
  { frame: 241, deltaBytes: 31, budgetMs: 11, revision: 241 },
  { frame: 242, deltaBytes: 32, budgetMs: 12, revision: 242 },
  { frame: 243, deltaBytes: 33, budgetMs: 13, revision: 243 },
  { frame: 244, deltaBytes: 34, budgetMs: 14, revision: 244 },
  { frame: 245, deltaBytes: 35, budgetMs: 15, revision: 245 },
  { frame: 246, deltaBytes: 36, budgetMs: 16, revision: 246 },
  { frame: 247, deltaBytes: 37, budgetMs: 4, revision: 247 },
  { frame: 248, deltaBytes: 38, budgetMs: 5, revision: 248 },
  { frame: 249, deltaBytes: 39, budgetMs: 6, revision: 249 },
  { frame: 250, deltaBytes: 40, budgetMs: 7, revision: 250 },
  { frame: 251, deltaBytes: 41, budgetMs: 8, revision: 251 },
  { frame: 252, deltaBytes: 42, budgetMs: 9, revision: 252 },
  { frame: 253, deltaBytes: 43, budgetMs: 10, revision: 253 },
  { frame: 254, deltaBytes: 44, budgetMs: 11, revision: 254 },
  { frame: 255, deltaBytes: 45, budgetMs: 12, revision: 255 },
  { frame: 256, deltaBytes: 46, budgetMs: 13, revision: 256 },
  { frame: 257, deltaBytes: 47, budgetMs: 14, revision: 257 },
  { frame: 258, deltaBytes: 48, budgetMs: 15, revision: 258 },
  { frame: 259, deltaBytes: 12, budgetMs: 16, revision: 259 },
  { frame: 260, deltaBytes: 13, budgetMs: 4, revision: 260 },
  { frame: 261, deltaBytes: 14, budgetMs: 5, revision: 261 },
  { frame: 262, deltaBytes: 15, budgetMs: 6, revision: 262 },
  { frame: 263, deltaBytes: 16, budgetMs: 7, revision: 263 },
  { frame: 264, deltaBytes: 17, budgetMs: 8, revision: 264 },
  { frame: 265, deltaBytes: 18, budgetMs: 9, revision: 265 },
  { frame: 266, deltaBytes: 19, budgetMs: 10, revision: 266 },
  { frame: 267, deltaBytes: 20, budgetMs: 11, revision: 267 },
  { frame: 268, deltaBytes: 21, budgetMs: 12, revision: 268 },
  { frame: 269, deltaBytes: 22, budgetMs: 13, revision: 269 },
  { frame: 270, deltaBytes: 23, budgetMs: 14, revision: 270 },
  { frame: 271, deltaBytes: 24, budgetMs: 15, revision: 271 },
  { frame: 272, deltaBytes: 25, budgetMs: 16, revision: 272 },
  { frame: 273, deltaBytes: 26, budgetMs: 4, revision: 273 },
  { frame: 274, deltaBytes: 27, budgetMs: 5, revision: 274 },
  { frame: 275, deltaBytes: 28, budgetMs: 6, revision: 275 },
  { frame: 276, deltaBytes: 29, budgetMs: 7, revision: 276 },
  { frame: 277, deltaBytes: 30, budgetMs: 8, revision: 277 },
  { frame: 278, deltaBytes: 31, budgetMs: 9, revision: 278 },
  { frame: 279, deltaBytes: 32, budgetMs: 10, revision: 279 },
  { frame: 280, deltaBytes: 33, budgetMs: 11, revision: 280 },
  { frame: 281, deltaBytes: 34, budgetMs: 12, revision: 281 },
  { frame: 282, deltaBytes: 35, budgetMs: 13, revision: 282 },
  { frame: 283, deltaBytes: 36, budgetMs: 14, revision: 283 },
  { frame: 284, deltaBytes: 37, budgetMs: 15, revision: 284 },
  { frame: 285, deltaBytes: 38, budgetMs: 16, revision: 285 },
  { frame: 286, deltaBytes: 39, budgetMs: 4, revision: 286 },
  { frame: 287, deltaBytes: 40, budgetMs: 5, revision: 287 },
  { frame: 288, deltaBytes: 41, budgetMs: 6, revision: 288 },
  { frame: 289, deltaBytes: 42, budgetMs: 7, revision: 289 },
  { frame: 290, deltaBytes: 43, budgetMs: 8, revision: 290 },
  { frame: 291, deltaBytes: 44, budgetMs: 9, revision: 291 },
  { frame: 292, deltaBytes: 45, budgetMs: 10, revision: 292 },
  { frame: 293, deltaBytes: 46, budgetMs: 11, revision: 293 },
  { frame: 294, deltaBytes: 47, budgetMs: 12, revision: 294 },
  { frame: 295, deltaBytes: 48, budgetMs: 13, revision: 295 },
  { frame: 296, deltaBytes: 12, budgetMs: 14, revision: 296 },
  { frame: 297, deltaBytes: 13, budgetMs: 15, revision: 297 },
  { frame: 298, deltaBytes: 14, budgetMs: 16, revision: 298 },
  { frame: 299, deltaBytes: 15, budgetMs: 4, revision: 299 },
  { frame: 300, deltaBytes: 16, budgetMs: 5, revision: 300 },
];

export function summarizeTrace(frames: readonly TraceFrame[]): {
  frames: number;
  bytes: number;
  maxBudgetMs: number;
  lastRevision: number;
} {
  return frames.reduce(
    (summary, frame) => {
      return {
        frames: summary.frames + 1,
        bytes: summary.bytes + frame.deltaBytes,
        maxBudgetMs: Math.max(summary.maxBudgetMs, frame.budgetMs),
        lastRevision: frame.revision,
      };
    },
    {
      frames: 0,
      bytes: 0,
      maxBudgetMs: 0,
      lastRevision: 0,
    },
  );
}
```

## 六、为什么要等待基线确认

如果从空字符串开始逐字符渲染十份长文档，实验测到的主要是“初始化超大文档”的成本，不是用户真正关心的“已有长对话继续流式生成”的成本。因此需要明确区分两个阶段：

### Preparing

- 加载并校验静态资源。
- 生成十份内存基线。
- Legacy 同步完成完整渲染。
- Incremental 的每个实例回报 `committedContentLength === baseline.length`。
- 指标采集保持关闭。

### Running

- 重置 Collector 和 Patch Log。
- 从完整基线之后继续追加场景内容。
- 开启输入帧、Worker、Patch 与主线程耗时采集。
- 完成后保留最终快照，便于比较两栏输出。

## 七、自动滚动与阅读意图

“只要有新内容就滚到底”会破坏用户阅读。更合理的规则是：

- 初始状态视为跟随。
- 视口距离底部小于阈值时，新内容到达后继续跟随。
- 用户主动向上滚动超过阈值后暂停。
- 用户重新滚到底部时自动恢复。
- 每个渲染实例独立保存状态，不能由全局开关互相影响。

代码块本身使用独立滚动容器，最大高度固定。用户浏览 300 行源码时，不应把整个对话面板撑出页面。

## 八、故障矩阵

| 故障 | 检测信号 | 当前帧处理 | 后续行为 |
| --- | --- | --- | --- |
| Worker 无法创建 | 构造异常 | 完整渲染当前内容 | 保持 fallback |
| Worker 超时 | 计时器到期 | 完整渲染最新目标 | 停止发 Patch 请求 |
| Revision 不匹配 | 协议校验失败 | 拒绝 Patch | 重建完整快照 |
| DOM 锚点缺失 | Apply 前置条件失败 | 使用 Patch 快照 | 记录 fallback |
| 不安全 HTML | DOMPurify 清理 | 移除危险节点 | 正常继续 |
| 静态资源 503 | Fetch 非 2xx | 展示错误状态 | 用户可重试 |

## 九、性能测试场景

第二段 TypeScript 是一组 300 条确定性性能样本。它模拟不同帧率、实例数量与语法边界，避免只用一小段纯文本得出失真的结论。

```ts
export interface BenchmarkCase {
  id: number;
  fps: 5 | 10 | 20 | 30 | 40 | 60;
  instances: 1 | 4;
  syntax: 'paragraph' | 'table' | 'code' | 'inline';
  expected: 'tail-append' | 'snapshot';
}

export const benchmarkCases: readonly BenchmarkCase[] = [
  { id: 1, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 2, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 3, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 4, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 5, fps: 40, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 6, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 7, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 8, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 9, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 10, fps: 30, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 11, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 12, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 13, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 14, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 15, fps: 20, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 16, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 17, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 18, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 19, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 20, fps: 10, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 21, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 22, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 23, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 24, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 25, fps: 5, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 26, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 27, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 28, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 29, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 30, fps: 60, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 31, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 32, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 33, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 34, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 35, fps: 40, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 36, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 37, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 38, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 39, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 40, fps: 30, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 41, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 42, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 43, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 44, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 45, fps: 20, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 46, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 47, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 48, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 49, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 50, fps: 10, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 51, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 52, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 53, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 54, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 55, fps: 5, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 56, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 57, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 58, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 59, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 60, fps: 60, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 61, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 62, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 63, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 64, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 65, fps: 40, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 66, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 67, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 68, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 69, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 70, fps: 30, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 71, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 72, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 73, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 74, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 75, fps: 20, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 76, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 77, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 78, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 79, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 80, fps: 10, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 81, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 82, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 83, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 84, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 85, fps: 5, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 86, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 87, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 88, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 89, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 90, fps: 60, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 91, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 92, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 93, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 94, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 95, fps: 40, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 96, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 97, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 98, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 99, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 100, fps: 30, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 101, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 102, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 103, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 104, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 105, fps: 20, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 106, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 107, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 108, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 109, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 110, fps: 10, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 111, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 112, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 113, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 114, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 115, fps: 5, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 116, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 117, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 118, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 119, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 120, fps: 60, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 121, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 122, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 123, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 124, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 125, fps: 40, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 126, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 127, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 128, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 129, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 130, fps: 30, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 131, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 132, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 133, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 134, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 135, fps: 20, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 136, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 137, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 138, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 139, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 140, fps: 10, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 141, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 142, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 143, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 144, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 145, fps: 5, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 146, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 147, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 148, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 149, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 150, fps: 60, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 151, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 152, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 153, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 154, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 155, fps: 40, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 156, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 157, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 158, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 159, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 160, fps: 30, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 161, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 162, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 163, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 164, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 165, fps: 20, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 166, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 167, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 168, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 169, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 170, fps: 10, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 171, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 172, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 173, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 174, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 175, fps: 5, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 176, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 177, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 178, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 179, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 180, fps: 60, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 181, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 182, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 183, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 184, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 185, fps: 40, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 186, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 187, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 188, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 189, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 190, fps: 30, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 191, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 192, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 193, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 194, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 195, fps: 20, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 196, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 197, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 198, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 199, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 200, fps: 10, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 201, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 202, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 203, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 204, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 205, fps: 5, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 206, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 207, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 208, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 209, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 210, fps: 60, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 211, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 212, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 213, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 214, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 215, fps: 40, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 216, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 217, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 218, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 219, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 220, fps: 30, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 221, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 222, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 223, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 224, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 225, fps: 20, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 226, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 227, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 228, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 229, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 230, fps: 10, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 231, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 232, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 233, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 234, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 235, fps: 5, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 236, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 237, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 238, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 239, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 240, fps: 60, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 241, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 242, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 243, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 244, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 245, fps: 40, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 246, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 247, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 248, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 249, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 250, fps: 30, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 251, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 252, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 253, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 254, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 255, fps: 20, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 256, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 257, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 258, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 259, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 260, fps: 10, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 261, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 262, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 263, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 264, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 265, fps: 5, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 266, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 267, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 268, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 269, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 270, fps: 60, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 271, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 272, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 273, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 274, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 275, fps: 40, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 276, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 277, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 278, fps: 10, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 279, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 280, fps: 30, instances: 4, syntax: 'inline', expected: 'snapshot' },
  { id: 281, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 282, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 283, fps: 5, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 284, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 285, fps: 20, instances: 1, syntax: 'paragraph', expected: 'snapshot' },
  { id: 286, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 287, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 288, fps: 60, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 289, fps: 5, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 290, fps: 10, instances: 1, syntax: 'table', expected: 'snapshot' },
  { id: 291, fps: 20, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 292, fps: 30, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 293, fps: 40, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 294, fps: 60, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 295, fps: 5, instances: 1, syntax: 'code', expected: 'snapshot' },
  { id: 296, fps: 10, instances: 4, syntax: 'inline', expected: 'tail-append' },
  { id: 297, fps: 20, instances: 1, syntax: 'paragraph', expected: 'tail-append' },
  { id: 298, fps: 30, instances: 1, syntax: 'table', expected: 'tail-append' },
  { id: 299, fps: 40, instances: 1, syntax: 'code', expected: 'tail-append' },
  { id: 300, fps: 60, instances: 4, syntax: 'inline', expected: 'snapshot' },
];

export function groupCases(
  cases: readonly BenchmarkCase[],
): Readonly<Record<BenchmarkCase['expected'], number>> {
  return cases.reduce(
    (groups, benchmarkCase) => {
      return {
        ...groups,
        [benchmarkCase.expected]: groups[benchmarkCase.expected] + 1,
      };
    },
    {
      'tail-append': 0,
      snapshot: 0,
    },
  );
}
```

## 十、观测指标解释

- **Input Frames**：Streamer 实际发出的输入帧数。
- **Legacy Commits**：全量解析与 DOM 替换次数。
- **Incremental Commits**：成功应用的增量 Patch 次数。
- **Coalesced Frames**：Worker 忙碌时被更新目标覆盖的中间帧数。
- **Worker Parse / Diff**：Worker 内部解析与差分累计时间。
- **Main Total / Average / Max**：主线程实际执行渲染或 Patch 的耗时。
- **Tail Append Rate**：命中文本安全尾部追加的 Patch 比例。
- **Snapshot Fallback Rate**：因结构跳变而使用块快照的比例。
- **Runtime Fallbacks**：整个增量运行时退回全量渲染的次数。

这些指标不能单独看。例如 Coalesced Frames 上升不一定是坏事，它可能说明调度器主动丢弃了已经过时、且不会影响最终内容的中间目标。最终必须同时检查内容一致性和主线程长任务。

## 十一、验收清单

- [ ] 两栏在基线阶段接收完全相同的字符串。
- [ ] 基线由单一源文件在浏览器内复制十份。
- [ ] 两个代码块均不少于 300 行，并拥有内部滚动。
- [ ] 指标在基线确认前保持为零。
- [ ] 开始后只流式追加续写内容。
- [ ] 调节推送速度不会重新切分已经生成的帧。
- [ ] 用户上滑后暂停自动滚动，回到底部后恢复。
- [ ] Worker 故障时内容完整、安全且状态可观测。
- [ ] Legacy 与 Incremental 最终可见文本一致。
- [ ] Loading、Error、Retry、Ready、Running 和 Completed 状态可验证。

## 十二、结论

高质量的流式渲染不是把 `innerHTML` 放进定时器，而是把输入确定性、Worker 状态机、Revision 协议、安全净化、DOM 最小提交、阅读意图和指标边界作为同一个系统设计。只有在超大真实基线上仍能证明最终一致性，增量优化才具有生产价值。
