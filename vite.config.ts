import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig({
  base: './',
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
  ],
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
