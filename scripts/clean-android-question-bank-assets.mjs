import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

rmSync(resolve('src-tauri/gen/android/app/src/main/assets/question-bank'), { recursive: true, force: true })
