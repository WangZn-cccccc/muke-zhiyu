const TYPES=new Set(['question','diagnosis','direction_selection','product','management','no_match','knowledge','emergency','out_of_scope','service_end','error']);
const STATUSES=new Set(['not_started','waiting_for_selection','processing','completed','failed']);
const MODES=new Set(['product','management','no_match',null]);
const ERROR_CODES=new Set(['INVALID_REQUEST','UNAUTHORIZED','WORKFLOW_TIMEOUT','WORKFLOW_FAILED','INVALID_RESPONSE','KNOWLEDGE_UNAVAILABLE','DUPLICATE_SUBMISSION']);
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v), txt=v=>typeof v==='string'&&v.trim().length>0;
export function validateWorkflowResponse(p){
 const e=[],add=(path,message)=>e.push({path,message}); if(!obj(p))return[{path:'$',message:'响应必须是 JSON 对象'}];
 if(p.contract_version!=='1.0.0')add('contract_version','当前版本必须为 1.0.0'); if(typeof p.success!=='boolean')add('success','必须是 boolean');
 if(!TYPES.has(p.response_type))add('response_type','不在允许枚举中'); if(!txt(p.conversation_id))add('conversation_id','必须是非空字符串');
 if(!obj(p.meta)||!txt(p.meta.request_id)||!txt(p.meta.workflow_version))add('meta','必须包含 request_id 和 workflow_version');
 if(!Number.isInteger(p.follow_up_round)||p.follow_up_round<0||p.follow_up_round>4)add('follow_up_round','必须是 0—4 的整数');
 if(typeof p.fourth_round_triggered!=='boolean')add('fourth_round_triggered','必须是 boolean');
 if(p.follow_up_round===4&&p.fourth_round_triggered!==true)add('fourth_round_triggered','第4轮必须明确标记为保底追问');
 if(p.fourth_round_triggered===true&&!txt(p.fourth_round_reason))add('fourth_round_reason','触发第4轮必须记录具体理由');
 for(const k of ['questions','solution_directions','recommended_products','management_advice'])if(!Array.isArray(p[k]))add(k,'必须是数组');
 if(!Array.isArray(p.pending_question_ids))add('pending_question_ids','必须是数组');
 if(!obj(p.question_answers))add('question_answers','必须是对象');
 if(!STATUSES.has(p.recommendation_status))add('recommendation_status','不在允许枚举中'); if(!MODES.has(p.result_mode))add('result_mode','不在允许枚举中');
 const qs=Array.isArray(p.questions)?p.questions:[];
 if(p.response_type==='question'){if(qs.length<1||qs.length>3)add('questions','每轮必须包含 1—3 题');if(qs.length===3&&p.follow_up_round!==1)add('questions','只有宽泛症状首轮允许3题');if(p.follow_up_round<1||p.follow_up_round>4)add('follow_up_round','追问响应轮次必须为 1—4');}else if(qs.length)add('questions','非追问响应不得携带待回答问题');
 const ids=new Set(); qs.forEach((q,i)=>{const x=`questions[${i}]`;if(!obj(q))return add(x,'必须是对象');if(!txt(q.id))add(`${x}.id`,'必须是非空字符串');else if(ids.has(q.id))add(`${x}.id`,'同一轮 id 不得重复');else ids.add(q.id);if(!txt(q.target_field))add(`${x}.target_field`,'必须指向病例字段');if(!txt(q.question))add(`${x}.question`,'必须是非空字符串');if(q.question_type==='single_choice'){if(!Array.isArray(q.options)||q.options.length<2||q.options.length>5)add(`${x}.options`,'单选题必须有 2—5 项');if(q.allow_other!==true)add(`${x}.allow_other`,'单选题必须允许其他补充');}});
 const pending=Array.isArray(p.pending_question_ids)?p.pending_question_ids:[], answers=obj(p.question_answers)?p.question_answers:{};
 pending.forEach(id=>{if(!answers[id]||!['pending','invalid'].includes(answers[id].status))add(`question_answers.${id}`,'待回答问题必须具有 pending 或 invalid 状态');});
 Object.entries(answers).forEach(([id,a])=>{if(a?.status==='answered'&&!txt(a.value))add(`question_answers.${id}.value`,'answered 状态必须有回答值');if(a?.value==='other'&&!txt(a.other_text))add(`question_answers.${id}.other_text`,'选择其他时必须有补充文字');});
 if(p.response_type==='diagnosis'){if(!obj(p.diagnosis)||!txt(p.diagnosis.disease_name))add('diagnosis.disease_name','必须包含疾病名称');const ev=p.diagnosis?.evidence;if(!Array.isArray(ev)||!ev.length)add('diagnosis.evidence','至少需要一条证据');else ev.forEach((v,i)=>{if(!txt(v?.source_ref))add(`diagnosis.evidence[${i}].source_ref`,'证据必须可追溯');});if(txt(p.diagnosis?.disease_name)&&p.locked_disease!==p.diagnosis.disease_name)add('locked_disease','必须与 diagnosis.disease_name 一致');}
 const dirs=Array.isArray(p.solution_directions)?p.solution_directions:[];if(p.response_type==='direction_selection'){if(dirs.length<1||dirs.length>4)add('solution_directions','必须包含 1—4 个方向');if(p.recommendation_status!=='waiting_for_selection')add('recommendation_status','必须为 waiting_for_selection');if(txt(p.selected_direction))add('selected_direction','用户选择前不得预填');}
 const products=Array.isArray(p.recommended_products)?p.recommended_products:[],advice=Array.isArray(p.management_advice)?p.management_advice:[];
 if(p.response_type==='product'){if(!products.length)add('recommended_products','商品响应必须有商品');products.forEach((v,i)=>{if(!txt(v?.source_id))add(`recommended_products[${i}].source_id`,'商品必须可追溯');});}
 if(p.response_type==='management'){if(products.length)add('recommended_products','纯管理响应不得包含商品');if(!advice.length)add('management_advice','纯管理响应必须包含建议');if(p.result_mode!=='management')add('result_mode','必须为 management');}
 if(p.response_type==='no_match'&&(products.length||p.result_mode!=='no_match'))add('recommended_products','无匹配响应必须为空商品且模式为 no_match');
 if(p.response_type==='emergency'){if(p.emergency?.stop_recommendation!==true)add('emergency.stop_recommendation','必须终止推荐');if(dirs.length)add('solution_directions','紧急响应不得给普通方向');if(products.length)add('recommended_products','紧急响应不得推荐商品');}
 if(p.success===false||p.response_type==='error'){if(!obj(p.error))add('error','失败响应必须包含 error');else{if(!ERROR_CODES.has(p.error.code))add('error.code','必须使用稳定错误码');if(!txt(p.error.message))add('error.message','必须是用户可理解文本');}}
 return e;
}
export function assertWorkflowResponse(p){const e=validateWorkflowResponse(p);if(e.length)throw new Error(`工作流响应不符合合同：\n${e.map(v=>`${v.path}: ${v.message}`).join('\n')}`);return p;}
