/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // 같은 네트워크의 다른 기기(모바일 등)에서 IP로 접속해 확인할 수 있도록
    // localhost뿐 아니라 모든 네트워크 인터페이스에 바인딩한다.
    host: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
