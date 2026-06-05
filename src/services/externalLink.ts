import { openUrl } from '@tauri-apps/plugin-opener'

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const invoke = window.__TAURI__?.core?.invoke ?? window.__TAURI_INTERNALS__?.invoke
  if (typeof invoke !== 'function') throw new Error('Tauri runtime is unavailable')
  return invoke(command, args) as Promise<T>
}

function isTauriRuntime(): boolean {
  return Boolean(window.__TAURI__ || window.__TAURI_INTERNALS__)
}

function openInBrowser(url: string): void {
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) window.location.assign(url)
}

export async function openExternalLink(url: string): Promise<void> {
  if (!url.startsWith('https://github.com/y38501148-max/AI-DL/releases')) {
    throw new Error('不支持打开该外部链接')
  }

  if (isTauriRuntime()) {
    try {
      await openUrl(url)
      return
    } catch {
      // Keep the existing app command as a fallback for older desktop runtimes.
    }
    try {
      await invokeTauri<boolean>('open_external_url', { url })
      return
    } catch {
      openInBrowser(url)
      return
    }
  }

  openInBrowser(url)
}
