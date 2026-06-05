const port = Number(process.argv[2] ?? 5173)
const basePath = process.argv[3] ? `/${process.argv[3].replace(/^\/|\/$/g, '')}` : ''

const manifestResponse = await fetch(`http://127.0.0.1:${port}${basePath}/question-bank/manifest.json`)
if (!manifestResponse.ok) throw new Error('无法读取开发服务器题库清单')
const manifest = await manifestResponse.json()

if (!Array.isArray(manifest.subjects) || manifest.subjects.length < 3) {
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
const imageExamples = dsQuestions.filter((question) => question.tags?.includes('图片例题'))
const homework7Questions = dsQuestions.filter((question) => question.tags?.includes('第七套作业'))
const generatedExamples = dsQuestions.filter((question) => question.tags?.includes('自主命题'))
const mdExamQuestions = dsQuestions.filter((question) => question.tags?.includes('非编程题'))
const extraFoundationQuestions = dsQuestions.filter((question) => question.tags?.includes('专题补充'))
const invalidIds = dsQuestions.filter((question, index) => question.id !== `ds1-${String(index + 1).padStart(3, '0')}`)

if (manifest.bankTag !== 'multi-0.2.3.1-ai100-20260605') throw new Error(`题库标记异常：${manifest.bankTag}`)
if (manifest.appVersion !== '0.2.3') throw new Error(`应用版本异常：${manifest.appVersion}`)
if (!Array.isArray(manifest.releaseNotes) || manifest.releaseNotes.length < 3) {
  throw new Error('题库更新说明缺失')
}
if (questions.length !== 818) throw new Error(`题库总数异常：${questions.length}`)
if (manifest.questionCount !== questions.length) {
  throw new Error(`题库清单数量异常：${manifest.questionCount} != ${questions.length}`)
}
if (aiQuestions.length !== 440) throw new Error(`人工智能导论题库数量异常：${aiQuestions.length}`)
if (aiQuestions.some((question) => question.subjectId !== 'ai')) throw new Error('人工智能导论题库存在错误科目标识')
if (aiExplanations.length !== aiQuestions.length) throw new Error(`人工智能导论存在缺少题解的题目：${aiQuestions.length - aiExplanations.length}`)
if (aiManifest?.bankTag !== 'ai-0.2.3.1-exam100-20260605') throw new Error(`人工智能导论题库标记异常：${aiManifest?.bankTag}`)
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
if (iscQuestions.length !== 0) throw new Error(`智能感知与控制题库数量异常：${iscQuestions.length}`)
const iscManifest = manifest.subjects.find((subject) => subject.id === 'intelligent-sensing-control')
if (!iscManifest) throw new Error('智能感知与控制科目清单缺失')
if (iscManifest.bankTag !== 'isc-0.1.6-20260605') throw new Error(`智能感知与控制题库标记异常：${iscManifest.bankTag}`)
if (!iscManifest.releaseNotes?.includes('试题收集中，敬请期待')) throw new Error('智能感知与控制更新说明缺失')
if (dsQuestions.length !== 378) throw new Error(`数据结构题库数量异常：${dsQuestions.length}`)
if (dsQuestions.some((question) => question.subjectId !== 'data-structure')) throw new Error('数据结构题库存在错误科目标识')
if (dsSingles.length < 200 || dsMultiples.length < 1 || dsBlanks.length < 170) {
  throw new Error(`数据结构题库数量异常：单选 ${dsSingles.length}，多选 ${dsMultiples.length}，填空 ${dsBlanks.length}`)
}
if (imageExamples.length < 83) throw new Error(`图片例题数量异常：${imageExamples.length}`)
if (homework7Questions.length !== 20) throw new Error(`第七套作业数量异常：${homework7Questions.length}`)
const dsManifest = manifest.subjects.find((subject) => subject.id === 'data-structure')
if (!manifest.subjects.every((subject) => subject.bankTag)) throw new Error('科目级题库标记缺失')
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
  `Web 冒烟检查通过：AI ${aiQuestions.length} 题、数据结构 ${dsQuestions.length} 题、智能感知与控制 ${iscQuestions.length} 题；科目题库已分文件维护。`,
)
