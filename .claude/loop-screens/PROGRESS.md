# 진행 상태

상태값: `대기` / `구현중` / `승인대기` / `완료`

## Phase 1 — 핵심 워크플로우 (접수 → 종결 한 바퀴)

| # | 항목 | 목업 anchor | 상태 | 커밋 | 비고 |
|---|---|---|---|---|---|
| 1 | [경찰서] 접수 / 배치요구서 작성 | `s4` `s4m` | 완료 | `747c0bd` | |
| 2 | [본사] 배치요청 목록 + 담당자 배정 | `s6b` `s6c` | 완료 | `fee6fd0` | |
| 3 | [본사] 배정 경호건 상세 | `s7a` `s7c` `s7d` `s7e` `s7` `s7b` | 완료 | `3300a9c` `6abb74a` | 워크플로우 수정 다수 반영 후 완료. **미해결**: 상세 페이지에 상태 가드가 없어 URL을 직접 알면 접수 상태에서도 기본정보 등록이 가능한 우회 경로가 남아있음 — 필요시 후속 처리 |
| 4 | [경찰서] 경찰서 경호목록 | `s3` `s3m` | 대기 | | 본사 쪽과 같은 이유로 Phase 2에서 앞당김 — 목록 없이 상세부터 만들면 진입 경로가 없어 같은 문제가 재발함 (2026-08-24) |
| 5 | [경찰서] 경호 상세 (연장·단축 모달 포함) | `s5` `s5-recv` `s5-assigned` `s5m` `s5-ext` `s5-ext-short` `s5m-ext` `s5m-ext-short` | 대기 | | |

Phase 2~4는 Phase 1 끝나고 이 표에 이어서 추가.

## Phase 3에서 순서를 앞당긴 항목

| 항목 | 목업 anchor | 상태 | 비고 |
|---|---|---|---|
| [본사] 근무자 목록/등록 | `s11` `s11b` | 완료 | 항목 3(배정 경호건 상세)의 근무자 선택 드롭다운이 이 데이터에 의존해서 먼저 구현 (2026-08-22) |

## Phase 2에서 순서를 앞당긴 항목

| 항목 | 목업 anchor | 상태 | 비고 |
|---|---|---|---|
| [본사] 본사 경호목록 | `s6d` | 완료 | 항목 3 검증 중 "배정 후 상태 미반영" 문제의 근본 원인이 이 화면 부재였음이 드러나 앞당겨 구현 — 같은 이유로 경찰서 경호목록(`s3`)도 Phase 1 항목4로 앞당김(위 표 참고) (2026-08-24) |

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
