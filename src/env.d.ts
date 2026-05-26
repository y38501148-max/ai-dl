/// <reference types="vite/client" />

import type { BootstrapData, StorageKey } from './types'

declare global {
  interface Window {
    examAPI?: {
      bootstrap: () => Promise<BootstrapData>
      save: (key: StorageKey, value: unknown) => Promise<boolean>
      getDataDirectory: () => Promise<string>
    }
  }
}

export {}

