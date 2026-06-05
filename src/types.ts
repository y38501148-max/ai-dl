export type QuestionType = 'single' | 'multiple' | 'boolean' | 'blank'
export type ExamMode = 'exam' | 'wrong-practice' | 'practice'
export type SubmitMethod = 'manual' | 'timeout'
export type StorageKey = 'records' | 'wrongBook' | 'progress' | 'activeExam' | 'settings'
export type SubjectId = string

export interface QuestionOption {
  key: string
  text: string
}

export interface Question {
  id: string
  sourceNumber: number
  type: QuestionType
  subjectId?: SubjectId
  stem: string
  options: QuestionOption[]
  correctAnswers: string[]
  acceptedAnswers?: string[]
  image?: string
  tags?: string[]
  explanation?: string
}

export interface ActiveExam {
  id: string
  mode: ExamMode
  subjectId?: SubjectId
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
  subjectId?: SubjectId
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
  questionBankTag?: string
  activeSubjectId?: SubjectId
}

export interface QuestionBankManifest {
  schemaVersion: number
  bankTag: string
  appVersion?: string
  questionCount: number
  subjects?: QuestionBankSubjectManifest[]
  updatedAt?: string
  releaseNotes?: string[]
  questionsUrl?: string
  manifestUrl?: string
}

export interface QuestionBankSubjectManifest {
  id: SubjectId
  name?: string
  bankTag?: string
  questionCount: number
  relativePath: string
  questionsUrl?: string
  assetDirectory?: string
  restoredFrom?: string
  releaseNotes?: string[]
  title?: string
  subtitle?: string
  examLabel?: string
  examDescription?: string
  durationSeconds?: number
  scorePerQuestion?: number
  officialQuestionCount?: number
  allowPractice?: boolean
  notice?: string
  types?: Partial<Record<QuestionType, number>>
  explanations?: number
  sourceCounts?: Record<string, unknown>
}

export interface BootstrapData {
  questions: Question[]
  questionBankManifest?: QuestionBankManifest
  records: ExamRecord[]
  wrongBook: WrongBookEntry[]
  progress: ProgressData
  activeExam: ActiveExam | null
  settings: SettingsData
}
