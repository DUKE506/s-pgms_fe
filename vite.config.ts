/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_ 접두어 없이도 전부 읽음 — 클라이언트 번들에 노출되면 안 되는(백엔드
  // 내부 주소) dev 서버 전용 값이라 일부러 export하지 않는다.
  const env = loadEnv(mode, process.cwd(), '')

  return {
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
      // 백엔드 연동(Phase 5)이 끝난 API(/api/v1/*)는 실제 백엔드로 프록시한다.
      // 미연동 화면은 MSW가 계속 처리(onUnhandledRequest:'bypass') — 화면 단위로
      // 점진 전환되므로 프록시 대상 경로도 자연히 늘어난다. .env.local에
      // API_PROXY_TARGET이 없으면(이 컴퓨터 밖) 프록시를 아예 안 걸어 미설정
      // 상태에서도 dev 서버가 정상 기동하게 한다.
      proxy: env.API_PROXY_TARGET
        ? {
            '/api/v1': {
              target: env.API_PROXY_TARGET,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  }
})
