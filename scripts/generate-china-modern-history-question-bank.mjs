import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const SUBJECT_ID = 'china-modern-history'
const OUTPUT_DIR = resolve('resources/question-bank/china-modern-history')
const OUTPUT_FILE = join(OUTPUT_DIR, 'questions.json')
const DRAFTS_FILE = join(OUTPUT_DIR, 'drafts.json')
const REVIEW_QUEUE_FILE = join(OUTPUT_DIR, 'review-queue.json')
const MANIFEST_FILE = resolve('resources/question-bank/manifest.json')
const DOC_FILE = resolve('shigang/中国近代史试题库(1).doc')
const DOCX_FILE = resolve('shigang/近代史题库单选总结(1).docx')
const ROOT_BANK_TAG = 'multi-0.2.4.1-cmh-audit-20260625-fix2'
const SUBJECT_BANK_TAG = 'cmh-0.1.1-shigang-audit-20260625-fix2'
const UPDATED_AT = '2026-06-25T00:00:00+08:00'
const LOW_CONFIDENCE_THRESHOLD = 0.72

// 手工干扰项覆盖表（key 为草稿 stem 精确值，value 为 3 个同语义类型干扰项）。
// 用于补救独子桶/小桶单选题自动生成干扰项语义错配问题。
// 由子代理全库扫描 + 人工确认后录入。key 必须与 drafts.json 中 stem 完全一致（含 Unicode 引号）。
const MANUAL_DISTRACTORS = new Map([
  // --- 第一轮修复（用户指定）---
  ['土地革命战争时期，中国共产党开辟的“中国革命的新道路”是指____。', ['中心城市暴动，夺取全国政权', '议会斗争，合法夺权', '依靠苏联红军直接解放中国']],
  ['抗日战争结束后，中国社会主要矛盾是中国人民同____之间的矛盾。', ['美帝国主义', '封建地主阶级', '官僚资产阶级']],
  ['1945年中国成为联合国的____和五个常任理事国之一。', ['会员国', '观察员国', '发起国']],
  ['1949年6月30日，毛泽东发表了著名的《____》。', ['实践论', '矛盾论', '论联合政府']],
  ['全面抗战爆发后，中国军队的第一次重大胜利是____。', ['台儿庄战役', '百团大战', '淞沪会战']],
  ['红军长征途中，中国共产党召开的、成为党的历史上生死攸关的转折点的会议是____。', ['八七会议', '洛川会议', '瓦窑堡会议']],
  // --- 第二轮修复（子代理全库扫描）---
  ['革命派和改良派论证的焦点是要不要以____的手段推翻清王朝。', ['维新变法', '武装暴动', '君主立宪']],
  ['新文化运动的基本口号是____。', ['自强求富', '中体西用', '三民主义']],
  ['宣传新文化的主要刊物是____。', ['《每周评论》', '《国民》', '《晨报》']],
  ['中国共产党就国共合作的方针和方法做出正确的决定是在____。', ['八七会议', '中共“二大”', '古田会议']],
  ['中国工人运动第一次高潮起点的标志是____。', ['京汉铁路工人大罢工', '安源路矿工人罢工', '省港大罢工']],
  ['中国新民主主义革命的开端是____。', ['中国共产党的成立', '五卅运动', '一二九运动']],
  ['中国共产党独立领导革命战争，创建人民军队和武装夺取政权的开端是____。', ['秋收起义', '广州起义', '武昌起义']],
  ['毛泽东在1927年中共八七会议上提出著名论断是____。', ['星星之火，可以燎原', '工农武装割据', '没有调查，没有发言权']],
  ['左翼文化运动中，被称为“文化新军的最伟大和最英勇的旗手”的中国文化革命伟人是____。', ['郭沫若', '茅盾', '巴金']],
  ['土地革命战争时期“左”倾错误党中央占据统治地位的有____。', ['两次', '四次', '五次']],
  ['1936年10月，在甘肃会宁、静宁将台堡胜利会师的三大主力红军是____。', ['红二、六军团', '红四方面军', '红一方面军']],
  ['局部抗日战争开始于____。', ['七七事变', '“一二八事变”', '华北事变']],
  ['华北事变发生后，中国共产党组织领导的____标志着中国人民抗日救亡新高潮的到来。', ['一二一运动', '五卅运动', '五四运动']],
  ['抗日民族统一战线形成的标志是国民党中央通讯社播发____。', ['国共合作宣言', '抗日救国十大纲领', '《中共中央为公布国共合作宣言》']],
  ['毛泽东在《论持久战》中指出，中国抗日战争取得最后胜利的最为关键的阶段是____。', ['战略防御阶段', '战略反攻阶段', '战略决战阶段']],
  ['1938年3月，国民党军队在正面战场取得大捷是____。', ['淞沪会战', '武汉会战', '长沙会战']],
  ['抗战后期国民党军队在____中再次大溃败。', ['淞沪会战', '徐州会战', '武汉会战']],
  ['国民党军队在皖南事变中袭击了共产党领导的____。', ['八路军', '华南抗日游击队', '东北抗日联军']],
  ['1937年8月，中国共产党在陕北洛川召开的政治局扩大会议制定了____。', ['全面抗战路线', '持久战方针', '《论持久战》']],
  ['1945年7月，同盟国敦促日本无条件投降的会议是____。', ['雅尔塔会议', '开罗会议', '德黑兰会议']],
  ['20世纪40年代，中国共产党开展的延安整风运动最主要的任务是反对____。', ['宗派主义', '党八股', '官僚主义']],
  ['全面内战爆发的标志是国民党军队大举进攻____。', ['华东解放区', '东北解放区', '华北解放区']],
  ['1947年，刘邓大军挺进中原的重大意义在于____。', ['揭开战略进攻的序幕', '扭转全国战局', '威胁国民党统治核心区']],
  ['1947年制订的《中国土地法大纲》规定____。', ['废除封建剥削', '实行耕者有其田', '减租减息']],
  ['1949年4月21日，毛泽东和朱德桓发布《____》。', ['《中国人民解放军布告》', '《论人民民主专政》', '《将革命进行到底》']],
  ['国民党统治覆灭的时间是____。', ['1949年1月31日', '1949年4月21日', '1949年10月1日']],
  ['在中国共产党的领导下，中国人民推翻了三座大山，于1949年成立了____，这标志着新民主主义革命的胜利。', ['中央人民政府', '人民民主专政的国家', '社会主义新中国']],
  // --- 第三轮修复（前 113 题子代理扫描）---
  ['近代操纵了中国政治、经济命脉，日益成为支配中国的决定性力量是____。', ['本国封建势力', '外国资本主义', '买办阶级']],
  ['近代中国成为奴役人民的社会基础和统治支柱的是____。', ['地主阶级', '买办资产阶级', '官僚资产阶级']],
  ['标志着以慈禧太后为首的清政府彻底放弃抵抗外国侵略者的事件是____。', ['鸦片战争的失败', '八国联军侵华', '《马关条约》的签订']],
  ['从中国攫取一百多万平方公里土地，在第二次鸦片战争中获利最大的国家是____。', ['英国', '法国', '德国']],
  ['1898年把长城以北划分给帝国主义国家____的势力范围。', ['英国', '法国', '德国']],
  ['第一次火烧圆明园的侵略军是____。', ['英法联军', '日本侵略军', '八国联军']],
  ['甲午战争之后中华民族面临生死存亡关头，开始普遍有了____的觉醒。', ['民族危机', '救亡意识', '变法图强']],
  ['天京事变是太平天国由盛转衰的____。', ['转折点', '分水岭', '起点']],
  ['太平天国政权失败的根本原因是____。', ['中外反动势力过于强大', '缺乏科学理论指导', '领导集团内部腐败分裂']],
  ['洋务运动失败的标志是____。', ['福建水师全军覆没', '甲午战争失败', '《辛丑条约》签订']],
  ['太平天国政权对儒家思想的态度是____。', ['全盘否定', '全盘保留', '批判性继承']],
  ['洋务派认为清王朝的“心腹之害”是____。', ['鸦片战争', '甲午战败', '外国侵略势力']],
  ['清政府的海上主力是____。', ['绿营水师', '湘军水师', '淮军水师']],
  ['维新派代表了____的利益和要求。', ['民族资产阶级', '开明地主', '中小资产阶级']],
  ['戊戌维新运动是一次____改革运动。', ['民族资产阶级', '地主阶级改良', '中小资产阶级']],
  ['提出“三纲四维之道不可变”，“择西学之可以补吾阙者用之”的主张是____。', ['维新派', '顽固派', '革命派']],
  ['戊戌维新时期，维新派在上海创办的影响较大的报刊是____。', ['《国闻报》', '《湘学报》', '《万国公报》']],
  ['洋务运动指导思想是____。', ['自强求富', '师夷长技', '变法维新']],
  ['戊戌维新运动中维新派主张建立的政治制度是____。', ['民主共和制', '开明君主专制', '总统共和制']],
  ['清末维新派的目的是在中国建立起____。', ['民主共和制', '开明专制', '议会内阁制']],
  ['戊戌维新运动兴起的社会物资条件是____。', ['民族资产阶级力量壮大', '维新思想广泛传播', '列强对华资本输出加剧']],
  ['科举制度是清政府在清末“新政”活动中____。', ['设立的', '保留的', '改革的']],
  ['近代中国第一个领导资产阶级革命的全国性政党是____。', ['国民党', '中华革命党', '光复会']],
  ['辛亥革命和戊戌维新运动失败的共同原因是____。', ['封建势力过于强大', '资产阶级的软弱性和妥协性', '缺乏广泛群众基础']],
  ['新文化运动兴起的标志是____。', ['胡适发表《文学改良刍议》', '鲁迅发表《狂人日记》', '李大钊发表《布尔什维主义的胜利》']],
  ['清末“预备立宪”的根本目的在于____。', ['实行君主立宪制', '抵制革命运动', '欺骗人民群众']],
  ['孙中山建立的第一个资产阶级革命团体是____。', ['华兴会', '光复会', '同盟会']],
  ['袁世凯暗杀了国民党领袖宋教仁后，孙中山发动了____。', ['护法运动', '护国运动', '讨袁战争']],
  ['辛亥革命的中坚力量是____。', ['会党群众', '新军官兵', '海外华侨资产阶级']],
])

const CHAPTER_TITLES = new Set([
  '进入近代后中华民族的磨难与抗争',
  '不同社会力量对国家出路的早期探索',
  '辛亥革命与君主专制制度的终结',
  '中国共产党成立和中国革命的新局面',
  '中国革命的新道路',
  '中华民族的抗日战争',
  '为建立新中国而奋斗',
])

const PERSON_ANSWERS = new Set([
  '林则徐',
  '郑观应',
  '孙中山',
  '英国人赫德',
  '冯子材',
  '邓世昌',
  '洪仁玕',
  '严复',
  '康有为',
  '洪秀全',
  '光绪皇帝',
  '冯桂芬',
  '邹容',
  '张勋',
  '蔡锷',
  '黄兴',
  '李大钊',
  '陈独秀',
  '陈望道',
  '鲍罗廷',
  '毛泽东',
  '王明',
  '傅作义',
])

const PLACE_ANSWERS = new Set([
  '南京',
  '广东',
  '黄花岗',
  '四川',
  '浙江萧山县',
  '井冈山',
  '广州、武汉',
  '中原解放区',
  '解放区',
  '河北平山县',
  '国统区',
  '乡村',
])

const COUNTRY_FORCE_ANSWERS = new Set([
  '资本-帝国主义',
  '封建阶级',
  '俄国',
  '德国',
  '英国',
  '法国',
  '日本',
  '日本和俄国',
  '资产阶级',
  '农民阶级的局限性',
  '中外反动势力的联合镇压',
  '留学生为骨干的青年知识分子',
  '国民党反动派',
  '中国',
  '美国',
  '蒋介石国民党政府的经济崩溃和政治危机',
])

const CONCLUSION_BUCKETS = [
  [/根本原因|失败的共同原因|衷心拥护原因|主要是因为|原因是|之所以能够/, 'root-cause'],
  [/实质|事实上质|事实本质/, 'essence'],
  [/起点标志|形成的标志|失败的标志|由盛转衰的标志|开端|开始于|转折点|标志着|标志是|标志毛泽东思想/, 'mark'],
  [/导火索/, 'trigger'],
  [/焦点/, 'focus'],
  [/根本目的|短期目标|长期的基本目标|基本目标|目的|目标/, 'goal'],
  [/重大意义|意义在于/, 'significance'],
  [/主要任务|最主要的任务/, 'task'],
  [/主要矛盾/, 'contradiction'],
  [/根本利益/, 'interest'],
]

// 独子桶扩容映射：当某判断结论/小桶只有 1 道题、无法从同桶取干扰项时，
// 用语义近似的更大类型作为回退池（仍属同类历史概念，避免跨类型混杂）。
const BUCKET_FALLBACK_TYPE = {
  'judgment:trigger': 'event',
  'judgment:task': 'policy',
  'judgment:interest': 'policy',
  'judgment:contradiction': 'country-force',
  'judgment:significance': 'event',
  'judgment:focus': 'event',
  'policy:slogan': 'policy',
  'event:incident': 'event',
  'event:uprising-or-strike': 'event',
  'time:range': 'time',
}

function compact(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([\p{Script=Han}，。！？；：、“”《》（）])\s+(?=[\p{Script=Han}，。！？；：、“”《》（）])/gu, '$1')
    .replace(/\s+([，。！？；：、])/g, '$1')
    .trim()
}

function readWordText(file) {
  return execFileSync('textutil', ['-convert', 'txt', '-stdout', file], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function countVisibleCharacters(value) {
  return Array.from(String(value).replace(/\s+/g, '')).length
}

function quoteIsBalanced(value) {
  const text = String(value)
  return (
    (text.match(/《/g)?.length ?? 0) === (text.match(/》/g)?.length ?? 0) &&
    (text.match(/“/g)?.length ?? 0) === (text.match(/”/g)?.length ?? 0)
  )
}

function detectConclusionSubtype(stem, sourceText) {
  const text = `${stem} ${sourceText}`
  for (const [pattern, subtype] of CONCLUSION_BUCKETS) {
    if (pattern.test(text)) return subtype
  }
  return null
}

function classifyBaseAnswer(answer) {
  if (/^\d{4}年(?:\d{1,2}月)?(?:-\d{4}年\d{0,2}月?)?$/.test(answer) || /^\d{1,2}月\d{1,2}日$/.test(answer)) {
    return { answerType: 'time', answerSubtype: answer.includes('-') ? 'range' : 'date' }
  }
  if (PERSON_ANSWERS.has(answer)) return { answerType: 'person', answerSubtype: 'individual' }
  if (/^《[^》]+》/.test(answer) || /条约|协定|二十一条|共同纲领|宣言|约法|纲领|报|杂志|新篇|本本主义|人民民主专政|革命军|五四指示|土地法大纲/.test(answer)) {
    if (/条约|协定|二十一条/.test(answer)) return { answerType: 'text', answerSubtype: 'treaty-or-agreement' }
    if (/报|杂志/.test(answer)) return { answerType: 'text', answerSubtype: 'periodical' }
    return { answerType: 'text', answerSubtype: 'document-or-work' }
  }
  if (/会议|大会|全会|中共[一二三四五六七八九十]+大|国民党“一大”|政治协商会议|波茨坦会议|民盟一届三中全会/.test(answer)) {
    return { answerType: 'meeting', answerSubtype: /中共|国民党|民盟/.test(answer) ? 'party-meeting' : 'conference' }
  }
  if (PLACE_ANSWERS.has(answer) || /南京|广东|四川|浙江|河北|黄花岗|井冈山|瑞金|解放区|国统区|台湾|澎湖|广州|武汉|乡村/.test(answer)) {
    return { answerType: 'place', answerSubtype: /解放区|国统区|乡村/.test(answer) ? 'region' : 'location' }
  }
  if (/同盟会|北洋水师|新四军|红一、二、四方面军|政府委员会|行政院|立法院|民主同盟|中国国民党革命委员会|政治协商会议|中华苏维埃共和国临时中央政府/.test(answer)) {
    if (/新四军|红一、二、四方面军|水师/.test(answer)) return { answerType: 'organization', answerSubtype: 'army' }
    if (/政府|行政院|立法院|政治协商会议/.test(answer)) return { answerType: 'organization', answerSubtype: 'state-organ' }
    return { answerType: 'organization', answerSubtype: 'party-or-group' }
  }
  if (/战争|运动|起义|革命|事变|战役|罢工|易帜|和平解决|全面内战|占领南京|覆灭/.test(answer)) {
    if (/战争|战役/.test(answer)) return { answerType: 'event', answerSubtype: 'war-or-campaign' }
    if (/起义|罢工/.test(answer)) return { answerType: 'event', answerSubtype: 'uprising-or-strike' }
    if (/运动|革命/.test(answer)) return { answerType: 'event', answerSubtype: 'movement-or-revolution' }
    return { answerType: 'event', answerSubtype: 'incident' }
  }
  if (/制度|主义|道路|方针|政策|原则|口号|思想|理论|中体西用|三三制|君主立宪制|减租减息|耕者有其田|和平建国|民主与科学|土地革命|土地制度|国家政权|领导权|联盟|农民战争|政治方式|内线作战|外线作战/.test(answer)) {
    if (/制度|君主立宪制|三三制/.test(answer)) return { answerType: 'policy', answerSubtype: 'system' }
    if (/口号|民主与科学|两个务必/.test(answer)) return { answerType: 'policy', answerSubtype: 'slogan' }
    if (/原则|方针|政策|减租减息|耕者有其田|和平建国/.test(answer)) return { answerType: 'policy', answerSubtype: 'policy-or-principle' }
    return { answerType: 'policy', answerSubtype: 'theory-or-line' }
  }
  if (COUNTRY_FORCE_ANSWERS.has(answer) || /帝国主义|阶级|政府|国民党|日本|俄国|英国|法国|德国|美国|中国|势力/.test(answer)) {
    if (/日本|俄国|英国|法国|德国|美国|中国/.test(answer)) return { answerType: 'country-force', answerSubtype: 'country' }
    if (/阶级|势力/.test(answer)) return { answerType: 'country-force', answerSubtype: 'social-force' }
    return { answerType: 'country-force', answerSubtype: 'political-force' }
  }
  return { answerType: 'concept', answerSubtype: 'historical-concept' }
}

function classifyDraft(stem, answer, sourceText, kind) {
  if (kind === 'statement') {
    return {
      templateId: 'statement-correct',
      answerType: 'statement',
      answerSubtype: 'correct-statement',
      confidence: 0.68,
    }
  }

  const conclusionSubtype = detectConclusionSubtype(stem, sourceText)
  if (conclusionSubtype) {
    return {
      templateId: `blank-judgment-${conclusionSubtype}`,
      answerType: 'judgment',
      answerSubtype: conclusionSubtype,
      confidence: 0.93,
    }
  }

  const base = classifyBaseAnswer(answer)
  return {
    templateId: `blank-${base.answerType}-${base.answerSubtype}`,
    ...base,
    confidence: /____/.test(stem) ? 0.96 : 0.74,
  }
}

function bucketKey(draft) {
  return `${draft.answerType}:${draft.answerSubtype}`
}

function hashString(value) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed) {
  let value = seed >>> 0
  return function next() {
    value += 0x6d2b79f5
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(values, seedText) {
  const result = [...values]
  const random = mulberry32(hashString(seedText))
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function pushMapValue(map, key, value) {
  map.set(key, [...(map.get(key) ?? []), value])
}

function makeTypedPools(drafts) {
  const pools = {
    all: [],
    byType: new Map(),
    byBucket: new Map(),
    byChapterType: new Map(),
    byChapterBucket: new Map(),
  }

  for (const draft of drafts) {
    pools.all.push(draft)
    pushMapValue(pools.byType, draft.answerType, draft)
    pushMapValue(pools.byBucket, bucketKey(draft), draft)
    pushMapValue(pools.byChapterType, `${draft.chapter ?? 'general'}:${draft.answerType}`, draft)
    pushMapValue(pools.byChapterBucket, `${draft.chapter ?? 'general'}:${bucketKey(draft)}`, draft)
  }
  return pools
}

function uniqueAnswersFromDrafts(drafts, correctAnswer, existing = []) {
  return unique(drafts.map((draft) => draft.answer)).filter((answer) => answer !== correctAnswer && !existing.includes(answer))
}

function takeAnswers(pool, count, seedText) {
  return shuffle(pool, seedText).slice(0, count)
}

function pickTypedDistractors(draft, pools, seedText) {
  const chapter = draft.chapter ?? 'general'
  const sameBucket = uniqueAnswersFromDrafts(
    [...((pools.byChapterBucket.get(`${chapter}:${bucketKey(draft)}`) ?? [])), ...((pools.byBucket.get(bucketKey(draft)) ?? []))],
    draft.answer,
  )
  const sameType = uniqueAnswersFromDrafts(
    [...((pools.byChapterType.get(`${chapter}:${draft.answerType}`) ?? [])), ...((pools.byType.get(draft.answerType) ?? []))],
    draft.answer,
  )
  const fallbackType = BUCKET_FALLBACK_TYPE[bucketKey(draft)]
  const fallbackPool = fallbackType && fallbackType !== draft.answerType
    ? uniqueAnswersFromDrafts(
        [...((pools.byChapterType.get(`${chapter}:${fallbackType}`) ?? [])), ...((pools.byType.get(fallbackType) ?? []))],
        draft.answer,
      )
    : []
  // 同章回退：当小桶/同类都不足时，用同章其他答案补足，保证不跨章混杂。
  const sameChapter = uniqueAnswersFromDrafts(
    pools.all.filter((item) => (item.chapter ?? 'general') === chapter),
    draft.answer,
  )
  const all = uniqueAnswersFromDrafts(pools.all, draft.answer)

  const picks = []
  picks.push(...takeAnswers(sameBucket, Math.min(3, sameBucket.length), `${seedText}:same-bucket`))
  if (picks.length < 3) {
    picks.push(...takeAnswers(fallbackPool.filter((answer) => !picks.includes(answer)), Math.min(3 - picks.length, fallbackPool.length), `${seedText}:fallback-type`))
  }
  if (picks.length < 3) {
    picks.push(...takeAnswers(sameType.filter((answer) => !picks.includes(answer)), 3 - picks.length, `${seedText}:same-type`))
  }
  if (picks.length < 3) {
    picks.push(...takeAnswers(sameChapter.filter((answer) => !picks.includes(answer)), 3 - picks.length, `${seedText}:same-chapter`))
  }
  if (picks.length < 3) {
    picks.push(...takeAnswers(all.filter((answer) => !picks.includes(answer)), 3 - picks.length, `${seedText}:fallback`))
  }

  const distractors = picks.slice(0, 3)
  const sameBucketLike = [...sameBucket, ...fallbackPool, ...sameType]
  return {
    distractors,
    sameBucketDistractorCount: distractors.filter((answer) => sameBucketLike.includes(answer)).length,
    sameTypeDistractorCount: distractors.filter((answer) => sameType.includes(answer) || fallbackPool.includes(answer)).length,
  }
}

function auditDraftQuestion(draft, distractors, sameBucketDistractorCount, sameTypeDistractorCount) {
  const flags = []
  const options = [draft.answer, ...distractors]
  if (draft.confidence < LOW_CONFIDENCE_THRESHOLD) {
    flags.push({ severity: 'critical', code: 'low-confidence', message: '草稿置信度低于入库阈值。' })
  }
  if (distractors.length !== 3) {
    flags.push({ severity: 'critical', code: 'missing-distractors', message: '未能生成 3 个干扰项。' })
  }
  // 同语义类型（answerType）干扰项少于 2 个：选项类型混杂，代回题干易荒谬。
  if (sameTypeDistractorCount < 2) {
    flags.push({ severity: 'red', code: 'semantic-type-too-small', message: '同语义类型干扰项少于 2 个。' })
  }
  if (draft.kind === 'blank' && !draft.stem.includes('____')) {
    flags.push({ severity: 'critical', code: 'blank-missing', message: '挖空题题干缺少空格占位。' })
  }
  if (options.some((option) => countVisibleCharacters(option) > 32)) {
    flags.push({ severity: 'red', code: 'long-option', message: '答案或干扰项过长，需要人工确认可读性。' })
  }
  if (options.some((option) => !quoteIsBalanced(option))) {
    flags.push({ severity: 'red', code: 'unbalanced-quote', message: '选项存在引号或书名号不平衡。' })
  }
  if (options.some((option) => /____|。$|，$|；$/.test(option))) {
    flags.push({ severity: 'red', code: 'fragment-option', message: '选项疑似半截句或残留题干符号。' })
  }
  return flags
}

function makeQuestion(draft, index, pools) {
  const manualDistractors = MANUAL_DISTRACTORS.get(draft.stem)
  let distractors, sameBucketDistractorCount, sameTypeDistractorCount

  if (manualDistractors) {
    distractors = manualDistractors
    sameBucketDistractorCount = manualDistractors.length
    sameTypeDistractorCount = manualDistractors.length
  } else {
    const result = pickTypedDistractors(
      draft,
      pools,
      `${draft.chapter ?? 'general'}:${index}:${draft.answer}`,
    )
    distractors = result.distractors
    sameBucketDistractorCount = result.sameBucketDistractorCount
    sameTypeDistractorCount = result.sameTypeDistractorCount
  }

  const options = shuffle([draft.answer, ...distractors], `${draft.chapter ?? 'general'}:${index}:options`)
  const correctKey = String.fromCharCode(65 + options.indexOf(draft.answer))

  const question = {
    id: `cmh-${String(index + 1).padStart(3, '0')}`,
    sourceNumber: index + 1,
    subjectId: SUBJECT_ID,
    type: 'single',
    stem: draft.stem,
    options: options.map((text, optionIndex) => ({
      key: String.fromCharCode(65 + optionIndex),
      text,
    })),
    correctAnswers: [correctKey],
    explanation: draft.explanation ?? draft.sourceText,
  }

  if (draft.chapter) question.tags = [draft.chapter]
  const flags = auditDraftQuestion(draft, distractors, sameBucketDistractorCount, sameTypeDistractorCount)
  return {
    question,
    reviewItem: flags.length
      ? {
          draftNumber: index + 1,
          questionId: question.id,
          chapter: draft.chapter,
          sourceText: draft.sourceText,
          stem: question.stem,
          answerText: draft.answer,
          answerType: draft.answerType,
          answerSubtype: draft.answerSubtype,
          templateId: draft.templateId,
          confidence: draft.confidence,
          flags,
        }
      : null,
  }
}

function parseDocQuestions() {
  const rawText = readWordText(DOC_FILE)
  const text = rawText.replace(/\r/g, '').replace(/\f/g, '\n').replace(/[\u200b-\u200d\u2060\ufeff]/g, '')
  const starts = [...text.matchAll(/(?:^|\n)\s*(\d{1,3})，\s*/g)]
  const questions = []

  for (let index = 0; index < starts.length; index += 1) {
    const start = (starts[index].index ?? 0) + starts[index][0].length
    const end = index + 1 < starts.length ? starts[index + 1].index ?? text.length : text.length
    const body = text.slice(start, end).trim()
    const answerMatch = body.match(/\(\s*([A-D])\s*\)/) ?? body.match(/答案[：:\s]*([A-D])/i)
    if (!answerMatch) continue

    const optionMatches = [...body.matchAll(/(?:^|\s)([A-D])\s*[，,]\s*/g)]
    if (optionMatches.length < 2) throw new Error(`第 ${index + 1} 题无法识别选项`)

    const stem = compact(
      body
        .slice(0, optionMatches[0].index)
        .replace(/\(\s*[A-D]\s*\)/, '')
        .replace(/（多选题）/g, ''),
    ).replace(/[。．]$/, '')
    const options = optionMatches.map((match, optionIndex) => {
      const optionStart = (match.index ?? 0) + match[0].length
      const optionEnd = optionIndex + 1 < optionMatches.length ? optionMatches[optionIndex + 1].index ?? body.length : body.length
      return {
        key: String.fromCharCode(65 + optionIndex),
        text: compact(body.slice(optionStart, optionEnd).replace(/\n\s*[一二三四]，.*$/s, '')),
      }
    })
    const answerKey = answerMatch[1].trim().toUpperCase()
    const correctOption = options.find((option) => option.key === answerKey)
    if (!correctOption) throw new Error(`第 ${index + 1} 题答案不在选项内`)

    questions.push({
      id: `cmh-doc-${String(index + 1).padStart(3, '0')}`,
      sourceNumber: index + 1,
      subjectId: SUBJECT_ID,
      type: 'single',
      stem,
      options,
      correctAnswers: [answerKey],
      explanation: `原题答案：${answerKey}，${correctOption.text}。`,
    })
  }

  return questions
}

function makeBlankDraft(chapter, sourceText, stem, answer, explanation = sourceText) {
  const cleanStem = compact(stem)
  const cleanAnswer = compact(answer)
  return {
    kind: 'blank',
    sourceType: 'docx-summary',
    chapter,
    sourceText,
    stem: cleanStem,
    answer: cleanAnswer,
    answerText: cleanAnswer,
    explanation,
    ...classifyDraft(cleanStem, cleanAnswer, sourceText, 'blank'),
  }
}

function makeStatementDraft(chapter, sourceText, answer, explanation = sourceText) {
  const cleanAnswer = compact(answer)
  const stem = `下列关于${chapter ?? '中国近现代史纲要'}的说法中，正确的是____。`
  return {
    kind: 'statement',
    sourceType: 'docx-summary',
    chapter,
    sourceText,
    stem,
    answer: cleanAnswer,
    answerText: cleanAnswer,
    explanation,
    ...classifyDraft(stem, cleanAnswer, sourceText, 'statement'),
  }
}

function extractDocxDrafts(line, chapter) {
  const sourceText = line
  const normalized = compact(line)
  if (!normalized || CHAPTER_TITLES.has(normalized)) return []

  const exact = (needle, stem, answer, explanation = sourceText) => {
    if (normalized !== needle) return null
    return [makeBlankDraft(chapter, sourceText, stem, answer, explanation)]
  }

  const exactStatement = (needle, answer, explanation = sourceText) => {
    if (normalized !== needle) return null
    return [makeStatementDraft(chapter, sourceText, answer, explanation)]
  }

  if (normalized === '第一次火烧圆明园的侵略军是第二次鸦片战争时的英法联军，第二次是八国联军') {
    return [
      makeBlankDraft(chapter, sourceText, '第一次火烧圆明园的侵略军是____。', '第二次鸦片战争时的英法联军'),
      makeBlankDraft(chapter, sourceText, '第二次火烧圆明园的侵略军是____。', '八国联军'),
    ]
  }

  const exactRules = [
    ['中国近代社会的起点标志是鸦片战争', '中国近代社会的起点标志是____。', '鸦片战争'],
    ['近代操纵了中国政治、经济命脉，日益成为支配中国的决定性力量是资本-帝国主义', '近代操纵了中国政治、经济命脉，日益成为支配中国的决定性力量是____。', '资本-帝国主义'],
    ['近代中国成为奴役人民的社会基础和统治支柱的是封建阶级', '近代中国成为奴役人民的社会基础和统治支柱的是____。', '封建阶级'],
    ['我国与列强签订的第一个不平等条约是南京条约', '我国与列强签订的第一个不平等条约是____。', '南京条约'],
    ['林则徐是中国近代睁眼看世界的第一人', '____是中国近代睁眼看世界的第一人。', '林则徐'],
    ['提出同西方国家进行商战，设立议院思想的人是郑观应', '提出同西方国家进行商战，设立议院思想的人是____。', '郑观应'],
    ['孙中山提出“振兴中华”的口号', '____提出“振兴中华”的口号。', '孙中山'],
    ['标志着以慈禧太后为首的清政府彻底放弃抵抗外国侵略者的事件是《辛丑条约》的签订', '标志着以慈禧太后为首的清政府彻底放弃抵抗外国侵略者的事件是____。', '《辛丑条约》的签订'],
    ['《马关条约》含有强迫清政府把台湾割让给日本', '____含有强迫清政府把台湾割让给日本。', '《马关条约》'],
    ['割占我国九龙半岛的不平等条约是《北京条约》', '割占我国九龙半岛的不平等条约是____。', '《北京条约》'],
    ['从中国攫取一百多万平方公里土地，在第二次鸦片战争中获利最大的国家是俄国', '从中国攫取一百多万平方公里土地，在第二次鸦片战争中获利最大的国家是____。', '俄国'],
    ['1898年把山东划分给帝国主义国家德国的势力范围', '1898年把山东划分给帝国主义国家____的势力范围。', '德国'],
    ['1898年把长江流域划分给帝国主义国家英国的势力范围', '1898年把长江流域划分给帝国主义国家____的势力范围。', '英国'],
    ['1898年把广东、广西、云南划分给帝国主义国家法国的势力范围', '1898年把广东、广西、云南划分给帝国主义国家____的势力范围。', '法国'],
    ['1898年把福建划分给帝国主义国家日本的势力范围', '1898年把福建划分给帝国主义国家____的势力范围。', '日本'],
    ['1898年把长城以北划分给帝国主义国家俄国的势力范围', '1898年把长城以北划分给帝国主义国家____的势力范围。', '俄国'],
    ['第一次火烧圆明园的侵略军是第二次鸦片战争时的英法联军', '第一次火烧圆明园的侵略军是____。', '第二次鸦片战争时的英法联军'],
    ['英国人赫德掌握中国海关大权40余年', '掌握中国海关大权40余年的是____。', '英国人赫德'],
    ['在中法战争期间指挥清军获得镇南关大捷的爱国将领是冯子材', '在中法战争期间指挥清军获得镇南关大捷的爱国将领是____。', '冯子材'],
    ['在甲午中日战争中英勇殉国的爱国将领是邓世昌', '在甲午中日战争中英勇殉国的爱国将领是____。', '邓世昌'],
    ['甲午战争之后中华民族面临生死存亡关头，开始普遍有了民族意识的觉醒', '甲午战争之后中华民族面临生死存亡关头，开始普遍有了____的觉醒。', '民族意识'],
    ['《天朝田亩制度》能比较典型的反映太平天国农民政权特点', '____能比较典型地反映太平天国农民政权特点。', '《天朝田亩制度》'],
    ['天京事变是太平天国由盛转衰的标志', '天京事变是太平天国由盛转衰的____。', '标志'],
    ['太平天国政权失败的根本原因是农民阶级的局限性', '太平天国政权失败的根本原因是____。', '农民阶级的局限性'],
    ['太平天国运动面对中国历史上历次农民战争所不曾有的新情况，即中外反动势力的联合镇压', '太平天国运动面对中国历史上历次农民战争所不曾有的新情况，即____。', '中外反动势力的联合镇压'],
    ['洋务运动失败的标志是北洋水师的覆灭', '洋务运动失败的标志是____。', '北洋水师的覆灭'],
    ['洪仁玕的《资政新篇》能与当时世界历史潮流同步', '____能与当时世界历史潮流同步。', '洪仁玕的《资政新篇》'],
    ['严复最早向中国介绍西方进化论', '____最早向中国介绍西方进化论。', '严复'],
    ['康有为是清末倡议变法的维新派领袖', '____是清末倡议变法的维新派领袖。', '康有为'],
    ['太平天国政权对儒家思想的态度是先全盘否定后来保留其封建纲常', '太平天国政权对儒家思想的态度是____。', '先全盘否定后来保留其封建纲常'],
    ['太平天国最高领导者是洪秀全', '太平天国最高领导者是____。', '洪秀全'],
    ['太平天国定都于南京', '太平天国定都于____。', '南京'],
    ['洋务派认为清王朝的“心腹之害”是太平天国和捻军', '洋务派认为清王朝的“心腹之害”是____。', '太平天国和捻军'],
    ['清政府的海上主力是北洋军师', '清政府的海上主力是____。', '北洋水师', '清政府的海上主力是____。'],
    ['维新派代表了资产阶级的利益和要求', '维新派代表了____的利益和要求。', '资产阶级'],
    ['在维新派推动下实行“戊戌变法”的清帝是光绪皇帝', '在维新派推动下实行“戊戌变法”的清帝是____。', '光绪皇帝'],
    ['近代中国第一个比较系统的发展资本主义的方案是《资政新篇》', '近代中国第一个比较系统的发展资本主义的方案是____。', '《资政新篇》'],
    ['最早对兴办洋务运动的指导思想做出完整表述的是冯桂芬', '最早对兴办洋务运动的指导思想做出完整表述的是____。', '冯桂芬'],
    ['戊戌维新运动是一次资产阶级改革运动', '戊戌维新运动是一次____改革运动。', '资产阶级'],
    ['戊戌维新运动中维新派主张建立的政治制度是君主立宪制', '戊戌维新运动中维新派主张建立的政治制度是____。', '君主立宪制'],
    ['提出“三纲四维之道不可变”，“择西学之可以补吾阙者用之”的主张是洋务派', '提出“三纲四维之道不可变”，“择西学之可以补吾阙者用之”的主张是____。', '洋务派'],
    ['戊戌维新时期，维新派在上海创办的影响较大的报刊是《时务报》', '戊戌维新时期，维新派在上海创办的影响较大的报刊是____。', '《时务报》'],
    ['洋务运动指导思想是中体西用', '洋务运动指导思想是____。', '中体西用'],
    ['清末维新派的目的是在中国建立起资产阶级君主立宪制', '清末维新派的目的是在中国建立起____。', '资产阶级君主立宪制'],
    ['戊戌维新运动兴起的社会物资条件是中国民族资本主义的初步发展', '戊戌维新运动兴起的社会物资条件是____。', '中国民族资本主义的初步发展'],
    ['科举制度是清政府在清末“新政”活动中废除的', '科举制度是清政府在清末“新政”活动中____。', '废除的'],
    ['辛亥革命的中坚力量是留学生为骨干的青年知识分子', '辛亥革命的中坚力量是____。', '留学生为骨干的青年知识分子'],
    ['近代中国第一个领导资产阶级革命的全国性政党是同盟会', '近代中国第一个领导资产阶级革命的全国性政党是____。', '同盟会'],
    ['中国历史上第一个具有资产阶级共和国性质的法典是《中华民国临时约法》', '中国历史上第一个具有资产阶级共和国性质的法典是____。', '《中华民国临时约法》'],
    ['辛亥革命和戊戌维新运动失败的共同原因是不能依靠和发动人民群众', '辛亥革命和戊戌维新运动失败的共同原因是____。', '不能依靠和发动人民群众'],
    ['新文化运动兴起的标志是陈独秀在上海创办《青年杂志》', '新文化运动兴起的标志是____。', '陈独秀在上海创办《青年杂志》'],
    ['清末“预备立宪”的根本目的在于延续清政府的统治', '清末“预备立宪”的根本目的在于____。', '延续清政府的统治'],
    ['孙中山建立的第一个资产阶级革命团体是兴中会', '孙中山建立的第一个资产阶级革命团体是____。', '兴中会'],
    ['热情讴歌革命的文章《革命军》的作者是邹容', '热情讴歌革命的文章《革命军》的作者是____。', '邹容'],
    ['资产阶级革命政党中国同盟会的机关报是《民报》', '资产阶级革命政党中国同盟会的机关报是____。', '《民报》'],
    ['1911年4月在广州发生的起义之所以被称为“黄花岗起义”是因为起牺牲的烈士被葬在黄花岗', '1911年4月在广州发生的起义之所以被称为“黄花岗起义”是因为起牺牲的烈士被葬在____。', '黄花岗'],
    ['袁世凯暗杀了国民党领袖宋教仁后，孙中山发动了“二次革命”', '袁世凯暗杀了国民党领袖宋教仁后，孙中山发动了____。', '“二次革命”'],
    ['为了让对方支持他复辟帝制，袁世凯与日本签订了严重丧权辱国的“二十一条”', '为了让对方支持他复辟帝制，袁世凯与日本签订了严重丧权辱国的____。', '“二十一条”'],
    ['1917年悍然拥立废帝溥仪，复辟清朝的封建军阀是张勋', '1917年悍然拥立废帝溥仪，复辟清朝的封建军阀是____。', '张勋'],
    ['组织“护国军”，发起护国运动的人是蔡锷', '组织“护国军”，发起护国运动的人是____。', '蔡锷'],
    ['革命派和改良派论证的焦点是要不要以革命的手段推翻清王朝', '革命派和改良派论证的焦点是要不要以____的手段推翻清王朝。', '革命'],
    ['引起20世纪中国第一次历史性巨变的重大事件是辛亥革命', '引起20世纪中国第一次历史性巨变的重大事件是____。', '辛亥革命'],
    ['1904-1905年，为了争夺在华利益而在中国东北进行战争的帝国主义国家是日本和俄国', '1904-1905年，为了争夺在华利益而在中国东北进行战争的帝国主义国家是____。', '日本和俄国'],
    ['我国科举制度正式废除于1906年', '我国科举制度正式废除于____。', '1906年'],
    ['1911年4月，资产阶级革命派在黄兴的带领下举行了黄花岗起义', '1911年4月，资产阶级革命派在____的带领下举行了黄花岗起义。', '黄兴'],
    ['1911年爆发的保路运动中，规模最大、斗争最激烈的省份是四川', '1911年爆发的保路运动中，规模最大、斗争最激烈的省份是____。', '四川'],
    ['新文化运动的基本口号是民主与科学', '新文化运动的基本口号是____。', '民主与科学'],
    ['宣传新文化的主要刊物是《新青年》', '宣传新文化的主要刊物是____。', '《新青年》'],
    ['五四运动的直接导火索是巴黎和会上中国的外交失败', '五四运动的直接导火索是____。', '巴黎和会上中国的外交失败'],
    ['“问题与主义”争论的双方主要代表人物是李大钊和胡适', '“问题与主义”争论的双方主要代表人物是____和胡适。', '李大钊'],
    ['中国共产党就国共合作的方针和方法做出正确的决定是在中共“三大”', '中国共产党就国共合作的方针和方法做出正确的决定是在____。', '中共“三大”'],
    ['第一次国共合作形成的标志是国民党“一大”', '第一次国共合作形成的标志是____。', '国民党“一大”'],
    ['中共创立时领导人是陈独秀', '中共创立时领导人是____。', '陈独秀'],
    ['初期新文化运动的实质是资产阶级民主主义运动', '初期新文化运动的实质是____。', '资产阶级民主主义运动'],
    ['中国工人阶级以独立的姿态登上政治舞台是五四运动时期', '中国工人阶级以独立的姿态登上政治舞台是____。', '五四运动时期'],
    ['大革命开始的革命根据地在广东', '大革命开始的革命根据地在____。', '广东'],
    ['《共产党宣言》第一个中文全译本的译者是陈望道', '《共产党宣言》第一个中文全译本的译者是____。', '陈望道'],
    ['在新文化运动中率先举起马克思主义旗帜的是李大钊', '在新文化运动中率先举起马克思主义旗帜的是____。', '李大钊'],
    ['中国工人运动第一次高潮起点的标志是香港海员罢工', '中国工人运动第一次高潮起点的标志是____。', '香港海员罢工'],
    ['中国新民主主义革命的开端是五四运动', '中国新民主主义革命的开端是____。', '五四运动'],
    ['中国共产党第一次提出反帝反封建的民主革命的纲领是在1922年召开的中共二大', '中国共产党第一次提出反帝反封建的民主革命的纲领是在____召开的中共二大。', '1922年'],
    ['中国第一个农民协会诞生于浙江萧山县', '中国第一个农民协会诞生于____。', '浙江萧山县'],
    ['国民革命时期，国民政府聘请了苏联的政治顾问鲍罗廷', '国民革命时期，国民政府聘请了苏联的政治顾问____。', '鲍罗廷'],
    ['中国共产党独立领导革命战争，创建人民军队和武装夺取政权的开端是南昌起义', '中国共产党独立领导革命战争，创建人民军队和武装夺取政权的开端是____。', '南昌起义'],
    ['在大革命失败的危急关头，中共八七会议确定总方针是土地革命和武装反抗国民党反动统治', '在大革命失败的危急关头，中共八七会议确定总方针是____。', '土地革命和武装反抗国民党反动统治'],
    ['毛泽东在1927年中共八七会议上提出著名论断是须知政权是由枪杆子中取得的', '毛泽东在1927年中共八七会议上提出著名论断是____。', '须知政权是由枪杆子中取得的'],
    ['八七会议和遵义会议相同之处挽救了党和中国革命', '八七会议和遵义会议的相同之处是____。', '挽救了党和中国革命'],
    ['张学良宣布“东北易帜”使国民党在全国范围内建立了自己的统治', '张学良宣布____使国民党在全国范围内建立了自己的统治。', '“东北易帜”'],
    ['中国共产党开辟的第一个农村革命根据地是井冈山', '中国共产党开辟的第一个农村革命根据地是____。', '井冈山'],
    ['1931年11月在江西省瑞金县成立的红色政权是中华苏维埃共和国临时中央政府', '1931年11月在江西省瑞金县成立的红色政权是____。', '中华苏维埃共和国临时中央政府'],
    ['土地革命战争时期，中国共产党开辟的“中国革命的新道路”是指农村包围城市，武装夺取政权', '土地革命战争时期，中国共产党开辟的“中国革命的新道路”是指____。', '农村包围城市，武装夺取政权'],
    ['国共十年对峙时期，中共得到农民的衷心拥护原因是进行了土地革命', '国共十年对峙时期，中共得到农民的衷心拥护原因是进行了____。', '土地革命'],
    ['1927年9月，毛泽东领导的武装起义时秋收起义', '1927年9月，毛泽东领导的武装起义是____。', '秋收起义'],
    ['标志毛泽东思想初步形成的是农村包围城市，武装夺取政权理论的提出', '标志毛泽东思想初步形成的是____。', '农村包围城市，武装夺取政权理论的提出'],
    ['左翼文化运动中，被称为“文化新军的最伟大和最英勇的旗手”的中国文化革命伟人是鲁迅', '左翼文化运动中，被称为“文化新军的最伟大和最英勇的旗手”的中国文化革命伟人是____。', '鲁迅'],
    ['土地革命战争时期“左”倾错误党中央占据统治地位的有三次', '土地革命战争时期“左”倾错误党中央占据统治地位的有____。', '三次'],
    ['1936年10月，在甘肃会宁、静宁将台堡胜利会师的三大主力红军是红一、二、四方面军', '1936年10月，在甘肃会宁、静宁将台堡胜利会师的三大主力红军是____。', '红一、二、四方面军'],
    ['红军长征途中，中国共产党召开的、成为党的历史上生死攸关的转折点的会议是遵义会议', '红军长征途中，中国共产党召开的、成为党的历史上生死攸关的转折点的会议是____。', '遵义会议'],
    ['中国共产党在长征途中召开的遵义会议，集中解决了当时具有决定意义的军事问题和组织问题', '中国共产党在长征途中召开的遵义会议，集中解决了当时具有决定意义的____和组织问题。', '军事问题'],
    ['在土地革命战争时期，毛泽东阐明了坚持辩证唯物主义的思想路线即坚持理论与实际相结合的原则的极端重要性，并提出“没有调查，没有发言权”重要思想的著作是《反对本本主义》', '在土地革命战争时期，毛泽东提出“没有调查，没有发言权”重要思想的著作是____。', '《反对本本主义》'],
    ['在土地革命战争时期，提出坚决打击富农和“地主不分田，富农分坏田”的主张是王明', '在土地革命战争时期，提出坚决打击富农和“地主不分田，富农分坏田”的主张是____。', '王明'],
    ['中国革命之所以能够得到坚持和发展，根本原因是中国共产党紧紧依靠了农民，领导农民进行了土地制度的革命', '中国革命之所以能够得到坚持和发展，根本原因是中国共产党紧紧依靠了农民，领导农民进行了____。', '土地制度的革命'],
    ['局部抗日战争开始于九一八事变', '局部抗日战争开始于____。', '九一八事变'],
    ['华北事变发生后，中国共产党组织领导的一二九运动标志着中国人民抗日救亡新高潮的到来', '华北事变发生后，中国共产党组织领导的____标志着中国人民抗日救亡新高潮的到来。', '一二九运动'],
    ['大革命时期的统一战线和抗日民族的统一战线皆有各阶级阶层广泛参加', '大革命时期的统一战线和抗日民族统一战线____。', '皆有各阶级阶层广泛参加'],
    ['抗日民族统一战线形成的标志是国民党中央通讯社播发《中国共产党为公布国公合作宣言》', '抗日民族统一战线形成的标志是国民党中央通讯社播发____。', '《中国共产党为公布国公合作宣言》'],
    // 国民政府正式对日宣战实为1941年12月9日（珍珠港事件后），源文"七七事变后"史实存疑，暂下线待人工补题。
    ['国共两党十年内战基本结束，国内和平基本实现的标志是西安事变的和平解决', '国共两党十年内战基本结束，国内和平基本实现的标志是____。', '西安事变的和平解决'],
    ['毛泽东在《论持久战》中指出，中国抗日战争取得最后胜利的最为关键的阶段是战略相持阶段', '毛泽东在《论持久战》中指出，中国抗日战争取得最后胜利的最为关键的阶段是____。', '战略相持阶段'],
    ['全国性抗战开始于七七事变', '全国性抗战开始于____。', '七七事变'],
    ['全面抗战爆发后，中国军队的第一次重大胜利是平型关大捷', '全面抗战爆发后，中国军队的第一次重大胜利是____。', '平型关大捷'],
    ['共产党在同顽固派作斗争时应坚持有理有利有节的原则', '共产党在同顽固派作斗争时应坚持____的原则。', '有理有利有节'],
    ['1938年10月，日本侵略军占领了广州、武汉后改变了侵华战略方针，这主要是因为日军战线太长，兵力和财力不足', '1938年10月，日本侵略军占领了广州、武汉后改变了侵华战略方针，这主要是因为____。', '日军战线太长，兵力和财力不足'],
    ['抗战转入相持阶段是在日本占领广州、武汉后', '抗战转入相持阶段是在日本占领____后。', '广州、武汉'],
    ['中国共产党在抗日战争时期视星等土地政策是减租减息', '中国共产党在抗日战争时期实行的土地政策是____。', '减租减息'],
    ['抗日战争时期，根据地政权的民主建设主要体现为实行“三三制”的原则', '抗日战争时期，根据地政权的民主建设主要体现为实行____的原则。', '“三三制”'],
    ['中国共产党第一次提出“马克思主义中国化”的命题和任务的会议是中共六届六中全会', '中国共产党第一次提出“马克思主义中国化”的命题和任务的会议是____。', '中共六届六中全会'],
    ['1938年3月，国民党军队在正面战场取得大捷是台儿庄战役', '1938年3月，国民党军队在正面战场取得大捷是____。', '台儿庄战役'],
    ['抗战后期国民党军队在豫湘桂战役中再次大溃败', '抗战后期国民党军队在____中再次大溃败。', '豫湘桂战役'],
    ['国民党军队在皖南事变中袭击了共产党领导的新四军的抗日武装', '国民党军队在皖南事变中袭击了共产党领导的____。', '新四军'],
    ['1937年8月，中国共产党在陕北洛川召开的政治局扩大会议制定了抗日救国十大纲领', '1937年8月，中国共产党在陕北洛川召开的政治局扩大会议制定了____。', '抗日救国十大纲领'],
    ['1945年7月，同盟国敦促日本无条件投降的会议是波茨坦会议', '1945年7月，同盟国敦促日本无条件投降的会议是____。', '波茨坦会议'],
    ['1945年中国成为联合国的创始国和五个常任理事国之一', '1945年中国成为联合国的____和五个常任理事国之一。', '创始国'],
    ['中国人民抗日战争胜利纪念日是9月3日', '中国人民抗日战争胜利纪念日是____。', '9月3日'],
    ['中国政府在台湾举行受降仪式，台湾以及澎湖列岛由中国收回', '台湾以及澎湖列岛由____收回。', '中国'],
    ['中共六届六中全会上明确提出实现“马克思主义中国化”命题是毛泽东', '中共六届六中全会上明确提出实现“马克思主义中国化”命题是____。', '毛泽东'],
    ['把毛泽东思想确定为党的指导思想的会议是中共七大', '把毛泽东思想确定为党的指导思想的会议是____。', '中共七大'],
    ['20世纪40年代，中国共产党开展的延安整风运动最主要的任务是反对主观主义', '20世纪40年代，中国共产党开展的延安整风运动最主要的任务是反对____。', '主观主义'],
    ['抗战胜利后，中国人民的根本利益是为建立新中国而奋斗', '抗战胜利后，中国人民的根本利益是____。', '为建立新中国而奋斗'],
    ['抗日战争结束后，中国社会主要矛盾是中国人民同国民党反动派之间的矛盾', '抗日战争结束后，中国社会主要矛盾是中国人民同____之间的矛盾。', '国民党反动派'],
    ['抗战胜利后，美国在中国追求的短期目标首先是避免共产党完全控制中国', '抗战胜利后，美国在中国追求的短期目标首先是____。', '避免共产党完全控制中国'],
    ['抗战胜利后，美国在中国追求的长期的基本目标是推动建立一个统一的亲美政府', '抗战胜利后，美国在中国追求的长期的基本目标是推动建立一个____。', '统一的亲美政府'],
    ['1945年，重庆谈判的焦点问题是人民军队和解放区的合法地位问题', '1945年，重庆谈判的焦点问题是____。', '人民军队和解放区的合法地位问题'],
    ['1945年10月10日，国共双方签署了双十协定，确定的基本方针是和平建国', '1945年10月10日，国共双方签署了双十协定，确定的基本方针是____。', '和平建国'],
    ['1946年，政治协商会议确定的最高国务机关是政府委员会', '1946年，政治协商会议确定的最高国务机关是____。', '政府委员会'],
    ['1946年，政治协商会议确定的最高行政机关是行政院', '1946年，政治协商会议确定的最高行政机关是____。', '行政院'],
    ['1946年，政治协商会议确定的最高立法机关是立法院', '1946年，政治协商会议确定的最高立法机关是____。', '立法院'],
    ['1946年，政协闭幕第二天，中共中央发出党内指示“从此中国即走上了和平民主建设的新阶段”，国内问题的解决方式是政治方式', '1946年，政协闭幕第二天，中共中央发出党内指示“从此中国即走上了和平民主建设的新阶段”，国内问题的解决方式是____。', '政治方式'],
    ['全面内战爆发的标志是国民党军队大举进攻中原解放区', '全面内战爆发的标志是国民党军队大举进攻____。', '中原解放区'],
    ['全面内战爆发，“煮豆燃豆萁，相煎何太急”更接近事实本质', '全面内战爆发，“煮豆燃豆萁，相煎何太急”更接近____。', '事实本质'],
    ['1946年6月-1947年6月，人民军队处于战略防御阶段，战争区域是解放区', '1946年6月-1947年6月，人民军队处于战略防御阶段，战争区域是____。', '解放区'],
    ['1947年6月，中国人民解放军开始实行战略进攻的战略意图是由内线作战转向至外线作战', '1947年6月，中国人民解放军开始实行战略进攻的战略意图是由____。', '内线作战转向至外线作战'],
    ['1947年，刘邓大军挺进中原的重大意义在于改变解放战争的重要态势', '1947年，刘邓大军挺进中原的重大意义在于____。', '改变解放战争的重要态势'],
    ['1946年5月4日，中共中央发出《五四指示》所决定的土地政策是耕者有其田', '1946年5月4日，中共中央发出《五四指示》所决定的土地政策是____。', '耕者有其田'],
    ['1947年中共中央召开全国土地会议，制订了《中国土地法大纲》的地点是河北平山县', '1947年中共中央召开全国土地会议，制订了《中国土地法大纲》的地点是____。', '河北平山县'],
    ['1947年制订的《中国土地法大纲》规定没收地主的土地', '1947年制订的《中国土地法大纲》规定____。', '没收地主的土地'],
    ['中国共产党得到农民衷心拥护原因是进行了土地革命', '中国共产党得到农民衷心拥护原因是进行了____。', '土地革命'],
    ['解放战争时期，国民党统治区人民民主运动高涨的根本原因是蒋介石国民党政府的经济崩溃和政治危机', '解放战争时期，国民党统治区人民民主运动高涨的根本原因是____。', '蒋介石国民党政府的经济崩溃和政治危机'],
    ['1945年年底爆发的一二一运动，昆明学生提出的口号是“反对内战，争取自由”', '1945年年底爆发的一二一运动，昆明学生提出的口号是____。', '“反对内战，争取自由”'],
    ['对解放战争时期反蒋斗争第二条战线的准确描述是国统区的人民民主运动', '对解放战争时期反蒋斗争第二条战线的准确描述是____。', '国统区的人民民主运动'],
    ['解放战争时期，中间路线鼓吹者所主张的道路实质上是旧民主主义道路', '解放战争时期，中间路线鼓吹者所主张的道路实质上是____。', '旧民主主义道路'],
    ['解放战争时期，最早与蒋介石集团决裂的民主党派是中国民主同盟', '解放战争时期，最早与蒋介石集团决裂的民主党派是____。', '中国民主同盟'],
    ['1947年10月，被国民党当局宣布为“非法团体”的是中国民主同盟', '1947年10月，被国民党当局宣布为“非法团体”的是____。', '中国民主同盟'],
    ['宋庆龄为名誉主席的民主党派是中国国民党革命委员会', '宋庆龄为名誉主席的民主党派是____。', '中国国民党革命委员会'],
    ['标志着民盟站在新民主主义革命的立场上来的会议是民盟一届三中全会', '标志着民盟站在新民主主义革命的立场上来的会议是____。', '民盟一届三中全会'],
    ['中国各民主党派地位根本变化的标志是参加新政协并将在新中国参政', '中国各民主党派地位根本变化的标志是____。', '参加新政协并将在新中国参政'],
    ['中国共产党领导的多党合作与政治协商制度的基本组织形式是中国人民政治协商会议', '中国共产党领导的多党合作与政治协商制度的基本组织形式是____。', '中国人民政治协商会议'],
    ['辽沈、淮海、平津三大战役进行的时间是1948年9月-1949年1月', '辽沈、淮海、平津三大战役进行的时间是____。', '1948年9月-1949年1月'],
    ['率领北平国民党军队接受和平改编的国民党将领是傅作义', '率领北平国民党军队接受和平改编的国民党将领是____。', '傅作义'],
    ['1949年4月21日，毛泽东和朱德桓发布《向全国进军的命令》', '1949年4月21日，毛泽东和朱德桓发布《____》。', '向全国进军的命令'],
    ['国民党统治覆灭的时间是1949年4月23日', '国民党统治覆灭的时间是____。', '1949年4月23日'],
    ['1949年，人民解放军占领了南京，宣告延续了22年之久的国民党反动统治覆灭了', '1949年，人民解放军占领了南京，宣告延续了22年之久的____覆灭了。', '国民党反动统治'],
    ['“钟山风雨起苍黄，百万雄师过大江……天若有情天亦老，人间正道是沧桑”是毛泽东在解放军占领南京后所做的诗', '“钟山风雨起苍黄，百万雄师过大江……天若有情天亦老，人间正道是沧桑”是____在解放军占领南京后所做的诗。', '毛泽东'],
    ['毛泽东向全党提出“两个务必”思想是在七届二中全会', '毛泽东向全党提出“两个务必”思想是在____。', '七届二中全会'],
    ['1949年6月30日，毛泽东发表了著名的《论人民民主专政》', '1949年6月30日，毛泽东发表了著名的《____》。', '论人民民主专政'],
    ['人民民主专政的基础是工人阶级，农民阶级和城市小资产阶级的联盟', '人民民主专政的基础是____的联盟。', '工人阶级，农民阶级和城市小资产阶级'],
    ['在中国共产党的领导下，中国人民推翻了三座大山，于1949年成立了中华人民共和国，这标志着新民主主义革命的胜利', '在中国共产党的领导下，中国人民推翻了三座大山，于1949年成立了____，这标志着新民主主义革命的胜利。', '中华人民共和国'],
    ['中共七届二中全会提出中国共产党的工作重心由乡村转到城市', '中共七届二中全会提出中国共产党的工作重心由____转到城市。', '乡村'],
    ['中华人民共和国成立时，《共同纲领》起临时宪法作用', '中华人民共和国成立时，《共同纲领》起____作用。', '临时宪法'],
    ['在统一战线中，我们要积极争取和扩大的是工人阶级和民族资产阶级的联盟', '在统一战线中，我们要积极争取和扩大的是____的联盟。', '工人阶级和民族资产阶级'],
    ['巩固和扩大统一战线的关键是坚持工人阶级及其政党的领导权', '巩固和扩大统一战线的关键是坚持____的领导权。', '工人阶级及其政党'],
    ['中国的武装战争实质是由工人阶级领导的农民战争', '中国的武装战争实质是由工人阶级领导的____。', '农民战争'],
    ['完成创建新中国的任务，是由中国人民政治协商会议来承担的', '完成创建新中国的任务，是由____来承担的。', '中国人民政治协商会议'],
    ['加强中国共产党的建设，首先着重党的思想建设', '加强中国共产党的建设，首先着重____。', '党的思想建设'],
    ['革命的根本问题是国家政权问题', '革命的根本问题是____问题。', '国家政权'],
  ]

  for (const [needle, stem, answer, explanation = sourceText] of exactRules) {
    if (normalized === needle) return [makeBlankDraft(chapter, sourceText, stem, answer, explanation)]
  }

  const simpleMappings = [
    [/^中国近代社会的起点标志是鸦片战争$/, '中国近代社会的起点标志是____。', '鸦片战争'],
    [/^近代操纵了中国政治、经济命脉，日益成为支配中国的决定性力量是资本-帝国主义$/, '近代操纵了中国政治、经济命脉，日益成为支配中国的决定性力量是____。', '资本-帝国主义'],
    [/^近代中国成为奴役人民的社会基础和统治支柱的是封建阶级$/, '近代中国成为奴役人民的社会基础和统治支柱的是____。', '封建阶级'],
  ]
  for (const [pattern, stem, answer] of simpleMappings) {
    if (pattern.test(normalized)) return [makeBlankDraft(chapter, sourceText, stem, answer)]
  }

  // Keep uncovered summary lines out of the published bank. They remain in
  // review-queue.json as low-confidence statement drafts for manual repair.

  if (/^《马关条约》含有强迫清政府把台湾割让给日本$/.test(normalized)) return [makeBlankDraft(chapter, sourceText, '____含有强迫清政府把台湾割让给日本。', '《马关条约》')]
  if (/^1898年把山东划分给帝国主义国家德国的势力范围$/.test(normalized)) return [makeBlankDraft(chapter, sourceText, '1898年把山东划分给帝国主义国家____的势力范围。', '德国')]
  if (/^1898年把长江流域划分给帝国主义国家英国的势力范围$/.test(normalized)) return [makeBlankDraft(chapter, sourceText, '1898年把长江流域划分给帝国主义国家____的势力范围。', '英国')]
  if (/^1898年把广东、广西、云南划分给帝国主义国家法国的势力范围$/.test(normalized)) return [makeBlankDraft(chapter, sourceText, '1898年把广东、广西、云南划分给帝国主义国家____的势力范围。', '法国')]
  if (/^1898年把福建划分给帝国主义国家日本的势力范围$/.test(normalized)) return [makeBlankDraft(chapter, sourceText, '1898年把福建划分给帝国主义国家____的势力范围。', '日本')]
  if (/^1898年把长城以北划分给帝国主义国家俄国的势力范围$/.test(normalized)) return [makeBlankDraft(chapter, sourceText, '1898年把长城以北划分给帝国主义国家____的势力范围。', '俄国')]

  if (/^1945年中国成为联合国的创始国和五个常任理事国之一$/.test(normalized)) {
    return [makeStatementDraft(chapter, sourceText, '1945年中国成为联合国的创始国和五个常任理事国之一')]
  }

  return [makeStatementDraft(chapter, sourceText, normalized)]
}

function parseDocxQuestions() {
  const rawText = readWordText(DOCX_FILE)
  const bullets = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('•'))
    .map((line) => compact(line.replace(/^•\s*/, '')))
    .filter(Boolean)

  const drafts = []
  const uncoveredLines = []
  let chapter = null

  for (const line of bullets) {
    if (CHAPTER_TITLES.has(line)) {
      chapter = line
      continue
    }
    const items = extractDocxDrafts(line, chapter)
    if (!items.length) {
      uncoveredLines.push({ chapter, line })
      continue
    }
    drafts.push(...items)
  }

  const pools = makeTypedPools(drafts)
  const results = drafts.map((draft, index) => makeQuestion(draft, index + 1, pools))
  return { drafts, results, uncoveredLines }
}

function severityRank(severity) {
  return { critical: 0, red: 1 }[severity] ?? 2
}

function buildReviewQueue(reviewItems, downlinedItems, uncoveredLines) {
  const entries = [...reviewItems, ...downlinedItems].map((item) => ({
    ...item,
    flags: [...item.flags].sort((a, b) => severityRank(a.severity) - severityRank(b.severity)),
  }))
  return { generatedAt: UPDATED_AT, uncoveredLines, reviewItems: entries }
}

function countByAnswerType(items) {
  const counts = new Map()
  for (const item of items) {
    const key = item.answerType ?? 'unknown'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Object.fromEntries([...counts.entries()].sort())
}

function updateManifest(publishedCount, docxPublishedCount, downlinedCount, reviewCount) {
  const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
  const cmh = manifest.subjects.find((subject) => subject.id === SUBJECT_ID)
  if (!cmh) throw new Error('manifest 中缺少中国近现代史纲要科目')

  cmh.bankTag = SUBJECT_BANK_TAG
  cmh.questionCount = publishedCount
  cmh.types = { single: publishedCount, multiple: 0, boolean: 0, blank: 0 }
  cmh.explanations = publishedCount
  cmh.sourceCounts = {
    docSingleChoice: 53,
    summaryDerivedSingleChoice: docxPublishedCount,
    summaryBlankQuestions: docxPublishedCount,
    reviewQueueSize: reviewCount,
    downlinedCount,
  }
  cmh.releaseNotes = [
    '重建摘要改写单选题生成逻辑：先按事实类型分桶，再按同语义桶生成干扰项。',
    `本科目仅含单选题，共 ${publishedCount} 道题（.doc 原题 53 道、摘要改写 ${docxPublishedCount} 道）。`,
    `自动审题下线 ${downlinedCount} 道低置信度题，${reviewCount} 道进入人工复核队列。`,
  ]

  manifest.bankTag = ROOT_BANK_TAG
  manifest.questionCount = manifest.subjects.reduce((sum, subject) => sum + subject.questionCount, 0)
  manifest.updatedAt = UPDATED_AT
  manifest.releaseNotes = [
    '重建中国近现代史纲要摘要改写题生成逻辑，收紧改写规则并新增自动审题与人工复核队列。',
    `近现代史纲要题库热更新至 ${publishedCount} 道单选题，旧客户端可经远端 manifest 拉取。`,
  ]

  writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifest
}

function main() {
  const docQuestions = parseDocQuestions()
  const { drafts, results, uncoveredLines } = parseDocxQuestions()

  const publishedPairs = []
  const reviewItems = []
  const downlinedItems = []

  for (const { question, reviewItem } of results) {
    const isCritical = reviewItem?.flags.some((flag) => flag.severity === 'critical')
    if (isCritical) {
      const draftNumber = reviewItem.draftNumber
      const droppedId = `cmh-dropped-${String(draftNumber).padStart(3, '0')}`
      downlinedItems.push({ ...reviewItem, questionId: droppedId, downlined: true })
      continue
    }
    publishedPairs.push({ question, reviewItem })
    if (reviewItem) reviewItems.push(reviewItem)
  }

  const questions = [...docQuestions, ...publishedPairs.map((pair) => pair.question)]
  questions.forEach((question, index) => {
    question.sourceNumber = index + 1
    question.id = `cmh-${String(index + 1).padStart(3, '0')}`
  })

  const docCount = docQuestions.length
  for (let index = 0; index < publishedPairs.length; index += 1) {
    const pair = publishedPairs[index]
    if (pair.reviewItem) {
      pair.reviewItem.questionId = questions[docCount + index].id
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(questions, null, 2)}\n`, 'utf8')
  writeFileSync(DRAFTS_FILE, `${JSON.stringify({ generatedAt: UPDATED_AT, drafts }, null, 2)}\n`, 'utf8')
  writeFileSync(
    REVIEW_QUEUE_FILE,
    `${JSON.stringify(buildReviewQueue(reviewItems, downlinedItems, uncoveredLines), null, 2)}\n`,
    'utf8',
  )

  const manifest = updateManifest(
    questions.length,
    publishedPairs.length,
    downlinedItems.length,
    reviewItems.length + downlinedItems.length,
  )

  console.log(`已生成 ${questions.length} 道中国近现代史纲要单选题。`)
  console.log(`来源：.doc ${docQuestions.length} 题，.docx 摘要改写入库 ${publishedPairs.length} 题。`)
  console.log(`摘要草稿题型分布：${JSON.stringify(countByAnswerType(drafts))}`)
  console.log(`复核队列数量：${reviewItems.length + downlinedItems.length}（其中下线 ${downlinedItems.length} 道）。`)
  console.log(`输出：${OUTPUT_FILE}`)
  console.log(`manifest 题库总数：${manifest.questionCount}（bankTag ${manifest.bankTag}）`)
}

main()
