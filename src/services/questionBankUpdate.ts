import type { Question, QuestionBankManifest } from '../types'
import { installQuestionBankData } from './storage'

const DEFAULT_MANIFEST_URL = 'https://raw.githubusercontent.com/y38501148-max/AI-DL/main/resources/question-bank/manifest.json'
const DEFAULT_QUESTIONS_URL = 'https://raw.githubusercontent.com/y38501148-max/AI-DL/main/resources/question-bank/questions.json'

export interface QuestionBankUpdateInfo {
  currentTag: string
  latestTag: string
  questionCount: number
  manifest: QuestionBankManifest
}

function tagVersion(tag: string): number[] {
  const version = tag.match(/(\d+(?:\.\d+){1,3})/)?.[1] ?? tag
  return version.split('.').map((item) => Number(item) || 0)
}

function compareTags(first: string, second: string): number {
  const left = tagVersion(first)
  const right = tagVersion(second)
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0)
    if (delta !== 0) return delta
  }
  return first.localeCompare(second)
}

async function fetchJson<T>(url: string, timeoutMs = 6000): Promise<T | null> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}

function validateQuestions(questions: Question[]): boolean {
  return (
    Array.isArray(questions) &&
    questions.length > 0 &&
    questions.every(
      (question) =>
        question.id &&
        question.stem &&
        Array.isArray(question.options) &&
        Array.isArray(question.correctAnswers) &&
        Boolean(question.explanation),
    )
  )
}

export async function checkForQuestionBankUpdate(
  currentManifest: QuestionBankManifest | undefined,
): Promise<QuestionBankUpdateInfo | null> {
  const latest = await fetchJson<QuestionBankManifest>(currentManifest?.manifestUrl ?? DEFAULT_MANIFEST_URL)
  if (!latest?.bankTag || !latest.questionCount) return null
  const currentTag = currentManifest?.bankTag ?? 'embedded'
  if (currentManifest && compareTags(latest.bankTag, currentManifest.bankTag) <= 0) return null
  return {
    currentTag,
    latestTag: latest.bankTag,
    questionCount: latest.questionCount,
    manifest: latest,
  }
}

export async function downloadAndInstallQuestionBank(update: QuestionBankUpdateInfo): Promise<Question[]> {
  const questionsUrl = update.manifest.questionsUrl ?? DEFAULT_QUESTIONS_URL
  const questions = await fetchJson<Question[]>(questionsUrl, 15000)
  if (!questions || !validateQuestions(questions)) throw new Error('下载到的题库格式不完整')
  await installQuestionBankData(questions, { ...update.manifest, questionCount: questions.length })
  return questions
}
