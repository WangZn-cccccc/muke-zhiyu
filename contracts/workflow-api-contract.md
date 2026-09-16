# 牧客智语工作流 API 合同

> 版本：1.0.0-draft  
> 状态：用于 Coze、牧客智语后端和前端联调的第一版合同  
> 目标：规定请求与响应的稳定结构。本文不规定各节点使用什么模型，也不替代节点 Prompt。

## 1. 合同参与方

```text
牧客智语前端 → 牧客智语后端 → Coze 工作流
牧客智语前端 ← 牧客智语后端 ← Coze 工作流
```

- 前端：收集输入、展示问题/诊断/方向/产品、提交用户选择。
- 后端：保存会话、保护 Token、调用 Coze、校验响应、记录错误。
- Coze：执行节点1～7并返回符合本合同的结构化结果。
- 本合同：约束三方的数据语言，不参与医学推理。

## 2. 需求来源标记

| 标记 | 含义 |
| --- | --- |
| `PRD_REQUIRED` | PRD或流程图明确规定，不得随意删除 |
| `UI_REQUIRED` | 已确认 Demo 的展示或交互需要 |
| `ENGINEERING_REQUIRED` | 鉴权、会话、校验、日志或故障处理需要 |
| `PROPOSED` | 为稳定性建议增加，需在正式冻结前确认 |

任何新增字段必须标注来源。无法找到依据的字段不能伪装成 `PRD_REQUIRED`。

## 3. 接口基本信息

| 项目 | 值 | 来源 |
| --- | --- | --- |
| 方法 | `POST` | 当前 Coze 部署 |
| 地址 | `https://whh4824k28.coze.site/run` | 当前 Coze 部署 |
| Content-Type | `application/json` | `ENGINEERING_REQUIRED` |
| 鉴权 | `Authorization: Bearer <API_TOKEN>` | 当前 Coze 部署 |
| Token位置 | 仅后端环境变量 | `ENGINEERING_REQUIRED` |

禁止在浏览器代码、日志、错误消息或 Git 仓库中保存真实 Token。

## 4. 请求格式

当前 Coze 接口接收两个顶层字段：

```json
{
  "user_input": "仔猪拉稀两天了，精神不好",
  "conversation_context": "{\"conversation_id\":\"case_001\",\"case_data\":{},\"follow_up_round\":0,\"diagnosis_attempts\":0,\"asked_questions\":[],\"selected_direction\":null}"
}
```

### 4.1 请求字段

| 字段 | 类型 | 必填 | 来源 | 作用 |
| --- | --- | --- | --- | --- |
| `user_input` | string | 是 | `PRD_REQUIRED` | 用户本轮原始输入，不得被前端改写成医学事实 |
| `conversation_context` | JSON字符串 | 是 | 当前 Coze 接口 | 本轮之前的全量上下文 |

### 4.2 conversation_context内容

| 字段 | 类型 | 必填 | 来源 | 作用 |
| --- | --- | --- | --- | --- |
| `conversation_id` | string | 是 | `ENGINEERING_REQUIRED` | 关联同一次问诊 |
| `case_data` | object | 是 | `PRD_REQUIRED` | 全量结构化病例 |
| `follow_up_round` | integer 0–4 | 是 | `PRD_REQUIRED` | 累计信息补充轮次；第4轮仅为有条件的保底追问 |
| `fourth_round_triggered` | boolean | 是 | `PRD_REQUIRED` | 是否触发第4轮保底追问 |
| `fourth_round_reason` | string/null | 是 | `PRD_REQUIRED` | 第4轮触发理由；未触发时为null |
| `diagnosis_attempts` | integer ≥0 | 是 | 当前工作流 | 累计重诊次数 |
| `asked_questions` | string[] | 是 | `PRD_REQUIRED` | 已展示问题的稳定ID，防止重复追问 |
| `pending_question_ids` | string[] | 是 | `UI_REQUIRED` | 当前仍未完成处理的必答问题ID |
| `question_answers` | object | 是 | `UI_REQUIRED` | 各问题的回答值与 `pending/answered/unavailable/invalid` 状态 |
| `selected_direction` | string/null | 否 | `PRD_REQUIRED` | 用户已选择的方向ID |

后端负责把内部对象序列化为 `conversation_context` 字符串。前端不直接拼接该字符串。

## 5. 统一响应外壳

Coze 每次成功执行都必须返回同一顶层结构；不适用的数据使用 `null`、空对象或空数组，字段类型不得漂移。

```json
{
  "contract_version": "1.0.0",
  "success": true,
  "response_type": "question",
  "response": "为了继续判断，还需要确认两项信息。",
  "conversation_id": "case_001",
  "case_data": {},
  "follow_up_round": 1,
  "fourth_round_triggered": false,
  "fourth_round_reason": null,
  "diagnosis_attempts": 0,
  "asked_questions": [],
  "pending_question_ids": [],
  "question_answers": {},
  "questions": [],
  "diagnosis": null,
  "locked_disease": null,
  "candidate_id": null,
  "solution_directions": [],
  "selected_direction": null,
  "product_category_tags": [],
  "management_directions": [],
  "management_advice": [],
  "company_product_categories": [],
  "prefer_company_product": false,
  "recommendation_status": "not_started",
  "result_mode": null,
  "recommended_products": [],
  "emergency": null,
  "service_end_reason": null,
  "error": null,
  "meta": {
    "request_id": "req_001",
    "workflow_version": "coze-workflow-version"
  }
}
```

## 6. response_type枚举

| 值 | 含义 | 前端行为 | 必填结构 |
| --- | --- | --- | --- |
| `question` | 需要用户补充信息 | 常规展示1～2题；宽泛症状首轮可展示2～3题 | `questions` |
| `diagnosis` | 已形成辅助诊断 | 展示结构化诊断 | `diagnosis` |
| `direction_selection` | 等待选择解决方向 | 展示方向列表 | `solution_directions` |
| `product` | 返回产品方案 | 展示产品卡片 | `recommended_products` |
| `management` | 仅管理建议 | 展示管理方案 | `management_advice` |
| `no_match` | 没有匹配产品 | 展示无匹配结果 | 产品数组必须为空 |
| `knowledge` | 普通知识问答 | 展示连续文本 | `response` |
| `emergency` | 重大风险 | 显示紧急页并终止推荐 | `emergency` |
| `out_of_scope` | 超出服务范围 | 礼貌说明范围 | `response` |
| `service_end` | 转检测/兽医/客服 | 展示结束原因和下一步 | `service_end_reason` |
| `error` | 执行失败 | 展示重试或稍后再试 | `error` |

来源：原 Coze 枚举保留 `diagnosis/question/product/knowledge/emergency/out_of_scope/service_end`；根据最新版节点6、节点7及Demo增加 `direction_selection/management/no_match/error`。最新版节点7只处理产品型方向，不再输出旧版 `mixed` 类型。

## 7. 追问结构

```json
{
  "questions": [
    {
      "id": "age_group_01",
      "target_field": "age_group",
      "question": "这些仔猪大约多大？",
      "question_type": "single_choice",
      "options": [
        { "value": "recently_weaned", "label": "刚断奶不久" },
        { "value": "suckling", "label": "还在哺乳期" }
      ],
      "allow_other": true,
      "required": true
    }
  ]
}
```

### 7.1 规则

- `PRD_REQUIRED`：常规每轮1～2个问题；用户仅提供宽泛症状、RAG召回较多且首轮无法形成可靠候选时，首轮允许2～3个高价值观察问题。
- `PRD_REQUIRED`：常规尽量在前三轮缩圈；只有存在用户可观察、未询问且能明显改变候选排序的信息时，才允许第4轮保底追问；绝不设置第5轮。
- `PRD_REQUIRED`：不得重复询问已确认或已有效回答的信息。
- `PRD_REQUIRED`：使用选项时允许用户补充其他情况。
- `UI_REQUIRED`：多道必答题全部完成后才能提交。
- `UI_REQUIRED`：选择“其他”后必须输入非空内容。
- `UI_REQUIRED`：选择某个选项不能自动提交整轮追问。
- `UI_REQUIRED`：所有必答问题必须进入 `answered` 或 `unavailable` 后才能进入下一阶段；仍为 `pending/invalid` 时不得继续。
- `UI_REQUIRED`：选择“其他”时必须保存非空 `other_text`，不能只保存“其他”二字。
- `ENGINEERING_REQUIRED`：`id` 在当前会话内稳定且唯一。
- `ENGINEERING_REQUIRED`：`value` 为机器值，`label` 为展示文案。
- `ENGINEERING_REQUIRED`：追问阶段允许用户不点击选项、直接在全局输入框使用自然语言回答；前端必须复用当前 `conversation_id`，并把上一轮完整响应作为 `conversation_context` 继续提交。
- `ENGINEERING_REQUIRED`：当 `pending_question_ids` 非空时，工作流必须优先把 `user_input` 作为当前追问的回答交给节点2解析，不得先按一条全新咨询重新执行全局意图识别。用户同时补充其他新症状时，节点2应合并有效事实后继续原问诊链路。

## 8. case_data结构

```json
{
  "animal": "猪",
  "user_reported_disease": {"name": "", "statement_type": ""},
  "stage": "断奶仔猪",
  "age": "",
  "symptoms": ["腹泻", "精神差"],
  "duration": "2天",
  "morbidity": {"total_count": "", "affected_count": ""},
  "mortality": {"death_count": ""},
  "severity": "",
  "temperature": "",
  "feeding_status": "",
  "drinking_status": "",
  "feces_color": "黄色",
  "feces_shape": "稀便",
  "medication_history": "",
  "environment_change": "",
  "other_information": [],
  "information_status": {},
  "change_history": [],
  "conflicts": [],
  "raw_text": ["仔猪拉稀两天了，精神不好"]
}
```

- 每轮返回全量病例，而非仅返回本轮增量。
- 未提供的信息按最新版Node2的字段类型使用空字符串、空数组或明确状态，不得推测；`information_status` 禁止使用 `inferred`。
- 新确认信息覆盖旧值，但必须保留原始输入用于追溯。
- 症状数组只能包含用户表达或明确确认的信息；`raw_text` 为跨轮原始表达数组。

## 9. diagnosis结构

```json
{
  "diagnosis": {
    "disease_name": "仔猪断奶后腹泻",
    "display_title": "初步判断：更符合仔猪断奶后腹泻",
    "confidence": "medium",
    "evidence": [
      {
        "text": "用户描述为断奶仔猪并出现黄色稀便",
        "source_type": "case_data",
        "source_ref": "age_group,feces_color,feces_shape"
      }
    ],
    "differential_notes": [],
    "missing_information": ["体温", "饮水情况"],
    "risk_level": "medium",
    "warning": "该结果为辅助判断，不能替代现场诊断。"
  }
}
```

- 诊断不得表述为确诊。
- 每条支持依据必须携带来源类型和来源引用。
- 用户未提供的内容只能列为待确认，不能作为支持依据。
- `confidence`：`low/medium/high`；不得使用100%等绝对可信度。
- `risk_level`：`low/medium/high/critical`。

## 10. solution_directions结构

```json
{
  "solution_directions": [
    {
      "id": "direction_rehydration",
      "name": "补液与电解质支持",
      "description": "优先降低脱水风险并稳定当前状态",
      "direction_type": "product",
      "priority": 1,
      "product_category_tags": ["口服补液盐", "电解质"],
      "company_product_categories": [],
      "prefer_company_product": false,
      "source_rule_id": "node6_rule_001"
    }
  ]
}
```

- 节点6每次返回1～4个适用方向；当前PRD部分版本写3～4个，流程图允许1～4个，正式冻结前需统一。暂按1～4执行并标记为待确认项。
- 方向必须来自固定节点6规则表，携带 `source_rule_id`。
- 前端提交稳定的方向 `id`，不使用显示名称作为唯一标识。
- `direction_type`：对外统一为 `product/management`，分别映射最新版节点6内部的 `product/non_product`。
- 公司产品仅在医学适用性相近时排序优先，不得降低适用标准。

## 11. 推荐状态与结果类型

原 `recommendation_status=waiting_for_selection/selected/management_only` 混合了流程状态和结果类型，拆为：

```text
recommendation_status:
  not_started | waiting_for_selection | processing | completed | failed

result_mode:
  product | management | no_match | null
```

## 12. recommended_products结构

```json
{
  "result_mode": "product",
  "recommended_products": [
    {
      "product_id": "product_001",
      "product_name": "产品名称",
      "manufacturer": "生产厂家",
      "product_category": "口服补液盐",
      "ingredients": "经核验的主要成分；缺失时为null",
      "positioning": "产品定位；缺失时为null",
      "applicable_timing": "适用条件或使用时机；缺失时为null",
      "features": ["补充水分和电解质"],
      "recommendation_reason": "与当前疾病、方向和生长阶段匹配",
      "usage": "产品知识库中的原始使用说明",
      "precautions": ["按照产品标签和专业人员建议使用"],
      "official_website": "厂家官方网址；缺失时为null",
      "contact_info": "厂家官方电话；缺失时为null",
      "purchase_url": null,
      "source_id": "product_kb_001"
    }
  ]
}
```

- 产品必须来自固定产品知识库。
- 产品响应一次返回1～3项，必须在工作流代码层完成相关性过滤、去重和数量截断。
- `source_id` 必填，用于证明来源。
- 不得虚构名称、厂家、成分、剂量或产品效果。
- 无匹配时 `result_mode=no_match` 且产品数组为空。
- `management` 模式不得生成产品对象。
- 最新版节点7仅处理产品型方向；纯非产品型方向由节点6直接返回管理建议，不进入节点7。
- `ingredients`、`positioning`、`applicable_timing` 和 `purchase_channel` 来源于最新版节点7对外输出要求。当前 `1.0.0` 工作流若尚未返回，应先作为可选兼容字段；Coze、插件OpenAPI和JSON Schema同步后再升级为正式必填字段。
- `official_website` 存在时，前端显示厂家官网链接；缺失时不得由前端搜索、猜测或拼接网址。

## 13. emergency结构

```json
{
  "emergency": {
    "emergency_type": "suspected_asf",
    "risk_level": "critical",
    "title": "存在重大动物疫病风险",
    "actions": [
      "立即隔离疑似病猪",
      "暂停转群和外运",
      "联系当地兽医或有关部门"
    ],
    "stop_recommendation": true
  }
}
```

当 `response_type=emergency`：

- `stop_recommendation` 必须为 `true`。
- `recommendation_status` 不能为 `processing` 或 `completed`。
- `recommended_products`、`solution_directions` 必须为空。
- 后端也必须执行相同拦截，不能只依赖前端隐藏。

## 14. 错误结构

```json
{
  "success": false,
  "response_type": "error",
  "response": "当前服务暂时不可用，请稍后重试。",
  "error": {
    "code": "WORKFLOW_TIMEOUT",
    "message": "工作流执行超时",
    "retryable": true
  }
}
```

错误码至少覆盖：

- `INVALID_REQUEST`
- `UNAUTHORIZED`
- `WORKFLOW_TIMEOUT`
- `WORKFLOW_FAILED`
- `INVALID_RESPONSE`
- `KNOWLEDGE_UNAVAILABLE`
- `DUPLICATE_SUBMISSION`

用户只看到安全文案；内部错误、Token和Prompt不得回显。

## 15. 类型与字段组合规则

| response_type | 必须满足 |
| --- | --- |
| `question` | `success=true`；常规问题1～2个，宽泛症状首轮最多3个；`follow_up_round` 为1～4；第4轮必须带触发理由 |
| `diagnosis` | `diagnosis` 非空；证据均有来源 |
| `direction_selection` | `solution_directions.length` 为1～4；状态为 `waiting_for_selection` |
| `product` | `result_mode=product`；产品1～3个且都有 `source_id` |
| `management` | `result_mode=management`；产品数组为空；管理建议非空 |
| `no_match` | `result_mode=no_match`；产品数组为空 |
| `emergency` | 停止推荐；方向和产品数组为空 |
| `error` | `success=false`；`error` 非空 |

## 16. 字段来源矩阵

| 字段组 | 来源 |
| --- | --- |
| `response/response_type` | 原Coze返回 + `UI_REQUIRED`扩展 |
| `case_data/follow_up_round/asked_questions` | `PRD_REQUIRED` |
| `locked_disease/candidate_id/diagnosis_attempts` | 现有工作流内部状态 |
| `questions` | `PRD_REQUIRED + UI_REQUIRED` |
| `diagnosis` | `PRD_REQUIRED + UI_REQUIRED` |
| `solution_directions` | `PRD_REQUIRED + UI_REQUIRED` |
| `product_category_tags/company_product_categories/prefer_company_product` | `PRD_REQUIRED` |
| `recommended_products/management_advice/result_mode` | `PRD_REQUIRED + UI_REQUIRED` |
| `emergency` | `PRD_REQUIRED + ENGINEERING_REQUIRED` |
| `contract_version/request_id/workflow_version/error` | `ENGINEERING_REQUIRED/PROPOSED` |

## 17. 兼容当前Coze返回的适配策略

当前Coze字段可保留，但后端需要补充或映射：

| 当前字段 | 合同字段 |
| --- | --- |
| `response` | 原样保留作为展示降级文本 |
| `response_type=question` | 必须同时补 `questions` |
| `response_type=diagnosis` | 必须同时补 `diagnosis` |
| 等待用户选方向 | 改为 `response_type=direction_selection` 并补 `solution_directions` |
| `company_product_category` | 统一改为复数 `company_product_categories` |
| `management_context` | 明确后统一为 `management_advice` |
| `recommendation_status=management_only` | 改为 `recommendation_status=completed` + `result_mode=management` |

正式接入前，应优先让Coze直接输出合同结构；后端适配仅用于版本过渡，不应长期解析自然语言 `response`。

## 18. 版本变更规则

- 新增可选字段：小版本升级，例如 `1.1.0`。
- 修改枚举、类型、必填规则或删除字段：大版本升级，例如 `2.0.0`。
- 前端、后端、Coze都必须记录正在使用的合同版本。
- 不兼容版本必须拒绝处理并返回 `INVALID_RESPONSE`，不得猜测字段含义。

## 19. 待产品确认项

1. 节点6方向数量最终采用 `1～4` 还是 `3～4`。
2. `high`可信度是否对用户展示为“较高”，以及是否需要隐藏内部数值评分。
3. `service_end` 的原因枚举是否包含 `testing_required/vet_required/customer_service/follow_up_limit_reached`。
4. 正式产品卡片是否向用户展示厂家和具体用量，需结合合规审核确认。

## 20. 验收标准

- JSON Schema 校验通过。
- 合同语义测试通过。
- 黄金病例的必须行为全部满足。
- 黄金病例的禁止行为均未出现。
- 每个诊断依据和产品都有可追溯来源。
- 前端无需解析自然语言即可决定展示哪个组件。
