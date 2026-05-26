export type QuestionType = 'single' | 'multiple' | 'boolean'
export type ExamMode = 'exam' | 'wrong-practice' | 'practice'
export type SubmitMethod = 'manual' | 'timeout'
export type StorageKey = 'records' | 'wrongBook' | 'progress' | 'activeExam' | 'settings'

export interface QuestionOption {
  key: string
  text: string
}

export interface Question {
  id: string
  sourceNumber: number
  type: QuestionType
  stem: string
  options: QuestionOption[]
  correctAnswers: string[]
}

export interface ActiveExam {
  id: string
  mode: ExamMode
  questionIds: string[]
  answers: Record<string, string[]>
  startedAt: string
  deadlineAt: string
  currentIndex: number
}

export interface QuestionEvaluation {
  questionId: string
  displayNumber: number
  selectedAnswers: string[]
  correctAnswers: string[]
  answered: boolean
  correct: boolean
  score: number
}

export interface ExamRecord {
  id: string
  mode: ExamMode
  startedAt: string
  submittedAt: string
  submitMethod: SubmitMethod
  elapsedSeconds: number
  questionIds: string[]
  evaluations: QuestionEvaluation[]
  score: number
  maxScore: number
  correctCount: number
  wrongCount: number
  unansweredCount: number
  newlyAttemptedCount: number
}

export interface WrongBookEntry {
  questionId: string
  wrongCount: number
  latestWrongAt: string
  latestWrongAnswers: string[]
  mastered: boolean
}

export interface ProgressData {
  attemptedQuestionIds: string[]
}

export interface SettingsData {
  questionBankVersion: number
}

export interface BootstrapData {
  questions: Question[]
  records: ExamRecord[]
  wrongBook: WrongBookEntry[]
  progress: ProgressData
  activeExam: ActiveExam | null
  settings: SettingsData
}
