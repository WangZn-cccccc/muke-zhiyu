import { useEffect, useRef, useState } from "react";
import "@fontsource-variable/noto-sans-sc";
import { AnimatePresence, motion } from "motion/react";
import { CameraIcon, ChatBubbleIcon, CheckCircledIcon, ChevronDownIcon, ChevronRightIcon, ClipboardIcon, CopyIcon, Cross2Icon, DotsHorizontalIcon, ExitIcon, GearIcon, MagnifyingGlassIcon, MobileIcon, PaperPlaneIcon, Pencil2Icon, PersonIcon, PlusIcon, QuestionMarkCircledIcon, SpeakerLoudIcon, StarIcon, TrashIcon } from "@radix-ui/react-icons";
import { BottomSheet, KeyboardInput, KeyboardTextarea, MobileScroll, useKeyboard, useKeyboardInsets } from "./mobile";
import { runWorkflow, type WorkflowDirection, type WorkflowProduct, type WorkflowResponse } from "./workflow-api";

type Screen = "login" | "phone" | "home" | "chat" | "settings" | "profile";
type DemoPhase = "analyzing" | "followup" | "diagnosing" | "diagnosis" | "directionLoading" | "directions" | "productLoading" | "products";
const prompts = ["仔猪拉稀两天了怎么办？", "猪咳嗽、喘气是什么原因？", "母猪突然不吃料"];
const history = [{ group: "今天", items: ["仔猪拉稀两天了怎么办", "母猪突然不吃料"] }, { group: "近 7 天", items: ["育肥猪咳嗽、喘气", "新购仔猪怎样隔离"] }];
const workflowResult = {
  headline: "仔猪腹泻（两天、精神差）应优先考虑消化道应激或感染",
  assessment: "可能与饲喂变化、环境应激或细菌性腹泻有关。建议结合体温、饮水、粪便性状及脱水情况综合判断。",
  actions: [
    { title: "稳住饮水与电解质", detail: "提供干净温水，少量多次饮用，防止继续脱水。" },
    { title: "控制应激与环境", detail: "单独隔离观察，注意保温并保持圈舍干燥清洁。" },
    { title: "观察并记录关键指标", detail: "记录饮水量、排便次数与性状、体温和精神状态。" },
  ],
  warning: "若出现完全不饮水、明显虚弱或便中带血，请尽快联系兽医。",
  related: ["怎么判断脱水程度？", "口服补液盐怎么配？"],
  followUp: { question: "仔猪现在还能正常喝水吗？", options: ["可以", "很少 / 不能"] },
};
const diagnosisResult = {
  title: "目前更符合【猪大肠杆菌性腹泻】",
  mechanism: "这类腹泻常与致病性大肠杆菌在仔猪肠道内增殖并产生肠毒素有关，可造成肠道分泌增加，出现水样腹泻和脱水。",
  basis: ["3日龄哺乳仔猪，处于该病较常见的易感阶段", "10头中已有5头发病，且在两天内集中出现"],
  causes: "请结合猪场实际排查母猪乳房及产床卫生、保温情况、初乳摄入和同窝传播等可能诱因。",
  caution: "当前属于临床高可能判断，不等同实验室确诊。仔猪脱水进展较快；若继续扩散、明显虚弱或出现死亡，应立即联系兽医并评估采样检测。",
};
const directions = [
  { id: "rehydration", title: "补液与电解质支持", target: "腹泻造成的水分与电解质损失", mechanism: "补充水分与电解质，帮助维持水盐平衡", improvement: "减轻脱水和水盐失衡，支持精神与饮水状态恢复" },
  { id: "gut", title: "肠道微生态调节", target: "腹泻后肠道微生态失衡和恢复缓慢", mechanism: "通过适用益生菌产品辅助调节肠道微生态", improvement: "辅助改善软便及肠道恢复状态" },
  { id: "hygiene", title: "清洁消毒与环境卫生", target: "产床、器具和圈舍中的持续污染与传播风险", mechanism: "先清除有机污物，再进行适用的环境清洁消毒", improvement: "降低环境污染负荷，减少持续暴露和传播风险" },
];
const directionProducts = {
  rehydration: {
    title: "补液与电解质支持",
    lead: "三产品卡片视觉预览：以下记录均来自现有产品资料表，仅用于确认多产品排列和配色；正式接入时仍按用户所选方向严格筛选。",
    products: [
      { name: "口服补液盐", manufacturer: "杭州科皇集团有限公司", category: "猪用口服补液盐", ingredients: "氯化钠、氯化钾、碳酸氢钠、葡萄糖", timing: "用于腹泻导致的电解质紊乱和酸碱失衡", reason: "与当前腹泻病例的脱水风险及所选方向相匹配", usage: "产品资料载1袋溶于16L水供自由饮用；实际使用以当前标签为准", caution: "严重脱水或不能自主饮水时，应尽快由兽医评估处置", channel: "厂家官网展示，未见直接购买按钮" },
      { name: "利百益", manufacturer: "安琪酵母股份有限公司·福邦农业", category: "猪用益生菌", ingredients: "枯草芽孢杆菌，产品页面标示活菌数200亿/克", timing: "用于急性期稳定后的肠道微生态恢复辅助", reason: "适合用于预览补充支持类产品卡片的信息层级", usage: "按商品详情及包装标签使用", caution: "不能替代补液、抗菌治疗或原发病处置", channel: "官方商城商品页可查询" },
      { name: "安灭杀", manufacturer: "默沙东动物保健", category: "猪舍与器具消毒剂", ingredients: "复方戊二醛溶液", timing: "先完成清洁，再按产品标签用于猪舍及器具环境消毒", reason: "适合用于预览环境卫生类产品卡片的信息层级", usage: "先清洁后按当前产品标签配制使用", caution: "仅用于环境消毒，不可替代病因处置", channel: "厂家官网可查询，购买需通过专业渠道咨询" },
    ],
  },
  gut: {
    title: "肠道微生态调节",
    lead: "病例概述：急性期状态稳定后，选择肠道微生态调节作为恢复支持。",
    products: [
      { name: "利百益", manufacturer: "安琪酵母股份有限公司·福邦农业", category: "猪用益生菌", ingredients: "枯草芽孢杆菌，产品页面标示活菌数200亿/克", timing: "用于急性期稳定后的肠道微生态恢复辅助", reason: "产品方向与当前病例的恢复阶段相符", usage: "按商品详情及包装标签使用", caution: "不能替代补液、抗菌治疗或原发病处置", channel: "官方商城商品页可查询" },
    ],
  },
  hygiene: {
    title: "清洁消毒与环境卫生",
    lead: "该方向适合配合执行，但当前固定样例中没有可靠匹配到可直接展示的具体产品。",
    products: [],
  },
} as const;

type LiveAnswer = { value: string; other: string };
type CompletedQuestion = { id: string; question: string; answer: string };
type PastTurn =
  | { id: string; kind: "questions"; questions: CompletedQuestion[] }
  | { id: string; kind: "diagnosis"; result: WorkflowResponse }
  | { id: string; kind: "message"; assistant: string; user: string };
type LoadingMode = "analysis" | "directions" | "products";

function getCaseSummary(caseData: Record<string, any>) {
  const morbidity = caseData.morbidity || {};
  const mortality = caseData.mortality || {};
  const affected = morbidity.affected_count;
  const total = morbidity.total_count;
  const morbidityText = affected && total ? `共${total}，发病${affected}` : affected ? `发病${affected}` : total ? `共${total}` : "";
  const symptomText = Array.isArray(caseData.symptoms) ? caseData.symptoms.filter(Boolean).join("、") : caseData.symptoms;
  const mortalityText = mortality.death_count ? `死亡${mortality.death_count}` : "";
  return [
    { label: "日龄", value: caseData.age },
    { label: "生长阶段", value: caseData.stage },
    { label: "主要症状", value: symptomText },
    { label: "持续时间", value: caseData.duration },
    { label: "粪便颜色", value: caseData.feces_color },
    { label: "粪便性状", value: caseData.feces_shape_detail || caseData.feces_shape },
    { label: "发病范围", value: morbidityText },
    { label: "死亡情况", value: mortalityText },
    { label: "严重程度", value: caseData.severity },
    { label: "体温情况", value: caseData.temperature },
    { label: "饮水状态", value: caseData.drinking_status },
    { label: "采食状态", value: caseData.feeding_status },
  ].filter(item => item.value && String(item.value).trim());
}

function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
}

function DiagnosisContent({ result, onDirections }: { result: WorkflowResponse; onDirections?: () => void }) {
  if (!result.diagnosis) return null;
  const summary = getCaseSummary(result.case_data || {});
  return <section className="editorial-section live-diagnosis">
    {summary.length > 0 && <div className="case-summary"><div className="case-summary-head"><strong>已确认病例信息</strong><span>{summary.length} 项</span></div><div className="case-summary-grid">{summary.map(item => <div className="case-summary-item" key={item.label}><span>{item.label}</span><strong>{String(item.value)}</strong></div>)}</div></div>}
    <h2>{result.diagnosis.display_title || "初步判断"}</h2>
    <p className="live-response">{result.response}</p>
    {result.diagnosis.warning && <div className="editorial-warning"><QuestionMarkCircledIcon/><span>{result.diagnosis.warning}</span></div>}
    {onDirections && <button className="primary-flow-button live-direction-cta" onClick={onDirections}>查看解决方向 <ChevronRightIcon/></button>}
  </section>;
}

function DirectionCards({ directions, onChoose }: { directions: WorkflowDirection[]; onChoose: (direction: WorkflowDirection) => void }) {
  return <div className="direction-list live-direction-list">{directions.map((item, index) => <button key={item.id} onClick={() => onChoose(item)}>
    <span className="direction-index">{index + 1}</span>
    <span className="direction-copy"><strong>{item.name}</strong>{item.description && <span className="direction-description">{item.description}</span>}
      {item.mechanism && <small><b>作用方式</b><span>{item.mechanism}</span></small>}
      {item.expected_improvement && <small><b>预期改善</b><span>{item.expected_improvement}</span></small>}
    </span>
    <ChevronRightIcon/>
  </button>)}</div>;
}

function ProductCard({ product, index }: { product: WorkflowProduct; index: number }) {
  const features = Array.isArray(product.features) ? product.features.filter(Boolean) : [];
  const precautions = Array.isArray(product.precautions) ? product.precautions.filter(Boolean) : [];
  const officialWebsite = isSafeHttpUrl(product.official_website) ? product.official_website : null;
  const purchaseUrl = isSafeHttpUrl(product.purchase_url) ? product.purchase_url : null;
  return <article className="product-card live-product-card">
    <div className="product-heading"><span className="product-rank">{index === 0 ? "首选" : `推荐${index + 1}`}</span><strong>{product.product_name}</strong><small>{product.manufacturer || "厂家信息暂缺"}{product.product_category ? ` · ${product.product_category}` : ""}</small></div>
    <div className="product-reason"><b>推荐理由</b><span>{product.recommendation_reason}</span></div>
    <details><summary>查看完整产品资料 <ChevronDownIcon/></summary>
      <dl>
        {features.length > 0 && <div><dt>产品特点</dt><dd>{features.join("；")}</dd></div>}
        <div><dt>使用方式</dt><dd>{product.usage || "请按当前产品标签及兽医指导使用"}</dd></div>
        <div><dt>注意事项</dt><dd>{precautions.length > 0 ? precautions.join("；") : "请遵循当前产品标签、休药期及兽医指导"}</dd></div>
        {product.contact_info && <div><dt>厂家电话</dt><dd>{product.contact_info}</dd></div>}
      </dl>
      {(officialWebsite || purchaseUrl) && <div className="product-channel-actions">{officialWebsite && <a href={officialWebsite} target="_blank" rel="noopener noreferrer">访问厂家官网 <ChevronRightIcon/></a>}{purchaseUrl && <a href={purchaseUrl} target="_blank" rel="noopener noreferrer">查看购买渠道 <ChevronRightIcon/></a>}</div>}
    </details>
  </article>;
}

function LiveWorkflowPanel({ initialText }: { initialText: string }) {
  const keyboard = useKeyboard();
  const [result, setResult] = useState<WorkflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, LiveAnswer>>({});
  const [pastTurns, setPastTurns] = useState<PastTurn[]>([]);
  const [loadingMode, setLoadingMode] = useState<LoadingMode>("analysis");
  const [directionResult, setDirectionResult] = useState<WorkflowResponse | null>(null);
  const conversationId = useRef(`conv_web_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`);
  const lastRequest = useRef<{ text: string; context: string; mode: LoadingMode }>({ text: initialText, context: "", mode: "analysis" });

  const execute = async (text: string, context = "", mode: LoadingMode = "analysis") => {
    lastRequest.current = { text, context, mode };
    setLoadingMode(mode); setLoading(true); setError(""); keyboard.hide();
    try {
      const next = await runWorkflow({ user_input: text, conversation_context: context, conversation_id: conversationId.current, request_id: `req_web_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}` });
      if (next.response_type === "direction_selection") setDirectionResult(structuredClone(next));
      setResult(next); setAnswers({});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "连接工作流失败，请稍后重试");
    } finally { setLoading(false); }
  };

  useEffect(() => { void execute(initialText, "", "analysis"); }, [initialText]);

  const questions = Array.isArray(result?.questions) ? result.questions : [];
  const ready = questions.length > 0 && questions.every(q => !q.required || Boolean(answers[q.id]?.value && (answers[q.id].value !== "other" || answers[q.id].other.trim())));
  const submitAnswers = () => {
    if (!result || !ready) return;
    const context = structuredClone(result) as Record<string, any>;
    context.question_answers = { ...(context.question_answers || {}) };
    context.pending_question_ids = [];
    const completedQuestions: CompletedQuestion[] = [];
    const requestParts = questions.map(q => {
      const answer = answers[q.id];
      const shown = answer.value === "other" ? answer.other.trim() : (q.options.find(option => option.value === answer.value)?.label || answer.value);
      completedQuestions.push({ id: q.id, question: q.question, answer: shown });
      context.question_answers[q.id] = { status: "answered", value: answer.value, other_text: answer.value === "other" ? answer.other.trim() : null };
      return `${q.question}：${shown}`;
    });
    const requestReply = requestParts.join("；");
    setPastTurns(old => [...old, { id: crypto.randomUUID(), kind: "questions", questions: completedQuestions }]);
    void execute(requestReply, JSON.stringify(context), "analysis");
  };
  const requestDirections = () => {
    if (!result) return;
    const snapshot = structuredClone(result) as WorkflowResponse;
    setPastTurns(old => [...old, { id: crypto.randomUUID(), kind: "diagnosis", result: snapshot }]);
    void execute("请根据当前诊断结果，给我治疗方案和解决方向", JSON.stringify(snapshot), "directions");
  };
  const choose = (direction: WorkflowDirection) => {
    if (!result) return;
    const context = { ...structuredClone(result), selected_direction: direction.id };
    setPastTurns(old => [...old, { id: crypto.randomUUID(), kind: "message", assistant: result.response, user: `我选择：${direction.name}` }]);
    void execute(direction.id, JSON.stringify(context), "products");
  };
  const returnToDirections = () => {
    if (!directionResult) return;
    keyboard.hide();
    setResult(structuredClone(directionResult));
    setError("");
  };

  const loadingCopy = loadingMode === "directions"
    ? { title: "正在整理适合当前病例的解决方向", detail: "正在核对方向规则、管理建议和适用边界…" }
    : loadingMode === "products"
      ? { title: "正在匹配适合当前方向的产品", detail: "正在根据所选方向筛选并核对真实产品资料…" }
      : { title: "正在结合病例和知识库分析", detail: "真实工作流可能需要一点时间，请稍候…" };

  return <>
    <div className="service-banner"><span className="service-dot"/><div><strong>24小时养猪智能助手</strong><small>养殖问题随时问，提供更有依据的参考建议</small></div></div>
    <motion.div className="user-message" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{initialText}</motion.div>
    <div className="assistant-state"><span className="assistant-mark"><CheckCircledIcon /></span><strong>牧客智语</strong><span className={`status-pill${!loading ? " done" : ""}`}>{loading ? "正在分析" : "本轮完成"}</span></div>
    {pastTurns.map(turn => turn.kind === "questions" ? <motion.section className="answered-question-card" key={turn.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
      <div className="answered-card-head"><CheckCircledIcon/><strong>本轮信息已补充</strong></div>
      <div className="answered-items">{turn.questions.map(item => <div className="answered-item" key={item.id}><span>{item.question}</span><strong>{item.answer}</strong></div>)}</div>
    </motion.section> : turn.kind === "diagnosis" ? <motion.div className="past-rich-turn" key={turn.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}><DiagnosisContent result={turn.result}/></motion.div> : <div className="past-turn" key={turn.id}><div className="past-assistant-message">{turn.assistant}</div><motion.div className="user-message" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>{turn.user}</motion.div></div>)}
    {loading && <div className={`diagnosing-card loading-${loadingMode}`}><span className="thinking-orb"/><div><strong>{loadingCopy.title}</strong><p>{loadingCopy.detail}</p></div></div>}
    {error && <div className="live-error"><strong>暂时没有连接成功</strong><span>{error}</span><button onClick={() => void execute(lastRequest.current.text, lastRequest.current.context, lastRequest.current.mode)}>重新尝试</button></div>}
    {!loading && result && <motion.article className="diagnosis-result live-result" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
      <div className="result-kicker"><CheckCircledIcon />{result.response_type === "question" ? "需要补充信息" : result.response_type === "direction_selection" ? "解决方向已生成" : result.response_type === "product" ? "产品匹配已完成" : result.response_type === "management" ? "管理建议已生成" : "真实分析结果"}</div>
      {result.response_type === "question" && <div className="live-questions">
        {questions.map((q, index) => <div className="question-block" key={q.id}><strong><i>{index + 1}</i>{q.question}</strong>
          {q.question_type === "single_choice" ? <div>{q.options.map(option => <button key={option.value} className={answers[q.id]?.value === option.value ? "selected" : ""} onClick={() => setAnswers(old => ({...old,[q.id]:{value:option.value,other:old[q.id]?.other || ""}}))}>{option.label}</button>)}{q.allow_other && !q.options.some(option => option.value === "other") && <button className={answers[q.id]?.value === "other" ? "selected" : ""} onClick={() => setAnswers(old => ({...old,[q.id]:{value:"other",other:old[q.id]?.other || ""}}))}>其他</button>}</div>
          : <KeyboardInput value={answers[q.id]?.value || ""} onChange={event => setAnswers(old => ({...old,[q.id]:{value:event.target.value,other:""}}))} placeholder="请按实际情况补充" />}
          {answers[q.id]?.value === "other" && <div className="other-input"><KeyboardInput value={answers[q.id]?.other || ""} onChange={event => setAnswers(old => ({...old,[q.id]:{value:"other",other:event.target.value}}))} placeholder="请具体补充其他情况" /></div>}
        </div>)}
        <div className="question-progress"><span>{questions.filter(q => answers[q.id]?.value).length}/{questions.length} 已回答</span><button className="continue-button" disabled={!ready} onClick={submitAnswers}>完成并继续 <ChevronRightIcon /></button></div>
      </div>}
      {result.response_type === "diagnosis" && <DiagnosisContent result={result} onDirections={requestDirections}/>}
      {result.response_type === "direction_selection" && <section className="direction-section live-direction-section">
        {result.management_advice?.length > 0 && <div className="management-guidance compact-management"><h2>当前管理与排查建议</h2><span>先做好基础管理，再选择下一步改善方向</span><ul>{result.management_advice.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
        <div className="section-intro"><span>下一步</span><h2>你想先了解哪个解决方向？</h2><p>选择一个方向，继续查看对应的改善方式。</p></div>
        <DirectionCards directions={result.solution_directions || []} onChoose={choose}/>
      </section>}
      {result.response_type === "product" && <section className="product-result live-products"><button className="text-back live-result-back" onClick={returnToDirections}>‹ 返回解决方向</button><div className="section-intro"><span>匹配结果</span><h2>适合当前方向的产品</h2><p>{result.response}</p></div>{(result.recommended_products || []).map((item, index) => <ProductCard product={item} index={index} key={item.product_id}/>) }<div className="product-safety">产品信息用于辅助了解，不替代兽医诊断、处方及当前产品标签；使用前请核对适用对象、剂型、休药期和当地监管要求。</div></section>}
      {result.response_type === "management" && <section className="management-guidance live-management"><button className="text-back live-result-back" onClick={returnToDirections}>‹ 返回解决方向</button><h2>当前管理与排查建议</h2>{result.management_advice?.length === 0 && <span>{result.response}</span>}<ul>{(result.management_advice || []).map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
      {result.response_type === "no_match" && <section className="no-match-card live-no-match"><button className="text-back live-result-back" onClick={returnToDirections}>‹ 返回解决方向</button><strong>暂未匹配到可靠产品</strong><p>{result.response}</p><span>没有可靠结果时不会使用其他方向的产品补位，你可以返回重新选择方向或联系专业人员进一步处理。</span></section>}
      {result.response_type === "emergency" && <section className="live-emergency"><QuestionMarkCircledIcon/><div><span>紧急风险提醒</span><h2>{result.emergency?.title || "发现需要立即处理的风险信号"}</h2><p>{result.response}</p><ol>{(result.emergency?.actions || []).map((item, index) => <li key={index}>{item}</li>)}</ol></div></section>}
      {result.response_type === "service_end" && <section className="live-terminal service-end"><strong>{result.service_end_reason === "testing_required" ? "建议进行专业检测" : result.service_end_reason === "vet_required" ? "建议联系专业兽医" : result.service_end_reason === "follow_up_limit_reached" ? "现有信息仍不足" : "建议联系在线客服"}</strong><span>{result.response}</span></section>}
      {result.response_type === "error" && <section className="live-terminal error"><strong>本次请求未完成</strong><span>{result.response || result.error?.message}</span>{result.error?.retryable && <button onClick={() => void execute(lastRequest.current.text, lastRequest.current.context, lastRequest.current.mode)}>重新尝试</button>}</section>}
      {(["knowledge","out_of_scope"] as string[]).includes(result.response_type) && <div className={`live-terminal ${result.response_type}`}><span>{result.response}</span></div>}
    </motion.article>}
  </>;
}

function AssistantAvatar() {
  return <span className="assistant-avatar-crop" aria-hidden="true"><img src="/assistant-pig-flat-source.png" alt="" draggable={false} /></span>;
}

export default function Prototype() {
  const keyboard = useKeyboard();
  const { bottomInset } = useKeyboardInsets();
  const [screen, setScreen] = useState<Screen>("login");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState("仔猪拉稀两天了怎么办？");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [helpful, setHelpful] = useState(false);
  const [toast, setToast] = useState("");
  const [analysisStage, setAnalysisStage] = useState(3);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("diagnosis");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [ageAnswer, setAgeAnswer] = useState("");
  const [stoolAnswer, setStoolAnswer] = useState("");
  const [ageOther, setAgeOther] = useState("");
  const [stoolOther, setStoolOther] = useState("");
  const [selectedDirection, setSelectedDirection] = useState("");
  const [liveMode, setLiveMode] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const go = (next: Screen) => { keyboard.hide(); setDrawerOpen(false); setScreen(next); };
  const enter = () => agreed ? go("home") : setToast("请先阅读并同意用户协议与隐私政策");
  const send = (text = message) => { if (!text.trim()) return; setSelectedHistory(text); setMessage(""); setFollowUpAnswer(""); setAgeAnswer(""); setStoolAnswer(""); setAgeOther(""); setStoolOther(""); setSelectedDirection(""); setDemoPhase("analyzing"); setAnalysisStage(0); setLiveMode(true); keyboard.hide(); setScreen("chat"); };

  useEffect(() => {
    if (screen !== "chat" || demoPhase !== "analyzing" || analysisStage >= 3) return;
    const timer = window.setTimeout(() => setAnalysisStage(stage => stage + 1), 780);
    return () => window.clearTimeout(timer);
  }, [screen, analysisStage, demoPhase]);

  useEffect(() => {
    if (demoPhase === "analyzing" && analysisStage === 3) {
      const timer = window.setTimeout(() => setDemoPhase("followup"), 360);
      return () => window.clearTimeout(timer);
    }
    if (demoPhase === "diagnosing") {
      const timer = window.setTimeout(() => setDemoPhase("diagnosis"), 1450);
      return () => window.clearTimeout(timer);
    }
  }, [demoPhase, analysisStage]);

  const followUpReady = Boolean(ageAnswer && stoolAnswer && (ageAnswer !== "其他" || ageOther.trim()) && (stoolAnswer !== "其他" || stoolOther.trim()));
  const answerFollowUp = () => {
    if (!followUpReady) return;
    const age = ageAnswer === "其他" ? ageOther.trim() : ageAnswer;
    const stool = stoolAnswer === "其他" ? stoolOther.trim() : stoolAnswer;
    setFollowUpAnswer(`${age}，${stool}`);
    keyboard.hide();
    setDemoPhase("diagnosing");
  };

  const chooseDirection = (id: string) => {
    setSelectedDirection(id);
    setDemoPhase("productLoading");
    window.setTimeout(() => setDemoPhase("products"), 720);
  };

  const startDemo = () => {
    setLiveMode(false);
    setSelectedHistory("3日龄哺乳仔猪，10头里有5头拉稀，已经两天了");
    setFollowUpAnswer("");
    setAgeAnswer("");
    setStoolAnswer("");
    setAgeOther("");
    setStoolOther("");
    setSelectedDirection("");
    setDemoPhase("analyzing");
    setAnalysisStage(0);
    keyboard.hide();
    setScreen("chat");
  };

  if (screen === "login" || screen === "phone") return (
    <div className="prototype-shell auth-shell"><MobileScroll className="auth-scroll">
      {screen === "login" ? <main className="auth-page">
        <section className="brand-lockup"><div className="auth-avatar"><AssistantAvatar /></div><span>牧客智语</span></section>
        <section className="auth-copy"><h1>欢迎回来</h1><p>登录后，继续你的养殖问答</p></section>
        <div className="auth-actions"><button className="primary-button" onClick={enter}>微信一键登录</button><button className="secondary-button" onClick={() => go("phone")}><MobileIcon />使用手机号登录</button></div>
        <label className="agreement-row"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} /><span>我已阅读并同意 <a>《用户协议》</a> 和 <a>《隐私政策》</a></span></label>
        {toast && <div className="toast">{toast}</div>}
      </main> : <main className="auth-page phone-auth">
        <button className="back-button" onClick={() => go("login")} aria-label="返回">‹</button>
        <section className="brand-lockup compact"><div className="auth-avatar"><AssistantAvatar /></div><span>牧客智语</span></section>
        <section className="auth-copy"><h1>手机号登录</h1><p>未注册的手机号将自动创建账号</p></section>
        <div className="phone-form"><label className="phone-field"><span>+86</span><KeyboardInput value={phone} onChange={e => setPhone(e.target.value)} placeholder="请输入手机号" inputMode="tel" /></label><label className="phone-field"><KeyboardInput value={code} onChange={e => setCode(e.target.value)} placeholder="请输入验证码" inputMode="numeric" /><button>获取验证码</button></label><button className="primary-button" onClick={enter} disabled={!phone || !code}>登录</button><button className="text-button" onClick={() => go("login")}>返回微信登录</button></div>
        <p className="legal-note">登录即表示同意《用户协议》和《隐私政策》</p>
      </main>}
    </MobileScroll></div>
  );

  return <div className="prototype-shell">
    <header className="topbar">
      <button className="icon-button book-button" aria-label="打开问诊记录" onClick={() => { keyboard.hide(); setDrawerOpen(true); }}><ClipboardIcon /></button>
      <div className="topbar-title"><strong>{screen === "settings" ? "设置" : screen === "profile" ? "个人信息" : "牧客智语"}</strong>{(screen === "home" || screen === "chat") && <span>AI 建议仅供参考</span>}</div>
      {(screen === "home" || screen === "chat") ? <button className="icon-button accent" aria-label="新建对话" onClick={() => go("home")}><ChatBubbleIcon /><PlusIcon className="new-chat-plus" /></button> : <button className="icon-button close-page" aria-label="关闭" onClick={() => go("home")}><Cross2Icon /></button>}
    </header>

    <MobileScroll className="app-screen"><main className={`main-content ${screen}`}>
      {screen === "home" && <><section className="welcome"><div className="avatar-ring"><AssistantAvatar /></div><h1>你好，我是牧客智语</h1><p>让每一次养殖判断，都更有依据</p></section><section className="prompt-list">{prompts.map(p => <button key={p} className="prompt-row" onClick={() => send(p)}><QuestionMarkCircledIcon /><span>{p}</span><ChevronRightIcon /></button>)}</section></>}
      {screen === "chat" && <section className="conversation focus-conversation">
        {liveMode ? <LiveWorkflowPanel key={selectedHistory} initialText={selectedHistory} /> : <>
        <div className="demo-banner"><span>固定案例</span><strong>完整问诊交互 Demo</strong><button onClick={startDemo}>重新演示</button></div>
        <motion.div className="user-message" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{selectedHistory}</motion.div>
        <div className="assistant-state"><span className="assistant-mark"><CheckCircledIcon /></span><strong>牧客智语</strong><span className={`status-pill${analysisStage === 3 ? " done" : ""}`}>{analysisStage === 3 ? "分析完成" : ["正在整理症状", "正在分析原因", "正在生成建议"][analysisStage]}{analysisStage === 3 && <CheckCircledIcon />}</span></div>
        <AnimatePresence mode="wait">
          {demoPhase === "analyzing" ? <motion.div key="analyzing" className="analysis-progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }}>
            <div className="progress-track"><motion.span animate={{ width: `${(analysisStage + 1) * 33.34}%` }} transition={{ duration: .55 }} /></div>
            <div className="progress-labels"><span className={analysisStage >= 0 ? "active" : ""}>症状整理</span><span className={analysisStage >= 1 ? "active" : ""}>原因分析</span><span className={analysisStage >= 2 ? "active" : ""}>建议生成</span></div>
          </motion.div> : demoPhase === "followup" ? <motion.article key="followup" className="flow-card question-card" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
            <span className="flow-eyebrow">还需要确认 2 项信息</span><h1>目前可以先判断为仔猪腹泻，需要再观察两项</h1><p>这类情况可能涉及多种疾病或诱因；不确定的内容可以直接选择“不清楚”。</p>
            <div className="question-block"><strong><i>1</i> 仔猪的饮水和精神状态怎么样？</strong><div>{["饮水正常、精神尚可", "饮水减少、精神变差", "基本不饮水、明显虚弱", "其他"].map(option => <button key={option} className={ageAnswer === option ? "selected" : ""} onClick={() => setAgeAnswer(option)}>{option}</button>)}</div>{ageAnswer === "其他" && <motion.div className="other-input" initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}}><KeyboardInput value={ageOther} onChange={event => setAgeOther(event.target.value)} placeholder="请补充饮水或精神情况" /></motion.div>}</div>
            <div className="question-block"><strong><i>2</i> 粪便更接近哪种情况？</strong><div>{["黄色水样稀便", "黄色糊状便", "灰白色稀便", "其他"].map(option => <button key={option} className={stoolAnswer === option ? "selected" : ""} onClick={() => setStoolAnswer(option)}>{option}</button>)}</div>{stoolAnswer === "其他" && <motion.div className="other-input" initial={{opacity:0, height:0}} animate={{opacity:1,height:"auto"}}><KeyboardInput value={stoolOther} onChange={event => setStoolOther(event.target.value)} placeholder="请描述颜色、形状或其他情况" /></motion.div>}</div>
            <div className="question-progress"><span>{[ageAnswer, stoolAnswer].filter(Boolean).length}/2 已回答</span><button className="continue-button" disabled={!followUpReady} onClick={answerFollowUp}>完成并继续 <ChevronRightIcon /></button></div>
          </motion.article>
          : demoPhase === "diagnosing" ? <motion.div key="diagnosing" className="diagnosing-card" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><span className="thinking-orb"/><div><strong>正在结合补充信息进一步判断</strong><p>病例信息已更新，正在核对疾病特征与风险信号…</p></div></motion.div>
          : <motion.article key={demoPhase} className="diagnosis-result" initial="hidden" animate="show" variants={{ hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:.1}} }}>
            {followUpAnswer && <motion.div className="user-message compact-reply" variants={{hidden:{opacity:0,y:8},show:{opacity:1,y:0}}}>{followUpAnswer}</motion.div>}
            {(demoPhase === "diagnosis" || demoPhase === "directions") && (
              <>
                <motion.div className="result-kicker" variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}><CheckCircledIcon />已完成本轮辅助分析</motion.div>
                <motion.h1 variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>{diagnosisResult.title}</motion.h1>
                <motion.section className="diagnosis-summary" variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}><h2>为什么会出现这些症状</h2><p>{diagnosisResult.mechanism}</p></motion.section>
                <motion.section className="editorial-section" variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}><h2>支持判断</h2><ul className="evidence-list">{diagnosisResult.basis.map(item => <li key={item}>{item}</li>)}<li>本轮补充观察：{stoolAnswer === "其他" ? stoolOther : stoolAnswer}；{ageAnswer === "其他" ? ageOther : ageAnswer}</li></ul></motion.section>
                <motion.section className="management-guidance" variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}><h2>当前管理与排查建议</h2><span>先控制现场风险，再持续观察病情变化</span><ul><li>排查母猪乳房、产床和饮水器具的卫生情况，减少持续污染。</li><li>检查产床保温和仔猪初乳摄入情况，避免受凉或摄入不足。</li><li>将明显腹泻、精神较差的仔猪单独标记并重点观察。</li><li>持续记录饮水、精神、排便次数以及同窝新增发病情况。</li></ul></motion.section>
                <motion.div className="editorial-warning" variants={{ hidden: { opacity: 0, scale: .98 }, show: { opacity: 1, scale: 1 } }}><QuestionMarkCircledIcon /><span>{diagnosisResult.caution}</span></motion.div>
                {demoPhase === "diagnosis" && <motion.button className="primary-flow-button" variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} onClick={() => { setDemoPhase("directionLoading"); window.setTimeout(() => setDemoPhase("directions"), 680); }}>查看适合的解决方向 <ChevronRightIcon /></motion.button>}
              </>
            )}
            {demoPhase === "directionLoading" && <motion.div className="transition-card" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><span className="thinking-orb"/><div><strong>正在匹配适合的解决方向</strong><p>结合当前判断整理优先顺序…</p></div></motion.div>}
            {demoPhase === "directions" && (
              <motion.section className="direction-section" variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}><div className="section-intro"><span>下一步</span><h2>您想先了解哪一个方向？</h2><p>完成基础管理与排查后，可以选择一个方向，继续查看针对当前问题的改善方式。</p></div><div className="direction-list">{directions.map((item, index) => <motion.button initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:index*.08}} key={item.id} className={selectedDirection === item.id ? "selected" : ""} onClick={() => chooseDirection(item.id)}><span className="direction-index">{index + 1}</span><span><strong>{item.title}</strong><small><b>针对问题</b>{item.target}</small><small><b>作用方式</b>{item.mechanism}</small><small><b>预期改善</b>{item.improvement}</small></span><ChevronRightIcon /></motion.button>)}</div></motion.section>
            )}
            {demoPhase === "productLoading" && <motion.div className="transition-card" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><span className="thinking-orb"/><div><strong>正在生成对应方案</strong><p>为你整理这个方向下的推荐内容…</p></div></motion.div>}
            {demoPhase === "products" && (
              <motion.section className="product-result" variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}><button className="text-back" onClick={() => {setSelectedDirection("");setDemoPhase("directions")}}>‹ 重新选择方向</button><div className="result-kicker"><CheckCircledIcon />匹配完成</div><h1>{directionProducts[selectedDirection as keyof typeof directionProducts]?.title}</h1><p className={`product-lead${selectedDirection === "rehydration" ? " preview-note" : ""}`}>{directionProducts[selectedDirection as keyof typeof directionProducts]?.lead}</p>{directionProducts[selectedDirection as keyof typeof directionProducts]?.products.map((product,index)=><motion.div className="product-card" key={product.name} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:index*.1}}><div className="product-heading"><span className="product-rank">产品 {index + 1}</span><strong>{product.name}</strong><small>{product.manufacturer}</small></div><div className="product-reason"><b>推荐原因</b><span>{product.reason}</span></div><details><summary>查看完整产品资料 <ChevronDownIcon /></summary><dl><div><dt>产品品类</dt><dd>{product.category}</dd></div><div><dt>主要成分</dt><dd>{product.ingredients}</dd></div><div><dt>适用时机</dt><dd>{product.timing}</dd></div><div><dt>使用方法</dt><dd>{product.usage}</dd></div><div><dt>注意事项</dt><dd>{product.caution}</dd></div><div><dt>购买咨询</dt><dd>{product.channel}</dd></div></dl></details></motion.div>)}{directionProducts[selectedDirection as keyof typeof directionProducts]?.products.length === 0 && <div className="no-match-card"><strong>暂未找到可靠匹配产品</strong><p>不使用其他方向或未经核验的商品补位。建议先执行该方向的环境管理措施，并联系专业人员确认适用的清洁消毒产品。</p></div>}<div className="product-safety">以上内容依据当前病例信息和产品资料整理，不替代执业兽医现场诊断；具体使用应以当前产品标签及兽医指导为准。</div><div className="flow-complete"><CheckCircledIcon /><div><strong>完整流程已展示</strong><span>诊断、方向选择与对应结果已经对齐</span></div><button onClick={() => {setSelectedDirection("");setDemoPhase("directions")}}>其他方向</button></div></motion.section>
            )}
          </motion.article>}
        </AnimatePresence></>}
      </section>}
      {screen === "settings" && <section className="simple-page"><div className="settings-group"><button><span>回答详细程度<small>标准</small></span><ChevronRightIcon /></button><button><span>字体大小<small>标准</small></span><ChevronRightIcon /></button></div><div className="settings-group"><button><span>隐私政策与用户协议</span><ChevronRightIcon /></button><button><span>意见反馈</span><ChevronRightIcon /></button><button><span>当前版本<small>1.0.0</small></span></button></div><button className="danger-row"><TrashIcon />清空历史记录</button></section>}
      {screen === "profile" && <section className="simple-page profile-page"><div className="profile-avatar"><AssistantAvatar /><button><CameraIcon /></button></div><div className="settings-group"><button><span>昵称<small>王师傅</small></span><ChevronRightIcon /></button><button><span>手机号<small>138****2608</small></span><ChevronRightIcon /></button><button><span>微信绑定<small className="bound">已绑定</small></span><ChevronRightIcon /></button></div><button className="logout-row" onClick={() => go("login")}><ExitIcon />退出登录</button></section>}
    </main></MobileScroll>

    {(screen === "home" || (screen === "chat" && liveMode)) && <div className="composer-zone" style={{ bottom: bottomInset }}><div className="composer"><KeyboardTextarea value={message} onChange={e => setMessage(e.target.value)} placeholder={screen === "chat" ? "继续补充症状…" : "说说猪怎么了，或者你想了解什么"} rows={1} /><div className="composer-tools"><button onClick={() => fileInput.current?.click()}><PlusIcon /></button><button onClick={() => fileInput.current?.click()}><CameraIcon /></button><button onClick={() => setMessage("仔猪今天精神不太好")}><SpeakerLoudIcon /></button><span /><button className="send-button" onClick={() => send()} disabled={!message.trim()}><PaperPlaneIcon /></button></div><input ref={fileInput} className="visually-hidden" type="file" accept="image/*" /></div></div>}

    <aside className={`history-drawer${drawerOpen ? " open" : ""}`}><div className="drawer-head"><strong>问诊记录</strong><button onClick={() => setDrawerOpen(false)}><Cross2Icon /></button></div><label className="history-search"><MagnifyingGlassIcon /><KeyboardInput placeholder="搜索历史对话" /></label><div className="history-list">{history.map(section => <section key={section.group}><h3>{section.group}</h3>{section.items.map(item => <div className="history-item" key={item}><button onClick={() => { setSelectedHistory(item); go("chat"); }}><ChatBubbleIcon /><span>{item}</span></button><button className="more-button" onClick={() => setActionOpen(true)}><DotsHorizontalIcon /></button></div>)}</section>)}</div><div className="drawer-footer"><button onClick={() => go("settings")}><GearIcon /><span>设置</span><ChevronRightIcon /></button><button onClick={() => go("profile")}><PersonIcon /><span><strong>王师傅</strong><small>查看个人信息</small></span><ChevronRightIcon /></button></div></aside>
    {drawerOpen && <button className="drawer-scrim" onClick={() => setDrawerOpen(false)} />}
    <BottomSheet open={actionOpen} onOpenChange={setActionOpen} title="对话操作"><div className="sheet-list"><button><Pencil2Icon />重命名</button><button><StarIcon />置顶</button><button className="danger"><TrashIcon />删除</button></div></BottomSheet>
    {toast && <div className="toast app-toast">{toast}</div>}
  </div>;
}
