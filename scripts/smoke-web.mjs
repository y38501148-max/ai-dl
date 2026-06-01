const port = Number(process.argv[2] ?? 5173)
const basePath = process.argv[3] ? `/${process.argv[3].replace(/^\/|\/$/g, '')}` : ''

const response = await fetch(`http://127.0.0.1:${port}${basePath}/question-bank/questions.json`)
if (!response.ok) throw new Error('无法读取开发服务器题库')

const questions = await response.json()
if (!Array.isArray(questions) || questions.length !== 623) {
  throw new Error(`题库数量异常：${Array.isArray(questions) ? questions.length : '非数组'}`)
}

const aiQuestions = questions.filter((question) => !question.subjectId || question.subjectId === 'ai')
const dsQuestions = questions.filter((question) => question.subjectId === 'data-structure')
const dsSingles = dsQuestions.filter((question) => question.type === 'single')
const dsBlanks = dsQuestions.filter((question) => question.type === 'blank')
const aiExplanations = aiQuestions.filter((question) => question.explanation)
const missingDsExplanations = dsQuestions.filter((question) => !question.explanation)
const originalExamples = dsQuestions.filter((question) => question.tags?.includes('原例题'))

if (aiQuestions.length !== 360) throw new Error(`人工智能导论题库数量异常：${aiQuestions.length}`)
if (dsQuestions.length !== 263 || dsSingles.length !== 133 || dsBlanks.length !== 130) {
  throw new Error(`数据结构题库数量异常：选择 ${dsSingles.length}，填空 ${dsBlanks.length}`)
}
if (originalExamples.length !== 63) throw new Error(`数据结构原例题数量异常：${originalExamples.length}`)
if (aiExplanations.length) throw new Error(`人工智能导论题库不应包含题解：${aiExplanations.length}`)
if (missingDsExplanations.length) throw new Error(`数据结构存在缺少题解的题目：${missingDsExplanations.length}`)

const groups = []
for (let start = 0; start < aiQuestions.length; start += 60) {
  groups.push(aiQuestions.slice(start, start + 60))
}

if (groups.length !== 6 || groups.some((group) => group.length !== 60)) {
  throw new Error('练习模式分组异常，应为 6 组，每组 60 题')
}

console.log('Web 冒烟检查通过：AI 360 题且无题解，数据结构 263 题且均有题解，原例题 63 道。')
