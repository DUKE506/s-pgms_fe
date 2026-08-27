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
| 2 | [본사] 연장요청/단축요청 승인 | 없음(목업 미설계) | 완료 | (커밋 예정) | 배치요청 목록(s6b)과 동일한 형태로 재구성. 승인 시 `workSchedule.days`도 연장/절단 |

Phase 2 완료. Phase 3부터는 이 표에 이어서 추가.

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
