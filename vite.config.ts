import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
      },
    },
    {
      name: 'include-question-bank-in-web-build',
      writeBundle() {
        const outputDirectory = resolve('dist/question-bank')
        mkdirSync(outputDirectory, { recursive: true })
        copyFileSync(resolve('resources/question-bank/questions.json'), resolve(outputDirectory, 'questions.json'))
      },
    },
  ],
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
