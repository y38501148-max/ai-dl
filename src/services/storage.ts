import type { BootstrapData, Question, QuestionBankManifest, StorageKey } from '../types'

const fallbackDefaults = {
  records: [],
  wrongBook: [],
  progress: { attemptedQuestionIds: [] },
  activeExam: null,
  settings: { questionBankVersion: 3, questionBankTag: 'ds1-0.1.5', activeSubjectId: 'data-structure' },
}

const QUESTION_BANK_OVERRIDE_KEY = 'muz-choice-blank-bank:questionBankOverride'
const QUESTION_BANK_MANIFEST_KEY = 'muz-choice-blank-bank:questionBankManifest'

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const invoke = window.__TAURI__?.core?.invoke ?? window.__TAURI_INTERNALS__?.invoke
  if (typeof invoke !== 'function') throw new Error('Tauri runtime is unavailable')
  return invoke(command, args) as Promise<T>
}

function fallbackGet<T>(key: StorageKey): T {
  const saved = localStorage.getItem(`muz-choice-blank-bank:${key}`) ?? localStorage.getItem(`ai-question-exam:${key}`)
  return saved ? (JSON.parse(saved) as T) : (fallbackDefaults[key] as T)
}

function readBrowserQuestionBankOverride(): { questions: Question[]; manifest?: QuestionBankManifest } | null {
  const savedQuestions = localStorage.getItem(QUESTION_BANK_OVERRIDE_KEY)
  if (!savedQuestions) return null
  const questions = JSON.parse(savedQuestions) as Question[]
  const savedManifest = localStorage.getItem(QUESTION_BANK_MANIFEST_KEY)
  const manifest = savedManifest ? (JSON.parse(savedManifest) as QuestionBankManifest) : undefined
  return { questions, manifest }
}

export async function loadApplicationData(): Promise<BootstrapData> {
  if (window.__TAURI__ || window.__TAURI_INTERNALS__) return invokeTauri<BootstrapData>('bootstrap')
  if (window.examAPI) return window.examAPI.bootstrap()

  const embeddedManifest = await fetch(`${import.meta.env.BASE_URL}question-bank/manifest.json`)
    .then((response) => (response.ok ? response.json() : undefined))
    .catch(() => undefined)
  const override = readBrowserQuestionBankOverride()
  const questions =
    override?.questions ??
    (await fetch(`${import.meta.env.BASE_URL}question-bank/questions.json`).then((response) => {
      if (!response.ok) throw new Error('无法读取浏览器版本题库文件')
      return response.json()
    }))

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
  localStorage.setItem(QUESTION_BANK_OVERRIDE_KEY, JSON.stringify(questions))
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
