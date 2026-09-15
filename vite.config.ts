/// <reference types="vitest/config" />
import fs from 'node:fs'
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

  // mkcert로 발급한 사내망 LAN IP용 인증서(.certs/, gitignore 대상, PC별로 로컬
  // 생성). PWA 설치 테스트처럼 휴대폰에서 HTTPS로 접속해야 할 때만 있으면 되므로
  // 파일이 없으면 조용히 일반 HTTP로 동작한다.
  const certPath = path.resolve(import.meta.dirname, '.certs/cert.pem')
  const keyPath = path.resolve(import.meta.dirname, '.certs/key.pem')
  const https =
    fs.existsSync(certPath) && fs.existsSync(keyPath)
      ? { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }
      : undefined

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
      https,
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
            // 경호계획서·개인정보동의서는 전용 다운로드 API가 없고 저장 경로가 곧
            // 다운로드 URL이다(스웨거 GetDestroyDocDownload 설명). 백엔드가 정적 파일을
            // /files/<경로>로 서빙하므로 이 경로도 함께 프록시한다.
            '/files': {
              target: env.API_PROXY_TARGET,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    preview: {
      host: true,
      https,
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      // 캘린더 팝오버(생년월일 yearGrid 포함)를 여러 개 순차 조작하는 폼 테스트가
      // jsdom에서 무거워, 워커가 경합하는 풀 스위트 실행에서 기본 5초를 간헐적으로
      // 넘긴다 — 여유를 둬 flaky를 없앤다.
      testTimeout: 15000,
    },
  }
})
