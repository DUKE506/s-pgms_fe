# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 현황

`s-pgms`는 경찰(본청/지역경찰청/경찰서)과 민간 경비업체(본사)가 함께 사용하는 민간경호(신변보호) 배치·관리 시스템입니다. 프로젝트 개요, 계정 권한 체계, 업무 워크플로우, 화면 목록, 상태/관리번호 체계는 [`docs/project-overview.md`](docs/project-overview.md)를 참고하세요.

코드 자체는 아직 `npm create vite` 스캐폴드 상태이며, `src/App.tsx`도 기본 카운터 예제 그대로입니다.

기술적 설계 결정(인증, 라우팅, 상태관리 등)은 [`docs/architecture.md`](docs/architecture.md) 참고.

개발 우선순위(Phase별 로드맵)는 [`docs/roadmap.md`](docs/roadmap.md) 참고.

## 명령어

- `npm run dev` — Vite 개발 서버 실행 (HMR)
- `npm run build` — `tsc -b`로 타입체크 후 프로덕션 빌드
- `npm run lint` — ESLint 실행
- `npm run preview` — 프로덕션 빌드 결과물을 로컬에서 미리보기
- `npm run test` — Vitest 테스트 실행

## 아키텍처 노트

- 진입점: `src/main.tsx`가 `index.html`의 `#root`에 `<App />`(`src/App.tsx`)를 마운트함
- **React Compiler가 활성화되어 있음** (`vite.config.ts`에서 `@rolldown/plugin-babel`을 통해 `babel-plugin-react-compiler` 적용). `useMemo`/`useCallback`/`React.memo` 같은 수동 메모이제이션은 대부분 불필요함 — 컴파일러가 처리함.
- TypeScript는 project references 구조 사용: 루트 `tsconfig.json`은 `tsconfig.app.json`(앱 코드)과 `tsconfig.node.json`(Vite 설정)만 참조함. 반드시 `tsc -b`로 빌드해야 하며(단순 `tsc` 아님) 이 분리 구조를 존중해야 함.
- ESLint는 flat config 형식(`eslint.config.js`) 사용: `typescript-eslint` recommended 규칙 + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`. 타입 인식(type-aware) lint 규칙은 아직 활성화되어 있지 않음.
