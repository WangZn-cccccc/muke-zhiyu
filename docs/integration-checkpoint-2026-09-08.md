# 牧客智语真实工作流联调检查点

日期：2026-09-08  
状态：真实前后半程已接入并通过本地验收

## 当前目标

保留现有前端UI、手机框、交互节奏和动画，将固定Demo数据替换为Coze公网工作流的真实响应。当前阶段只做本地联调，不部署正式服务器，不接正式数据库。

## 已完成

- Coze公网API：`POST https://whh4824k28.coze.site/run`
- API Token已由用户填写在本机`.env.local`，不得读取展示、复制进前端或提交代码库。
- 本地代理：`http://127.0.0.1:3001`
- 代理入口：`POST /api/workflow/run`
- 前端地址：`http://127.0.0.1:4173/`
- 代理已真实调用Coze成功，返回`success=true`、`response_type=question`和2道问题。
- 前端API客户端：`src/workflow-api.ts`
- 代理程序：`server/local-proxy.mjs`
- API合同、Schema、黄金案例和自动合同测试已建立。
- 真实响应已驱动诊断卡、方向卡、产品卡、管理建议、无匹配、紧急、服务结束与错误状态。
- 用户选择方向时仅提交稳定方向ID；产品卡最多展示3项，并仅为真实安全网址提供跳转。
- 2026-09-08真实链路验收：非危重病例经2题追问得到“仔猪黄痢”诊断，随后返回4个方向；选择`DIR-0086`后返回`product`及真实产品“口服补液盐”。
- 另用危重病例验证`emergency`拦截成功，方向和商品均为空。

## 当前观察项

首轮真实响应仍可能出现`questions.length>0`而`asked_questions`暂未同步的问题；前端使用`pending_question_ids`和`question_answers`完成本轮交互，但Coze仍应持续保证`asked_questions`跨轮累计唯一。

## 已完成的接入项

1. 启动本地代理并确认`/health`正常。
2. 启动现有前端，不改动受保护的移动端运行时文件。
3. 将聊天发送动作连接`runWorkflow()`。
4. 保存`conversation_id`及上一轮完整业务状态。
5. 根据真实`questions`动态渲染1～3题。
6. 所有必答题settle后才能提交；只答一题不得继续。
7. “其他”必须填写并保存`other_text`。
8. 动态渲染diagnosis、direction_selection、management、product、no_match、emergency、service_end和error。
9. 保留现有动画风格，用真实状态驱动，不重做视觉设计。
10. 跑合同测试、UI状态测试、运行时完整性检查、构建测试和真实HTTP流程。

## 不得偏离的规则

- 前端不得直接调用Coze，Token只在本地代理/正式后端。
- 常规每轮1～2题；仅宽泛症状首轮可2～3题。
- 常规前三轮；满足最新版Node5全部资格条件才允许第4轮；禁止第5轮。
- 用户选择前`selected_direction=null`。
- 纯管理方向由Node6返回，不进入Node7。
- Node7只返回product或no_match，不使用旧版mixed。
- 商品必须来自固定产品库并具有稳定`product_id/source_id`。
- 紧急响应停止普通推荐并清空方向和商品。
- 不改现有UI方向，不把联调做成新的页面。

## 完成判定

用户只访问`http://127.0.0.1:4173/`，即可从真实输入开始，完成追问、诊断、方向选择以及管理/商品结果；刷新或异常有明确提示；浏览器中看不到Coze Token。
