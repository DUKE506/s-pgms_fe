# 아키텍처 결정 기록

개발 진행하면서 확정된 기술적 설계 결정을 주제별로 기록합니다.

## 인증/로그인

- 방식: 자체 ID/PW 로그인 + JWT(accessToken, refreshToken)
- 저장 위치: 둘 다 localStorage (추후 백엔드와 협의되면 refreshToken을 HttpOnly 쿠키로 전환 검토)
- 토큰 갱신: accessToken 만료 시 refreshToken으로 재발급 요청 → 헤더 갱신 → 원 요청 재시도 (인터셉터 패턴)
- 로그인 화면: 경찰(`/`)과 본사(`/admin`)로 완전히 분리
- 로그인 후 기본 경로: 각 진입점 하위의 `/dashboard`, `/history` 등 구체 경로로 이동 (루트 경로 자체엔 컨텐츠 없음)
- 권한 모델: role은 한글 문자열로 관리(본청/지역청/경찰서/게스트/시스템관리자/운영관리자/본부관리자). 게스트는 경찰서가 발급하는 별도 role로, 할당된 경호건만 조회 가능한 축소 권한. 화면/버튼 단위 접근 제어는 역할별로 화면을 분리하지 않고 공용 컴포넌트 + `usePermission()` 훅으로 조건부 처리
- 미인증 접근: 로그인 화면으로 리다이렉트
- 권한 없는 접근: 대상 라우트를 렌더링하지 않고 라우트 가드 단계에서 차단 + 토스트 알림 후 이전 화면/로그인 후 기본 화면으로 리다이렉트
- 게스트 계정: 경찰서(피전)가 발급/관리. 타 관할 협조 시 특정 경호건만 볼 수 있는 계정을 발급해 경찰 로그인 화면에서 로그인

### 로그인/토큰 갱신 API 계약 (MSW mock 기준)

- `POST /api/auth/police/login`, `POST /api/auth/company/login` — 요청 `{ id, password }`, 응답 `{ user: { id, name, role }, accessToken, refreshToken }`. 실패 시 401
- `POST /api/auth/refresh` — 요청 `{ refreshToken }`, 응답 `{ accessToken, refreshToken }` (재발급 시 둘 다 새로 발급/rotate). refreshToken 자체가 유효하지 않으면 401 → 클라이언트는 로그아웃 처리
- 인터셉터: `apiFetch` (`src/features/auth/api/client.ts`)가 401 응답을 받으면 `/api/auth/refresh` 호출 → 성공 시 새 accessToken으로 원 요청 1회만 재시도, 실패 시 세션 클리어
- 로그인 성공 후 이동 경로는 role마다 다름 — `getDefaultRouteForRole()` (`src/features/auth/lib/defaultRoute.ts`)가 유일한 매핑 소스: 본청/지역청 → `/dashboard`, 경찰서/게스트 → `/security-cases`, 시스템관리자/운영관리자/본부관리자 → `/admin/dashboard`. `ProtectedRoute`가 권한 없는 접근을 리다이렉트할 때도 같은 함수를 사용

## 라우팅

- 라이브러리: `react-router` (v7)
- 모바일: 별도 라우트로 분리하지 않고 단일 라우트 + 반응형 레이아웃으로 처리 (PWA 적용 여부와 무관한 결정)
- 라우트 가드: `<ProtectedRoute allow={[...]}>` 래퍼 컴포넌트로 구현 (loader 방식 아님, `src/app/ProtectedRoute.tsx`). Zustand 스토어를 렌더링 시점에 동기적으로 읽어 판단하므로 별도 비동기 처리 없이 렌더 전에 차단 가능. 미인증이면 현재 경로가 `/admin`으로 시작하는지로 진영을 판별해 해당 로그인으로 리다이렉트, 권한 없는 role이면 토스트 알림 후 `getDefaultRouteForRole()`로 리다이렉트
- URL 세그먼트는 영어(kebab-case), 화면에 보이는 라벨은 한글 유지. 경호건은 `security-case`로 표기
- 모달로 처리하는 화면(담당자 배정, 게스트 발급, 근무자 등록)은 별도 라우트를 주지 않고 목록 페이지 내 UI 상태로 처리
- 아직 실제 화면이 없는 라우트는 `ScreenPlaceholder`(`src/shared/components/ScreenPlaceholder.tsx`, 라벨 + 목업 anchor id 표시)로 채워져 있으며 roadmap Phase 1-4에서 화면이 만들어질 때마다 하나씩 교체됨
- 토스트 알림: `useToastStore`(`src/shared/hooks/useToastStore.ts`) + `ToastViewport`(`src/shared/components/ToastViewport.tsx`, `App.tsx`에 전역 마운트)
- `usePermission(allow)` 훅(`src/shared/hooks/usePermission.ts`): `ProtectedRoute`와 같은 role 체크 로직을 재사용 — 화면 내 버튼/영역 단위 조건부 렌더링에 사용 예정

### 경찰 (`/`)

| 경로                     | 화면                            | 비고                                    |
| ------------------------ | ------------------------------- | ---------------------------------------- |
| `/`                      | 로그인                          | 비인증 시                                |
| `/dashboard`             | 1, 2 (현황 대시보드)            | role별 scope만 다름, 같은 라우트 공유. 본청/지역청/경찰서 (게스트 제외) |
| `/history`               | 1h, 2h, 8 (이력 조회 목록)      | 본청/지역청/경찰서 공통, role별 scope만 다름 |
| `/history/:id`           | 1h/2h/8h (이력 상세)            | 본청/지역청/경찰서 공통                  |
| `/security-cases`        | 3 (경호목록)                    | 경찰서/게스트                            |
| `/security-cases/new`    | 4 (접수/배치요구서 작성)        | 경찰서 전용 (게스트 제외)                |
| `/security-cases/:id`    | 5 (경호 상세, 연장·단축 모달 포함) | 경찰서/게스트                          |
| `/guests`                | 9 (게스트 계정 관리, 목록)      | 경찰서 전용 (게스트 제외). 발급(10)은 목록 내 모달 |

### 본사 (`/admin`)

| 경로                            | 화면                        | 비고                              |
| ------------------------------- | --------------------------- | ---------------------------------- |
| `/admin`                        | 로그인                      | 비인증 시                          |
| `/admin/dashboard`              | 6 (전체 대시보드)           |                                     |
| `/admin/requests`               | 6b (배치요청 목록)          | 담당자 배정(6c)은 목록 내 모달     |
| `/admin/security-cases`         | 6d (경호목록)               |                                     |
| `/admin/security-cases/:id`     | 7 (배정 경호건 상세)        |                                     |
| `/admin/workers`                | 11 (근무자 목록/등록)       | 등록은 목록 내 모달                |
| `/admin/history`                | 12 (이력 조회)              |                                     |

## 스타일링 / UI

- CSS: **Tailwind CSS v4** (`@tailwindcss/vite` 플러그인, config-less CSS-first 방식 — `tailwind.config.js` 없이 `src/index.css`의 `@theme`에서 토큰 정의)
- 컴포넌트: **shadcn/ui** (`radix-nova` 스타일, Radix UI 기반). `npx shadcn@latest add <component>`로 필요한 컴포넌트를 `src/components/ui/`에 그때그때 추가 — npm 패키지가 아니라 소스를 프로젝트에 복사해오는 방식이라 자유롭게 커스터마이징
- import 별칭: `@/*` → `./src/*` (`tsconfig.json`/`tsconfig.app.json`의 `paths`, `vite.config.ts`의 `resolve.alias`)
- 폰트: **Pretendard Variable** (`pretendard` npm 패키지, dynamic subset — 브라우저가 실제 쓰는 글자의 유니코드 범위만 골라 요청). 목업 전체가 Pretendard 단일 폰트, weight 400/500/600/700만 사용
- 디자인 토큰은 `docs/PGMS_UI_mock.dc.html` 목업에서 실측한 값 — 색상 사용 빈도를 직접 세어서 추출함:
  - neutral(회색) 팔레트가 Tailwind 기본 `slate`와 정확히 일치해 커스텀 팔레트 없이 그대로 사용 (`--background`=slate-100, `--foreground`=slate-900 등)
  - 경호건 상태 배지 6색(`docs/project-overview.md` "상태 정의" 표)을 `--color-status-*` 토큰으로 노출 (`bg-status-assigned` 등으로 사용). 6개 중 접수/경호완료/종결/취소 4개는 Tailwind 기본 gray-500/blue-600/slate-700/red-600과 동일하지만, 상태뱃지 컴포넌트가 이 6개 토큰만 참조하면 되도록 하나의 semantic 세트로 통일. 배정(`#F0B20A`)/경호중(`#15AB59`) 2개만 실제 커스텀 값
  - radius는 shadcn 기본값(`--radius: 0.625rem`)이 목업 실측치(카드/인풋 10~12px)와 근접해 그대로 사용
  - 사이드바 전용 토큰(`--sidebar-*`)은 목업의 다크 slate-900 사이드바를 기준으로 잡았고, 아래 `Sidebar` 컴포넌트로 실제 검증함
  - 다크모드(`.dark` 블록)는 제품 요구사항이 아니라 shadcn 기본값(grayscale) 그대로 둠 — status 6색만 라이트와 동일하게 고정

### 공용 UI 세트

- shadcn 컴포넌트: `Button`, `Card`, `Table`, `Dialog`, `Input`, `Label`, `Select` (`src/components/ui/`, 필요할 때마다 `npx shadcn add <component>`로 추가). `Button`의 `outline` variant는 기본값(`bg-background`)이 페이지 배경과 같은 색이라 `bg-card`(흰색)로 수정해둠 — shadcn CLI로 다른 컴포넌트를 다시 추가하면서 `button.tsx`가 덮어써지면 이 수정도 같이 사라지니 재적용 필요. `Table`의 `TableHeader`도 같은 이유로 헤더 배경(`bg-slate-50`, 목업 실측 `#f8fafc`)을 추가해둠
- `StatusBadge`(`src/shared/components/StatusBadge.tsx`): 경호건 상태 6개 → `--color-status-*` 토큰 매핑
- `Sidebar`(`src/shared/components/Sidebar.tsx`): 도메인 무관 rail 프리미티브. `xl`(1280px) 이상에서 좌측 고정 76px 세로 rail, 그 미만은 전부 모바일 취급해 하단 고정 플로팅 pill 아이콘 바로 반응형 전환 (목업이 데스크톱 1920px/모바일 390px 두 크기만 제공하고 중간 태블릿 크기가 없어서, 그 사이 전부를 모바일 레이아웃으로 처리하기로 함). nav 항목 목록(`items`)은 도메인이 주입
- `PoliceAppShell`(`src/features/police/layout/PoliceAppShell.tsx`), `CompanyAppShell`(`src/features/company/layout/CompanyAppShell.tsx`): `Sidebar` + 콘텐츠 영역을 조합하는 도메인별 레이아웃. `routes.tsx`의 모든 경찰/본사 화면 라우트가 `ProtectedRoute` 안에서 이 셸로 감싸짐 (로그인 화면 2개는 셸 없음). 경찰 sidebar 항목은 role별로 다름 — 본청/지역청은 `현황`+`이력` 2개, 경찰서는 `현황`+`경호목록`+`이력`+`게스트` 4개, 게스트는 `경호목록` 1개만. 본사는 role 무관 `대시보드`+`경호관리`+`근무자`+`이력` 4개 고정. 로그아웃 버튼도 여기 포함 (`useAuthStore.getState().logout()` + 진영별 로그인으로 이동)
- 로그인 화면 2개(`PoliceLoginPage`, `CompanyLoginPage`)는 `Card`+`Input`+`Label`+`Button`으로 재스타일링. `CardTitle`은 시맨틱 heading이 아닌 `div`라 접근성/테스트를 위해 쓰지 않고, 같은 스타일 클래스를 적용한 실제 `<h1>`을 직접 사용
- 로고 배지 텍스트("PGMS")는 목업에서 화면마다 다르게 표기된 것(회사는 "SL", 본청은 "본청" 등)을 통일한 것 — 실제 요구사항이 확정되면 변경
- 본사 화면 상단 breadcrumb: 목업은 화면마다 "에스텍 본사 / 메뉴명"(상세는 "에스텍 본사 / 메뉴명 / 케이스ID") 형태로 조직명을 접두어로 붙이지만, 본사 모드는 에스텍 직원만 쓰는 화면이라 조직명 표시가 불필요하다고 판단해 "에스텍 본사" 접두어는 뺌(2026-08-21, 배치요청 목록 화면에서 결정, 이후 구현하는 본사 화면에도 동일 적용). 그 위에 추가로: breadcrumb 남은 부분이 바로 아래 `h1`과 완전히 겹치는 최상위 목록 화면(예: 경호관리 목록 — breadcrumb "경호관리" = h1 "경호관리")은 breadcrumb 자체를 생략하고 `h1`만 표시. 반대로 상세 화면(`h1`이 케이스 식별자 등 다른 텍스트라 겹치지 않는 경우, 예: `/admin/security-cases/:id`)은 "경호관리 / 26-02-강남경찰서"처럼 부모 메뉴명 + 현재 항목 breadcrumb를 유지
- 경찰 화면 상단 breadcrumb: 본사와 달리 "지역청 / 경찰서명"(예: "서울지방경찰청 / 강남경찰서")으로 실제 소속 조직 정보를 담아 화면마다 다르므로, 위 본사 규칙과 달리 h1과 겹치는 목록 화면(예: 경찰서 경호목록 `/security-cases`)에서도 생략하지 않고 유지한다(2026-08-25, 경찰서 경호목록 화면에서 결정). 데이터는 응답으로 받은 케이스의 `jurisdiction` 필드에서 가져오며(mock 내부 매핑을 화면단에서 직접 import하지 않음), 목록이 비어 있으면 지역청 없이 소속 경찰서명만 표시

## 폴더 구조

기능(도메인) 기준 — 경찰과 본사가 화면을 거의 공유하지 않는 별개 도메인이라 채택.

```
src/
  app/                     # 라우터 설정, 전역 프로바이더
  features/
    police/                # 경찰 도메인 (본청/지역청/경찰서/게스트 공통)
      pages/, components/, hooks/, api/
    company/                # 본사 도메인
      pages/, components/, hooks/, api/
    auth/                   # 로그인 화면(경찰/본사), 토큰관리, usePermission
      pages/, hooks/, api/
  shared/                   # 도메인 무관 공용 (버튼/테이블/상태뱃지/모달 등 UI 프리미티브)
    components/, hooks/, lib/, types/
  components/ui/            # shadcn/ui가 생성하는 원본 컴포넌트 (shadcn CLI 전용, 직접 수정 지양)
  lib/utils.ts              # shadcn의 cn() 헬퍼 (shadcn init이 생성)
  mocks/                    # MSW 핸들러
```

`components/ui/`는 shadcn CLI(`npx shadcn add <component>`)가 관리하는 원본 primitive이고, `shared/components/`는 그걸 조합해 만드는 우리 프로젝트 전용 공용 컴포넌트 — 계층이 다르다.

테스트는 대상 파일 옆에 co-locate (예: `Component.test.tsx`).

## 상태관리

- 서버 상태(경호건 목록/상세, 배치요청 등 API 데이터): **TanStack Query**. 로딩/에러/캐싱/재요청을 직접 구현하지 않고 활용. MSW mock 단계와 궁합이 좋고, 이후 실제 API 전환 시 fetch 함수만 교체하면 됨
- 클라이언트 전역 상태(로그인 사용자 정보, role, accessToken/refreshToken): **Zustand**. fetch 래퍼의 401 인터셉트 로직 등 React 컴포넌트 트리 밖에서도 `getState()`로 동기 접근 가능해서 채택 (Context API는 트리 밖에서 접근이 번거로움)
- UI 로컬 상태(모달 열림/닫힘 등): 전역 상태 대신 컴포넌트 로컬 `useState`

## API / 백엔드

- 백엔드: 별도 ASP.NET 백엔드 개발자가 개발 중 (아직 개발 단계, API 미확정)
- 프론트 개발 전략: MSW(Mock Service Worker)로 mock API를 먼저 구축해 화면 개발을 진행하고, 실제 API가 준비되면 fetch 함수만 교체
- 데이터 모델 설계 방향: DB 스키마를 먼저 정하지 않고, 화면이 필요로 하는 필드를 기준으로 먼저 설계한다 (DB는 아직 미확정이며 UI 요구에 따라 바뀔 수 있음). 이렇게 도출된 데이터 형태가 사실상 ASP.NET 백엔드에 제안하는 API 계약안이 됨

### MSW mock 구조

- 폴더: `src/mocks/handlers/`(도메인별 분리: `auth.ts`, `security-case.ts`, `worker.ts`, `guest.ts`), `src/mocks/data/`(in-memory fixture), `src/mocks/browser.ts`(dev worker), `src/mocks/server.ts`(vitest node server)
- Phase 0-1 범위 우선 구현: 계정/사용자(로그인), 경호건(상태머신 + 관리번호/경호코드 발급 규칙), 배치요청
- 상태 저장: in-memory 배열을 요청마다 mutate하는 간단한 store (DB 아님, 새로고침/HMR 시 리셋)
- 통합: `main.tsx`는 `import.meta.env.DEV`일 때만 worker 시작, Vitest는 `setupTests.ts`에서 `server.listen()/resetHandlers()/close()` 훅 연동
- 실제 API 전환 대비: `features/*/api/`의 fetch 함수 안에서만 엔드포인트를 참조 — 전환 시 그 함수만 교체
