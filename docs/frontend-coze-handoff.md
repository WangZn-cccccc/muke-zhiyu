# 牧客智语前端与 Coze 工作流接入交付说明

## 交付目标

本交付包保存当前已经确认的牧客智语响应式 Web 前端，以及前端调用 Coze 工作流所需的接口合同。接收方应在保留现有 UI、交互和动画的前提下，将 `/api/workflow/run` 接入其云端运行环境；不得把 Coze API Token 写入浏览器端代码。

## 与目标 Coze 前端工程的兼容性结论

本包是**完整、可运行的原始前端工程**，可以作为视觉和交互实现的唯一来源；但它不是可直接覆盖目标工程 `frontend/src/` 的补丁。接收方需要做一次目录和依赖适配：

| 项目 | 当前交付源码 | 目标工程 | 接入处理 |
| --- | --- | --- | --- |
| React | React 19 | React 18 | 当前代码未使用 React 19 专属 API，可迁移到 React 18，但使用目标工程自己的依赖版本和入口文件 |
| 页面入口 | `src/Prototype.tsx` | `src/pages/页面.tsx` | 新建页面组件并迁入 `Prototype` 的应用内容，不覆盖目标工程入口 |
| 组件结构 | 页面内已有多个局部组件 | `src/components/` | 将诊断、追问、方向、产品、管理、异常等组件按职责拆分 |
| 动效 | `motion/react` | `framer-motion` | 在目标工程中把动效 import 改为 `framer-motion`，不得新增 `motion` 依赖 |
| 样式 | `src/prototype.css` 与运行时样式 | `tokens.css` + `index.css`/Modules | 保留当前视觉值，逐项映射为目标 token；避免覆盖目标全局样式 |
| 移动预览 | 自带 `src/mobile/` 手机预览运行时 | 目标工程网页运行时 | 正式网页只迁移应用内容；除非目标工程也需要设备预览，否则不复制手机外框和模拟键盘 |
| 类型 | `src/workflow-api.ts` | `src/types.ts` | 以本包合同为准合并进目标 `src/types.ts`，不要创建同义字段 |

因此，接收方应当“迁移页面内容并适配现有工程”，不能直接复制本包 `package.json`、`src/main.tsx`、`src/App.tsx` 或整个 `src/mobile/` 覆盖目标项目。

## 关键入口

- `src/Prototype.tsx`：产品页面、问诊流程、方向选择、管理建议和产品结果 UI。
- `src/prototype.css`：当前正式视觉样式与响应式布局。
- `src/workflow-api.ts`：前端请求和响应 TypeScript 类型，以及工作流调用入口。
- `contracts/workflow-response.schema.json`：工作流响应的机器校验合同。
- `contracts/workflow-api-contract.md`：前端、代理层和 Coze 工作流的协作规则。
- `design.md`：已经确认的 UI、交互和动画规范。
- `server/local-proxy.mjs`：本地联调代理参考实现；云端部署时应改造成平台的服务端函数或后端接口。

## 必须保留的调用链

```text
用户浏览器 -> 牧客智语前端 -> 服务端 /api/workflow/run -> Coze /run
```

浏览器只能请求同域或受控的 `/api/workflow/run`。服务端从环境变量读取 `COZE_API_URL` 和 `COZE_API_TOKEN`，再调用 Coze。Token 不得进入 `src/`、构建产物或任何公开仓库。

## 请求约定

前端向 `/api/workflow/run` 发送：

```json
{
  "user_input": "用户本轮输入",
  "conversation_context": "上一轮完整响应序列化后的 JSON 字符串",
  "conversation_id": "跨轮稳定的会话 ID",
  "request_id": "本次请求唯一 ID"
}
```

服务端应把 Coze 返回的 JSON 原样传回前端，并按 `contracts/workflow-response.schema.json` 校验。不得把数组转换为文本，也不得删除空数组、`null` 或稳定 ID。

特别注意：当前工作流请求合同没有独立的 `selected_direction` 请求字段。用户点击方向卡后，应把方向稳定 ID（例如 `DIR-0008`）作为本轮 `user_input` 发送，并同时原样携带上一轮 `conversation_context`。响应里的 `selected_direction` 是工作流确认后的输出字段，不能由浏览器伪造。

## 前端依赖的响应类型

- `question`：渲染本轮问题，全部必答问题完成后才能继续。
- `diagnosis`：渲染已确认病例信息、诊断判断、证据、风险和警示。
- `direction_selection`：渲染去重后的解决方向卡片，用户选择稳定 `DIR-xxxx`。
- `product`：渲染最多 3 个真实产品及厂家、推荐理由、使用信息和官方联系信息。
- `management`：渲染规则表约束下的管理与排查建议。
- `no_match`、`emergency`、`out_of_scope`、`service_end`、`error`：分别渲染对应安全状态。

前端需要跨轮保存上一轮完整响应作为下一轮 `conversation_context`。选择方向时，发送方向稳定 ID，而不是卡片标题或内部对象。

错误分支必须以 `success` 和 `response_type` 判断。`result_mode` 只允许 `product`、`management`、`no_match` 或 `null`，不存在 `error` 或 `service_end` 两个取值。

## 接收方实施边界

1. 保留 `src/Prototype.tsx` 和 `src/prototype.css` 已有界面，不重做视觉稿。
2. 将 `src/workflow-api.ts` 的请求地址改为部署环境的同域 `/api/workflow/run`。
3. 在云端实现代理函数，使用环境变量保存 Coze Token。
4. 保持工作流合同字段和枚举不变；若响应校验失败，应记录 `request_id` 和具体字段路径。
5. 部署前运行 `npm ci`、`npm test`、`npm run check:runtime` 和 `npm run build`。

## 推荐的目标目录拆分

```text
frontend/src/
  pages/MukeChatPage.tsx
  components/AssistantAvatar.tsx
  components/QuestionCard.tsx
  components/DiagnosisResult.tsx
  components/DirectionCard.tsx
  components/DirectionList.tsx
  components/ProductCard.tsx
  components/ManagementAdvice.tsx
  components/WorkflowStatus.tsx
  types.ts
  api/workflow.ts
  styles/muke-chat.css
```

拆分只能改变代码组织方式，不能改变已经确认的页面内容、颜色、层级、交互节奏和动画结果。

## 当前已知边界

- 本包包含本地代理参考实现，但不包含 Coze 平台内部完整 Python 工作流源码。
- RAG、方向规则表和产品库的权威源资料位于主仓库 `knowledge/`，不属于本前端精简交付包；Coze 线上运行数据应以其已部署资产为准。
- 当前前端默认本地代理地址为 `http://127.0.0.1:3001`。云端拼接时必须改为同域接口或通过部署环境变量覆盖。
- 本包的 `package.json` 仅用于复现原始前端，不应用来覆盖目标 Coze 工程的依赖清单。
