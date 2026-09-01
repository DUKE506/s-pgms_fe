# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 현황

`s-pgms`는 경찰(본청/지역경찰청/경찰서)과 민간 경비업체(본사)가 함께 사용하는 민간경호(신변보호) 배치·관리 시스템입니다. 프로젝트 개요, 계정 권한 체계, 업무 워크플로우, 화면 목록, 상태/관리번호 체계는 [`docs/project-overview.md`](docs/project-overview.md)를 참고하세요.

Phase 0(MSW mock, 로그인/인증, 라우터+가드, 공용 UI 세트+Tailwind/shadcn)는 완료됐고 현재 Phase 1(화면 구현)을 진행 중입니다. 진행 상태는 아래 로드맵/루프 문서 참고.

기술적 설계 결정(인증, 라우팅, 상태관리, 스타일링 등)은 [`docs/architecture.md`](docs/architecture.md) 참고.

개발 우선순위(Phase별 로드맵)는 [`docs/roadmap.md`](docs/roadmap.md) 참고.

**화면을 구현할 때는 반드시 [`.claude/loop-screens/`](.claude/loop-screens/)의 `TASK.md`(목표/정지조건), `LOOP_INSTRUCTIONS.md`(구현 절차), `PROGRESS.md`(진행 상태)를 먼저 확인하고 그 절차를 따르세요.** 핵심 규칙: 화면 1개 구현 후 스크린샷을 사용자에게 제시하고 **명시적 승인 전까지 다음 화면으로 넘어가지 않습니다.** (개인 메모리가 아니라 이 저장소에 커밋된 파일이 유일한 근거이므로, 어느 환경에서 작업하든 여기서부터 시작하세요.)

**백엔드 연동 작업을 할 때는 반드시 [`.claude/loop-backend/`](.claude/loop-backend/)의 `TASK.md`/`LOOP_INSTRUCTIONS.md`/`PROGRESS.md`를 먼저 확인하고 그 절차를 따르세요** (loop-screens와는 별도 loop — 완료 기준이 "스크린샷 승인"이 아니라 "API 연동 정확성 + 회귀 없음"이라 분리함, 2026-09-01 결정). 연동 대상 목록은 `docs/backend-integration-screen-api-matrix.md`(역할×화면×API), 그 외 `docs/backend-integration-*.md` — `analysis.md`(스웨거/DB 갭 분석), `issues.md`(백엔드/기획에 설계 변경을 요청할 사항), `process.md`(mock/백엔드 불일치를 다루는 프로세스 — 사소한 건 제외 후 `exclusions.md`에 기록, 막히는 건 `blockers.md`에 기록, 트레이드오프가 있으면 임의로 정하지 않고 사용자와 논의). 실제 DB 스키마는 `docs/db-dump/`, 스웨거 원본은 `docs/api-swagger.json`.

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
