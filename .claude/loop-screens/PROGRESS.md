# 진행 상태

상태값: `대기` / `구현중` / `승인대기` / `완료`

## Phase 1 — 핵심 워크플로우 (접수 → 종결 한 바퀴)

| # | 항목 | 목업 anchor | 상태 | 커밋 | 비고 |
|---|---|---|---|---|---|
| 1 | [경찰서] 접수 / 배치요구서 작성 | `s4` `s4m` | 완료 | `747c0bd` | |
| 2 | [본사] 배치요청 목록 + 담당자 배정 | `s6b` `s6c` | 완료 | `fee6fd0` | |
| 3 | [본사] 배정 경호건 상세 | `s7a` `s7c` `s7d` `s7e` `s7` `s7b` | 완료 | `3300a9c` `6abb74a` | 워크플로우 수정 다수 반영 후 완료. **미해결**: 상세 페이지에 상태 가드가 없어 URL을 직접 알면 접수 상태에서도 기본정보 등록이 가능한 우회 경로가 남아있음 — 필요시 후속 처리 |
| 4 | [경찰서] 경찰서 경호목록 | `s3` `s3m` | 완료 | `b690fec` | 본사 쪽과 같은 이유로 Phase 2에서 앞당김 — 목록 없이 상세부터 만들면 진입 경로가 없어 같은 문제가 재발함 (2026-08-24) |
| 5 | [경찰서] 경호 상세 (연장·단축 모달 포함) | `s5` `s5-recv` `s5-assigned` `s5-done` `s5m` `s5-ext` `s5-ext-short` `s5m-ext` `s5m-ext-short` | 완료 | `8fbde1d` `85c9172` `953f102` `2b0e1ed` | 연장/단축은 즉시반영이 아니라 "요청 제출"까지만 — 본사 승인 화면은 목업에도 없어 후속 항목으로 분리 (2026-08-25). 종결 사유 Select(임시 5항목, 경찰 쪽 확정 목록 미제공) + 취소/종결 액션버튼 색상 위계(취소=옅은 빨강, 종결=solid red) 반영 완료 (2026-08-27, `2b0e1ed`). 전체 상태 재통합 검증과 엣지케이스(수정 페이지 배치기간 잠금 경계값, 대기 배지 상태에서 새로고침)는 사용자가 직접 확인 완료(2026-08-27). 버튼 텍스트 수직 오프셋(폰트 메트릭, 앱 전체 공통)은 `text-box-trim` 기반으로 해결 완료(2026-08-27, 아래 최근 iteration 로그 참고) |

Phase 1 완료. Phase 2~4는 이 표에 이어서 추가.

## Phase 2 — 목록

| # | 항목 | 목업 anchor | 상태 | 커밋 | 비고 |
|---|---|---|---|---|---|
| 1 | [본사] 본사 경호목록 | `s6d` | 완료 | (Phase 1에서 앞당겨 구현 — 아래 "Phase 2에서 순서를 앞당긴 항목" 표 참고) | |
| 2 | [본사] 연장요청/단축요청 승인 | 없음(목업 미설계) | 완료 | `94ae5c7` | 배치요청 목록(s6b)과 동일한 형태로 재구성. 승인 시 `workSchedule.days`도 연장/절단 |

Phase 2 완료. Phase 3부터는 이 표에 이어서 추가.

## Phase 3 — 이력 / 부가기능

| # | 항목 | 목업 anchor | 상태 | 커밋 | 비고 |
|---|---|---|---|---|---|
| 1 | [본청/지역청/경찰서] 이력 조회 | `s1h` `s1hm` `s2h` `s2hm` `s8` `s8m` `s8h` `s8hm` | 완료 | `950a968` | 착수 전 논의로 본청/지역청은 전체 상태(진행중 포함) 조회로 범위 확장, 진행중 건은 기존 경호 상세 화면을 조회 전용으로 재사용 — 아래 iteration 로그 참고 |
| 2 | [본사] 이력 조회 | `s12` | 완료 | `1411c95` | 목록은 경찰 본청 이력 목록과 같은 형태(전국 스코프, 지역청/경찰서 컬럼·필터), 상세는 본사 상세화면 레이아웃 재사용+조회전용화. 착수 전 논의로 배치장소는 종결 건도 제외(피해자 개인정보) 확정 — 아래 iteration 로그 참고 |
| 3 | [경찰서] 게스트 계정 발급/관리 | `s9` `s9m` `s10` `s10m` | 완료 | `a51646e` | 목록(s9)+발급·수정 공용 모달(s10, 관리번호 다중선택). 게스트 로그인 실동작까지 연결(발급 시 선택한 경호건만 조회, 경호목록/상세 조회 전용) — 아래 iteration 로그 참고 |

## Phase 3에서 순서를 앞당긴 항목

| 항목 | 목업 anchor | 상태 | 비고 |
|---|---|---|---|
| [본사] 근무자 목록/등록 | `s11` `s11b` | 완료 | 항목 3(배정 경호건 상세)의 근무자 선택 드롭다운이 이 데이터에 의존해서 먼저 구현 (2026-08-22) |

## Phase 2에서 순서를 앞당긴 항목

| 항목 | 목업 anchor | 상태 | 비고 |
|---|---|---|---|
| [본사] 본사 경호목록 | `s6d` | 완료 | 항목 3 검증 중 "배정 후 상태 미반영" 문제의 근본 원인이 이 화면 부재였음이 드러나 앞당겨 구현 — 같은 이유로 경찰서 경호목록(`s3`)도 Phase 1 항목4로 앞당김(위 표 참고) (2026-08-24) |

## Phase 3.5 — 모바일 재점검 + 전체 워크플로우 통합 테스트

| # | 항목 | 상태 | 커밋 | 비고 |
|---|---|---|---|---|
| 1 | 모바일 실기기 재점검 + 발견 버그 수정 | 완료 | `247841f` | 사용자가 갤럭시 실기기(네이버 인앱브라우저 포함)로 전체 화면을 재점검하며 찾은 항목 다수 수정 — 아래 iteration 로그 참고 |
| 2 | 대시보드 제외 전체 워크플로우 통합 테스트 | 완료(1차) | `0fd9c78` `8660488` `8423086` | 경찰서·본사 운영관리자·본부관리자 계정은 확인 중 스코프 제한 미비 1건 발견/수정(아래 iteration 로그 참고). 나머지 계정(본청/지역청/게스트, 시스템관리자)도 사용자가 직접 확인해 문제 없음 확인(2026-08-31) |

**발견된 후속 항목(백로그)**: [공통] 프로필 화면(비밀번호 변경) — roadmap.md Phase 3.5 표 참고, 미구현

## Phase 3.6 — 담당자 참조 리팩터 + 관리자 계정 관리

| # | 항목 | 상태 | 커밋 | 비고 |
|---|---|---|---|---|
| 1 | [내부] assignee(이름) → assigneeId(계정 id) 리팩터 | 완료 | `190c43d` | 인사이동으로 담당자 이름이 바뀌어도 스코프 필터링/목록 표시가 깨지지 않도록 전환 — 아래 iteration 로그 참고 |
| 2 | [본사] 관리자 계정 관리 (신규) | 완료 | `d13de2c` | 목록+모달 패턴, 권한 매트릭스 2차 재확정(정보수정=항상 본인만) 반영 — 아래 iteration 로그 참고 |
| 3 | [본사/경찰] 최초 로그인 강제 비밀번호 변경 플로우 | 완료 | `f07b797` | `mustChangePassword` boolean 플래그 기반, 경찰(게스트)·본사(관리자) 로그인 양쪽 적용 — 아래 iteration 로그 참고 |

**발견된 후속 항목(백로그)**:
- [본사] 경호 상세 화면에서 담당자(본부관리자) 변경 기능 — roadmap.md Phase 3.6 후속 항목 참고, 미구현

## 최근 iteration 로그

(진행하면서 아래에 짧게 기록 — 날짜, 무엇을 했는지, 막힌 점)

- 2026-08-21: 항목 1(접수/배치요구서 작성) 구현 완료. SecurityCase 데이터 모델
  + MSW 목업, 8섹션 폼(필수항목 검증), Textarea/Select 공용 컴포넌트 신규
  추가, 스크린샷 승인 후 커밋 `747c0bd`.
- 2026-08-21: 항목 2(배치요청 목록 + 담당자 배정) 구현 완료. jurisdiction/
  securityCode/assignee 필드 + 경호코드 발급 로직, 본부관리자 mock 4명, TanStack
  Query 도입. 스크린샷 승인 후 사용자 피드백 반영(필터/검색 흰 배경, 탭 사이즈
  통일, 테이블 헤더 배경색, xl 미만 반응형 카드 리스트, 모달 버튼 사이즈, 모바일
  배정 버튼 색상, "에스텍 본사" breadcrumb 접두어 제거) — 목록 화면은 breadcrumb
  생략·상세 화면은 유지하는 규칙을 architecture.md에 정리. 커밋 `fee6fd0`.
- 2026-08-22: 항목 3(배정 경호건 상세) 착수 전 분석 중 근무자 마스터 데이터가
  전혀 없다는 걸 발견 — Phase 3 #11(근무자 목록/등록)을 앞당겨 먼저 구현.
  Worker API/mock(`workers.ts`)+목록/등록 모달 신규. 스크린샷 승인 후 사용자
  피드백으로 타이포그래피 문제 발견(테이블/버튼/라벨 글자가 shadcn 기본
  text-sm=14px 등을 그대로 써서 목업 실측값보다 1~4px 크게 보임) — 이 화면에
  한해 index.css에 목업 실측 기반 --text-table-header/table-body/label/
  field/button 토큰을 파일럿 도입(다른 화면 확대 적용은 보류, 사용자 결정
  대기). 커스텀 텍스트 토큰명을 "input"으로 지었다가 기존 --color-input과
  충돌해 조용히 무효화되는 문제를 겪어 "field"로 개명 — 향후 토큰 이름은
  기존 color 토큰명과 겹치지 않게 주의. lib/utils.ts의 cn()도
  extendTailwindMerge로 커스텀 텍스트 스케일을 등록해야 새/기존 클래스가
  dedupe됨. 이어서 버튼-인풋-카운트뱃지 높이 불일치(h-8/h-9/h-10 혼재)도
  지적받아 Button size="lg"(h-9, 기존 variant 재사용)로 통일. 근무자 목록
  화면 승인 완료.
- 2026-08-22: 근무자 목록 화면에서 검증한 타이포그래피/높이 토큰을 공용
  컴포넌트(`components/ui/table.tsx`·`button.tsx`·`input.tsx`·`label.tsx`·
  `select.tsx`·`card.tsx`)와 `shared/components/StatusBadge.tsx` 기본값에
  반영 — 이제 화면마다 개별 클래스를 안 박아도 자동 적용됨. WorkerListPage/
  RegisterWorkerDialog의 중복 오버라이드 제거. RequestListPage의 탭
  (TAB_BASE)은 공용 Tab 컴포넌트가 없어서 h-9/text-button으로 로컬 적용.
  CardTitle(섹션 제목, 14px/700)·StatusBadge(11px)도 같이 포함. 로그인 2개
  (목업 없음)/SecurityCaseNewPage(s4)/RequestListPage+AssignManagerDialog
  (s6b/s6c)/WorkerListPage+RegisterWorkerDialog(s11/s11b) 전 화면 스크린샷+
  getComputedStyle 실측으로 회귀 확인, 콘솔 에러 없음.
- 2026-08-23: 항목 3(배정 경호건 상세) 데이터모델/MSW/컴포넌트(BaseInfoForm/
  BaseInfoSummaryCard/ScheduleInitDialog/ScheduleGroupDialog/ScheduleSection/
  AttachmentsSection)/페이지/테스트 구현. 사용자 피드백 4건 반영: 관리번호
  표시(접수단계 "undefined" 노출 → `shared/lib/managementNumber.ts`의
  formatManagementNumber로 접수번호만 표시, 배정 후엔 "접수번호 · 경호코드"),
  XL 레이아웃(중앙정렬 max-w-3xl 래퍼 제거해 요약/스케줄/첨부가 XL에서 전체
  폭 사용 — BaseInfoForm만 자체 mx-auto max-w-3xl 유지), 배정 시 상태변경+
  경호코드 발급 로직 확인. 레이아웃 수정 중 BaseInfoForm이 nested flex-col
  안에서 mx-auto만 있고 w-full이 없어 stretch 대신 shrink-to-fit(768px→559px)
  되는 버그 발견/수정. build/lint/test(33/33) 통과, 브라우저 실측 확인.
  **사용자 요청으로 커밋은 진행하되 추가 검증이 더 필요한 상태 — 완료 체크
  보류.** 다음 세션에서 나머지 검증(전체 플로우 재확인) 마친 뒤 완료로
  전환.
- 2026-08-24: 항목 3(배정 경호건 상세) 워크플로우 수정 요청 7건 반영 — 배정 상태
  배지 정상화, 경호취소/접수취소(사유 필수·확인 모달, `CancelAssignedCaseDialog`/
  `CancelPendingCaseDialog` 신규), 배치시간 시/분 select(`HourMinuteSelect` 공용
  컴포넌트), 근무자 사번 표시, 담당 경찰관 비활성화, 7~11번 조치 섹션 기간 입력
  (체크 시에만 노출), 배치요구서를 PDF 대신 신규접수 폼 데이터 읽기전용 모달로
  전환(`DispatchRequestViewDialog`). 이어서 사용자와 여러 라운드 추가 논의/구현:
  배치요청 목록 ⋮ 드롭다운(배정/취소, `UserPlus`/`Trash2` 아이콘, shadcn
  DropdownMenu 신규 도입) + 행 클릭 시 배치요구서 모달, 탭 순서/카운트가
  화면마다 어긋나는 버그 발견 → `SecurityCaseTabs` 공용 컴포넌트로 통일(경호목록·
  배치요청·연장요청·단축요청 고정 순서, 양쪽 카운트 항상 표시), 스크롤 시 스케줄
  그룹 박스가 floating nav 위로 올라오는 z-index 버그 수정(Sidebar 고정/sticky
  nav에 `z-40`), 사전미팅을 Switch 즉시저장 방식에서 순수 CRUD(그룹 없이 근무자
  여러 명 추가/수정/삭제, 저장 버튼 누를 때만 API 호출)로 재설계(`PreMeetingDialog`
  신규, `PreMeeting` 데이터 모델도 `enabled`/단일 근무자 → `assignments[]`로 변경).

  이 과정에서 로드맵에 없던 Phase 2 항목 s6d(본사 경호목록)를 앞당겨 신규 구현
  (`SecurityCaseListPage`) — 배정 후 상태가 반영 안 되는 것처럼 보였던 근본 원인이
  "배정 후 진입할 화면 자체가 없어 URL을 직접 입력/새로고침해야 했고, 그때마다
  인메모리 mock이 리셋됐다"는 걸 발견해서다. 경호목록은 배정/경호중/경호완료만
  보이고 접수/종결/취소는 제외(종결·취소는 향후 이력 조회 화면 몫). 여기서 다시
  "새로고침하면 데이터가 사라진다"는 근본 문제가 재확인돼 mock 데이터 레이어에
  localStorage persist 도입(`mocks/data/persist.ts`, securityCases/workers 적용,
  경호코드·케이스ID 카운터는 저장된 데이터에서 매번 재계산해 정합성 유지 —
  zustand persist는 "서버 데이터"를 클라이언트 스토어에 중복 보관하게 돼서
  기각). 테스트는 `import.meta.env.MODE !== 'test'`로 persist를 완전히 꺼서
  기존 pristine-seed 전제가 깨지지 않게 함.

  전체 과정에서 build/lint/test(12개 파일 40개, 상태 필터 변경에 맞춰 일부
  갱신) 통과, 매 단계 브라우저(Playwright 드라이버)로 실측 검증 — 배정→
  하드 리로드 후에도 상태/담당자/본부/탭 카운트 유지 확인 포함. 미해결 이슈
  1건은 위 Phase 1 표 비고에 기록(상세 페이지 상태 가드 부재). 커밋 전.
- 2026-08-25: 항목 4(경찰서 경호목록, s3/s3m) 구현 완료. 착수 전 확인 결과 GET
  `/api/security-cases` MSW 핸들러가 본사 계정만 허용하고 있어(경찰 계정 401)
  경찰서 인가를 추가하고, 경찰서 계정은 자기 소속(`policeStation === 계정명`)
  건만 필터링해 내려주도록 수정(게스트 역할은 화면 9/10 미구현이라 빈 목록).
  localStorage persist는 이미 `mocks/data/securityCases.ts`에 단일 배열로
  적용돼 있어 목록↔상세 정합성은 추가 작업 없이 자동 확보 — 다만 seed가
  강남경찰서 기준 접수 1건뿐이라 배정/경호중/경호완료 각 1건을 보강
  (`seedActiveCase`). `PoliceSecurityCaseListPage` 신규(breadcrumb/요약카드+
  상태세그먼트바/상태 필터 칩/관리번호 검색/신규접수 버튼/테이블·모바일
  카드리스트), 목록 행 클릭은 상태 무관 전부 `/security-cases/:id`로 통일
  (화면5가 접수/배정 상태별 뷰를 한 화면에서 다루는 설계라 목업의 접수행
  `#s4` 링크는 채택하지 않기로 사용자 확인, "신규 접수" 버튼만 s4/new로).
  모바일 통화 아이콘/모달(`s3m-call`)은 목업 자체에서 blur 처리된 미완성
  화면이라 이번 범위에서 제외. 1차 스크린샷 승인 후 사용자 피드백 2건 추가
  반영: 모바일 상태 칩 줄바꿈→가로 스크롤 전환, 요약카드 상태 카운트에 아이콘
  누락 발견해 추가(Inbox/UserCheck/Shield/CheckCircle2, 상태색 매핑) — 확인
  중 목업(s3m)엔 요약카드 자체가 없다는 것도 함께 발견해 모바일에서 숨김
  처리(`hidden xl:flex`). 경찰 화면 breadcrumb 유지 규칙을 architecture.md에
  신규 기록(본사와 달리 h1과 겹쳐도 생략 안 함). build/lint/test(13개 파일
  44개) 통과, 데스크톱+모바일 브라우저 스크린샷 검증.
- 2026-08-25: 항목 5(경찰 경호 상세, s5 계열) 구현 완료. 착수 전 논의에서 중요한
  사실 확인 — 경호중 상태의 연장/단축은 목업처럼 즉시 반영되는 게 아니라
  "요청"만 생성되고 본사(운영관리자/본부관리자)가 승인해야 실제 기간·근무스케줄에
  반영되는 구조였음. 승인 화면은 원본 목업에도 없어(`SecurityCaseTabs`의
  연장요청/단축요청 탭이 이미 "아직 화면 계획 없음"으로 비활성 처리돼 있었음)
  이번 항목은 경찰 쪽 요청 제출까지만 구현하고 승인 화면은 로드맵에 후속
  항목으로 새로 추가(위 Phase 2 표 참고, 다음 순서로 최우선 진행 예정).
  `SecurityCase.pendingPeriodRequest` 필드 신규(대기 중엔 재요청 불가).

  s5-done(경호완료 상태 뷰 + 종결 액션)은 roadmap 텍스트엔 명시적으로 안
  묶여 있었지만 방금 만든 목록에서 경호완료 건 클릭 시 도달하는 화면이라
  포함(사용자 확인). MSW 인가 확장: GET /workers·DELETE /:id·PUT /:id/cancel에
  경찰 계정 허용 추가(항목4와 같은 패턴). 신규 mutation: `requestPeriodChange`
  (경호중+대기없음 검증), `closeCase`(파기확인서 필수). 컴포넌트 다수 신규
  (StatusStepper/BaseInfoReadCard/DocumentsCard/ConsentDocsCard/
  WorkerAssignmentPanel/PeriodRequestDialog/Cancel*Dialog/CloseCaseDialog) —
  배치요구서 보기는 회사쪽 DispatchRequestViewDialog 재사용, 실제 수정 기능은
  스코프 아웃. 기본정보 카드의 경찰관정보/배치장소는 목업이 접수 상태에서
  "-"로 그렸지만 실제로는 접수 시점부터 있는 데이터라 실값 표시로 변경(목업
  대신 데이터 존재 여부 기준).

  seed 데이터에 강남경찰서 배정/경호중/경호완료 각 1건씩 baseInfo+workSchedule+
  attachments 풀세트를 채운 데모 케이스 추가(`withDemoDetail`) — 화면 검증에
  필요했음. 구현 중 실제 버그 발견: `WorkerAssignmentPanel`/`PeriodRequestDialog`의
  날짜 계산이 로컬 타임존(KST)에서 자정 Date를 만든 뒤 `toISOString()`으로
  변환하는 패턴이라 날짜가 하루씩 밀려 `addDays`가 날짜를 전진시키지 못하고
  `dateRange`가 무한루프에 빠짐(브라우저 탭이 완전히 멎어 Playwright 명령이
  전부 30초 타임아웃) — `mocks/data/securityCases.ts`의 기존 `nextDate`처럼
  UTC로 통일해 수정. 이후 모바일 헤더에서 관리번호+상태뱃지+긴 액션버튼
  라벨("단축 요청 중 · 승인 대기")이 한 줄에서 찌그러져 줄바꿈되는 버그도
  발견해 헤더를 `flex-col sm:flex-row`로 반응형 처리. build/lint/test(14개
  파일 49개) 통과, 4개 상태(접수/배정/경호중/경호완료) 전부 데스크톱+모바일
  브라우저 스크린샷 검증 + 연장/단축 요청 제출 실제 동작 확인.
- 2026-08-25: 항목5 스크린샷 승인 후 사용자 피드백 4건 반영. (1) 접수/배정
  취소 버튼 라벨 분리 — 접수 상태는 "접수취소", 배정 상태는 "경호취소"
  (트리거 버튼 + `CancelPendingCaseDialog` 타이틀/버튼 전부). (2)
  `PeriodRequestDialog` 단축 탭 날짜칩이 선택 시 `font-semibold`로 굵어지며
  폭이 미세하게 늘어나던 버그 — 선택 여부와 무관하게 `font-medium` 고정으로
  수정(색상/배경만으로 구분). (3) `CloseCaseDialog`의 관리번호 텍스트를
  `text-xs`→`text-sm font-semibold`로 키우고, 종결 확정 버튼에 빠진
  `variant="destructive"`를 추가(다른 취소 다이얼로그들과 통일). (4) 배치요구서
  "읽기전용 보기"로 스코프 아웃했던 걸 뒤집어 실제 수정 기능 신규 구현 — 접수/
  배정은 배치기간 포함 전체 수정 가능, 경호중 이후는 배치기간 입력을 비활성화
  (값은 보이되 못 바꿈, 연장/단축 요청으로 유도하는 안내문구 추가). 모달 대신
  `/security-cases/new`와 같은 전용 페이지로 구현하는 게 낫다는 사용자 판단에
  따라 `SecurityCaseNewPage`의 8섹션 폼을 `features/police/components/
  SecurityCaseForm.tsx`(공유 폼 본체)로 추출하고 `SecurityCaseNewPage`(생성)/
  `SecurityCaseEditPage`(수정, 신규 라우트 `/security-cases/:id/edit`)가
  이를 각자 다른 `initialForm`/`onSubmit`/`disablePeriod`로 사용하도록 리팩터.
  MSW에 `PUT /security-cases/:id`(경찰 전용, `updateSecurityCase`) 신규 추가.
  `DocumentsCard`의 배치요구서 행은 다이얼로그 대신 수정 페이지로 이동하는
  링크로 교체(`DispatchRequestViewDialog` 사용 제거, 회사쪽은 그대로 유지).
  build/lint/test(15개 파일 51개, 리팩터 후 기존 SecurityCaseNewPage 테스트
  무변경 통과로 동등성 확인 + 신규 SecurityCaseEditPage 테스트 2개 추가) 통과,
  4건 전부 브라우저로 실측 재확인(수정 저장 후 상세 페이지로 복귀, 재진입 시
  저장값 유지되는 것까지 end-to-end 확인).
- 2026-08-25: 사용자가 직접 테스트하다 남긴 단축 요청 데이터가 화면을 막아
  localStorage에서 `pendingPeriodRequest`만 지우는 콘솔 스니펫으로 초기화
  지원. 이어서 추가 피드백 3건 반영. (1) 액션 버튼(접수취소/경호취소/연장·
  단축/종결)이 데스크톱 헤더에만 있어 모바일에서 접근성이 떨어짐 — 목업(s5m)
  처럼 모바일에서는 헤더 대신 스크롤 맨 아래 전체폭 버튼으로 이동. 두 블록을
  동시에 렌더링하고 `hidden xl:flex`/`xl:hidden`으로 반응형 토글하는 방식이라
  jsdom 테스트에선 둘 다 DOM에 잡혀 `getAllByRole(...)[0]`로 데스크톱 쪽만
  고르도록 테스트 보정. 중복 방지를 위해 버튼 목록을 `ActionButtons` 로컬
  서브컴포넌트로 추출(`fullWidth` prop으로 두 컨텍스트 공유). (2)
  접수취소/경호취소 다이얼로그의 확정 버튼이 `variant="destructive"`(옅은
  빨강)라 화면 진입 시 헤더의 진한 빨강 트리거 버튼과 톤이 안 맞아 보임 —
  다이얼로그 확정 버튼만 트리거와 동일한 solid red(`bg-destructive text-white`)로
  변경, 종결 다이얼로그는 옅은 빨강 그대로 유지. (3) 대기/비활성 배지("연장/
  단축 요청 중 · 승인 대기", 비활성 "종결")가 `bg-muted`를 쓰고 있었는데 이
  테마에서 `--muted`가 `--background`와 완전히 같은 색이라 배경이 사실상 안
  보이던 버그를 발견 — `bg-secondary`(= `--border` 톤, 기존 "취소/닫기"
  버튼과 같은 계열)로 통일해 눈에 띄게 수정. build/lint/test(15개 파일 51개)
  통과, 데스크톱+모바일 브라우저로 3건 전부 재확인.
- 2026-08-27: 사용자 요청 2건 반영(커밋 `2b0e1ed`). (1) 종결 시 종결사유를
  선택하게 해달라는 요청 — 경찰 쪽에서 아직 확정 목록을 안 줘서 통상적으로
  쓰이는 5개 항목(경호기간 만료/피해자 요청에 의한 종결/피의자 구속/피해자
  소재불명·연락두절/기타, 기타 선택 시 상세 사유 필수)으로 임시 구성
  (`ClosureReason` 타입, `SecurityCase.closureReason`/`closureReasonDetail`
  필드, `CloseCaseDialog`에 Select+조건부 Textarea, mock/MSW/API 전체 반영)
  — 추후 실제 목록으로 교체 필요. (2) 파괴적 액션 버튼 색상 위계 논의 —
  사용자가 "취소=빨간 테두리+옅은 배경, 종결만 solid red"를 제안했고 의견을
  물어봐서 동의 의사를 밝힘(워크플로우 전체의 유일한 최종/불가역 지점인
  종결에만 가장 무거운 시각적 신호를 주는 게 위계상 합리적이라는 근거).
  경찰/본사 양쪽의 접수취소·경호취소 트리거+다이얼로그 확정 버튼을 옅은
  빨강으로, 종결 트리거+다이얼로그 확정 버튼은 solid red로 재배치. 공용
  `Button` `variant="destructive"`에 테두리 추가(`border-destructive/30`)해
  본사 쪽 다이얼로그 2곳은 이 변경만으로 자동 반영. 작업 중 사용자가 취소
  다이얼로그의 "닫기"/"경호취소" 버튼 텍스트가 수직 중앙에서 살짝 위로 치우쳐
  보인다고 지적 — DOM 정밀 측정(getBoundingClientRect)으로 실제 존재하는
  현상임을 확인했으나, 이 다이얼로그만이 아니라 경호목록 상태 필터 버튼 등
  **앱 전체 버튼에 공통**으로 있는 현상(Pretendard 폰트의 수직 메트릭 특성으로
  추정, flex 정렬 자체는 정상)임을 확인 — 전역 `Button` 컴포넌트를 건드려야
  하는 사안이라 사용자 판단으로 지금은 보류, 추후 타이포그래피 정리 라운드에서
  일괄 처리 예정. build/lint/test(15개 파일 52개) 통과, 경찰+본사 양쪽
  브라우저 스크린샷으로 트리거/다이얼로그 색상·종결 사유 선택 플로우 전부
  재확인, 콘솔 에러 없음.
- 2026-08-27: 보류했던 버튼 텍스트 수직 오프셋 처리. 착수 전 실측/실험으로
  원인 확정 — Pretendard 폰트 ascent/descent 비대칭 때문에 세로 중앙정렬된
  텍스트가 라인박스 안에서 위로 치우침(오프셋은 고정값이 아니라 line-height
  비율에 따라 -0.25~-0.8px로 다름), 버튼뿐 아니라 테이블 헤더/다이얼로그
  버튼/탭/상태뱃지 등 "고정 높이 박스에 텍스트를 세로 중앙정렬하는 모든 곳"
  공통 현상임을 확인. 해결안 2가지(① `text-box-trim`/`text-box-edge` CSS로
  근본 수정 vs ② 컴포넌트별 고정 px 보정)를 실측 비교로 제시했고 사용자가
  ①로 결정. `text-box-trim`은 텍스트를 감싸는 flex 컨테이너 자체엔 안 먹고
  텍스트만 감싸는 별도 엘리먼트에 적용해야 효과가 있다는 것도 실험으로 확인.
  `index.css`에 `@utility text-trim` 신규 추가 후 `Button`(children 중
  문자열/숫자만 골라 하나의 text-trim span으로 묶음 — `{tab} 요청`처럼 JSX
  표현식과 리터럴이 나뉘어 여러 child가 되는 경우 각각 따로 감싸면 사이 공백이
  flex gap에 먹혀 접근성 이름이 깨지는 버그를 테스트로 발견해 인접 텍스트
  child를 그룹핑하는 방식으로 수정), `TableHead`/`TableCell`(직접 클래스
  추가), `StatusBadge`, `SecurityCaseTabs`, 경찰 경호목록의 상태 필터 칩
  (Button 미사용 raw `<button>`)에 적용. 다이얼로그 버튼 오프셋 -0.77px→
  +0.09px, 테이블 헤더 -0.61px→+0.14px, 탭 -0.25px→+0.09px로 실측 개선
  확인. 최신 CSS 스펙(Chrome/Edge 확실, Safari/Firefox는 불확실)이라 미지원
  브라우저는 자연 폴백. build/lint/test(15개 파일 52개) 통과, 경찰+본사
  데스크톱/모바일 스크린샷으로 레이아웃·아이콘 간격 회귀 없음 확인.

  → 사용자가 뱃지가 얇아졌다고 바로 지적해 후속 수정. 원인: `StatusBadge`는
  `h-*` 고정 높이 없이 `py-1`(패딩)+텍스트 line-height로 높이가 결정되는
  구조였는데, `text-box-trim`이 line-height의 leading을 걷어내면서 그 여백에
  얹혀있던 높이도 같이 줄어듦(실측 23.7px→15.78px). `TableCell`도 같은
  구조라 정도는 약하지만 동일 문제(35.56px→33px) — 다만 이건 사용자가
  원래 지적한 범위(테이블 헤더)를 벗어나 임의로 넓힌 부분이라 적용 자체를
  되돌림. 교훈: `text-trim`은 **고정 높이(`h-*`) 컨테이너에서만** 안전하게
  쓸 수 있고, 패딩+line-height로 높이가 정해지는 auto-height 컨테이너에
  쓰려면 먼저 고정 높이로 바꿔야 함. `StatusBadge`는 `py-1` 제거하고
  `h-6`(24px, 기존 높이와 거의 동일) 고정으로 전환해 해결. build/lint/
  test(52개) 재통과, 브라우저로 뱃지 높이 24px 복원 확인.

  → 이어서 사용자가 상세페이지 접수취소/경호취소/종결 버튼이 왜 이렇게
  크냐고 질문. 확인 결과 이 버튼들(`ActionButtons`, `SecurityCaseDetailPage.tsx`)은
  애초에 공용 `Button`을 안 쓰는 raw `<button>`(`px-4.5 py-2.5 text-sm`,
  고정 높이 없음)이라 실측 42px — 앱 표준 버튼(`h-9`=36px)보다 6px 컸음
  (이번 세션 text-trim 작업과는 무관한 기존 버그). 공용 Button으로 교체하기로
  사용자 결정 — 접수취소/경호취소는 `variant="destructive"`(기존
  LIGHT_DESTRUCTIVE와 동일한 스타일이라 그대로 대응), 연장/단축은 기본
  variant, 종결은 `variant="default"`+`bg-destructive` className 오버라이드
  (본사 CloseCaseDialog 확정 버튼과 동일 패턴), 비활성 종결은
  `variant="secondary"`+`disabled`로 전환. 실제 클릭 불가능한 정보성
  배지(대기 중 배지, 경호중 상태의 종결 placeholder)는 버튼이 아니라
  `span`으로 유지하되 `h-9`/`text-button`으로 클래스를 맞춰 옆의 실제
  버튼과 높이가 어긋나지 않게 함. 회사 쪽 상세페이지에도 동일한 raw button
  패턴(경호취소 트리거, 기본정보/스케줄 등록 버튼)이 남아있는 걸 발견했지만
  이번엔 범위 밖이라 손대지 않음 — 필요시 후속 처리. build/lint/test(52개)
  통과, 배정/경호중/경호완료 3개 상태 전부 데스크톱 스크린샷으로 36px 확인.

  → 이어서 사용자 요청으로 본사 쪽 동일 패턴도 정리. 본사
  `SecurityCaseDetailPage.tsx`의 raw button 3개(경호취소 트리거,
  "기본정보 등록", "스케줄 정보 입력" — 둘 다 아이콘+텍스트, `bg-primary
  px-5 py-2.5 text-sm`) 전부 공용 `Button`으로 교체(경호취소는
  `variant="destructive"`, 나머지 둘은 기본 variant, 아이콘+텍스트라
  Button의 `wrapTextChildren`이 처리). 범위는 상세페이지 본문으로 한정 —
  회사 feature 폴더 전반(다이얼로그 내부 등)의 다른 raw button까지 훑진
  않음, 필요시 후속 요청으로. build/lint/test(52개) 통과, 경호취소 트리거
  (36px)·기본정보 등록 버튼·등록 폼 진입까지 브라우저로 회귀 확인.
- 2026-08-27: [본사] 연장요청/단축요청 승인 화면(Phase 2 마지막 항목) 구현 완료.
  원본 목업에 없는 화면(anchor 없음)이라 논의 끝에 이미 있는 배치요청 목록
  (`RequestListPage`, s6b)과 동일한 형태 — 목록 + 더보기 드롭다운(배정/취소 대신
  승인/거부) — 로 만들기로 사용자와 합의. 착수 전 확인한 중요한 사실: 승인 시
  `startDate`/`endDate`만 바꾸면 안 됨 — `workSchedule.days`는 최초 스케줄 생성
  시점에 한 번만 만들어지고 이후 날짜 자체를 추가/삭제하는 UI가 없어서, 기간만
  바꾸면 상세 페이지 배치기간 표시와 스케줄 목록이 어긋나는 상태가 됨(예전
  s6d/s3 때 겪은 "화면/동기화 지점 누락"과 같은 종류). 그래서 이번 범위에 스케줄
  일자 자동 조정(연장 시 추가, 단축 시 잘라내기)을 포함하기로 결정.

  구현: `mocks/data/securityCases.ts`에 `approvePeriodRequest`/`rejectPeriodRequest`
  신규(연장은 `createInitialSchedule`에서 추출한 `generateScheduleDays` 헬퍼로
  기존 종료일 다음날부터 새 종료일까지 day 추가, 단축은 새 종료일 이후 day를
  필터링해 제거), MSW 핸들러 2개, API 클라이언트 3개(`listPeriodRequests`는
  전용 서버 필터 없이 전체 목록을 받아 클라이언트에서
  `pendingPeriodRequest.type`로 필터). `SecurityCaseTabs`의 비활성 "연장요청"/
  "단축요청" 탭을 실제 카운트 달린 링크로 전환. `PeriodRequestListPage`(연장/
  단축 공용, `type` prop)와 `PeriodRequestActionDialog`(승인/거부 공용,
  `CancelPendingCaseDialog` 패턴 재사용) 신규, 라우트
  `/admin/period-requests/extension`·`/shorten` 추가(`COMPANY_ALL` 가드).
  거부 사유는 데이터 모델/요구사항에 없어 단순 확인 다이얼로그로 처리.

  테스트 작성 중 실제 버그 발견: `PeriodRequestActionDialog`의 `onSuccess`가
  `['security-cases-all']`/`['pending-requests']`만 invalidate하고 페이지
  자신의 쿼리 키(`['period-requests', type]`)는 빠뜨려서, 승인/거부 후에도
  행이 목록에서 안 사라지는 문제 — 해당 키도 invalidate하도록 수정.
  build/lint/test(16개 파일 60개, 신규 8개: 데이터 레이어 4개+페이지 4개) 통과.

  브라우저(Playwright 드라이버)로 연장 승인·단축 거부 두 플로우 모두 end-to-end
  검증 — 경찰이 요청 제출 → 본사 탭 카운트 반영 → 승인 시 배치기간+스케줄
  일자(7일 추가) 실제 반영, 거부 시 배치기간/스케줄 불변 확인. 검증 스크립트
  작성 중 겪은 문제(앱 버그 아님, 기록용): (1) `login-company` 헬퍼가 폼 제출을
  기다리지 않고 바로 다음 커맨드로 넘어가는데, 그 다음 줄에서 곧바로 다른
  경로로 `nav`하면 로그인 API 응답이 오기 전에 페이지가 이동해버려 세션이
  붕 뜸 — 로그인 직후 도착 화면 텍스트를 `wait`으로 반드시 기다린 뒤 다음
  단계로 넘어가야 함. (2) Playwright `text=` 로케이터가 다이얼로그 배경에
  깔린 트리거 버튼("연장/단축")까지 함께 매칭해 "단축" 단독 텍스트 클릭이
  모호해짐 — 다이얼로그 내부로 스코프를 좁힌 CSS 선택자(`[role=dialog]
  button:has-text(...)`)로 해결. 콘솔 에러 없음.
- 2026-08-27: Phase 3 항목1([본청/지역청/경찰서] 이력 조회, `s1h`/`s1hm`/`s2h`/
  `s2hm`/`s8`/`s8m`/`s8h`/`s8hm`) 구현 완료. 착수 전 확인한 데이터 갭: 종결/취소
  건이 seed에 0건이었고(`closedAt` 필드도 없었음), 지역청 테스트 계정("경기지역청")
  이름이 `SecurityCase.jurisdiction` 값("경기남부지방경찰청")과 달라 스코프 매칭이
  안 됨 — `closedAt` 필드 추가, `Account.jurisdiction` 필드 신규(본부관리자
  `branch`와 같은 패턴), 종결 5건+취소 2건(지방청 3곳·경찰서 4곳) seed 보강.

  `HistoryListPage`/`HistoryDetailPage`(본청/지역청/경찰서 공용, role로 필터·컬럼
  개수만 분기) + MSW `GET /security-cases/history`·`GET /security-cases/history/:id`
  신규. 근무자 배정 이력(근무일수·총근무시간)과 총경호시간은 별도 정산 필드 없이
  `workSchedule.days` 실 배정을 합산해서 계산(`features/police/lib/historySummary.ts`).
  취소 건은 목업에 전용 상세 anchor가 없어 종결 상세 템플릿을 재사용하되 우측
  카드만 종결정보↔취소정보로 조건부 전환(사용자 확인 후 결정).

  1차 스크린샷 승인 후 사용자 피드백 2건 추가 반영. (1) 이력 상세의 배치장소
  섹션 제거 — 개인정보라 이력처럼 조직 상위 계층(본청 등)까지 넓게 노출되는
  화면에는 부적절하다는 판단(활성 케이스 상세의 배치장소 표시는 그대로 유지,
  그쪽은 담당 경찰서/본사만 보는 화면이라 무관). (2) 더 큰 설계 변경 — 사용자가
  "본청은 Phase4 대시보드가 아직 없어서 현재 진행중인 경호건도 이력에서 한번에
  보는 게 낫다"고 제안, 논의 끝에 본청+지역청은 전체 상태(접수~종결/취소)를
  다 보여주도록 확장(경찰서는 이미 경호목록이 있어 원래 설계인 종결/취소만
  유지). 목록에서 종결/취소 건은 이 화면 자체의 상세(`/history/:id`)로, 진행중
  건은 기존 경호 상세 화면(`/security-cases/:id`)으로 라우팅이 갈리게 하고,
  그 라우트 가드에 본청/지역청을 추가하되 `SecurityCaseDetailPage`에서 두
  role은 액션 버튼(접수취소/경호취소/연장·단축/종결)과 배치요구서 "수정" 링크를
  숨겨 조회 전용으로 렌더링하도록 처리(`DocumentsCard`에 `readOnly` prop 추가,
  fallback 뱃지가 "대기중"으로 잘못 뜨던 문제도 같이 수정). 경호시작·경호종료·
  총경호시간 컬럼은 종결 건만 실값, 취소·진행중은 전부 "-"로 통일.

  세션 메모리에 "필터 상태를 URL 쿼리스트링으로 옮기고 그걸 그대로 백엔드 API
  파라미터로 전달"하는 추후 계획(당장 구현 대상 아님)도 기록해둠 —
  `docs/architecture.md` 상태관리 섹션 참고. build/lint/test(19개 파일 72개,
  신규 13개) 통과, 본청/지역청/경찰서 3개 계정으로 데스크톱+모바일 브라우저
  스크린샷 검증(목록 스코프 필터링, 종결/취소 상세, 진행중 건의 조회 전용 상세
  라우팅까지 전부 확인), 콘솔 에러 없음.
- 2026-08-27: Phase 3 항목2([본사] 이력 조회, `s12`) 구현 완료. 착수 전 논의로
  목업 구성 확정 — 목록은 경찰 본청 이력 목록과 같은 형태(전국 스코프, 진행중은
  이미 `/admin/security-cases`에서 보이므로 종결/취소만, 지역청/경찰서 컬럼·필터
  둘 다 노출), 상세는 본사 상세화면(`SecurityCaseDetailPage`) 레이아웃을 재사용
  하되 조회 전용화(액션 버튼·첨부(경호계획서/개인정보동의서/파기확인서 업로드
  UI) 전부 제거, 근무 스케줄은 정산 참고용으로 유지). 배치장소(주거지/직장)는
  "본사가 실제 배치 관리 주체라 필요할 수도 있다"는 의견이 나왔지만, 사용자가
  "피해자 개인정보라 종결 건도 경찰 이력과 동일하게 제외"로 확정.

  구현: `MSW GET /security-cases/history`·`/history/:id`에 본사 계정 분기 추가
  (스코프 제한 없이 종결/취소 전체), API 클라이언트는 신규 없이 경찰 쪽
  `features/police/api/history.ts` 재사용. `BaseInfoSummaryCard`에 `onEdit`
  optional화+`hidePlacement` prop, `ScheduleSection`에 `readOnly` prop 추가해
  기존 컴포넌트를 조회 전용으로 재사용 가능하게 함. 신규
  `features/company/pages/HistoryListPage.tsx`/`HistoryDetailPage.tsx`,
  라우트 `/admin/history`(플레이스홀더 교체)·`/admin/history/:id`(신규) 추가.

  스크린샷 승인 후 사용자 피드백 3건 추가 반영. (1) 본청/지역청/경찰서 이력
  상세에 5개 조치(안전조치·긴급응급조치·잠정조치·긴급임시조치·임시조치)가
  아예 없었던 걸 발견해 경찰 `HistoryDetailPage`에도 추가(종결 건만 baseInfo가
  있어 실값, 취소 건은 "-"). (2) 신규접수 시 입력하는 사건유형(`caseType`)이
  어떤 상세/이력 화면에도 노출이 안 되고 있던 걸 발견 — 경찰 활성 상세
  (`BaseInfoReadCard`)·경찰 이력 상세·본사 활성+이력 상세(`BaseInfoSummaryCard`
  재사용) 전부에 "사건유형" 필드 추가. (3) 경찰 이력 상세 레이아웃을 본사와
  통일 — 기존엔 기본정보가 최상단에 전체폭 한 줄, 그 아래 좌우로 근무자배정
  이력/종결정보가 나뉘어 있었는데, 본사처럼 기본정보(+근무자배정이력)를 좌측
  컬럼, 종결/취소정보를 우측 w-96 카드로 나란히 배치하도록 재구성. 이어서 기본
  정보 그리드가 `xl:grid-cols-6`으로 한 줄에 몰려 답답해 보인다는 지적으로
  `xl` 오버라이드를 제거해 본사와 같은 `sm:grid-cols-3`로 통일(2줄로 자연스럽게
  줄바꿈), 마지막으로 필드 순서를 1행(대상자명/사건유형/경찰관정보)·2행
  (경호시작/경호종료/총경호시간)으로 재배열.

  build/lint/test(23개 파일 79개, 신규 7개) 통과, 본사(운영관리자)+경찰(강남
  경찰서) 계정으로 데스크톱+모바일 브라우저 스크린샷 검증(목록/종결 상세/취소
  상세/사건유형 노출/경찰 이력 상세 레이아웃 전부 확인), 콘솔 에러 없음.
- 2026-08-27: Phase 3 항목3([경찰서] 게스트 계정 발급/관리, `s9`/`s9m`/`s10`/
  `s10m`) 구현 완료(커밋 `a51646e`). 착수 전 확인 — 기존에 `policeAccounts`에
  정적 게스트 계정(`gangnamguest1`) 1개만 하드코딩돼 있었고, `GET /security-cases`
  핸들러는 "화면 9/10 미구현이라 게스트는 빈 목록"이라는 주석과 함께 게스트
  role을 항상 빈 배열로 처리하고 있었음 — 이번 항목의 범위를 "계정 관리 화면"
  뿐 아니라 "게스트 로그인 실동작 연결"까지로 확장(로드맵 화면10 설명 "경찰
  로그인 화면에서 로그인"이 이미 그 의도였음).

  데이터 설계: `mocks/data/guests.ts` 신규(정적 seed → 발급/수정/삭제 가능한
  동적 목록 + localStorage persist, `mocks/data/workers.ts`와 같은 패턴).
  경찰서 표시명→로그인 아이디 접두어 매핑(`강남경찰서→Gangnam`, 매핑 없는
  서는 `Guest`로 대체)으로 `{Prefix}Guest{N}` 형태 아이디 자동 생성. 로그인
  시스템(`mocks/handlers/auth.ts`)이 정적 `policeAccounts` 배열만 보던 걸
  `allPoliceLoginAccounts()`(정적+동적 게스트 합침)로 교체 — `securityCases.ts`/
  `workers.ts` 핸들러의 계정 조회도 동일하게 교체해야 게스트가 상세페이지의
  근무자 정보 등을 정상 조회.

  화면: `GuestListPage`(목록, s9) + `IssueGuestAccountDialog`(발급/수정 공용,
  s10 — `AssignManagerDialog`의 체크 리스트 패턴 재사용해 관리번호 다중선택),
  `DeleteGuestAccountDialog`. 라우트 `/guests`는 이미 로드맵 이전 세션에서
  가드까지 잡혀 있어 `ScreenPlaceholder`만 교체.

  1차 스크린샷 승인 후 사용자가 실제로 발급받은 계정으로 로그인을 시도하다
  버그 발견 — 목록에 표시되는 아이디("GangnamGuest7", 대소문자 혼용)와 실제
  저장된 로그인 id("gangnamguest7", 소문자 정규화)가 달라 화면에 보이는 대로
  입력하면 로그인이 거부됨(기존 정적 `gangnamguest1` 계정도 원래 같은 문제를
  안고 있었지만 이 화면이 없어 드러나지 않았을 뿐). 로그인 매칭을 아이디만
  대소문자 무관 비교로 수정(`auth.ts`)해 해결, 실제 브라우저로 표시된 아이디
  그대로 로그인 재확인.

  이어서 사용자 요청 2건 추가 반영. (1) 발급 모달의 "자동생성 아이디"가
  실제 값 없이 안내 문구만 보여주고 있었는데, 실제 서비스에서는 아이디=초기
  비밀번호로 발급하고 최초 로그인 시 변경하는 흐름을 가져갈 예정이라는 설명과
  함께 모달에 실제 생성될 아이디를 미리 보여주고 그 아래 "초기비밀번호는
  아이디와 동일합니다" 안내를 추가해달라는 요청 — `GET /api/guests/next-id`
  신규(실제 발급 로직과 같은 함수를 재사용해 미리보기가 어긋나지 않게 함),
  게스트 계정 비밀번호도 고정값(`password123`) 대신 발급된 아이디와 동일하게
  변경(안내 문구가 실제 동작과 일치하도록). 최초 로그인 강제 변경 화면 자체는
  로드맵/목업에 없는 별도 기능이라 이번 범위에서는 제외. (2) 관리번호 선택
  후보에 종결/취소 건까지 섞여 있던 걸 발견 — 이미 끝난 협조 건에 새로 게스트를
  할당할 이유가 없다는 지적으로 후보를 배정/경호중/경호완료(비종결·비취소)만
  남도록 제한.

  마지막으로 사용자가 실제 데이터로 재검증하다 "종결/취소된 건이 게스트
  계정에 여전히 할당돼 있다"는 걸 발견(ST101 취소·ST103 종결 사례) — 관리번호
  선택 후보만 막았을 뿐 이미 할당된 뒤에 종결/취소로 전환되는 경우와, 이 기능
  이전부터 존재하던 과거 테스트 데이터(예: seed의 GangnamGuest4)는 정리되지
  않고 있었음. `closeCase`/`cancelAssignedCase`(종결·취소 처리 시점)에서 해당
  건을 모든 게스트 계정 할당에서 즉시 제거하도록 추가하고, 과거에 이미
  종결/취소된 채로 남아있던 할당까지 정리하기 위해 게스트 데이터를 읽는
  시점(게스트 관리 목록 조회·게스트 본인의 경호목록 조회)마다 종결/취소
  상태인 관리번호를 걸러내는 자가 치유 로직도 추가 — 순환 참조를 피하려고
  `mocks/data/guests.ts`는 `securityCases`를 직접 import하지 않고 호출부
  (`mocks/handlers/securityCases.ts`·`mocks/handlers/guests.ts`, 둘 다 이미
  양쪽 데이터에 접근 가능)에서 현재 상태 목록을 넘겨받는 방식으로 순환 없이
  구현.

  build/lint/test(24개 파일 83개, 신규 4개) 통과, 브라우저(Playwright 드라이버)로
  데스크톱+모바일 목록·발급/수정 모달(실제 아이디 미리보기 포함)·신규 발급
  계정 실제 로그인·게스트 스코프 제한(2건만 조회)·조회 전용 상세 렌더링·
  API로 직접 취소/종결 처리 후 게스트 할당에서 즉시 빠지는 것까지 end-to-end
  검증, 콘솔 에러 없음.
- 2026-08-28: Phase 3.5 항목1(모바일 실기기 재점검) 완료(커밋 `247841f`). 사용자가
  갤럭시 실기기로 네트워크 IP 접속해 전체 화면을 점검하며 찾은 문제들을 원인분석
  후 항목 단위로 순차 수정.

  **공통**: (1) 모바일 rail에 프로필/로그아웃이 없던 문제 — `MobileHeader` 신규
  (sticky, xl 미만 전용). 로고는 처음엔 "PGMS"(가칭) 이니셜 배지였다가, 사용자가
  발표 때 쓰던 프로덕트명 "Safety Link" 워드마크 이미지(`public/SafetyLogo_no_bg.png`
  /`_white.png`)로 교체 요청 — 첫 업로드본(`SafetyLink_logo.png`)은 PNG 헤더는
  RGBA였지만 실제 배경 픽셀이 alpha=255인 가짜 투명(체크무늬가 실제 픽셀로
  구워짐)이었던 걸 canvas로 alpha 샘플링해 확인 후 재업로드본으로 교체, 원본은
  삭제. 헤더 배경은 배경통일(A안)/다크 rail 통일(B안) 두 버전을 실제 구현해
  비교한 뒤 B안(다크 네이비, `bg-sidebar`) 채택 — 화이트 로고와 짝을 맞춤. 이어서
  "너무 얇다"는 피드백으로 패딩/아이콘 크기를 키워 유튜브 모바일 앱바 수준으로
  조정(py-2.5→py-3.5, 아바타 28px→32px). 프로필뱃지는 클릭 시 프로필/로그아웃
  DropdownMenu가 뜨도록 변경(기존 `RequestListPage` 등에서 쓰던 DropdownMenu
  재사용, 별도 Popover 프리미티브 도입 안 함) — "프로필" 항목은 아직 연결된
  화면이 없어 자리만 있고 동작 없음, roadmap.md Phase 3.5에 후속 백로그로 기록.

  (2) 경호목록/이력목록 모바일 카드의 `justify-between`이 실기기(갤럭시+네이버
  인앱브라우저)에서만 깨지는 버그 — devtools 모바일 에뮬레이션은 뷰포트만 바꿀
  뿐 여전히 Chromium 엔진이라 재현이 안 됐던 것으로 추정. `w-full` 추가로는
  해결 안 됐고(캐시 삭제 후에도 재현), 정상 동작하던 게스트/근무자 목록이
  `<div>` 래퍼를 쓴다는 점에 착안해 `<button>`→`<div role="button" tabIndex={0}>`
  로 교체(키보드 접근성은 onKeyDown Enter/Space로 보완)한 뒤 실기기 재검증으로
  해결 확인(경호목록 2곳 + 이력목록 2곳, 총 4곳).

  (3) 모바일 입력창/셀렉트가 16px인 이유(iOS Safari 포커스 자동확대 방지, 2026-08-22
  기존 결정) 논의 — 사용자가 찾아온 PWA 관련 사례(standalone PWA는 핀치 줌아웃으로
  되돌리기 어려워 auto-zoom이 더 치명적)를 근거로 16px 유지를 재확인, 축소 안 함.

  **경찰**: (4) 이력 상세 페이지 스크롤 시 하단 floating nav와 겹치는 버그 —
  앱 전역 컨벤션은 `pb-28 sm:pb-28 xl:pb-8`인데 `HistoryDetailPage.tsx`(경찰/본사
  둘 다)만 `pb-10`으로 빠져있던 단순 누락, 컨벤션대로 통일. (5) 신규접수/수정
  폼 제출 성공 후 뒤로가기하면 폼으로 되돌아가는 문제 — `navigate`에
  `{ replace: true }` 적용(신규접수/수정/접수취소/경호취소 4곳), 실제 브라우저로
  히스토리 스택에서 폼 라우트가 빠지는 것까지 확인.

  **본사**: (6) 경호상세 접수취소/경호취소 버튼을 경찰과 동일하게 모바일에서
  헤더 대신 하단 전체폭 배치로 변경(`hidden xl:flex`/`xl:hidden` 토글 패턴 재사용).
  테스트에서 트리거 버튼이 두 곳에 동시 렌더링되는 문제(jsdom엔 둘 다 잡힘)는
  `firstButton()` 헬퍼로 보정(police 쪽 기존 패턴과 동일). (7) 기본정보등록
  "3. 배치시간" 섹션이 모바일에서 "시작시간/시작분 ~" / "종료시간/종료분"으로
  어색하게 줄바꿈되던 문제 — 바로 위 "2. 배치기간" 섹션과 동일한 레이아웃
  (`flex-col gap-4 sm:flex-row`, 각자 라벨을 가진 독립 필드, "~" 제거)으로 재구성.

  **캘린더**: 네이티브 `type="date"` input은 placeholder 커스텀이 불가능한 문제로
  shadcn Calendar 재도입 검토 — 예전에 문제를 겪었다는 기억이 있었지만
  react-day-picker v10(최신 메이저, `shadcn add calendar`로 설치)으로 실제
  구현해보니 문제없이 정상 동작 확인(구버전 v8 시절 이슈였을 것으로 추정).
  CLI 실행 중 `button.tsx` 덮어쓰기 프롬프트가 떠서 커스터마이징(text-trim 등)이
  날아갈 뻔했으나 전부 `n`으로 거부해서 보존, `calendar.tsx`/`popover.tsx`만 신규
  추가됨. 재사용 컴포넌트 `shared/components/DateField.tsx` 신규(Popover+Calendar,
  Input과 동일한 시각 스타일, 한글 로케일 기본 적용) — 값 변환은 과거
  WorkerAssignmentPanel에서 겪은 "UTC 변환 시 로컬 자정이 하루 밀리는" 버그를
  피하려고 양방향 다 로컬 getter/생성자만 사용. 기존 `type="date"` 6곳(신규접수/
  수정 시작·종료일, 경찰/본사 이력조회 필터, 사전미팅 날짜, 조치기간 5종
  시작·종료일) 전부 교체, Dialog 안에 중첩돼도 z-index 문제 없음을 실기기
  스크린샷으로 확인. 이어서 사용자 요청으로 시작일/종료일 쌍이 서로를 못 넘어가게
  `DateField`에 `minDate`/`maxDate` prop 추가(react-day-picker `disabled`
  matcher로 상대편 날짜 이전/이후를 비활성화) — 배치기간·이력조회 필터·조치기간
  전체에 반영.

  **번역 충돌 버그**: 캘린더에서 날짜를 선택해도 트리거에 표시된 텍스트가
  placeholder 그대로 남는(색만 진해지는) 버그를 사용자가 크롬에서 재현 — 원인은
  `index.html`의 `<html lang="en">`이 실제 한글 콘텐츠와 달라 Chrome이 자동번역을
  시도했고, 번역 위젯이 DOM 텍스트 노드를 가로채면서 React의 재렌더링과 충돌한
  것(사용자가 직접 원인을 찾아냄). `lang="ko"`로 수정해 해결.

  build/lint/test 매 단계 통과 확인(최종 27개 파일 83개), 전 과정 Playwright
  드라이버로 데스크톱+모바일 스크린샷 검증 + 사용자가 실기기(갤럭시, 네이버
  인앱브라우저 포함)로 각 수정사항 재확인. 콘솔 에러 없음. Phase 3.5 항목2(전체
  워크플로우 통합 테스트)는 아직 미착수.
- 2026-08-28: Phase 3.5 항목2(전체 워크플로우 통합 테스트) 착수. 사용자가 경찰서
  계정·본사 운영관리자 계정으로 흐름을 직접 확인하며 UI 개선사항 6건 발견,
  바로 수정(커밋 `8660488`/`8423086`). (1) 본사 기본정보등록 "5. 담당 경찰관"
  섹션이 배치요구서(단일 입력)와 다르게 이름/전화번호 2필드로 쪼개져 있던 것을
  단일 필드로 통일 — `CaseBaseInfo.investigatorName/investigatorPhone/
  victimOfficerName/victimOfficerPhone`(4필드)를 `investigator`/`victimOfficer`
  (단일 문자열 2필드)로 축소, `splitContact()` 파싱 제거(형식이 살짝만 달라도
  깨지는 구조였음). (2) 기본정보등록 하단 취소/등록 버튼이 모바일에서도 작은
  사이즈였던 것을 경찰 접수/수정 폼(`SecurityCaseForm.tsx`)에 이미 있던
  `flex-1 ... xl:flex-none` 반반 패턴으로 통일 — 다른 다이얼로그들의 취소/확인
  버튼은 좁은 모달 안이라 지금 사이즈가 맞아 손대지 않음. (3) 근무 스케줄 그룹
  시간 입력이 자유텍스트였던 것을 같은 파일군의 `PreMeetingDialog`가 이미 쓰던
  `HourMinuteSelect`로 교체(오탈자 방지, 앱 표준과 통일) — 이 과정에서 테스트가
  `getAllByDisplayValue('09:00')`로 값을 바꾸던 방식이라 함께 깨져
  `getByLabelText`+select 클릭 방식으로 수정. (4·6) 연장/단축요청 승인 모달
  (`PeriodRequestActionDialog.tsx`)의 "승인하시겠습니까? + 현재/요청 배치기간"이
  `<br/>`로만 구분된 인라인 문장이라 좁은 화면에서 어색하게 줄바꿈되던 것을
  라벨/값 row 구조로 재구성, 요청 배치기간 값은 semibold 강조. (5) 경찰이 연장/
  단축 요청을 넣어도 본사가 목록/상세에서 바로 알 방법이 없다는 아이디어는 구현
  안 하고 roadmap.md에 백로그로만 기록. 이어서 경찰 측 연장 모달의 "연장 후
  경호기간 (7일 단위 연장)" 라벨도 모바일에서 줄바꿈이 어색하다는 추가 피드백—
  괄호 설명을 라벨에서 떼어내 단축 탭에 이미 있던 캡션 패턴(`text-[11px]
  text-muted-foreground`)과 동일하게 별도 안내문구로 분리.

  build/lint/test 통과(83개), Playwright 드라이버로 전체 흐름(연장요청 생성→
  본사 승인까지) 실제 재현해 각 수정사항 스크린샷 검증. 경찰서·운영관리자 계정
  확인 완료 — 나머지 계정(본청/지역청/게스트, 시스템관리자/본부관리자)은 아직
  미확인, 이어서 진행 예정.
- 2026-08-28: Phase 3.5 항목2 이어서 본부관리자 계정 확인 중 스코프 제한 미비
  발견 — `docs/project-overview.md`엔 "본부관리자는 본인이 배정받은 경호건에
  한해서만 조회/처리 가능"이라 명시돼 있는데, 실제 `GET /api/security-cases`·
  `GET /api/security-cases/history` MSW 핸들러는 회사 계정이면 역할 구분 없이
  전체를 반환하고 있었음(시스템관리자/운영관리자와 동일하게). 사용자 확인 후
  범위를 (1) 경호관리/이력 목록 API를 본부관리자만 본인 담당(`assignee` 일치)
  건으로 스코프, (2) 연장/단축요청도 조회·승인·거부 전부 본인 담당 건만 가능
  (배치요청은 원래도 시스템관리자/운영관리자 전용이라 대상 아님)으로 확정하고
  작업 진행(**사용자 검토 필요**).

  구현: `mocks/handlers/securityCases.ts`에 `scopeForCompanyAccount(account, cases)`
  헬퍼 신규(본부관리자면 `assignee === account.name`만 필터, 그 외 역할은 그대로) —
  `GET /security-cases`에 적용해 경호관리 목록뿐 아니라 같은 API를 재사용하는
  `SecurityCaseTabs` 탭카운트·`PeriodRequestListPage`(연장/단축 목록)까지 연쇄로
  스코프됨. `GET /security-cases/history`에도 동일 적용. 목록만 막으면 URL 직접
  접근으로 우회 가능해서(Phase1 때 이미 한 번 지적됐던 패턴) `GET /security-cases/:id`·
  `GET /security-cases/history/:id`·`PUT /security-cases/:id/period-request/approve`·
  `/reject`에도 본부관리자 담당자 불일치 시 403 처리 추가.

  테스트: 회사 경호목록/이력/연장단축요청/상세 페이지 테스트 4개 파일에 본부관리자
  스코프 케이스 7개 신규(본인 담당 건만 노출, 타 담당자 건 비노출, 담당자 아닌
  건 상세 URL 접근 시 에러 화면, 담당자 아닌 건 승인 API 직접 호출 시 거부).
  build/lint/test(23개 파일 90개, 신규 7개) 통과. Playwright 드라이버로 hqmanager1
  (김민수) 계정 브라우저 검증 — 경호관리 목록 "경호목록 1"(본인 건 ST101만),
  이력 목록(본인 종결 건 ST110/ST113만, 타 담당자 ST111/ST112 제외), 타 담당자
  건(case-seed-7, 이영희 담당) 상세 URL 직접 접근 시 "경호건을 불러오지
  못했습니다" 에러 화면(콘솔 403, 의도된 차단) 전부 확인.

  **아직 미검토**: 이번 작업은 사용자가 결과를 직접 확인하기 전 상태 —
  스코프 기준(assignee 이름 매칭)과 403 처리 범위가 실제 의도와 맞는지 검토
  필요. 나머지 계정(본청/지역청/게스트, 시스템관리자)은 여전히 미확인.
- 2026-08-31: 위 미검토 항목 사용자 검토 완료, 후속으로 두 가지 발견/결정.
  (1) [본사] 경호관리 상단 탭에 본부관리자에게도 "배치요청"이 노출되고 있었음
  — 배치요청은 시스템관리자/운영관리자 전용(라우트 가드는 이미 `COMPANY_ADMIN`
  으로 제한돼 있었으나 `SecurityCaseTabs`가 역할과 무관하게 탭을 항상 렌더링).
  `useAuthStore`로 role을 읽어 본부관리자면 탭 자체를 숨기도록 수정(커밋
  `6e64ac7`). (2) 시스템관리자/운영관리자가 하위 본부관리자 계정을 관리하는
  화면이 아예 없다는 게 확인돼 논의 끝에 신규 화면으로 계획(로드맵 Phase 3.6
  "관리자 계정 관리" 항목, 메뉴명/스코프/액션/권한 매트릭스까지 확정, 아래
  참고).

  설계 논의 중 더 근본적인 문제 발견 — `SecurityCase.assignee`가 담당자 id가
  아니라 **이름 문자열**을 스냅샷 저장하는 구조였음(배정 시점
  `assignManager(caseId, managerName)`으로 저장). 본부관리자는 "본부당 계정
  1개 고정, 인사이동 시 담당자만 교체" 운영 방침이라 계정의 이름이 바뀔 수
  있는데, 이름 문자열로 스코프 필터링/컬럼 표시를 하고 있으면 인사이동
  즉시 스코프가 깨짐(새 담당자가 기존 배정 건을 못 보게 되거나, 목록의
  담당자/본부 컬럼이 매칭 실패로 "-" 표시). 실제 백엔드 연결 시에도 FK
  참조 방식일 거라는 사용자 판단으로 `assigneeId`(계정 id) 참조로 먼저
  리팩터하기로 결정 — 로드맵 Phase 3.6 항목1로 별도 기록 후 착수(아래 항목
  참고).
- 2026-08-31: Phase 3.6 항목1(assignee → assigneeId 리팩터) 완료. 확인해보니
  API 계약(`POST /security-cases/:id/assign`)은 원래도 `{ managerId }`로
  주고받고 있었고, MSW 핸들러가 그 id로 계정을 찾은 직후 `assignManager(caseId,
  manager.name)`으로 **이름으로 변환해서 저장하는 지점 한 곳**만 있었음 —
  그 변환을 없애고 id를 끝까지 들고 가는 정도로 범위가 생각보다 작았음.

  변경: `SecurityCase.assignee?: string` → `assigneeId?: string`(타입 +
  `SecurityCaseCreateInput` Omit 유니온), `mocks/data/securityCases.ts`의
  `assignManager()`+seed 데이터(김민수/이영희/박준혁 → hqmanager1/2/3),
  `mocks/handlers/securityCases.ts`의 `scopeForCompanyAccount()` + 상세/
  승인/거부 3곳의 403 체크 + assign 핸들러(`manager.name` → `manager.id`),
  `SecurityCaseListPage.tsx`의 담당자/본부 컬럼·필터(`branchByManagerName`
  이름 매핑 → `managersById` id 매핑으로 교체, 필터 드롭다운도 케이스에서
  뽑은 이름 대신 매니저 id를 값으로 사용). 테스트 6개 파일의 `assignManager(...)`
  호출/단언을 이름→id로 갱신(hqmanager1~4).

  build/lint/test(90개) 통과. Playwright 드라이버로 end-to-end 검증 — 배치요청
  목록에서 실제 UI로 담당자 배정(더보기 → 배정 → 박준혁 선택 → 배정하기)
  성공, 경호목록 담당자/본부 컬럼이 새 `assigneeId` 기반 조회로 정상 표시
  ("박준혁"/"서부본부"), hqmanager1/hqmanager3 로그인 시 본인 담당 건만
  스코프되는 것도 재확인. 검증 중 겪은 실수(앱 버그 아님, 기록용): 드라이버로
  로그인 직후 곧바로 `nav`하면 로그인 응답 전에 페이지가 이동해 이전 계정
  세션이 남아있는 것처럼 보이는 현상 재발 — 로그인 후 도착 화면 텍스트를
  `wait`으로 반드시 기다려야 함(2026-08-27에도 같은 교훈 기록됨). 또한
  `SecurityCaseTabs`의 아이콘 전용 "더보기" 버튼은 `aria-label`만 있고 visible
  text가 없어 드라이버의 `click-text`(text= 로케이터)로는 못 찾음 —
  `click button[aria-label="더보기"] >> nth=0`처럼 속성 선택자로 클릭해야 함.
- 2026-08-31: Phase 3.6 항목2([본사] 관리자 계정 관리) 구현 완료. 신규
  `/admin/managers`(메뉴명 "관리자") — 게스트 계정 관리(화면 9/10)와 같은
  "목록 + 모달" 패턴. `mocks/data/accounts.ts`에 `phone` 필드 추가 +
  `companyAccounts`를 workers/guests와 같은 localStorage persist 방식으로
  전환, `updateCompanyAccountInfo`/`resetCompanyAccountPassword` 신규.
  MSW `mocks/handlers/companyAccounts.ts` 신규(목록/정보수정/비밀번호초기화
  3개 엔드포인트), API 클라이언트 `features/company/api/managerAccounts.ts`,
  페이지 `ManagerAccountListPage.tsx` + 다이얼로그 3종
  (`EditManagerAccountDialog`/`ResetManagerPasswordDialog`/
  `ManagerAssignedCasesDialog`).

  구현 중 막힌 지점 — "배정 건 수정"(재배정)을 만들려고 기존
  `assignManager()`를 재사용하려 했으나, 이 함수는 접수→배정 최초 배정
  전용이라 이미 배정된 건은 거부하는 가드(중복배정 방지, 기존 테스트로
  보장됨)가 있어 그대로 못 씀 — 사용자 확인 후 `reassignManager()`를
  별도로 만들어 대응. 이후 사용자가 "담당자 변경은 이 화면이 아니라 경호
  상세 화면 책임"이라고 판단해 재배정 기능 자체를 스코프에서 빼기로
  하면서 `reassignManager()`/전용 엔드포인트/API 클라이언트/
  `AssignManagerDialog`의 `mode` prop을 전부 롤백 — "담당경호"는 조회
  전용 목록으로 축소(후속 항목으로 로드맵에 기록).

  1차 스크린샷 승인 후 사용자 피드백 다수 라운드 반영. (1) 사이드바 메뉴
  순서(대시보드/경호관리/이력/근무자/관리자)로 정렬. (2) 비밀번호 초기화
  모달의 description 줄 제거하고 게스트 발급 모달과 같은 아이디 표시
  박스로 교체, 본문은 "비밀번호를 초기화하시겠습니까?" 한 줄로 축소.
  (3) "배정 건 목록" → "담당경호"로 메뉴/모달 타이틀 통일. (4) 담당경호
  리스트 아이템에서 관리번호에 이미 경찰서명이 포함돼 있어 중복되는
  경찰서 캡션 줄 제거. (5) 권한 매트릭스 재확정 — 조회 범위를
  시스템/운영/본부관리자 전체로 통일(라우트 가드 `COMPANY_ADMIN`→
  `COMPANY_ALL`), 정보수정은 역할 무관 항상 본인만/비밀번호초기화는
  본인+하위 계층으로 단순화(이전엔 시스템관리자가 타인 정보수정도
  가능했음 — 폐기). (6) 본부관리자가 다른 본부관리자 행을 볼 때는
  배정건수 숫자는 보이되 "⋮" 액션 버튼 자체를 제거(담당경호도 본인
  행에서만 노출).

  (6) 작업 중 실제 버그 발견: `GET /api/security-cases`가 "본부관리자는
  본인 배정 건만 조회"라는 경호관리 화면 전용 스코프 규칙을 갖고 있어서,
  이 화면의 배정건수 집계가 그 스코프를 그대로 타 버려 본부관리자로
  보면 다른 관리자의 배정건수가 실제로는 있는데도 전부 0으로 표시되는
  문제였음 — `GET /api/company-accounts` 응답에 `assignedCount`를
  스코프와 무관하게 `securityCases` 전체에서 직접 계산해 내려주도록
  수정.

  build/lint/test(24개 파일 105개, 신규 13개) 통과. 시스템관리자/
  운영관리자/본부관리자 3개 계정 전부 브라우저(Playwright 드라이버)로
  검증 — 조회 범위, 정보수정/비밀번호초기화 권한별 메뉴 노출, 담당경호
  조회 전용 동작, 본부관리자 접근 시 배정건수 정확성까지 전부 확인,
  콘솔 에러 없음. 커밋 `d13de2c`.
- 2026-08-31: Phase 3.5 항목2(전체 워크플로우 통합 테스트) 마무리. 남아있던
  미확인 계정(본청/지역청/게스트, 시스템관리자)을 사용자가 직접 확인해
  문제 없음을 확인 — 8/28 발견된 본부관리자 스코프 미비(위 iteration 로그
  참고, 커밋 `0fd9c78`)에 대한 "사용자 검토 필요" 플래그도 이걸로 해소.
  1차 통과로 완료 처리, roadmap.md 체크.
- 2026-08-31: Phase 3.6 후속 백로그([본사] 비밀번호 초기화 후 최초 로그인
  강제 변경 플로우) 구현 완료. 착수 전 논의에서 설계 방향이 두 번 바뀜 —
  처음엔 "비밀번호===아이디" 문자열 비교로 감지하는 안을 제시했으나,
  사용자가 "실제 백엔드 연결 시 users 테이블에 최초 로그인 관련 boolean
  컬럼이 있을 것"이라고 확인해줘서 `Account`에 `mustChangePassword?:
  boolean` 플래그를 추가하는 방식으로 전환(assigneeId 리팩터 때와 같은
  이유 — 실제 DB 스키마를 미리 흉내냄). 적용 범위는 게스트 계정(경찰
  로그인)과 관리자 계정(본사 로그인) 둘 다로 확정.

  구현: `mocks/data/accounts.ts`의 `resetCompanyAccountPassword()`가
  `mustChangePassword: true`도 같이 세팅, `changeCompanyAccountPassword()`
  신규(비밀번호 교체 + 플래그 해제). `features/police/api/guests.ts`의
  `GuestAccount`에 `password`/`mustChangePassword` 필드 추가 — 기존엔
  게스트 로그인 비밀번호가 `guestLoginAccounts()`에서 매번 `g.name`으로
  파생 계산됐는데, 최초 변경 이후엔 사용자가 정한 값을 실제로 저장해야
  해서 저장형으로 전환(과거 seed 데이터엔 `password` 필드가 없어
  `g.password ?? g.name` 폴백 유지). `mocks/data/guests.ts`에
  `changeGuestAccountPassword()` 신규.

  `mocks/handlers/auth.ts`의 `loginHandler`가 인증 성공 후
  `account.mustChangePassword`를 확인해 참이면 토큰 없이
  `{mustChangePassword: true, id}`만 응답. 신규
  `changeInitialPasswordHandler`(일반 "비밀번호 변경" API가 아니라
  `mustChangePassword`가 실제로 true인 계정에만 허용) →
  `/api/auth/police/change-initial-password`·
  `/api/auth/company/change-initial-password` 2개 등록, 게스트는
  `changeGuestAccountPassword`, 관리자는 `changeCompanyAccountPassword`
  연결.

  프론트: 공용 `ForceChangePasswordDialog`(닫기 버튼 없음, ESC/바깥클릭
  차단 — 변경 완료 전엔 못 닫음) 신규, 새 비밀번호가 아이디와 같으면
  거부하는 검증 포함. `PoliceLoginPage`/`CompanyLoginPage` 둘 다 로그인
  응답에 `mustChangePassword`가 있으면 이 모달을 띄우고, 변경 성공 시
  세션을 발급하지 않고 로그인 폼으로 돌아가 토스트로 재로그인을 안내
  (기존 시드 계정은 플래그 미설정이라 영향 없음).

  build/lint/test(25개 파일 114개, 신규 9개) 통과. Playwright 드라이버로
  양쪽 전체 플로우 end-to-end 검증 — 경찰: 게스트 계정 신규 발급 →
  발급된 아이디/초기비밀번호로 로그인 → 강제 변경 모달 → 새 비밀번호
  설정 → 재로그인 요구 확인 → 새 비밀번호로 재로그인 성공(경호목록 진입).
  본사: 관리자 계정 관리에서 비밀번호 초기화 → 같은 플로우로 재로그인
  성공(본사 전체 대시보드 진입). 콘솔 에러 없음.
