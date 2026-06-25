const port = Number(process.argv[2] ?? 5173)
const basePath = process.argv[3] ? `/${process.argv[3].replace(/^\/|\/$/g, '')}` : ''

const manifestResponse = await fetch(`http://127.0.0.1:${port}${basePath}/question-bank/manifest.json`)
if (!manifestResponse.ok) throw new Error('无法读取开发服务器题库清单')
const manifest = await manifestResponse.json()

if (!Array.isArray(manifest.subjects) || manifest.subjects.length < 4) {
  throw new Error('题库清单应按科目列出独立题库文件')
}

const subjectBanks = await Promise.all(
  manifest.subjects.map(async (subject) => {
    const response = await fetch(`http://127.0.0.1:${port}${basePath}/question-bank/${subject.relativePath}`)
    if (!response.ok) throw new Error(`无法读取 ${subject.id} 科目题库`)
    const questions = await response.json()
    if (!Array.isArray(questions)) throw new Error(`${subject.id} 科目题库不是数组`)
    if (questions.length !== subject.questionCount) {
      throw new Error(`${subject.id} 科目题库数量异常：${questions.length} != ${subject.questionCount}`)
    }
    return [subject.id, questions]
  }),
)
const subjectQuestionMap = new Map(subjectBanks)
const questions = subjectBanks.flatMap(([, items]) => items)
const aiQuestions = subjectQuestionMap.get('ai') ?? []
const dsQuestions = subjectQuestionMap.get('data-structure') ?? []
const dsSingles = dsQuestions.filter((question) => question.type === 'single')
const dsMultiples = dsQuestions.filter((question) => question.type === 'multiple')
const dsBlanks = dsQuestions.filter((question) => question.type === 'blank')
const missingDsExplanations = dsQuestions.filter((question) => !question.explanation)
const aiExplanations = aiQuestions.filter((question) => question.explanation)
const aiManifest = manifest.subjects.find((subject) => subject.id === 'ai')
const iscQuestions = subjectQuestionMap.get('intelligent-sensing-control') ?? []
const iscSingles = iscQuestions.filter((question) => question.type === 'single')
const iscMultiples = iscQuestions.filter((question) => question.type === 'multiple')
const iscBlanks = iscQuestions.filter((question) => question.type === 'blank')
const missingIscExplanations = iscQuestions.filter((question) => !question.explanation)
const cmhQuestions = subjectQuestionMap.get('china-modern-history') ?? []
const cmhSingles = cmhQuestions.filter((question) => question.type === 'single')
const cmhManifest = manifest.subjects.find((subject) => subject.id === 'china-modern-history')
const imageExamples = dsQuestions.filter((question) => question.tags?.includes('图片例题'))
const homework7Questions = dsQuestions.filter((question) => question.tags?.includes('第七套作业'))
const generatedExamples = dsQuestions.filter((question) => question.tags?.includes('自主命题'))
const mdExamQuestions = dsQuestions.filter((question) => question.tags?.includes('非编程题'))
const extraFoundationQuestions = dsQuestions.filter((question) => question.tags?.includes('专题补充'))
const invalidIds = dsQuestions.filter((question, index) => question.id !== `ds1-${String(index + 1).padStart(3, '0')}`)

if (manifest.bankTag !== 'multi-0.2.4.1-cmh-audit-20260625') throw new Error(`题库标记异常：${manifest.bankTag}`)
if (manifest.appVersion !== '0.2.5') throw new Error(`应用版本异常：${manifest.appVersion}`)
if (!Array.isArray(manifest.releaseNotes) || !manifest.releaseNotes.length) {
  throw new Error('题库更新说明缺失')
}
if (questions.length !== 1165) throw new Error(`题库总数异常：${questions.length}`)
if (manifest.questionCount !== questions.length) {
  throw new Error(`题库清单数量异常：${manifest.questionCount} != ${questions.length}`)
}
if (aiQuestions.length !== 440) throw new Error(`人工智能导论题库数量异常：${aiQuestions.length}`)
if (aiQuestions.some((question) => question.subjectId !== 'ai')) throw new Error('人工智能导论题库存在错误科目标识')
if (aiExplanations.length !== aiQuestions.length) throw new Error(`人工智能导论存在缺少题解的题目：${aiQuestions.length - aiExplanations.length}`)
if (aiManifest?.bankTag !== 'ai-0.2.3.2-new80-notice-20260608') throw new Error(`人工智能导论题库标记异常：${aiManifest?.bankTag}`)
if (aiManifest?.officialQuestionCount !== 100) throw new Error(`人工智能导论模拟考试数量异常：${aiManifest?.officialQuestionCount}`)
if (aiManifest?.scorePerQuestion !== 1) throw new Error(`人工智能导论每题分值异常：${aiManifest?.scorePerQuestion}`)
if (
  !aiManifest?.officialQuestionTypes?.includes('single') ||
  !aiManifest?.officialQuestionTypes?.includes('multiple') ||
  !aiManifest?.officialQuestionTypes?.includes('boolean')
) {
  throw new Error('人工智能导论模拟考试题型范围异常')
}
if (!aiManifest?.examRules?.some((rule) => rule.includes('100 道题'))) throw new Error('人工智能导论考试规则未热更新为 100 道题')
if (!aiManifest?.notice?.includes('360+80=440')) throw new Error('人工智能导论新增题提醒缺失')
if (!aiManifest?.releaseNotes?.some((note) => note.includes('修复了一些已知问题'))) throw new Error('人工智能导论更新说明缺失')
if (iscQuestions.length !== 120) throw new Error(`智能感知与控制题库数量异常：${iscQuestions.length}`)
const iscManifest = manifest.subjects.find((subject) => subject.id === 'intelligent-sensing-control')
if (!iscManifest) throw new Error('智能感知与控制科目清单缺失')
if (iscManifest.bankTag !== 'isc-0.1.7.3-zg120-shuffle-20260610') throw new Error(`智能感知与控制题库标记异常：${iscManifest.bankTag}`)
if (!iscManifest.releaseNotes?.some((note) => note.includes('选择题选项已重新乱序'))) throw new Error('智能感知与控制更新说明缺失')
if (!iscManifest.notice?.includes('简答题')) throw new Error('智能感知与控制简答题提醒缺失')
if (!iscManifest.examRules?.some((rule) => rule.includes('简答题'))) throw new Error('智能感知与控制考试规则提醒缺失')
if (iscManifest.allowPractice !== true) throw new Error('智能感知与控制应已开放自由练习')
if (iscManifest.officialQuestionCount !== 50) throw new Error(`智能感知与控制模拟考试数量异常：${iscManifest.officialQuestionCount}`)
if (iscManifest.scorePerQuestion !== 2) throw new Error(`智能感知与控制每题分值异常：${iscManifest.scorePerQuestion}`)
if (iscSingles.length !== 72 || iscMultiples.length !== 8 || iscBlanks.length !== 40) {
  throw new Error(`智能感知与控制题型分布异常：单选 ${iscSingles.length}，多选 ${iscMultiples.length}，填空 ${iscBlanks.length}`)
}
if (iscMultiples.length > 10) throw new Error(`智能感知与控制多选题超限：${iscMultiples.length}`)
if (missingIscExplanations.length) throw new Error(`智能感知与控制存在缺少题解的题目：${missingIscExplanations.length}`)
if (!cmhManifest) throw new Error('中国近现代史纲要科目清单缺失')
if (cmhManifest.bankTag !== 'cmh-0.1.1-shigang-audit-20260625') throw new Error(`中国近现代史纲要题库标记异常：${cmhManifest.bankTag}`)
if (cmhQuestions.length !== 227) throw new Error(`中国近现代史纲要题库数量异常：${cmhQuestions.length}`)
if (cmhSingles.length !== cmhQuestions.length) throw new Error('中国近现代史纲要题库必须全部为单选题')
if (cmhQuestions.some((question) => question.subjectId !== 'china-modern-history')) throw new Error('中国近现代史纲要题库存在错误科目标识')
if (cmhQuestions.some((question) => question.correctAnswers.length !== 1)) throw new Error('中国近现代史纲要题库存在非单答案题目')
if (cmhQuestions.some((question) => question.options.length !== 4)) throw new Error('中国近现代史纲要题库存在非四选项题目')
if (cmhManifest.types?.single !== 227 || cmhManifest.types?.multiple !== 0 || cmhManifest.types?.blank !== 0 || cmhManifest.types?.boolean !== 0) {
  throw new Error('中国近现代史纲要题型分布异常')
}
if (!cmhManifest.officialQuestionTypes?.includes('single') || cmhManifest.officialQuestionTypes.length !== 1) {
  throw new Error('中国近现代史纲要模拟考试题型范围异常')
}
if (!cmhManifest.notice?.includes('仅含单选题')) throw new Error('中国近现代史纲要单选提醒缺失')
if (dsQuestions.length !== 378) throw new Error(`数据结构题库数量异常：${dsQuestions.length}`)
if (dsQuestions.some((question) => question.subjectId !== 'data-structure')) throw new Error('数据结构题库存在错误科目标识')
if (dsSingles.length < 200 || dsMultiples.length < 1 || dsBlanks.length < 170) {
  throw new Error(`数据结构题库数量异常：单选 ${dsSingles.length}，多选 ${dsMultiples.length}，填空 ${dsBlanks.length}`)
}
if (imageExamples.length < 83) throw new Error(`图片例题数量异常：${imageExamples.length}`)
if (homework7Questions.length !== 20) throw new Error(`第七套作业数量异常：${homework7Questions.length}`)
const dsManifest = manifest.subjects.find((subject) => subject.id === 'data-structure')
if (!manifest.subjects.every((subject) => subject.bankTag)) throw new Error('科目级题库标记缺失')
if (dsManifest?.bankTag !== 'ds-0.1.5.2-hw7-fix-20260616') throw new Error(`数据结构题库标记异常：${dsManifest?.bankTag}`)
if (!dsManifest?.releaseNotes?.length) throw new Error('数据结构科目更新说明缺失')
if (mdExamQuestions.length !== dsManifest?.sourceCounts?.mdExamKept) {
  throw new Error(`2019-2022 非编程题保留数量异常：${mdExamQuestions.length}`)
}
if (homework7Questions.length !== dsManifest?.sourceCounts?.homework7Kept) {
  throw new Error(`第七套作业保留数量异常：${homework7Questions.length}`)
}
if (generatedExamples.length < 160) throw new Error(`自主命题数量异常：${generatedExamples.length}`)
if (extraFoundationQuestions.length < 60) throw new Error(`专题补充题数量异常：${extraFoundationQuestions.length}`)
if (missingDsExplanations.length) throw new Error(`数据结构存在缺少题解的题目：${missingDsExplanations.length}`)
if (invalidIds.length) throw new Error(`题目编号异常：${invalidIds[0].id}`)

function normalizeStem(stem) {
  return String(stem)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[，。；：、,.!?！？;:()（）\[\]【】"'“”‘’`*_<>《》-]/g, '')
    .toLowerCase()
}

const seen = new Set()
for (const question of dsQuestions) {
  const key = normalizeStem(question.stem)
  if (seen.has(key)) throw new Error(`题干重复：${question.id}`)
  seen.add(key)
}

console.log(
  `Web 冒烟检查通过：AI ${aiQuestions.length} 题、数据结构 ${dsQuestions.length} 题、智能感知与控制 ${iscQuestions.length} 题、中国近现代史纲要 ${cmhQuestions.length} 题；科目题库已分文件维护。`,
)
