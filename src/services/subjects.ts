import type { Question, QuestionBankManifest, QuestionBankSubjectManifest, QuestionType, SubjectId } from '../types'

export interface SubjectConfig {
  id: SubjectId
  name: string
  title: string
  subtitle: string
  examLabel: string
  examDescription: string
  durationSeconds: number
  scorePerQuestion: number
  officialQuestionCount: number
  officialQuestionTypes?: QuestionType[]
  allowPractice: boolean
  examRules: string[]
  notice?: string
}

const STATIC_SUBJECTS: SubjectConfig[] = [
  {
    id: 'ai',
    name: '人工智能导论',
    title: '人工智能导论题库',
    subtitle: '从 440 道题中随机组卷，覆盖单选、多选与判断训练。',
    examLabel: 'AI COURSE EXAM',
    examDescription: '随机抽取 100 道题，限时 60 分钟，每题 1 分。',
    durationSeconds: 60 * 60,
    scorePerQuestion: 1,
    officialQuestionCount: 100,
    officialQuestionTypes: ['single', 'multiple', 'boolean'],
    allowPractice: true,
    examRules: ['考试时长 60 分钟，超时自动交卷。', '随机抽取 100 道题，每题 1 分，题型包含单选、多选与判断。', '考试界面仅显示本场题号，不显示题库原编号。'],
  },
  {
    id: 'data-structure',
    name: '数据结构',
    title: '数据结构选填训练',
    subtitle: '围绕字符串、结构体、指针、链表、栈、队列、树、图、排序与查找训练选择题与填空题。',
    examLabel: 'DATA STRUCTURE EXAM',
    examDescription: '随机抽取 10 道选择题与 10 道填空题，限时 60 分钟，每题 5 分。',
    durationSeconds: 60 * 60,
    scorePerQuestion: 5,
    officialQuestionCount: 20,
    allowPractice: true,
    examRules: ['考试时长 60 分钟，超时自动交卷。', '随机抽取 10 道选择题与 10 道填空题，每题 5 分。', '考试包含 C 代码书写区，考试记录会自动保存。'],
    notice:
      '注意：数据结构不会考原题，本应用中的题目为作业例题+自主命题，主要目的是为了帮助大家训练对于ds选填的能力，并不是原题！注意！',
  },
]

export const DEFAULT_SUBJECT_ID: SubjectId = 'ai'

export function subjectOf(question: Question): SubjectId {
  return question.subjectId ?? DEFAULT_SUBJECT_ID
}

function formatSubjectName(subjectId: SubjectId): string {
  return subjectId
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ') || '未命名科目'
}

function defaultSubjectConfig(subjectId: SubjectId, questionCount?: number): SubjectConfig {
  const name = formatSubjectName(subjectId)
  const countText = questionCount ? `从 ${questionCount} 道题中随机组卷。` : '从当前题库中随机组卷。'
  return {
    id: subjectId,
    name,
    title: `${name}题库`,
    subtitle: countText,
    examLabel: `${subjectId.toUpperCase()} EXAM`,
    examDescription: '随机抽取最多 50 道题，限时 60 分钟，每题 2 分。',
    durationSeconds: 60 * 60,
    scorePerQuestion: 2,
    officialQuestionCount: 50,
    allowPractice: true,
    examRules: ['考试时长 60 分钟，超时自动交卷。', '默认随机抽取最多 50 道题，每题 2 分。', '考试界面仅显示本场题号，不显示题库原编号。'],
  }
}

function subjectFromManifest(subject: QuestionBankSubjectManifest): SubjectConfig {
  const fallback = getStaticSubjectConfig(subject.id) ?? defaultSubjectConfig(subject.id, subject.questionCount)
  return {
    ...fallback,
    name: subject.name ?? fallback.name,
    title: subject.title ?? fallback.title,
    subtitle: subject.subtitle ?? fallback.subtitle,
    examLabel: subject.examLabel ?? fallback.examLabel,
    examDescription: subject.examDescription ?? fallback.examDescription,
    durationSeconds: subject.durationSeconds ?? fallback.durationSeconds,
    scorePerQuestion: subject.scorePerQuestion ?? fallback.scorePerQuestion,
    officialQuestionCount: subject.officialQuestionCount ?? fallback.officialQuestionCount,
    officialQuestionTypes: subject.officialQuestionTypes ?? fallback.officialQuestionTypes,
    examRules: subject.examRules ?? fallback.examRules,
    allowPractice: subject.allowPractice ?? fallback.allowPractice,
    notice: subject.notice ?? fallback.notice,
  }
}

function getStaticSubjectConfig(subjectId: SubjectId): SubjectConfig | undefined {
  return STATIC_SUBJECTS.find((subject) => subject.id === subjectId)
}

export function getSubjectConfig(subjectId: SubjectId): SubjectConfig {
  return getStaticSubjectConfig(subjectId) ?? defaultSubjectConfig(subjectId)
}

export function getSubjectConfigs(manifest: QuestionBankManifest | undefined, questions: Question[]): SubjectConfig[] {
  const subjectIds = new Set<SubjectId>()
  const configs = new Map<SubjectId, SubjectConfig>()
  const counts = new Map<SubjectId, number>()
  questions.forEach((question) => {
    const subjectId = subjectOf(question)
    subjectIds.add(subjectId)
    counts.set(subjectId, (counts.get(subjectId) ?? 0) + 1)
  })
  manifest?.subjects?.forEach((subject) => {
    subjectIds.add(subject.id)
    configs.set(subject.id, subjectFromManifest(subject))
  })
  for (const subject of STATIC_SUBJECTS) {
    if (subjectIds.has(subject.id) || !manifest?.subjects?.length) configs.set(subject.id, subject)
  }
  for (const subjectId of subjectIds) {
    if (!configs.has(subjectId)) configs.set(subjectId, defaultSubjectConfig(subjectId, counts.get(subjectId)))
  }
  return [...configs.values()].filter((subject) => subjectIds.has(subject.id) || subject.id === DEFAULT_SUBJECT_ID)
}

export function isSubjectId(value: unknown, subjects: SubjectConfig[] = STATIC_SUBJECTS): value is SubjectId {
  return typeof value === 'string' && subjects.some((subject) => subject.id === value)
}
