import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'knowledge/rag/新版RAG病理库_206场景版.md');
const outputPath = resolve(root, 'knowledge/rag/新版RAG病理库_206场景版_核心鉴别双块_待验证.md');

const url = {
  ped: 'https://www.woah.org/fileadmin/Home/eng/Our_scientific_expertise/docs/pdf/A_factsheet_PEDV.pdf',
  corona: 'https://www.msdvetmanual.com/digestive-system/enteric-viral-diseases-in-pigs/coronaviral-enteritis-in-pigs',
  ecoli: 'https://www.msdvetmanual.com/digestive-system/enteric-bacterial-diseases-in-pigs/enteric-colibacillosis-in-pigs',
  rota: 'https://www.msdvetmanual.com/digestive-system/enteric-viral-diseases-in-pigs/rotaviral-enteritis-in-pigs',
  cocci: 'https://www.msdvetmanual.com/digestive-system/coccidiosis/coccidiosis-of-pigs',
  clostridia: 'https://www.msdvetmanual.com/infectious-diseases/clostridial-diseases/enterotoxemias-in-animals',
  salmonella: 'https://www.msdvetmanual.com/digestive-system/enteric-bacterial-diseases-in-pigs/intestinal-salmonellosis-in-pigs',
  ileitis: 'https://www.msdvetmanual.com/digestive-system/intestinal-diseases-in-pigs/porcine-proliferative-enteropathy',
  dysentery: 'https://www.msdvetmanual.com/digestive-system/enteric-bacterial-diseases-in-pigs/swine-dysentery',
  edema: 'https://www.msdvetmanual.com/es/enfermedades-generalizadas/enfermedad-de-los-edemas/enfermedad-de-los-edemas-en-cerdos',
  salt: 'https://www.msdvetmanual.com/toxicology/salt-toxicosis/salt-toxicosis-in-animals',
  atrophic: 'https://www.msdvetmanual.com/respiratory-system/respiratory-diseases-of-pigs/atrophic-rhinitis-in-pigs',
  arthritis: 'https://www.msdvetmanual.com/musculoskeletal-system/lameness-in-pigs/lameness-in-nursery-pigs',
  toxoplasma: 'https://www.msdvetmanual.com/infectious-diseases/toxoplasmosis/toxoplasmosis-in-animals',
  mange: 'https://www.msdvetmanual.com/integumentary-system/mange/mange-in-pigs',
  exudative: 'https://www.msdvetmanual.com/integumentary-system/exudative-epidermitis/exudative-epidermitis-in-pigs',
  pcv: 'https://www.msdvetmanual.com/infectious-diseases/porcine-circoviruses/porcine-circoviruses-and-their-associated-diseases',
  asf: 'https://www.woah.org/en/disease/african-swine-fever/',
  csf: 'https://www.woah.org/en/disease/classical-swine-fever/',
  respiratory: 'https://www.msdvetmanual.com/respiratory-system/respiratory-diseases-of-pigs/overview-of-respiratory-diseases-of-pigs',
  influenza: 'https://www.msdvetmanual.com/respiratory-system/respiratory-diseases-of-pigs/influenza-in-pigs',
  prrs: 'https://www.msdvetmanual.com/generalized-conditions/porcine-reproductive-and-respiratory-syndrome/porcine-reproductive-and-respiratory-syndrome',
  strep: 'https://www.msdvetmanual.com/generalized-conditions/streptococcal-infections-in-pigs/streptococcus-suis-infection-in-pigs',
  glaesser: 'https://www.msdvetmanual.com/generalized-conditions/gl%C3%A4sser-disease/gl%C3%A4sser-disease-in-pigs',
  prvs: 'https://www.msdvetmanual.com/nervous-system/pseudorabies/pseudorabies-in-pigs',
  abortions: 'https://www.msdvetmanual.com/reproductive-system/abortion-in-large-animals/abortion-in-pigs',
};

// Notes are indexed by the source's stable candidate ID and repeated only in
// scenes where that candidate already exists. They do not rewrite medical facts.
const notes = {
  C001: {
    core: '黄色水样便和脱水也见于病毒性腹泻；仅凭颜色、日龄或呕吐不能锁定大肠杆菌病因。',
    diff: '【黄便不能单独区分】与PED、TGE、轮状病毒性肠炎症状重叠时保留相应候选。确认大肠杆菌性腹泻应结合小肠病变、细菌培养及必要的黏附/毒力因子检测；单纯检出大肠杆菌不等于证实致病。',
    source: url.ecoli,
  },
  C002: {
    core: '急性水样腹泻、呕吐、低日龄死亡可提示PED，但与TGE等病因高度重叠；不能凭黄色便或这些症状锁定PED。',
    diff: '【重点：PED/TGE临床高度相似】粪便颜色、日龄、呕吐和传播范围只能调整候选优先级，不能可靠区分PED与TGE；未获病原证据时同时保留两者，不输出病原级确诊。需要区分时由兽医选取合适样本，针对PEDV、TGEV进行RT-PCR/RT-qPCR等检测，并结合病程解释结果。与黄痢重叠时另结合小肠病变、细菌培养及毒力因子检测；病毒检测不能替代细菌病因确认。',
    source: url.ped,
  },
  C003: {
    core: '急性水样腹泻、呕吐和低日龄死亡可提示TGE，但与PED高度重叠；不能仅凭临床症状锁定TGE。',
    diff: '【重点：TGE/PED临床高度相似】粪便颜色、日龄、呕吐和传播范围只能调整候选优先级，不能可靠区分TGE与PED；未获病原证据时同时保留两者。需要区分时由兽医选取合适样本，针对TGEV、PEDV进行RT-PCR/RT-qPCR等检测，并结合病程解释结果。',
    source: url.corona,
  },
  C004: {
    core: '黄色或灰白色水样便与冠状病毒性肠炎、黄痢和球虫病重叠，不能仅凭便色锁定轮状病毒。',
    diff: '【水样便不能单独区分】日龄、病程和呕吐仅供调整候选优先级；病原确认需结合肠道病变、轮状病毒检测，并按重叠候选检查PEDV/TGEV、大肠杆菌或球虫。',
    source: url.rota,
  },
  C005: {
    core: '约5—15日龄可有黄色水样便；日龄和便色不足以排除或确诊球虫病，早期未见粪便卵囊也不能单独排除。',
    diff: '【与病毒性腹泻及黄痢重叠】持续/反复、同窝生长差和呕吐情况可帮助排序，但不能单独确诊。结合粪便卵囊与肠黏膜检查；发病早期粪便卵囊阴性时结合病程及肠黏膜检查复核。',
    source: url.cocci,
  },
  C006: {
    core: '低日龄血性腹泻和快速死亡提示C型梭菌性肠炎，但不是单凭症状即可确诊。',
    diff: '【需病变和毒素相关证据】与其他新生仔猪肠炎重叠时，结合小肠出血坏死、组织病理及梭菌分型/毒素相关检测；单纯检出梭菌不足以认定致病。',
    source: url.clostridia,
  },
  C007: {
    core: '发热、腹泻及败血症表现与其他肠炎或全身性感染重叠，不能凭便色或发热锁定沙门氏菌。',
    diff: '【发热和血便并非特异】与回肠炎、猪痢疾或败血性疾病重叠时，结合肠道/系统病变、沙门氏菌培养与分型；必要时同时排查其他候选。',
    source: url.salmonella,
  },
  C008: {
    core: '慢性腹泻、生长差或出血型黑便与沙门氏菌病、猪痢疾重叠；不能只凭便色确诊回肠炎。',
    diff: '【黑便/血便不能单独区分】结合回肠特征性病变、组织学及病变部位的Lawsonia检测；单次粪便PCR阳性需结合病变和群体背景解释。',
    source: url.ileitis,
  },
  C009: {
    core: '黏液血便可提示猪痢疾，但与其他结肠炎重叠，不能仅凭粪便外观确诊。',
    diff: '【黏液血便不能单独区分】结合结肠病变与针对Brachyspira的粪便培养或分子检测，并与沙门氏菌及回肠炎等候选比较。',
    source: url.dysentery,
  },
  C010: {
    core: '消瘦、呼吸、腹泻、皮肤或繁殖表现均不特异；单凭PCV2核酸阳性不能认定其造成当前疾病。',
    diff: '【检出病毒不等于确诊相关疾病】评估临床表现和相应组织病变，并尽量证明PCV2位于病变组织中；同时考虑PRRS及其他共感染。',
    source: url.pcv,
  },
  C011: {
    core: '高热、出血、发绀、死亡等表现可与非洲猪瘟及其他败血性病因重叠；不能凭临床表现锁定猪瘟。',
    diff: '【重点：与非洲猪瘟临床不能可靠区分】疑似猪瘟/非洲猪瘟时立即按当地防疫要求处理，并由有资质机构开展针对CSFV、ASFV的实验室检测；不能等待结果才提示风险，也不能以一种阴性结果自动确诊另一种。',
    source: url.csf,
  },
  C012: {
    core: '高热、发绀、出血及死亡与猪瘟和其他败血性病因重叠；不能凭临床或剖检表现锁定非洲猪瘟。',
    diff: '【重点：与猪瘟临床不能可靠区分】疑似非洲猪瘟/猪瘟时立即按当地防疫要求处理，并由有资质机构开展针对ASFV、CSFV的实验室检测；不能等待结果才提示风险，也不能以一种阴性结果自动确诊另一种。',
    source: url.asf,
  },
  C030: {
    core: '呼吸、繁殖和生长问题可由多种病原或混合感染造成，不能只凭症状锁定PRRS。',
    diff: '【综合征不能单凭症状指认病原】结合群体病程、繁殖/呼吸病变及PRRSV检测；疫苗使用史和共感染会影响结果解释，检出PRRSV不自动排除其他病因。',
    source: url.prrs,
  },
  C031: {
    core: '慢性咳嗽和料肉比下降与其他呼吸道病因重叠，不能只凭咳嗽锁定支原体肺炎。',
    diff: '【呼吸道病因可能共存】结合病程、肺部病变和针对猪肺炎支原体的检测，同时评估流感、PRRSV、APP及继发细菌感染。',
    source: url.respiratory,
  },
  C032: {
    core: '瘙痒、结痂、脱毛和生长下降可提示疥螨病，但也可见于其他皮肤病或管理问题；不能仅凭掉膘确诊。',
    diff: '【不是统一做PCR的问题】结合瘙痒及皮损分布、群体抓痒情况和适当皮肤检查；需要确认时可检查皮肤刮取物，同时鉴别渗出性表皮炎、营养性角化异常等。',
    source: url.mange,
  },
  C037: {
    core: '急性发热、咳嗽与PRRS等呼吸道病因重叠；临床表现不能单独确诊猪流感。',
    diff: '【急性呼吸症状不具病原特异性】结合发病速度与群体表现，采用针对猪流感病毒的RT-PCR等检测；注意与PRRS、细菌性肺炎及混合感染鉴别。',
    source: url.influenza,
  },
  C038: {
    core: '急性呼吸困难、发热和死亡可提示胸膜肺炎，但与其他细菌性或混合性肺炎重叠。',
    diff: '【需结合病变和病原】结合胸膜及肺病变，并从适当病变组织进行APP的培养或分子检测；不以咳嗽/死亡单项锁定病原。',
    source: url.respiratory,
  },
  C039: {
    core: '呼吸症状及肺炎病变可与其他原发或继发感染重叠，不能只凭咳嗽指认巴氏杆菌。',
    diff: '【注意继发感染】结合肺部病变和合适病变部位的细菌学结果，同时排查可能的原发病毒或支原体病因；检出细菌不等于其为唯一病因。',
    source: url.respiratory,
  },
  C040: {
    core: '喷嚏、鼻液和生长下降也见于其他鼻炎或呼吸道问题；不能只凭喷嚏锁定萎缩性鼻炎。',
    diff: '【鼻部症状不能单独判定病因】结合鼻甲骨萎缩等病变，按怀疑对象检测支气管败血波氏杆菌或产毒素多杀性巴氏杆菌；检出细菌还需结合毒素及病变解释。',
    source: url.atrophic,
  },
  C041: {
    core: '仔猪神经症状或母猪繁殖异常也可见于其他病因，不能只凭抽搐、弱仔或流产锁定伪狂犬病。',
    diff: '【神经/繁殖表现不特异】结合群体病史，针对伪狂犬病毒进行适当样本的分子检测；需要时由兽医结合免疫史解释血清学结果。',
    source: url.prvs,
  },
  C042: {
    core: '发热、关节肿、神经症状或多浆膜炎与链球菌病等重叠，不能只凭症状锁定格拉瑟病。',
    diff: '【取样部位决定解释价值】结合多浆膜炎、关节或脑膜病变，从受累部位培养或检测Glaesserella parasuis；鼻腔或呼吸道检出常在菌不足以证实系统性疾病。',
    source: url.glaesser,
  },
  C043: {
    core: '发热、脑膜炎、跛行或突然死亡与格拉瑟病及其他败血性疾病重叠，不能只凭症状锁定链球菌病。',
    diff: '【需结合受累部位取样】结合脑膜、关节或败血性病变，从适当病变部位培养并鉴定猪链球菌；鼻腔或扁桃体检出不足以单独证明其为当前病因。',
    source: url.strep,
  },
  C044: {
    core: '发热、流产或弱仔与其他繁殖及全身性感染重叠，不能只凭这些表现锁定弓形虫病。',
    diff: '【繁殖或全身症状不指认病原】结合流行病学、病变及适当样本的弓形虫检测，并与PRRS、钩端螺旋体病等候选鉴别；单一非特异症状不能作为病原级确诊。',
    source: url.toxoplasma,
  },
  C045: {
    core: '呼吸道混合感染是多病因状态，不能仅凭咳嗽、发热或一次病原阳性断言全部症状由单一病原造成。',
    diff: '【混合感染需分别取证】结合病程和肺部病变，对可疑病毒及细菌分别取适宜样本检测；阳性结果应与病变部位、采样时间和群体表现对应。',
    source: url.respiratory,
  },
  C047: {
    core: '发热、皮肤发红和关节问题可与其他败血性病因重叠；不能仅凭皮肤颜色锁定猪丹毒。',
    diff: '【皮肤/关节表现不具完全特异性】结合典型病变，并从适宜病变组织进行猪丹毒杆菌培养或针对性检测；同时排查猪瘟、非洲猪瘟等重要候选。',
    source: 'https://www.msdvetmanual.com/infectious-diseases/erysipelothrix-rhusiopathiae-infection/swine-erysipelas',
  },
  C048: {
    core: '返情、流产、死胎或弱仔可由多种感染与非感染因素造成，不能只凭繁殖结局锁定钩端螺旋体。',
    diff: '【流产结局不指认病原】结合妊娠阶段、群体病史，从适当胎儿组织/胎儿胃内容物开展钩端螺旋体检测，并与PRRS、细小病毒等鉴别。',
    source: url.abortions,
  },
  C052: {
    core: '仔猪皮肤发红、结痂与疥螨病及营养性皮肤异常重叠；油腻渗出和快速扩展有提示性，但不能只凭红皮锁定病因。',
    diff: '【结合皮损形态和病原证据】疑似渗出性表皮炎时检查油腻渗出、非瘙痒性皮损及传播情况；需要确认时可培养病变部位细菌，而非笼统要求PCR。',
    source: url.exudative,
  },
  C058: {
    core: '关节肿大和跛行可由多种感染或非感染原因造成，不能只凭关节症状锁定某一细菌。',
    diff: '【感染性关节炎需结合病变部位证据】检查关节液和相关病变，按怀疑病原做培养或分子检测；同时排查外伤及发育性跛行。',
    source: url.arthritis,
  },
  C065: {
    core: '断奶后神经症状或突然死亡也见于其他神经病因，不能仅凭划水或共济失调确诊水肿病。',
    diff: '【神经症状不具病原特异性】结合断奶时间、眼睑或皮下水肿、病变以及产志贺毒素大肠杆菌的分离与毒力因子检测；同时考虑链球菌病、格拉瑟病及缺水-钠离子中毒。',
    source: url.edema,
  },
  C066: {
    core: '神经症状与感染性脑炎或中毒重叠；缺水/复水经过是重要线索，但不能只凭划水判定钠离子中毒。',
    diff: '【不是统一做PCR的问题】核实停水及复水记录、饮水条件和相关检验，由兽医结合病变鉴别感染性脑炎等候选。',
    source: url.salt,
  },
  C078: {
    core: '木乃伊胎、死胎和弱仔可提示细小病毒病，但与PRRS及其他繁殖病因重叠。',
    diff: '【胎儿表现仅提示候选】结合胎次、妊娠阶段和胎儿大小差异，选取胎儿样本进行细小病毒相关检测，并同时评估PRRS及其他繁殖病因。',
    source: url.abortions,
  },
  C104: {
    core: '繁殖、呼吸及继发感染同时出现，可提示PRRS相关群体复杂化，但不能单凭多系统表现确认PRRSV为唯一病因。',
    diff: '【综合征应识别共感染】结合群体病程、病变及PRRSV检测，同时针对可能的继发病原取证；病毒阳性不自动解释全部症状。',
    source: url.prrs,
  },
  C105: {
    core: '反复消瘦、呼吸或腹泻可提示PCV2相关复杂化，但PCV2检出本身不能解释全部病情。',
    diff: '【PCV2相关病需病变证据】结合临床表现、病变与病变组织中的PCV2证据，并评估PRRS等共感染；不以单次核酸阳性锁定原因。',
    source: url.pcv,
  },
};

const source = readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');
const headers = [...source.matchAll(/^## (P\d{2}\.\d{2}) (.+)$/gm)];
if (headers.length !== 206) throw new Error(`Expected 206 scenes, got ${headers.length}`);

const blocks = [];
const sectionsToCore = ['基本信息', '检索标签', '典型表现', '关键观察项'];
const sectionsToDiff = ['鉴别要点（含差异观察项）', '解决方向', '发病或形成原理'];
for (let i = 0; i < headers.length; i++) {
  const start = headers[i].index;
  const end = i + 1 < headers.length ? headers[i + 1].index : source.length;
  // The source inserts a module heading after the final scene of each module.
  // Stop at the scene's first separator so that heading is not glued to a
  // candidate's pathogenesis block or mistaken for an extra RAG chunk.
  const raw = source.slice(start, end).split(/\n---\n/, 1)[0].trim();
  const head = headers[i][0];
  const sceneNumber = headers[i][1];
  const byHeading = new Map();
  const subsections = [...raw.matchAll(/^### (.+)$/gm)];
  for (let j = 0; j < subsections.length; j++) {
    const bodyStart = subsections[j].index + subsections[j][0].length;
    const bodyEnd = j + 1 < subsections.length ? subsections[j + 1].index : raw.length;
    byHeading.set(subsections[j][1], raw.slice(bodyStart, bodyEnd).trim());
  }
  for (const key of [...sectionsToCore, ...sectionsToDiff]) {
    if (!byHeading.has(key)) throw new Error(`${sceneNumber} missing ${key}`);
  }
  const basic = byHeading.get('基本信息');
  const sceneId = basic.match(/^- 场景ID：(.+)$/m)?.[1];
  const cid = basic.match(/^- 候选ID：(C\d{3})$/m)?.[1];
  const candidateName = basic.match(/^- 候选名称：(.+)$/m)?.[1];
  const problem = basic.match(/^- 所属问题：(.+)$/m)?.[1];
  if (!sceneId || !cid || !candidateName || !problem) throw new Error(`${sceneNumber} has incomplete identity`);
  if (!head.endsWith(`${problem}—${candidateName}`)) throw new Error(`${sceneNumber} heading/identity conflict`);
  const identity = `- 场景ID：${sceneId}\n- 所属问题：${problem}\n- 候选ID：${cid}\n- 候选名称：${candidateName}`;
  const extraBasic = basic.split('\n').filter(line => !/^- (场景ID|所属问题|候选ID|候选名称)：/.test(line)).join('\n').trim();
  const note = notes[cid];
  const core = [
    `${head}｜核心块`, identity,
    `### 基本信息\n${extraBasic}`,
    ...sectionsToCore.slice(1).map(key => `### ${key}\n${byHeading.get(key)}`),
    note ? `### 临床判断边界\n${note.core}` : '',
  ].filter(Boolean).join('\n\n');
  const diff = [
    `${head}｜鉴别块`, identity,
    `### 鉴别要点（含差异观察项）\n${byHeading.get('鉴别要点（含差异观察项）')}`,
    note ? `### 重点鉴别边界\n${note.diff}\n\n资料依据：${note.source}` : '',
    `### 解决方向\n${byHeading.get('解决方向')}`,
    `### 发病或形成原理\n${byHeading.get('发病或形成原理')}`,
  ].filter(Boolean).join('\n\n');
  blocks.push(core, diff);
}

if (blocks.length !== 412) throw new Error(`Expected 412 blocks, got ${blocks.length}`);
const result = `${blocks.join('\n\n---\n\n')}\n`;
writeFileSync(outputPath, result, 'utf8');
const noteCount = headers.reduce((n, h, i) => n + Number(Boolean(notes[source.slice(h.index, i + 1 < headers.length ? headers[i + 1].index : source.length).match(/^- 候选ID：(C\d{3})$/m)?.[1]])), 0);
console.log(JSON.stringify({ scenes: headers.length, blocks: blocks.length, annotatedScenes: noteCount, outputPath }, null, 2));
