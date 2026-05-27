import type { BootstrapData, StorageKey } from '../types'

const fallbackDefaults = {
  records: [],
  wrongBook: [],
  progress: { attemptedQuestionIds: [] },
  activeExam: null,
  settings: { questionBankVersion: 1 },
}

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const invoke = window.__TAURI__?.core?.invoke ?? window.__TAURI_INTERNALS__?.invoke
  if (typeof invoke !== 'function') throw new Error('Tauri runtime is unavailable')
  return invoke(command, args) as Promise<T>
}

function fallbackGet<T>(key: StorageKey): T {
  const saved = localStorage.getItem(`ai-question-exam:${key}`)
  return saved ? (JSON.parse(saved) as T) : (fallbackDefaults[key] as T)
}

export async function loadApplicationData(): Promise<BootstrapData> {
  if (window.__TAURI__ || window.__TAURI_INTERNALS__) return invokeTauri<BootstrapData>('bootstrap')
  if (window.examAPI) return window.examAPI.bootstrap()

  const questions = await fetch(`${import.meta.env.BASE_URL}question-bank/questions.json`).then((response) => {
    if (!response.ok) throw new Error('无法读取浏览器版本题库文件')
    return response.json()
  })

  return {
    questions,
    records: fallbackGet('records'),
    wrongBook: fallbackGet('wrongBook'),
    progress: fallbackGet('progress'),
    activeExam: fallbackGet('activeExam'),
    settings: fallbackGet('settings'),
  }
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
  localStorage.setItem(`ai-question-exam:${key}`, JSON.stringify(serializableValue))
}

export async function resolveDataDirectory(): Promise<string> {
  if (window.__TAURI__ || window.__TAURI_INTERNALS__) return invokeTauri<string>('get_data_directory')
  if (window.examAPI) return window.examAPI.getDataDirectory()
  return '浏览器本地存储（开发预览模式）'
}
