import type { BootstrapData, Question, QuestionBankManifest, StorageKey } from '../types'
import { compareQuestionBankTags } from './questionBankVersion'
import { subjectOf } from './subjects'

const fallbackDefaults = {
  records: [],
  wrongBook: [],
  progress: { attemptedQuestionIds: [] },
  activeExam: null,
  settings: { questionBankVersion: 5, questionBankTag: 'multi-0.1.5.3-20260603', activeSubjectId: 'ai' },
}

const QUESTION_BANK_OVERRIDE_KEY = 'muz-choice-blank-bank:questionBankOverride'
const QUESTION_BANK_MANIFEST_KEY = 'muz-choice-blank-bank:questionBankManifest'
const QUESTION_BANK_SUBJECT_OVERRIDE_PREFIX = 'muz-choice-blank-bank:questionBankOverride:'

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const invoke = window.__TAURI__?.core?.invoke ?? window.__TAURI_INTERNALS__?.invoke
  if (typeof invoke !== 'function') throw new Error('Tauri runtime is unavailable')
  return invoke(command, args) as Promise<T>
}

function fallbackGet<T>(key: StorageKey): T {
  const saved = localStorage.getItem(`muz-choice-blank-bank:${key}`) ?? localStorage.getItem(`ai-question-exam:${key}`)
  return saved ? (JSON.parse(saved) as T) : (fallbackDefaults[key] as T)
}

function subjectOverrideKey(subjectId: string): string {
  return `${QUESTION_BANK_SUBJECT_OVERRIDE_PREFIX}${subjectId}`
}

function readBrowserQuestionBankOverride(): { questions: Question[]; manifest?: QuestionBankManifest } | null {
  const savedManifest = localStorage.getItem(QUESTION_BANK_MANIFEST_KEY)
  const manifest = savedManifest ? (JSON.parse(savedManifest) as QuestionBankManifest) : undefined

  if (manifest?.subjects?.length) {
    const subjectBanks = manifest.subjects.map((subject) => {
      const savedSubjectQuestions = localStorage.getItem(subjectOverrideKey(subject.id))
      return savedSubjectQuestions ? (JSON.parse(savedSubjectQuestions) as Question[]) : null
    })
    if (subjectBanks.every((questions): questions is Question[] => Array.isArray(questions))) {
      return { questions: subjectBanks.flat(), manifest }
    }
  }

  const savedQuestions = localStorage.getItem(QUESTION_BANK_OVERRIDE_KEY)
  if (!savedQuestions) return null
  const questions = JSON.parse(savedQuestions) as Question[]
  return { questions, manifest }
}

function clearBrowserQuestionBankOverride() {
  localStorage.removeItem(QUESTION_BANK_OVERRIDE_KEY)
  localStorage.removeItem(QUESTION_BANK_MANIFEST_KEY)
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(QUESTION_BANK_SUBJECT_OVERRIDE_PREFIX)) localStorage.removeItem(key)
  }
}

function selectBrowserQuestionBankOverride(
  override: { questions: Question[]; manifest?: QuestionBankManifest } | null,
  embeddedManifest?: QuestionBankManifest,
): { questions: Question[]; manifest?: QuestionBankManifest } | null {
  if (!override?.questions.length) return null
  if (!embeddedManifest?.bankTag) return override
  if (!override.manifest?.bankTag) {
    clearBrowserQuestionBankOverride()
    return null
  }

  const tagComparison = compareQuestionBankTags(override.manifest.bankTag, embeddedManifest.bankTag)
  const sameBankShape =
    override.questions.length === embeddedManifest.questionCount &&
    override.manifest.questionCount === embeddedManifest.questionCount
  if (tagComparison < 0 || (tagComparison === 0 && !sameBankShape)) {
    clearBrowserQuestionBankOverride()
    return null
  }
  return override
}

async function loadEmbeddedQuestionBank(manifest?: QuestionBankManifest): Promise<Question[]> {
  if (manifest?.subjects?.length) {
    const subjectBanks = await Promise.all(
      manifest.subjects.map(async (subject) => {
        const response = await fetch(`${import.meta.env.BASE_URL}question-bank/${subject.relativePath}`)
        if (!response.ok) throw new Error(`无法读取浏览器版本题库文件：${subject.relativePath}`)
        return (await response.json()) as Question[]
      }),
    )
    return subjectBanks.flat()
  }

  const response = await fetch(`${import.meta.env.BASE_URL}question-bank/questions.json`)
  if (!response.ok) throw new Error('无法读取浏览器版本题库文件')
  return response.json()
}

export async function loadApplicationData(): Promise<BootstrapData> {
  if (window.__TAURI__ || window.__TAURI_INTERNALS__) return invokeTauri<BootstrapData>('bootstrap')
  if (window.examAPI) return window.examAPI.bootstrap()

  const embeddedManifest = await fetch(`${import.meta.env.BASE_URL}question-bank/manifest.json`)
    .then((response) => (response.ok ? response.json() : undefined))
    .catch(() => undefined)
  const override = selectBrowserQuestionBankOverride(readBrowserQuestionBankOverride(), embeddedManifest)
  const questions = override?.questions ?? (await loadEmbeddedQuestionBank(embeddedManifest))

  return {
    questions,
    questionBankManifest: override?.manifest ?? embeddedManifest,
    records: fallbackGet('records'),
    wrongBook: fallbackGet('wrongBook'),
    progress: fallbackGet('progress'),
    activeExam: fallbackGet('activeExam'),
    settings: fallbackGet('settings'),
  }
}

export async function installQuestionBankData(
  questions: Question[],
  manifest: QuestionBankManifest,
): Promise<{ questionCount: number; bankTag?: string }> {
  if (window.__TAURI__ || window.__TAURI_INTERNALS__) {
    return invokeTauri<{ questionCount: number; bankTag?: string }>('install_question_bank', { questions, manifest })
  }
  localStorage.removeItem(QUESTION_BANK_OVERRIDE_KEY)
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(QUESTION_BANK_SUBJECT_OVERRIDE_PREFIX)) localStorage.removeItem(key)
  }
  if (manifest.subjects?.length) {
    for (const subject of manifest.subjects) {
      const subjectQuestions = questions.filter((question) => subjectOf(question) === subject.id)
      localStorage.setItem(subjectOverrideKey(subject.id), JSON.stringify(subjectQuestions))
    }
  } else {
    localStorage.setItem(QUESTION_BANK_OVERRIDE_KEY, JSON.stringify(questions))
  }
  localStorage.setItem(QUESTION_BANK_MANIFEST_KEY, JSON.stringify(manifest))
  return { questionCount: questions.length, bankTag: manifest.bankTag }
}

export async function saveApplicationData(key: StorageKey, value: unknown): Promise<void> {
  const serializableValue = JSON.parse(JSON.stringify(value)) as unknown
  if (window.__TAURI__ || window.__TAURI_INTERNALS__) {
    await invokeTauri('save_data', { key, value: serializableValue })
    return
  }
  if (window.examAPI) {
    await window.examAPI.save(key, serializableValue)
    return
  }
  localStorage.setItem(`muz-choice-blank-bank:${key}`, JSON.stringify(serializableValue))
}

export async function resolveDataDirectory(): Promise<string> {
  if (window.__TAURI__ || window.__TAURI_INTERNALS__) return invokeTauri<string>('get_data_directory')
  if (window.examAPI) return window.examAPI.getDataDirectory()
  return '浏览器本地存储（开发预览模式）'
}
