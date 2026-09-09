# 牧客智语 v0

面向中国大陆养猪从业者的智能问诊与解决方案 Web 应用。本仓库保存当前正式前端、前后端 API 合同以及继续开发所需的权威业务资料。

## 权威资料顺序

发生冲突时按以下优先级判断：

1. `contracts/workflow-response.schema.json`：接口结构与校验规则。
2. `contracts/workflow-api-contract.md`：前端、代理层和 Coze 工作流的协作规则。
3. `design.md`：当前已经确认的 UI、交互与动画规范。
4. `docs/product/牧客智语_PRD.md`：产品目标与业务流程。
5. `docs/workflow/节点5-7_最新版Prompt.md`：Node5—7 最新业务输出要求。
6. `knowledge/`：当前指定的 RAG、方向规则表和产品库源文件。

旧工作区中的早期 PRD、20/28病种 RAG、历次产品表、预览截图和临时脚本不属于本仓库的权威来源。

## 目录说明

- `src/`：当前应用代码；业务 UI 主要位于 `src/Prototype.tsx` 和 `src/prototype.css`。
- `server/`：本地 Coze API 代理，避免浏览器直接暴露 Token。
- `contracts/`：API 合同、JSON Schema 和 Golden Cases。
- `docs/`：产品、设计、工作流与联调文档。
- `knowledge/rag/`：诊断知识源。
- `knowledge/rules/`：206场景解决方向与产品品类规则表。
- `knowledge/products/`：当前指定的标签统一版产品库。
- `coze/`：等待补充的 Coze 已部署工作流源码和运行时 JSON 资产。
- `tests/`：前端运行时及 API 合同测试。

## 本地运行

要求 Node.js 20 或更高版本。

```bash
npm ci
copy .env.local.example .env.local
npm run dev:proxy
npm run dev
```

请在 `.env.local` 中填写本地 Token。该文件已被 `.gitignore` 排除，禁止提交到 GitHub。

默认地址：

- 前端：`http://127.0.0.1:4173/`
- 本地代理：`http://127.0.0.1:3001/`

## 提交前验证

```bash
npm run check:runtime
npm run test:contract
npm run build
```

## Vercel 部署

本仓库已同时支持本地代理和 Vercel 云函数。将 GitHub 仓库导入 Vercel 后，在项目的 Environment Variables 中配置：

- `COZE_API_URL`：已部署的 Coze `/run` 地址。
- `COZE_API_TOKEN`：Coze API Token，仅保存在 Vercel 服务端。
- `COZE_TIMEOUT_MS`：可选，默认 `60000`。

Build Command 与 Output Directory 已由 `vercel.json` 固定。前端在线上使用同域 `/api/workflow/run`，不需要配置 `VITE_LOCAL_PROXY_URL`；该变量只供本地开发连接 `http://127.0.0.1:3001` 使用。

## 当前边界

- 当前前端通过本地代理调用 Coze 公网工作流。
- 本仓库暂未包含 Coze 平台内部完整 Python 工作流代码。
- `knowledge/` 保存的是可审阅的业务源资料；线上实际运行的 JSON 资产仍应从 Coze 导出后放入 `coze/`。
- 不要提交 API Token、个人配置、依赖目录、构建产物和测试截图。
