# 牧客智语 Coze 工作流流程图

> 用途：供 AI 和工作流搭建人员理解节点职责、路由条件、循环关系及数据传递。
>
> 规则优先级：节点正文与当前 Prompt > 评测说明。当前节点正文规定最多进行 3 轮信息补充，不设置第 4 轮。

## 一、主工作流

```mermaid
flowchart TD
    START([用户输入]) --> N1[节点1：意图识别]

    N1 -->|意图1：猪病问诊| N2[节点2：输入解析]
    N1 -->|意图2：方案选择或产品追问| CONTEXT{是否已有方案或产品上下文}
    N1 -->|意图3：非服务范围| OUT_SCOPE[礼貌说明服务范围]
    N1 -->|意图4：养殖知识问答| KNOW[养殖知识问答节点]

    CONTEXT -->|有| N7[节点7：产品推荐与最终输出]
    CONTEXT -->|无| OUT_SCOPE

    KNOW --> KNOW_READY{问题信息是否足够}
    KNOW_READY -->|足够| KNOW_ANSWER[直接回答养殖知识]
    KNOW_READY -->|不足但可先回答| KNOW_PART[先给通用建议，再追问1至2项]
    KNOW_READY -->|不足且无法有效回答| KNOW_Q[仅追问1至2项关键信息]
    KNOW_PART --> KNOW
    KNOW_Q --> KNOW
    KNOW -->|出现症状、发病或死亡| N2
    KNOW -->|转为已有方案或产品追问| N7

    N2 --> N2_OUT[(输出全量结构化病例 case_data)]
    N2_OUT --> N3[节点3：病类判断与诊断条件校验]

    N3 --> CAT{能否识别主要疾病方向}
    CAT -->|不能| N4[节点4：追问引导]
    CAT -->|能| READY{是否满足最低诊断条件}
    READY -->|不满足| N4
    READY -->|满足| N5[节点5：疾病诊断]

    N4 --> LIMIT{累计信息补充是否已达3轮}
    LIMIT -->|未达到且存在高价值问题| ASK[向用户追问1至2个问题]
    ASK --> USER_REPLY[用户补充信息]
    USER_REPLY --> N2
    LIMIT -->|已达3轮或继续追问无价值| N5

    N5 --> RAG[(疾病知识库、鉴别诊断库、病例库)]
    RAG --> N5
    N5 --> EMERGENCY{是否疑似ASF或重大紧急风险}
    EMERGENCY -->|是| ASF[ASF紧急通道]
    ASF --> ASF_OUT[风险警示、隔离、上报、采样与生物安全建议]
    ASF_OUT --> END_EMERGENCY([流程结束：禁止进入节点6和节点7])

    EMERGENCY -->|否| LOCK{是否形成单一临床高可能疾病}
    LOCK -->|否，未达3轮且再问有价值| N4
    LOCK -->|否，只能依赖PCR等检测区分| TEST[说明线上判断局限和检测必要性]
    TEST --> SERVICE[在线客服或专业兽医]
    LOCK -->|否，达到上限或无法有效缩圈| SERVICE
    SERVICE --> END_SERVICE([流程结束：不进入普通推荐])

    LOCK -->|是| DIAG_OUT[对外输出疾病名称、依据、可能诱因、机制与风险提示]
    DIAG_OUT --> N6[节点6：解决方向推荐]

    N6 --> RULE6[(节点6固定方案品类规则表)]
    RULE6 --> N6
    N6 --> DIRS[展示1至4个适用解决方向\n说明针对问题、作用方式、预期改善]
    DIRS --> SELECT{用户选择方向}
    SELECT -->|要求换方向| N6
    SELECT -->|补充新症状、病程或死亡信息| N2
    SELECT -->|产品型方向| SEARCH_COND[生成节点7检索条件]
    SELECT -->|非产品型管理方向| N7

    SEARCH_COND --> COMPANY{是否存在适用的公司产品品类}
    COMPANY -->|是| COMPANY_FLAG[prefer_company_product=true\n仅表示优先检索，不降低适用性要求]
    COMPANY -->|否| NORMAL_FLAG[按通用产品品类标签检索]
    COMPANY_FLAG --> N7
    NORMAL_FLAG --> N7

    N7 --> TABLE7[(节点7固定产品信息表)]
    TABLE7 --> N7
    N7 --> RESULT_MODE{匹配结果类型}
    RESULT_MODE -->|product| PRODUCT[输出1至4个具体产品]
    RESULT_MODE -->|management| MANAGEMENT[仅输出管理建议\n不生成产品字段和购买渠道]
    RESULT_MODE -->|mixed| MIXED[先输出产品，再输出配套管理建议]
    RESULT_MODE -->|no_match| NO_MATCH[明确无匹配结果，不虚构内容]

    PRODUCT --> FINAL[病例概述、推荐结果、使用信息、购买与咨询渠道、安全提醒]
    MANAGEMENT --> FINAL
    MIXED --> FINAL
    NO_MATCH --> FINAL
    FINAL --> END([本次问诊推荐主流程结束])

    END -->|用户查看其他产品| N7
    END -->|用户返回方向选择| N6
    END -->|用户重新描述症状| N2
```

## 二、节点间核心数据流

```mermaid
flowchart LR
    U[用户当前输入和历史对话] --> N1[节点1]
    N1 -->|意图标签 1、2、3、4| ROUTER[路由器]

    ROUTER --> N2[节点2]
    N2 -->|case_data：全量病例 JSON| N3[节点3]
    N3 -->|disease_category、diagnosis_ready、priority_missing_fields| N4[节点4]
    N4 -->|问题文本、follow_up_round、return_path| U

    N3 -->|满足最低条件| N5[节点5]
    N5 -->|follow_up_targets、follow_up_reason| N4
    N5 -->|locked_disease、diagnosis_basis、risk_level| N6[节点6]

    N6 -->|selected_direction、product_category_tags、company_product_category、prefer_company_product| N7[节点7]
    N7 -->|result_mode、recommended_products、management_advice、completion_status| FRONT[前端展示与结果保存]
```

## 三、Coze 条件节点建议

| 条件节点 | 建议判断字段 | 分支 |
|-|-|-|
| 意图路由 | `intent_code` | `1→节点2`；`2→节点7`；`3→非服务范围`；`4→养殖知识问答` |
| 诊断条件 | `diagnosis_ready` | `false→节点4`；`true→节点5` |
| 追问上限 | `follow_up_round`、`has_high_value_question` | `<3 且 true→继续追问`；否则返回节点5收口 |
| 紧急风险 | `emergency_type`、`risk_level` | `ASF/重大风险→紧急通道`；否则继续诊断 |
| 疾病锁定 | `is_locked`、`need_professional_testing`、`need_customer_service` | 锁定→节点6；需检测/客服→终止普通推荐；可继续鉴别→节点4 |
| 方向类型 | `direction_type` | `product→节点7产品检索`；`non_product→节点7管理建议输出` |
| 公司产品 | `prefer_company_product` | `true→适用公司产品优先`；`false→普通产品排序` |
| 最终结果 | `result_mode` | `product`、`management`、`mixed`、`no_match` |

## 四、搭建时必须保持的约束

1. 节点2每轮输出的是全量病例，不是仅输出本轮新增字段。
2. 节点3只判断病类和最低诊断条件，不输出具体疾病。
3. 节点4不自行决定医学追问方向，只把节点3或节点5给出的目标转成用户能回答的问题。
4. 每轮追问约1至2项；已确认、用户无法提供或已问过的信息不得重复追问。
5. 最多进行3轮信息补充；达到上限后不得再次进入节点4。
6. 节点5的内部候选疾病不直接展示给用户；只有形成单一临床高可能疾病后，才进入节点6。
7. 仅凭临床信息无法区分且必须依赖检测时，不强行锁定疾病，也不进入节点6。
8. ASF或重大紧急风险一旦触发，立即中止节点6、节点7的普通推荐流程。
9. 节点6只从固定方案品类规则表读取方向，不自由生成方向。
10. 公司产品只能在医学适用程度相近时优先，不得覆盖疾病处理顺序或强行推荐。
11. 节点7的产品和管理建议只能来自固定产品信息表；缺失信息不得推测。
12. 管理建议类结果不套用产品字段；混合结果必须先产品、后管理建议。

## 五、PRD 内部待统一项

当前节点4、节点5正文规定“最多三轮信息补充，不设置第四轮”；评测说明中仍存在“第四轮保底”的旧表述。Coze 工作流建议暂按正文执行：第3轮信息补充完成后，由节点5直接形成临床结果、进入检测/客服，不再发起第4轮。
