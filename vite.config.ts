import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { extname, resolve } from 'node:path'

function copyQuestionBankAssets(outputDirectory: string) {
  mkdirSync(outputDirectory, { recursive: true })
  copyFileSync(resolve('resources/question-bank/questions.json'), resolve(outputDirectory, 'questions.json'))
  const sourceAssetDirectory = resolve('resources/question-bank/ds-assets')
  if (!existsSync(sourceAssetDirectory)) return
  const targetAssetDirectory = resolve(outputDirectory, 'ds-assets')
  mkdirSync(targetAssetDirectory, { recursive: true })
  for (const file of readdirSync(sourceAssetDirectory)) {
    copyFileSync(resolve(sourceAssetDirectory, file), resolve(targetAssetDirectory, file))
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? './',
  server: {
    host: process.env.TAURI_DEV_HOST ?? '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  plugins: [
    vue(),
    {
      name: 'serve-question-bank-during-development',
      configureServer(server) {
        server.middlewares.use('/question-bank/questions.json', (_request, response, next) => {
          try {
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(readFileSync(resolve('resources/question-bank/questions.json')))
          } catch {
            next()
          }
        })
        server.middlewares.use('/question-bank/ds-assets/', (request, response, next) => {
          if (!request.url) {
            next()
            return
          }
          const fileName = decodeURIComponent(request.url.replace(/^\//, ''))
          const filePath = resolve('resources/question-bank/ds-assets', fileName)
          if (!existsSync(filePath)) {
            next()
            return
          }
          const extension = extname(filePath).toLowerCase()
          const contentType =
            extension === '.png' ? 'image/png' : extension === '.svg' ? 'image/svg+xml' : 'application/octet-stream'
          response.setHeader('Content-Type', contentType)
          createReadStream(filePath).pipe(response)
        })
      },
    },
    {
      name: 'include-question-bank-in-web-build',
      writeBundle() {
        copyQuestionBankAssets(resolve('dist/question-bank'))
      },
    },
  ],
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
