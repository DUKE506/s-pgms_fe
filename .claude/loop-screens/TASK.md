# Loop: roadmap 화면 구현 (Phase 1부터)

## 목표

`docs/roadmap.md`의 Phase 1~4 화면 항목을 하나씩 실제 컴포넌트로 구현한다.
각 항목은 `src/app/routes.tsx`에 이미 라우트/가드/셸이 잡혀 있고, 지금은
`ScreenPlaceholder`로 채워진 자리다 — 이 loop는 그 자리를 실제 화면으로
교체하는 작업을 반복한다.

## 왜 이게 loop 후보가 됐는지

- Phase 0에서 디자인 시스템(색상/폰트/radius, Button/Card/Table/Dialog/
  Input/Label, StatusBadge, Sidebar+AppShell)이 이미 확정됨 — 화면마다 새
  디자인 판단을 하는 게 아니라 기존 컴포넌트를 재조합하는 작업에 가까움
- `run-s-pgms` 드라이버(`.claude/skills/run-s-pgms/`)로 실제 브라우저
  스크린샷 검증이 가능해짐
- 다만 "목업과 맞는지"는 여전히 사람이 스크린샷을 보고 판단해야 함 —
  완전 자동검증은 아니고, **화면 단위로 반드시 멈춰서 사용자 승인을 받는
  것**이 이 loop의 핵심 규칙

## Loop 단위

roadmap.md의 화면 구현 체크박스 1개 = 1회 iteration (여러 목업 anchor id가
묶인 항목도 하나의 iteration — 실제 구현 단위 기준으로 이미 그렇게 묶여있음)

## 절차

`LOOP_INSTRUCTIONS.md` 참고. 진행 상태는 `PROGRESS.md`에 기록.

## 정지 조건 (반드시 멈추고 사용자에게 물어볼 것)

- 화면 구현에 필요한 shadcn 컴포넌트(Select/Tabs/Avatar/DropdownMenu 등)가
  아직 없는 경우 — 즉흥적으로 추가하지 말고 먼저 알린다
- 목업에 없거나 모호한 동작/데이터 (예: 화면 사양 문서에 없는 필드) —
  임의로 가정하지 말고 확인받는다
- 사용자가 스크린샷을 보고 수정을 요청한 경우 — 반영 후 다시 스크린샷 →
  다시 승인 대기 (자동으로 다음 화면으로 넘어가지 않음)
- 사용자의 명시적 승인 없이 다음 iteration으로 넘어가지 않는다 (ScheduleWakeup
  기반 자동 진행은 쓰지 않음 — 이 loop는 대화 턴 안에서 사람이 직접 계속
  진행시키는 방식)
