import type { BootstrapData, StorageKey } from '../types'

const fallbackDefaults = {
  records: [],
  wrongBook: [],
  progress: { attemptedQuestionIds: [] },
  activeExam: null,
  settings: { questionBankVersion: 1 },
}

function fallbackGet<T>(key: StorageKey): T {
  const saved = localStorage.getItem(`ai-question-exam:${key}`)
  return saved ? (JSON.parse(saved) as T) : (fallbackDefaults[key] as T)
}

export async function loadApplicationData(): Promise<BootstrapData> {
  if (window.examAPI) return window.examAPI.bootstrap()

  const questions = await fetch('/question-bank/questions.json').then((response) => {
    if (!response.ok) throw new Error('无法读取开发模式下的题库文件')
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
  if (window.examAPI) {
    await window.examAPI.save(key, serializableValue)
    return
  }
  localStorage.setItem(`ai-question-exam:${key}`, JSON.stringify(serializableValue))
}

export async function resolveDataDirectory(): Promise<string> {
  if (window.examAPI) return window.examAPI.getDataDirectory()
  return '浏览器本地存储（开发预览模式）'
}
