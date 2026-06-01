import type {
  ActiveExam,
  ExamMode,
  ExamRecord,
  ProgressData,
  Question,
  SubmitMethod,
  SubjectId,
  WrongBookEntry,
} from '../types'
import { getSubjectConfig, subjectOf } from './subjects'

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `exam-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function shuffle<T>(values: T[]): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export function createExam(questionIds: string[], mode: ExamMode, subjectId: SubjectId): ActiveExam {
  const startedAt = new Date()
  const subject = getSubjectConfig(subjectId)
  return {
    id: makeId(),
    mode,
    subjectId,
    questionIds: shuffle(questionIds),
    answers: {},
    startedAt: startedAt.toISOString(),
    deadlineAt: new Date(startedAt.getTime() + subject.durationSeconds * 1000).toISOString(),
    currentIndex: 0,
  }
}

export function selectOfficialQuestions(questions: Question[], subjectId: SubjectId): string[] {
  if (subjectId === 'data-structure') {
    const singles = shuffle(questions.filter((question) => question.type === 'single')).slice(0, 10)
    const blanks = shuffle(questions.filter((question) => question.type === 'blank')).slice(0, 10)
    return shuffle([...singles, ...blanks].map((question) => question.id))
  }
  return shuffle(questions.map((question) => question.id)).slice(0, 50)
}

export function sameAnswers(first: string[], second: string[]): boolean {
  return [...first].sort().join('|') === [...second].sort().join('|')
}

function normalizeBlankAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[，。；：]/g, (match) => ({ '，': ',', '。': '.', '；': ';', '：': ':' })[match] ?? match)
    .replace(/\s+/g, '')
}

export function isCorrectAnswer(question: Question, selectedAnswers: string[]): boolean {
  if (!selectedAnswers.length) return false
  if (question.type !== 'blank') return sameAnswers(selectedAnswers, question.correctAnswers)
  const normalizedInput = normalizeBlankAnswer(selectedAnswers[0] ?? '')
  const accepted = [...question.correctAnswers, ...(question.acceptedAnswers ?? [])].map(normalizeBlankAnswer)
  return accepted.includes(normalizedInput)
}

function scoreFor(question: Question, session: ActiveExam): number {
  return getSubjectConfig(session.subjectId ?? subjectOf(question)).scorePerQuestion
}

export function gradeExam(
  session: ActiveExam,
  questionMap: Map<string, Question>,
  method: SubmitMethod,
  attemptedBefore: Set<string>,
): ExamRecord {
  const submittedAt = new Date()
  let newlyAttemptedCount = 0
  const evaluations = session.questionIds.map((questionId, index) => {
    const question = questionMap.get(questionId)
    if (!question) throw new Error(`题目不存在：${questionId}`)
    const selectedAnswers = session.answers[questionId] ?? []
    const answered = selectedAnswers.length > 0
    const correct = isCorrectAnswer(question, selectedAnswers)
    if (answered && !attemptedBefore.has(questionId)) {
      newlyAttemptedCount += 1
      attemptedBefore.add(questionId)
    }
    return {
      questionId,
      displayNumber: index + 1,
      selectedAnswers,
      correctAnswers: question.correctAnswers,
      answered,
      correct,
      score: correct ? scoreFor(question, session) : 0,
    }
  })

  const score = evaluations.reduce((total, item) => total + item.score, 0)
  return {
    id: session.id,
    mode: session.mode,
    subjectId: session.subjectId,
    startedAt: session.startedAt,
    submittedAt: submittedAt.toISOString(),
    submitMethod: method,
    elapsedSeconds: Math.min(
      60 * 60,
      Math.max(0, Math.round((submittedAt.getTime() - new Date(session.startedAt).getTime()) / 1000)),
    ),
    questionIds: session.questionIds,
    evaluations,
    score,
    maxScore: evaluations.reduce((total, item) => total + scoreFor(questionMap.get(item.questionId)!, session), 0),
    correctCount: evaluations.filter((item) => item.correct).length,
    wrongCount: evaluations.filter((item) => item.answered && !item.correct).length,
    unansweredCount: evaluations.filter((item) => !item.answered).length,
    newlyAttemptedCount,
  }
}

export function updateProgress(progress: ProgressData, record: ExamRecord): ProgressData {
  const attempted = new Set(progress.attemptedQuestionIds)
  record.evaluations.filter((item) => item.answered).forEach((item) => attempted.add(item.questionId))
  return { attemptedQuestionIds: [...attempted] }
}

export function updateWrongBook(entries: WrongBookEntry[], record: ExamRecord): WrongBookEntry[] {
  const byId = new Map(entries.map((entry) => [entry.questionId, { ...entry }]))
  record.evaluations.forEach((evaluation) => {
    if (!evaluation.answered) return
    const existing = byId.get(evaluation.questionId)
    if (evaluation.correct) {
      if (existing) existing.mastered = true
      return
    }
    byId.set(evaluation.questionId, {
      questionId: evaluation.questionId,
      wrongCount: (existing?.wrongCount ?? 0) + 1,
      latestWrongAt: record.submittedAt,
      latestWrongAnswers: evaluation.selectedAnswers,
      mastered: false,
    })
  })
  return [...byId.values()].sort((first, second) => second.wrongCount - first.wrongCount)
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
