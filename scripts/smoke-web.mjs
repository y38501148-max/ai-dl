const port = Number(process.argv[2] ?? 5173)

const response = await fetch(`http://127.0.0.1:${port}/question-bank/questions.json`)
if (!response.ok) throw new Error('无法读取开发服务器题库')

const questions = await response.json()
if (!Array.isArray(questions) || questions.length !== 360) {
  throw new Error(`题库数量异常：${Array.isArray(questions) ? questions.length : '非数组'}`)
}

const groups = []
for (let start = 0; start < questions.length; start += 60) {
  groups.push(questions.slice(start, start + 60))
}

if (groups.length !== 6 || groups.some((group) => group.length !== 60)) {
  throw new Error('练习模式分组异常，应为 6 组，每组 60 题')
}

console.log('Web 冒烟检查通过：题库 360 题，练习模式可按 60 题分为 6 组。')
