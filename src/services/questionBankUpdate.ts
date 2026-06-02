import type { Question, QuestionBankManifest } from '../types'
import { compareQuestionBankTags } from './questionBankVersion'
import { installQuestionBankData } from './storage'

const DEFAULT_MANIFEST_URL = 'https://raw.githubusercontent.com/y38501148-max/AI-DL/main/resources/question-bank/manifest.json'
const DEFAULT_QUESTIONS_URL = 'https://raw.githubusercontent.com/y38501148-max/AI-DL/main/resources/question-bank/questions.json'

export interface QuestionBankUpdateInfo {
  currentTag: string
  latestTag: string
  questionCount: number
  releaseNotes: string[]
  manifest: QuestionBankManifest
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

function validateQuestions(questions: Question[], manifest?: QuestionBankManifest): boolean {
  const subjectIds = manifest?.subjects?.map((subject) => subject.id) ?? []
  return (
    Array.isArray(questions) &&
    questions.length > 0 &&
    questions.every(
      (question) =>
        question.id &&
        question.stem &&
        Array.isArray(question.options) &&
        Array.isArray(question.correctAnswers) &&
        (!question.subjectId || !subjectIds.length || subjectIds.includes(question.subjectId)) &&
        (question.subjectId !== 'data-structure' || Boolean(question.explanation)),
    ) &&
    (!manifest?.questionCount || questions.length === manifest.questionCount)
  )
}

export async function checkForQuestionBankUpdate(
  currentManifest: QuestionBankManifest | undefined,
): Promise<QuestionBankUpdateInfo | null> {
  const latest = await fetchJson<QuestionBankManifest>(currentManifest?.manifestUrl ?? DEFAULT_MANIFEST_URL)
  if (!latest?.bankTag || !latest.questionCount) return null
  const currentTag = currentManifest?.bankTag ?? 'embedded'
  if (currentManifest && compareQuestionBankTags(latest.bankTag, currentManifest.bankTag) <= 0) return null
  return {
    currentTag,
    latestTag: latest.bankTag,
    questionCount: latest.questionCount,
    releaseNotes: latest.releaseNotes ?? [],
    manifest: latest,
  }
}

export async function downloadAndInstallQuestionBank(update: QuestionBankUpdateInfo): Promise<Question[]> {
  const questions = update.manifest.subjects?.length
    ? (
        await Promise.all(
          update.manifest.subjects.map(async (subject) => {
            const questionsUrl = subject.questionsUrl
            if (!questionsUrl) throw new Error(`题库清单缺少 ${subject.id} 的下载地址`)
            const subjectQuestions = await fetchJson<Question[]>(questionsUrl, 15000)
            if (!subjectQuestions) throw new Error(`下载 ${subject.id} 题库失败`)
            if (subject.questionCount && subjectQuestions.length !== subject.questionCount) {
              throw new Error(`${subject.id} 题库数量异常`)
            }
            return subjectQuestions
          }),
        )
      ).flat()
    : await fetchJson<Question[]>(update.manifest.questionsUrl ?? DEFAULT_QUESTIONS_URL, 15000)
  if (!questions || !validateQuestions(questions, update.manifest)) throw new Error('下载到的题库格式不完整')
  await installQuestionBankData(questions, { ...update.manifest, questionCount: questions.length })
  return questions
}
