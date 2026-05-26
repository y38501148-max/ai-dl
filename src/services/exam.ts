import type {
  ActiveExam,
  ExamMode,
  ExamRecord,
  ProgressData,
  Question,
  SubmitMethod,
  WrongBookEntry,
} from '../types'

const EXAM_DURATION_MS = 60 * 60 * 1000

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

export function createExam(questionIds: string[], mode: ExamMode): ActiveExam {
  const startedAt = new Date()
  return {
    id: makeId(),
    mode,
    questionIds: shuffle(questionIds),
    answers: {},
    startedAt: startedAt.toISOString(),
    deadlineAt: new Date(startedAt.getTime() + EXAM_DURATION_MS).toISOString(),
    currentIndex: 0,
  }
}

export function selectOfficialQuestions(questions: Question[]): string[] {
  return shuffle(questions.map((question) => question.id)).slice(0, 50)
}

function sameAnswers(first: string[], second: string[]): boolean {
  return [...first].sort().join('|') === [...second].sort().join('|')
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
    const correct = answered && sameAnswers(selectedAnswers, question.correctAnswers)
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
      score: correct ? 2 : 0,
    }
  })

  const score = evaluations.reduce((total, item) => total + item.score, 0)
  return {
    id: session.id,
    mode: session.mode,
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
    maxScore: session.questionIds.length * 2,
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

