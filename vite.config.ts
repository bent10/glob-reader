/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    ssr: 'src/index.ts'
  },
  test: {
    globals: true,
    include: ['test/*.test.{ts,tsx}']
  }
})
