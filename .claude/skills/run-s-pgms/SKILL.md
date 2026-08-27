---
name: run-s-pgms
description: s-pgms 웹앱(Vite + React)을 빌드/실행/구동해서 검증한다 — dev server를 띄우고, 경찰/본사 테스트 계정으로 로그인하고, 화면을 클릭해보고, 스크린샷을 찍고, 콘솔 에러를 확인한다. s-pgms를 실행/시작/스크린샷하거나, 변경사항이 실제 앱에서 (테스트만이 아니라) 동작하는지 확인해달라는 요청에 사용한다.
---

s-pgms는 Vite + React + TypeScript SPA다 (경찰/본사 배치·관리 시스템, 아직
초기 단계 — `../../../docs/project-overview.md` 참고). 에이전트/자동화
용도로는 이 스킬 디렉터리의 Playwright REPL 드라이버(`driver.mjs`)로
구동한다. 아래 경로는 모두 저장소 루트(`s-pgms/`) 기준 상대 경로다.

## 사전 준비

```bash
npm install
npx playwright install chromium   # 약 300MB, 최초 1회만; node_modules 밖에 캐시됨
```

## 실행 (에이전트 경로)

드라이버 stdin에 커맨드를 파이프로 흘려보낸다 — tmux 불필요, 한 줄씩
순차 처리하고 다음 줄로 넘어가기 전에 결과를 출력한다:

```bash
node .claude/skills/run-s-pgms/driver.mjs <<'EOF'
start-server
launch
login-police gangnam password123
wait text=경호목록
ss 01-police-security-cases
storage
console
quit
EOF
```

스크린샷은 `.claude/skills/run-s-pgms/shots/`에 저장된다 (`SCREENSHOT_DIR`로
재정의 가능). dev server는 고정 포트(`5199`, `PORT`로 재정의 가능)에서 떠서
수동으로 띄운 `npm run dev`와 충돌하지 않는다.

### 커맨드

| 커맨드 | 하는 일 |
|---|---|
| `start-server` | 드라이버 포트에서 `npm run dev` 실행, 응답할 때까지 대기 |
| `stop-server` | 드라이버 포트에서 리스닝 중인 프로세스를 kill |
| `launch` | 필요하면 서버부터 띄운 뒤, headless Chromium 실행 |
| `viewport <width> <height>` | 브라우저 뷰포트 크기 변경 (반응형/모바일 확인용, 예: `viewport 390 844`) |
| `nav <path>` | `http://localhost:<port><path>`로 이동 |
| `login-police <id> <password>` | `/`로 이동, 경찰 로그인 폼 채우고 제출 |
| `login-company <id> <password>` | `/admin`으로 이동, 본사 로그인 폼 채우고 제출 |
| `fill <selector> <text...>` | input 채우기 |
| `click <selector>` | CSS 셀렉터로 클릭 |
| `click-text <text>` | 해당 텍스트를 포함한 요소 클릭 |
| `wait <selector-or-text=...>` | 셀렉터가 나타날 때까지 최대 10초 대기 (Playwright `text=` 로케이터 사용 가능) |
| `ss [name]` | 스크린샷 → `shots/<name>.png` |
| `storage [key]` | `localStorage` 값 출력 (기본 key: `auth-storage`) |
| `text [selector]` | 요소의 `innerText` 출력 (기본: 페이지 전체) |
| `eval <js>` | 페이지에서 표현식 평가, JSON으로 출력 |
| `console` | `launch` 이후 수집된 `console.error`/`pageerror` 메시지 출력 |
| `quit` | 브라우저 닫고 서버 정지 |

테스트 계정은 `src/mocks/data/accounts.ts`에 있다 (비밀번호는 전부
`password123`): 경찰 — `hq`/`gyeonggi`/`gangnam`; 본사 —
`sysadmin`/`opadmin`/`hqmanager1`. 게스트 계정(`src/mocks/data/guests.ts`,
예: `gangnamguest1`)은 별도 체계 — 비밀번호가 아이디와 동일하다(예:
`gangnamguest1` 로그인 시 비밀번호는 `GangnamGuest1`).

## 실행 (사람 경로)

```bash
npm run dev   # 5173부터 시작해서 비어있는 다음 포트에서 열림
```

## 테스트 스위트

```bash
npm run test   # vitest run — MSW 기반 unit/integration 테스트
```

## 주의사항 (Gotchas)

- **커맨드는 동시가 아니라 큐로 순차 실행되어야 한다.** heredoc으로 stdin에
  흘려보내면 readline이 이전 async 커맨드 핸들러가 끝나길 기다리지 않고
  모든 `line` 이벤트를 연달아 발생시킨다 — `driver.mjs`의 `Promise` 큐가
  없으면 `launch`와 바로 다음 커맨드가 경합하고, `page`가 아직 세팅되기
  전이라 `launch` 이후 모든 커맨드가 `ERROR: launch first`로 실패한다.
  드라이버를 확장할 때도 이 큐를 계속 거치도록 유지할 것.
- **`--strictPort`로 포트를 고정한다.** 그냥 `vite`는 비어있는 다음 포트를
  조용히 골라버려서, 이전 세션에서 남은 dev server(개발 중 5173을 이미
  점유한 인스턴스가 있었음)가 있으면 드라이버가 엉뚱한 인스턴스에 붙게 된다.
  드라이버는 항상 `PORT`(기본 `5199`)에서 `--strictPort`로 띄우고, 이미
  떠있는 게 있으면 먼저 kill한다.
- **`killPort`는 Windows 전용이다.** `driver.mjs`의 포트 kill 로직은
  `netstat`/`taskkill`을 쓴다 (이 프로젝트의 개발 환경이 Windows). Linux/macOS
  에서 돌린다면 `lsof -ti:$PORT | xargs kill`로 바꿔야 한다.
- **로그인 화면 2개는 디자인 목업이 없다.** `docs/PGMS_UI_mock.dc.html`은
  화면 1–12(로그인 이후)만 다루고, 로그인 화면은 기능 위주로 만들어졌다 —
  비주얼 스펙과 비교하지 말고 `src/features/auth/pages/*LoginPage.tsx` 자체를
  기준으로 볼 것.
- **로그인 성공 후 이동 경로는 role마다 다르다.** `getDefaultRouteForRole()`
  (`src/features/auth/lib/defaultRoute.ts`)이 유일한 매핑 소스: 본청/지역청
  → `/dashboard`, 경찰서/게스트 → `/security-cases`, 본사 3개 role →
  `/admin/dashboard`. `login-police`로 어떤 계정을 쓰느냐에 따라 `wait`으로
  기다려야 할 화면 라벨이 달라진다.

## 트러블슈팅

- **모든 커맨드에서 `ERROR: launch first`가 뜬다:** 위 큐 관련 수정이
  빠졌거나 `launch` 자체가 에러났을 수 있다 — `launch` 바로 다음 줄에
  `browser launched`가 찍혔는지 확인.
- **`TIMEOUT waiting for server`:** 포트 `5199`에 이미 다른 게 떠 있는데
  깔끔하게 kill되지 않은 경우 — `stop-server`를 실행하거나 `PORT`를 비어있는
  값으로 지정.
- **`wait`이 로그인 성공 화면에서 타임아웃난다:** `/dashboard`,
  `/security-cases`, `/admin/dashboard` 등은 아직 `ScreenPlaceholder`
  (`src/shared/components/ScreenPlaceholder.tsx`) 상태다 — roadmap
  Phase 1-4에서 화면이 만들어질 때마다 교체된다. `wait`에 넘길 텍스트는
  로그인한 계정의 role이 실제로 도착하는 화면의 라벨(예: `경호목록`,
  `본청/지역청 대시보드`)이어야 하며, role별 목적지는
  `getDefaultRouteForRole()`을 따른다.
