import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'

const questionBankDirectory = resolve('resources/question-bank')

function copyDirectory(source: string, target: string) {
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  for (const item of readdirSync(source)) {
    const sourcePath = resolve(source, item)
    const targetPath = resolve(target, item)
    if (statSync(sourcePath).isDirectory()) copyDirectory(sourcePath, targetPath)
    else copyFileSync(sourcePath, targetPath)
  }
}

function copyQuestionBankAssets(outputDirectory: string) {
  copyDirectory(questionBankDirectory, outputDirectory)
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
        server.middlewares.use('/question-bank/', (request, response, next) => {
          if (!request.url) {
            next()
            return
          }
          const relativePath = decodeURIComponent(request.url.replace(/^\//, ''))
          const filePath = resolve(questionBankDirectory, relativePath)
          if (!filePath.startsWith(questionBankDirectory) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
            next()
            return
          }
          const extension = extname(filePath).toLowerCase()
          const contentType =
            extension === '.json'
              ? 'application/json; charset=utf-8'
              : extension === '.png'
              ? 'image/png'
              : extension === '.jpg' || extension === '.jpeg'
                ? 'image/jpeg'
                : extension === '.webp'
                  ? 'image/webp'
                  : extension === '.svg'
                    ? 'image/svg+xml'
                    : 'application/octet-stream'
          response.setHeader('Content-Type', contentType)
          response.setHeader('X-Question-Bank-Path', relative(questionBankDirectory, filePath))
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
