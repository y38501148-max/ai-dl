const port = Number(process.argv[2] ?? 5173)
const basePath = process.argv[3] ? `/${process.argv[3].replace(/^\/|\/$/g, '')}` : ''

const response = await fetch(`http://127.0.0.1:${port}${basePath}/question-bank/questions.json`)
if (!response.ok) throw new Error('无法读取开发服务器题库')

const questions = await response.json()
if (!Array.isArray(questions) || questions.length < 223) {
  throw new Error(`题库数量异常：${Array.isArray(questions) ? questions.length : '非数组'}`)
}

const dsQuestions = questions.filter((question) => question.subjectId === 'data-structure')
const dsSingles = dsQuestions.filter((question) => question.type === 'single')
const dsBlanks = dsQuestions.filter((question) => question.type === 'blank')
const missingDsExplanations = dsQuestions.filter((question) => !question.explanation)
const imageExamples = dsQuestions.filter((question) => question.tags?.includes('图片例题'))
const generatedExamples = dsQuestions.filter((question) => question.tags?.includes('自主命题'))
const mdExamQuestions = dsQuestions.filter((question) => question.tags?.includes('非编程题'))
const extraFoundationQuestions = dsQuestions.filter((question) => question.tags?.includes('专题补充'))
const invalidIds = dsQuestions.filter((question, index) => question.id !== `ds1-${String(index + 1).padStart(3, '0')}`)
const manifestResponse = await fetch(`http://127.0.0.1:${port}${basePath}/question-bank/manifest.json`)
if (!manifestResponse.ok) throw new Error('无法读取开发服务器题库清单')
const manifest = await manifestResponse.json()

if (questions.length !== dsQuestions.length) throw new Error('0.1.5 题库应只包含数据结构题目')
if (dsSingles.length < 80 || dsBlanks.length < 80) {
  throw new Error(`数据结构题库数量异常：选择 ${dsSingles.length}，填空 ${dsBlanks.length}`)
}
if (imageExamples.length < 63) throw new Error(`图片例题数量异常：${imageExamples.length}`)
if (manifest.sourceCounts?.mdExamInput !== 75) {
  throw new Error(`2019-2022 非编程题输入数量异常：${manifest.sourceCounts?.mdExamInput}`)
}
if (manifest.sourceCounts?.duplicatesRemoved !== manifest.sourceCounts?.supplementsUsed) {
  throw new Error(
    `去重补题数量不一致：${manifest.sourceCounts?.duplicatesRemoved} != ${manifest.sourceCounts?.supplementsUsed}`,
  )
}
if (mdExamQuestions.length !== manifest.sourceCounts?.mdExamKept) {
  throw new Error(`2019-2022 非编程题保留数量异常：${mdExamQuestions.length}`)
}
if (generatedExamples.length < 160) throw new Error(`自主命题数量异常：${generatedExamples.length}`)
if (extraFoundationQuestions.length < 60) throw new Error(`专题补充题数量异常：${extraFoundationQuestions.length}`)
if (missingDsExplanations.length) throw new Error(`数据结构存在缺少题解的题目：${missingDsExplanations.length}`)
if (invalidIds.length) throw new Error(`题目编号异常：${invalidIds[0].id}`)
if (manifest.questionCount !== questions.length) {
  throw new Error(`题库清单数量异常：${manifest.questionCount} != ${questions.length}`)
}

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
  `Web 冒烟检查通过：数据结构 ${questions.length} 题，选择 ${dsSingles.length}，填空 ${dsBlanks.length}，全部有题解。`,
)
