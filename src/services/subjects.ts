import type { Question, SubjectId } from '../types'

export interface SubjectConfig {
  id: SubjectId
  name: string
  title: string
  subtitle: string
  examLabel: string
  examDescription: string
  durationSeconds: number
  scorePerQuestion: number
  allowPractice: boolean
  notice?: string
}

export const SUBJECTS: SubjectConfig[] = [
  {
    id: 'ai',
    name: '人工智能导论',
    title: '人工智能导论题库',
    subtitle: '从 440 道题中随机组卷，覆盖单选、多选与判断训练。',
    examLabel: 'AI COURSE EXAM',
    examDescription: '随机抽取 50 道题，限时 60 分钟，每题 2 分。',
    durationSeconds: 60 * 60,
    scorePerQuestion: 2,
    allowPractice: true,
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
    allowPractice: true,
    notice:
      '注意：数据结构不会考原题，本应用中的题目为作业例题+自主命题，主要目的是为了帮助大家训练对于ds选填的能力，并不是原题！注意！',
  },
]

export const DEFAULT_SUBJECT_ID: SubjectId = 'ai'

export function subjectOf(question: Question): SubjectId {
  return question.subjectId ?? DEFAULT_SUBJECT_ID
}

export function getSubjectConfig(subjectId: SubjectId): SubjectConfig {
  return SUBJECTS.find((subject) => subject.id === subjectId) ?? SUBJECTS[0]
}

export function isSubjectId(value: unknown): value is SubjectId {
  return SUBJECTS.some((subject) => subject.id === value)
}
