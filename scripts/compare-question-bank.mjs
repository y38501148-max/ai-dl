import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sourcePdf = process.argv[2]
if (!sourcePdf) {
  console.error('用法: node scripts/compare-question-bank.mjs "/path/to/question-bank.pdf"')
  process.exit(1)
}

function compact(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([\p{Script=Han}，。！？；：、“”《》（）])\s+(?=[\p{Script=Han}，。！？；：、“”《》（）])/gu, '$1')
    .replace(/\s+([，。！？；：、])/g, '$1')
    .trim()
}

function parsePdf(pdfPath) {
  const rawText = execFileSync('pdftotext', ['-layout', resolve(pdfPath), '-'], {
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

  return questions
}

function answersKey(answers) {
  return [...answers].sort().join(',')
}

function optionsKey(options) {
  return options.map((option) => `${option.key}.${option.text}`).join('|')
}

const current = JSON.parse(readFileSync('resources/question-bank/ai/questions.json', 'utf8'))
const incoming = parsePdf(sourcePdf)
const currentByNumber = new Map(current.map((question) => [question.sourceNumber, question]))

const differences = []
if (incoming.length !== current.length) {
  differences.push({ sourceNumber: '-', field: '题目数量', current: current.length, incoming: incoming.length })
}

incoming.forEach((question, index) => {
  if (question.sourceNumber !== index + 1) {
    differences.push({
      sourceNumber: question.sourceNumber,
      field: '题号连续性',
      current: index + 1,
      incoming: question.sourceNumber,
    })
  }

  const existing = currentByNumber.get(question.sourceNumber)
  if (!existing) {
    differences.push({ sourceNumber: question.sourceNumber, field: '题号', current: '不存在', incoming: '存在' })
    return
  }

  for (const field of ['type', 'stem']) {
    if (existing[field] !== question[field]) {
      differences.push({
        sourceNumber: question.sourceNumber,
        field,
        current: existing[field],
        incoming: question[field],
      })
    }
  }

  if (optionsKey(existing.options) !== optionsKey(question.options)) {
    differences.push({
      sourceNumber: question.sourceNumber,
      field: '选项',
      current: optionsKey(existing.options),
      incoming: optionsKey(question.options),
    })
  }

  if (answersKey(existing.correctAnswers) !== answersKey(question.correctAnswers)) {
    differences.push({
      sourceNumber: question.sourceNumber,
      field: '答案',
      current: answersKey(existing.correctAnswers),
      incoming: answersKey(question.correctAnswers),
    })
  }
})

const multipleCount = incoming.filter((question) => question.type === 'multiple').length
const booleanCount = incoming.filter((question) => question.type === 'boolean').length

console.log(`PDF 解析题数：${incoming.length}`)
console.log(`当前题库题数：${current.length}`)
console.log(`PDF 多选题：${multipleCount}，判断题：${booleanCount}`)

if (!differences.length) {
  console.log('对比结果：完全一致')
} else {
  console.log(`对比结果：发现 ${differences.length} 处差异`)
  console.log(JSON.stringify(differences, null, 2))
}
