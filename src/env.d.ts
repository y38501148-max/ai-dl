/// <reference types="vite/client" />

import type { BootstrapData, StorageKey } from './types'

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>
      }
    }
    __TAURI_INTERNALS__?: {
      invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>
    }
    examAPI?: {
      bootstrap: () => Promise<BootstrapData>
      save: (key: StorageKey, value: unknown) => Promise<boolean>
      getDataDirectory: () => Promise<string>
    }
  }
}

export {}
