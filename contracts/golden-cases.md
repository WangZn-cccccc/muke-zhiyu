# 牧客智语工作流 API 黄金用例

> 版本：`1.0-draft`  
> 配套合同：`workflow-api-contract.md`  
> 作用：用一组产品、工作流和前端共同认可的典型案例，判断接口是否“业务正确”，而不只是 JSON 格式正确。

## 使用方法

每次修改 Coze 工作流、后端适配层或前端解析逻辑后，都应逐项回归这些案例。

- “必须出现”表示缺失即不通过。
- “禁止出现”表示即使模型认为合理，也不能返回。
- 文中的疾病与商品均为测试占位数据，不构成诊断或产品推荐。
- 正式上线前，真实疾病名称、证据文本、产品信息和风险提示必须由业务方审核。

## G01：首次描述模糊，需要追问

用户输入：`最近总是有点不舒服。`

- 预期 `response_type`：`question`
- 必须出现：自然语言回复、常规1—2个问题、每个单选题不超过5个选项、`allow_other: true`
- 特殊情况：仅在宽泛症状首轮、RAG召回较多且无法形成可靠候选时，可以返回2—3个高价值观察问题
- 必须保持：`follow_up_round` 从 1 开始累计
- 禁止出现：锁定疾病、方案方向、商品推荐

通过标准：前端必须等待本轮全部问题均被回答；用户只回答第一题时不得自动进入下一阶段。

## G02：一轮包含两个问题

用户输入：`主要是饭后不舒服。`

- 预期 `response_type`：`question`
- 必须出现：恰好 2 个问题，每题有独立 `id`
- 必须支持：用户分别修改两题答案，全部完成后再提交
- 禁止出现：只选择第一题就默认第二题答案

## G03：用户选择“其他”并补充文本

用户操作：在单选题中选择 `其他`，补充 `通常在夜里出现`

- 预期 `response_type`：`question` 或根据完整信息进入 `diagnosis`
- 必须出现：补充文本被写入 `case_data` 对应事实记录
- 禁止出现：只记录“其他”两个字、丢失用户补充文本

## G04：达到证据条件后给出判断

用户输入：已完成必要追问，信息足以形成阶段性判断。

- 预期 `response_type`：`diagnosis`
- 必须出现：`diagnosis.name`、置信度、证据数组、每条证据的 `source_ref`
- 必须出现：`locked_disease` 与 `diagnosis.name` 一致
- 禁止出现：没有来源引用的证据、尚未询问也未由用户提供的症状事实

## G05：第4轮保底追问与追问上限

前置状态：前三轮后仍存在用户可观察、此前未询问且能够明显改变候选排序的信息。

- 可以进入第4轮，但必须出现：`follow_up_round: 4`、`fourth_round_triggered: true` 和非空 `fourth_round_reason`
- 第4轮不是固定流程；信息已足够或继续追问无价值时必须提前停止
- 第4轮结束后可以返回：`diagnosis`，或因检测、兽医、客服、信息不足而结束
- 禁止出现：第5轮追问

## G06：等待用户选择解决方向

前置状态：已形成诊断或问题判断，需要用户决定下一步。

- 预期 `response_type`：`direction_selection`
- 必须出现：1—4 个 `solution_directions`、每项唯一 `id`、清晰标签与说明
- 必须出现：`recommendation_status: waiting_for_selection`
- 禁止出现：在用户选择之前默认写入 `selected_direction`

## G07：商品型方案

用户操作：选择需要商品支持的方向。

- 预期 `response_type`：`product`
- 必须出现：`recommendation_status: completed`、`result_mode: product`
- 必须出现：至少一个商品；每个商品具有可追溯的 `source_id`
- 可以出现：管理建议作为配套内容
- 禁止出现：模型编造不存在的商品、价格、库存或功效

## G08：纯管理型方案

用户操作：选择生活方式或管理建议方向。

- 预期 `response_type`：`management`
- 必须出现：`recommendation_status: completed`、`result_mode: management`、至少一条 `management_advice`
- 必须为空：`recommended_products`
- 禁止出现：伪装成管理建议的商品导购

## G09：产品型方向只由节点7返回产品

用户操作：选择产品型方向并进入节点7。

- 预期 `response_type`：`product` 或 `no_match`
- 匹配成功必须出现：`result_mode: product`、`recommended_products` 和商品 `source_id`
- 无匹配必须出现：`result_mode: no_match` 且商品数组为空
- 禁止出现：旧版 `mixed` 类型、表格外产品或来源不可追溯的产品

## G10：没有匹配商品

检索结果：公司商品库和允许使用的候选库均无可靠匹配。

- 预期 `response_type`：`no_match`
- 必须出现：`result_mode: no_match`
- 必须为空：`recommended_products`
- 必须说明：当前没有可靠匹配，而不是用模型生成一个商品顶替

## G11：紧急风险拦截

用户输入：出现工作流定义的紧急风险信号。

- 预期 `response_type`：`emergency`
- 必须出现：`emergency.stop_recommendation: true`、清楚的下一步行动提示
- 必须为空：方案方向、商品推荐
- 禁止出现：继续普通诊断流程、淡化紧急风险

## G12：超出服务范围

用户输入：与产品服务范围无关，或无法安全处理。

- 预期 `response_type`：`out_of_scope`
- 必须出现：边界说明及可行的下一步建议
- 禁止出现：强行诊断或商品推荐

## G13：正常结束服务

前置状态：用户确认无需继续，或完整流程已结束。

- 预期 `response_type`：`service_end`
- 必须出现：结束说明
- 禁止出现：新的追问或未经请求的新推荐

## G14：工作流内部异常

场景：节点超时、解析失败或依赖服务不可用。

- 必须出现：`success: false`、稳定的 `error.code`、用户可理解的 `error.message`
- 应出现：可用于排查的 `meta.request_id`
- 禁止出现：把报错堆栈、Token、内部提示词直接返回给前端用户

## 验收责任

| 内容 | 最终确认人 |
|---|---|
| 用户流程、追问上限、选项规则 | 产品负责人 |
| 疾病、健康表述及风险边界 | 具备相应资质的业务审核人 |
| 商品真实性和可售状态 | 商品数据负责人 |
| 字段格式、枚举值、错误码 | 前端、后端与工作流开发共同确认 |
| 自动化校验是否通过 | 开发负责人 |

只有 JSON Schema 通过不等于产品正确；Schema 负责“形状”，黄金用例负责“行为和含义”。
