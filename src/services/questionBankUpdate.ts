import type { Question, QuestionBankManifest, QuestionBankSubjectManifest } from '../types'
import { compareQuestionBankTags } from './questionBankVersion'
import { installQuestionBankData } from './storage'
import { subjectOf } from './subjects'

const DEFAULT_MANIFEST_URL = 'https://raw.githubusercontent.com/y38501148-max/AI-DL/main/resources/question-bank/manifest.json'
const DEFAULT_QUESTIONS_URL = 'https://raw.githubusercontent.com/y38501148-max/AI-DL/main/resources/question-bank/questions.json'

export interface QuestionBankUpdateInfo {
  currentTag: string
  latestTag: string
  questionCount: number
  releaseNotes: string[]
  updatedSubjects: QuestionBankSubjectManifest[]
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

function validateQuestions(questions: Question[], manifest?: QuestionBankManifest, expectedSubjects = manifest?.subjects): boolean {
  const subjectIds = expectedSubjects?.map((subject) => subject.id) ?? []
  const expectedCount = expectedSubjects?.reduce((sum, subject) => sum + subject.questionCount, 0) ?? manifest?.questionCount
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
    (!expectedCount || questions.length === expectedCount)
  )
}

function inferredSubjectTag(subject: QuestionBankSubjectManifest | undefined, fallbackTag: string | undefined): string | undefined {
  if (!subject) return fallbackTag
  if (subject.bankTag) return subject.bankTag
  if (subject.id === 'ai' && subject.questionCount === 360) return 'ai-0.1.5-20260602'
  if (subject.id === 'data-structure' && subject.questionCount === 358) return 'ds-0.1.5-20260602'
  return fallbackTag
}

function changedSubjects(
  latest: QuestionBankManifest,
  current: QuestionBankManifest | undefined,
): QuestionBankSubjectManifest[] {
  if (!latest.subjects?.length) {
    return current && compareQuestionBankTags(latest.bankTag, current.bankTag) <= 0 ? [] : latest.subjects ?? []
  }
  return latest.subjects.filter((subject) => {
    const currentSubject = current?.subjects?.find((candidate) => candidate.id === subject.id)
    const latestTag = inferredSubjectTag(subject, latest.bankTag)
    const currentTag = inferredSubjectTag(currentSubject, current?.bankTag)
    if (!currentSubject || !currentTag || !latestTag) return true
    return compareQuestionBankTags(latestTag, currentTag) > 0 || subject.questionCount !== currentSubject.questionCount
  })
}

export async function checkForQuestionBankUpdate(
  currentManifest: QuestionBankManifest | undefined,
): Promise<QuestionBankUpdateInfo | null> {
  const latest = await fetchJson<QuestionBankManifest>(currentManifest?.manifestUrl ?? DEFAULT_MANIFEST_URL)
  if (!latest?.bankTag || !latest.questionCount) return null
  const subjects = changedSubjects(latest, currentManifest)
  if (!subjects.length) return null
  const currentTag = subjects
    .map((subject) => `${subject.name ?? subject.id}: ${inferredSubjectTag(currentManifest?.subjects?.find((item) => item.id === subject.id), currentManifest?.bankTag) ?? 'embedded'}`)
    .join('；')
  const latestTag = subjects.map((subject) => `${subject.name ?? subject.id}: ${inferredSubjectTag(subject, latest.bankTag)}`).join('；')
  return {
    currentTag,
    latestTag,
    questionCount: subjects.reduce((sum, subject) => sum + subject.questionCount, 0),
    releaseNotes: subjects.flatMap((subject) => subject.releaseNotes ?? latest.releaseNotes ?? []),
    updatedSubjects: subjects,
    manifest: latest,
  }
}

export async function downloadAndInstallQuestionBank(
  update: QuestionBankUpdateInfo,
  currentQuestions: Question[] = [],
  currentManifest?: QuestionBankManifest,
): Promise<Question[]> {
  const targetSubjects = update.updatedSubjects.length ? update.updatedSubjects : (update.manifest.subjects ?? [])
  const downloadedQuestions = update.manifest.subjects?.length
    ? (
        await Promise.all(
          targetSubjects.map(async (subject) => {
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
  if (!downloadedQuestions || !validateQuestions(downloadedQuestions, update.manifest, targetSubjects)) {
    throw new Error('下载到的题库格式不完整')
  }

  const updatedSubjectIds = new Set(targetSubjects.map((subject) => subject.id))
  const downloadedBySubject = new Map(targetSubjects.map((subject) => [subject.id, downloadedQuestions.filter((question) => subjectOf(question) === subject.id)]))
  const currentBySubject = new Map(
    (currentManifest?.subjects ?? []).map((subject) => [subject.id, currentQuestions.filter((question) => subjectOf(question) === subject.id)]),
  )
  const nextQuestions = update.manifest.subjects?.length
    ? update.manifest.subjects.flatMap((subject) =>
        updatedSubjectIds.has(subject.id) ? (downloadedBySubject.get(subject.id) ?? []) : (currentBySubject.get(subject.id) ?? []),
      )
    : downloadedQuestions
  const nextSubjects = update.manifest.subjects?.map((subject) => {
    const currentSubject = currentManifest?.subjects?.find((candidate) => candidate.id === subject.id)
    return updatedSubjectIds.has(subject.id) || !currentSubject ? subject : currentSubject
  })
  const nextManifest = {
    ...update.manifest,
    subjects: nextSubjects,
    questionCount: nextQuestions.length,
  }
  if (!validateQuestions(nextQuestions, nextManifest)) throw new Error('合并后的题库格式不完整')
  await installQuestionBankData(nextQuestions, nextManifest)
  return nextQuestions
}
