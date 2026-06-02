import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const sourcePdf = process.argv[2]
if (!sourcePdf) {
  console.error('用法: npm run import:questions -- "/path/to/question-bank.pdf"')
  process.exit(1)
}

const outputDirectory = resolve('resources/question-bank/ai')
const jsonPath = join(outputDirectory, 'questions.json')

function compact(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([\p{Script=Han}，。！？；：、“”《》（）])\s+(?=[\p{Script=Han}，。！？；：、“”《》（）])/gu, '$1')
    .replace(/\s+([，。！？；：、])/g, '$1')
    .trim()
}

const rawText = execFileSync('pdftotext', ['-layout', resolve(sourcePdf), '-'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
})

const normalizedText = rawText
  .replace(/\r/g, '')
  .replace(/\f/g, '\n')
  .replace(/[\u200b-\u200d\u2060\ufeff]/g, '')
  .split('\n')
  .filter((line) => !/^\s*\d+\s*$/.test(line))
  .join('\n')

const starts = [...normalizedText.matchAll(/(?:^|\n)\s*(\d{1,3})\.\s*/g)]
const questions = starts.map((match, index) => {
  const sourceNumber = Number(match[1])
  const start = (match.index ?? 0) + match[0].length
  const end = index + 1 < starts.length ? starts[index + 1].index : normalizedText.length
  const body = normalizedText.slice(start, end)
  const answerMatch = body.match(/(?:正确答案|答案)\s*[:：]\s*([A-Z](?:\s*[,，、]\s*[A-Z])*)/i)
  if (!answerMatch) throw new Error(`第 ${sourceNumber} 题无法识别答案`)

  const questionText = body.slice(0, answerMatch.index)
  const optionMatches = [
    ...questionText.matchAll(/(?:^|\n)\s*([A-Z])\.\s*|[ \t]+([A-Z])\.[ \t]+/g),
  ].map((option) => ({
    index: option.index ?? 0,
    length: option[0].length,
    originalKey: option[1] ?? option[2],
  }))
  if (optionMatches.length < 2) throw new Error(`第 ${sourceNumber} 题无法识别选项`)
  if (optionMatches.length > 4) throw new Error(`第 ${sourceNumber} 题识别到异常数量的选项`)

  const stem = compact(questionText.slice(0, optionMatches[0].index).replace(/（多选题）/g, ''))
  const options = optionMatches.map((option, optionIndex) => {
    const optionStart = option.index + option.length
    const optionEnd =
      optionIndex + 1 < optionMatches.length ? optionMatches[optionIndex + 1].index : questionText.length
    return {
      key: String.fromCharCode(65 + optionIndex),
      originalKey: option.originalKey,
      text: compact(questionText.slice(optionStart, optionEnd)),
    }
  })
  const keyMap = new Map(options.map((option) => [option.originalKey, option.key]))
  const correctAnswers = (answerMatch[1].match(/[A-Z]/g) ?? []).map((key) => keyMap.get(key) ?? key)
  const optionTexts = options.map((option) => option.text)
  const isBoolean =
    options.length === 2 &&
    optionTexts.some((text) => text.includes('正确')) &&
    optionTexts.some((text) => text.includes('错误'))

  return {
    id: `q-${sourceNumber}`,
    sourceNumber,
    subjectId: 'ai',
    type: correctAnswers.length > 1 ? 'multiple' : isBoolean ? 'boolean' : 'single',
    stem,
    options: options.map(({ key, text }) => ({ key, text })),
    correctAnswers,
  }
})

if (questions.length !== 360) {
  throw new Error(`期望识别 360 题，实际识别 ${questions.length} 题`)
}

questions.forEach((question, index) => {
  if (question.sourceNumber !== index + 1) {
    throw new Error(`题号不连续：期望 ${index + 1}，实际 ${question.sourceNumber}`)
  }
  const available = new Set(question.options.map((option) => option.key))
  if (question.correctAnswers.some((answer) => !available.has(answer))) {
    throw new Error(`第 ${question.sourceNumber} 题答案不在选项内`)
  }
})

mkdirSync(outputDirectory, { recursive: true })
writeFileSync(jsonPath, `${JSON.stringify(questions, null, 2)}\n`, 'utf8')

const multipleCount = questions.filter((question) => question.type === 'multiple').length
const booleanCount = questions.filter((question) => question.type === 'boolean').length
console.log(`已导入 ${questions.length} 题：多选 ${multipleCount} 题，判断 ${booleanCount} 题。`)
console.log(`来源文件：${basename(sourcePdf)}`)
console.log(`生成文件：${jsonPath}`)
