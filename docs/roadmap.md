# 개발 로드맵

핵심 워크플로우를 얇게 한 바퀴 먼저 돌린 뒤 목록 → 이력/부가기능 → 대시보드 순으로 확장합니다.
진행하면서 체크박스를 갱신합니다.

각 항목은 담당 계정(`[경찰서]`/`[본사]`/`[본청/지역청]` 등)을 태그로 표시하고, 뒤에는 `docs/PGMS_UI_mock.dc.html`의 목업 anchor ID를 바인딩했습니다(한 항목에 여러 ID가 붙을 수 있음 — 실제 구현 단위 기준으로 묶음). 화면 7의 대안 변형(`7f`/`7g`)은 폐기 확정되어 제외했습니다.

## 참고 — 루프 자동화 관련

Phase 0에서 사람이 직접 구현/검토하며 자동검증 패턴을 먼저 확립했다: MSW mock, 로그인/인증, 라우터+가드, 공용 UI 세트(디자인 토큰, shadcn 컴포넌트, Sidebar/AppShell)까지 완료되면서 화면마다 새로 디자인 판단을 할 필요가 줄었고, `run-s-pgms` 드라이버(`.claude/skills/run-s-pgms/`)로 실제 브라우저 스크린샷 검증도 가능해졌다.

이 상태를 근거로 Phase 1부터는 화면 구현 자체를 loop 대상으로 삼기로 했다 (2026-08-20 결정) — 단, "목업과 맞는지"는 여전히 사람이 스크린샷을 보고 판단해야 하므로 완전 자동검증은 아니다. 그래서 **화면 1개 = 1 iteration, 반드시 사용자 승인을 받아야 다음 화면으로 진행**하는 형태로 운영한다 (ScheduleWakeup 기반 무인 자동진행 아님 — 대화 턴 안에서 사람이 매번 다음으로 진행시킴). 구조는 `.claude/loop-screens/`에 `TASK.md`/`LOOP_INSTRUCTIONS.md`/`PROGRESS.md`로 구성했다.

## Phase 0 — 기반

- [x] MSW mock 핸들러 구조 세팅
- [x] 로그인(경찰/본사) 화면 + 인증 흐름 (토큰 저장, 인터셉터)
- [x] 라우터 + `ProtectedRoute` 가드
- [x] 공용 UI 최소 세트 (버튼/테이블/상태뱃지 등)

## Phase 1 — 핵심 워크플로우 (접수 → 종결 한 바퀴)

- [x] [경찰서] 접수 / 배치요구서 작성 — `s4` `s4m`
- [x] [본사] 배치요청 목록 + 담당자 배정 — `s6b` `s6c`
- [x] [본사] 배정 경호건 상세 (기본정보 등록, 근무 스케줄 입력) — `s7a` `s7c` `s7d` `s7e` `s7` `s7b`
- [x] [경찰서] 경찰서 경호목록 — `s3` `s3m` (본사 쪽과 같은 이유로 Phase 2에서 앞당김 — 목록 없이 상세부터 만들면 진입 경로가 없어 같은 문제가 재발함, 2026-08-24)
- [x] [경찰서] 경호 상세 (연장·단축 모달 포함) — `s5` `s5-recv` `s5-assigned` `s5-done` `s5m` `s5-ext` `s5-ext-short` `s5m-ext` `s5m-ext-short` (연장/단축은 즉시반영이 아니라 요청 제출까지만 — 본사 승인 화면은 후속 항목, 2026-08-25)

## Phase 2 — 목록

- [x] [본사] 본사 경호목록 — `s6d` (Phase 1 항목 3 검증 중 "배정 상태가 새로고침/URL 이동 시 반영 안 됨" 문제의 근본 원인이 이 화면의 부재였음이 드러나 앞당겨 구현, 2026-08-24)
- [x] [본사] 연장요청/단축요청 승인 화면 — 목업 anchor 없음(원본 목업에도 미설계). 배치요청 목록(s6b)과 동일한 형태(목록+더보기 드롭다운 승인/거부)로 재구성, 승인 시 `workSchedule.days`도 함께 연장/절단(2026-08-27)

## Phase 3 — 이력 / 부가기능

- [x] [본청/지역청/경찰서] 이력 조회 (목록 + 상세, 조직 단계 공통 컴포넌트) — `s1h` `s1hm` `s2h` `s2hm` `s8` `s8m` `s8h` `s8hm` (본청/지역청은 Phase4 대시보드 미구현으로 전체 상태(진행중 포함) 조회로 확장, 진행중 건은 기존 경호 상세 화면을 조회 전용으로 재사용 — 경찰서는 원래 설계대로 종결/취소만 유지, 2026-08-27)
- [x] [본사] 이력 조회 — `s12` (목업과 동일하게 종결/취소만 대상, 전국 스코프로 지역청/경찰서 컬럼·필터 모두 노출. 상세는 본사 상세화면 레이아웃 재사용 + 조회전용화 — 배치장소는 피해자 개인정보라 종결 건도 제외, 근무 스케줄은 정산 참고용으로 유지, 첨부/액션버튼 전부 제거. 이 작업 중 경찰 이력 상세에도 사건유형·5개 조치 항목을 추가하고 본사와 같은 좌우 배치 레이아웃으로 통일, 2026-08-27)
- [x] [경찰서] 게스트 계정 발급/관리 — `s9` `s9m` `s10` `s10m` (목록은 s9와 동일 구조, 발급/수정은 같은 모달 재사용(다중선택 관리번호). 게스트 로그인 실동작까지 연결 — 발급 시 선택한 경호건만 조회 가능, 경호목록/상세는 조회 전용(본청/지역청과 동일 패턴). 관리번호 선택 후보는 종결/취소 제외, 종결/취소 전환 시 할당된 게스트 계정에서 자동 제거(과거 데이터 자가 치유 포함). 초기 비밀번호=아이디, 로그인은 아이디 대소문자 무관 매칭, 2026-08-27)
- [x] [본사] 근무자 목록/등록 — `s11` `s11b` (Phase 1 항목 3의 선행 의존성이라 순서를 앞당겨 구현, 2026-08-22)

## Phase 3.5 — 모바일 재점검 + 전체 워크플로우 통합 테스트

Phase 3까지 완료된 시점에 대시보드(Phase 4)를 시작하기 전, 지금까지 화면
단위로 쪼개서 구현·검증해온 것과 별개로 모바일 실기기 + 전체 흐름을 이어서
한 번 더 점검한다 (2026-08-27 결정, `vite.config.ts`에 `server.host: true`를
추가해 같은 네트워크에서 IP로 접속 가능하게 해둔 상태).

- [x] 모바일 실기기로 네트워크 IP 접속해 전체 화면 디테일 재점검 (레이아웃·터치
      타깃·타이포그래피 등 데스크톱 브라우저 스크린샷만으로는 놓쳤을 수 있는 부분) —
      갤럭시+네이버 인앱브라우저 포함 재점검, 발견된 버그 전부 수정(2026-08-28,
      커밋 `247841f`)
- [x] 대시보드(Phase 4)를 제외한 전체 워크플로우 통합 테스트 — 접수 → 배정 →
      기본정보/근무스케줄 등록 → 경호중(연장·단축 요청/승인) → 경호완료 → 종결,
      취소 경로, 게스트 계정 발급·로그인·조회 범위, 이력 조회까지 한 바퀴.
      경찰서·본사 운영관리자·본부관리자 계정은 사용자가 직접 확인하며 스코프
      미비 1건 발견/수정(아래 참고), 나머지 계정(본청/지역청/게스트,
      시스템관리자)도 사용자가 추가로 확인해 문제 없음 확인(2026-08-31, 1차 통과)

**발견된 후속 항목 (이번 범위 밖, 별도 진행 예정):**

- [ ] [공통] 프로필 화면 — 본인 계정 비밀번호 변경 기능만 간단히. 모바일 헤더에
      프로필 드롭다운(프로필/로그아웃)을 신설하면서 "프로필" 항목의 실제 목적지가
      필요하다는 게 확인됨 (2026-08-28). 화면 목업 없음 — 신규 설계 필요.
- [ ] [본사] 연장/단축요청 미확인 표시 — 경찰이 연장·단축을 요청해도 본사 관리자가
      연장요청/단축요청 탭에 직접 들어가지 않으면 알 방법이 없음. 경호목록/상세
      페이지에서 해당 건에 `pendingPeriodRequest`가 있으면 뱃지 등으로 바로 표시되면
      좋겠다는 아이디어 (2026-08-28, Phase 3.5 항목2 통합 테스트 중 발견). 화면
      목업 없음 — 신규 설계 필요.

## Phase 3.6 — 담당자 참조 리팩터 + 관리자 계정 관리

Phase 3.5 항목2(통합 테스트) 중 본부관리자 스코프 제한을 작업하면서, 현재
`SecurityCase.assignee`가 담당자 **이름 문자열**을 스냅샷 저장하는 구조라는
게 드러났다 — 스코프 필터링(본부관리자 조회 제한)과 본사 경호목록의
담당자/본부 컬럼이 전부 이 이름 매칭에 의존 중이라, 인사이동으로 담당자
이름이 바뀌면 조용히 깨지는 구조였다. 마침 "시스템관리자/운영관리자가
본부관리자 계정을 관리하는 화면이 없다"는 것도 같은 시점에 확인돼, 두
작업을 이어서 진행하기로 함(2026-08-31 결정).

- [x] [내부] `assignee`(이름 문자열) → `assigneeId`(계정 id 참조)로 리팩터.
      본부는 계정에 고정값으로 귀속(인사이동돼도 계정 id/본부는 그대로,
      이름/연락처만 바뀜). 실제 백엔드 연결 시에도 이 방식(FK 참조)일 것으로
      예상돼 미리 전환. 대상: `SecurityCase` 타입, `assignManager()`,
      `scopeForCompanyAccount()` + 상세/승인/거부 3곳의 403 체크, 본사
      경호목록의 담당자/본부 컬럼·필터, seed 데이터, 관련 테스트. API 계약은
      이미 `managerId`로 주고받고 있어(`assignManager(caseId, managerId)`
      MSW 핸들러) id→name 변환 지점 한 곳만 없애면 되는 정도의 범위로 확인함.
- [x] [본사] 관리자 계정 관리 (신규, 목업 없음) — 메뉴명 "관리자"
      (`/admin/managers`, `COMPANY_ALL` 가드 — 시스템관리자/운영관리자/
      본부관리자 전체가 접근 가능하고 사이드바 메뉴도 전 역할에 노출,
      2026-08-31 재확정). 조회 범위도 역할 무관 전체 계정 목록으로 통일
      (이전엔 역할별로 조회 범위를 제한했으나 폐기). 본부관리자는 본부당
      계정 1개 고정 운영 전제. 게스트 계정 관리(화면 9/10)와 동일한
      "목록 + 모달" 패턴으로 별도 상세페이지 없이 구성(2026-08-31 결정 —
      액션들이 다 모달 규모, 본부관리자당 배정 건수도 많지 않아 목록 화면
      규모로 충분하다고 판단, 필요해지면 그때 분리). 담당자별 배정 건("담당
      경호")은 조회 전용 목록만 제공 — 담당자 변경(재배정)은 이 화면 책임이
      아니라 경호 상세 화면 쪽에 있어야 한다고 판단해 스코프에서 제외
      (2026-08-31, 아래 후속 항목 참고).

  **정보수정(이름/연락처)·비밀번호 초기화 권한 매트릭스** (2026-08-31 재확정
  — 최초 확정안은 시스템관리자가 타인 정보수정도 가능했으나, "정보수정은
  역할 무관 항상 본인만, 비밀번호초기화는 본인+하위 계층"으로 단순화):
  | 실행자 \ 대상 | 시스템관리자 | 운영관리자 | 본부관리자 |
  |---|---|---|---|
  | 시스템관리자 | 정보수정·초기화 O(본인) | 초기화만 O | 초기화만 O |
  | 운영관리자 | 접근 불가 | 정보수정·초기화 O(본인만) | 초기화만 O |
  | 본부관리자 | 접근 불가 | 접근 불가 | 정보수정·초기화 O(본인만) |

  "담당경호"(배정 건 조회) 열람은 위 매트릭스와 별개 규칙 — 시스템관리자/
  운영관리자에게는 모든 본부관리자 행에 공통으로 열려있지만, 본부관리자
  본인에게는 자기 행에서만 보이고 다른 본부관리자 행은 액션 버튼 자체가
  없다(2026-08-31 재확정 — 최초엔 본부관리자도 다른 본부관리자의 배정
  건까지 조회 가능하게 했으나 좁힘). 배정건수 숫자 컬럼은 이 제한과
  무관하게 모든 역할에 항상 노출.

  비밀번호 초기화는 이번 범위에선 초기화 실행까지만(게스트 계정 발급 때와
  동일하게 "초기화 시 아이디와 동일한 값으로 재설정" 정도) — 초기화 후 "다음
  로그인 시 변경" 강제 플로우는 별도 후속 개발 항목으로 분리(2026-08-31
  결정, 아래 후속 항목 목록 참고).

**발견된 후속 항목 (이번 범위 밖, 별도 진행 예정):**

- [x] [본사/경찰] 비밀번호 초기화·발급 후 최초 로그인 강제 변경 플로우 —
      관리자 계정 비밀번호 초기화, 게스트 계정 발급(로드맵 Phase 3 항목3)
      둘 다 "비밀번호=아이디" 상태를 만드는데, 지금까지는 그 값을 그대로
      계속 쓸 수 있었음. 문자열 비교(비밀번호===아이디) 대신 실제 백엔드의
      `users` 테이블 "최초 로그인" 컬럼을 미리 대응한 `mustChangePassword`
      boolean 플래그로 판단하도록 구현(2026-08-31) — 로그인 성공 조건은
      만족해도 이 플래그가 서면 세션을 발급하지 않고 강제 변경 모달만
      띄우고, 변경 완료 후에는 자동 로그인하지 않고 재로그인을 요구한다.
      경찰(게스트)·본사(관리자) 로그인 화면 둘 다 적용, 기존 시드 계정은
      영향 없음(플래그 미설정).
- [ ] [본사] 경호 상세 화면에서 담당자(본부관리자) 변경 기능 — 관리자 계정
      관리 작업 중 "배정 건 수정"을 만들다 발견. 어떤 경호건의 담당자를
      다른 본부관리자로 바꾸는 액션은 계정 관리 화면이 아니라 그 경호건의
      상세 화면(`SecurityCaseDetailPage`) 쪽 책임이라고 판단해 이번 범위에서
      제외(2026-08-31). 관리자 계정 관리의 "담당경호"는 조회 전용으로만
      남김. 구현 시 참고: `assignManager()`는 접수→배정 최초 배정 전용이라
      이미 배정된 건의 담당자 교체에는 못 쓴다(중복배정 방지 가드가 걸려
      있어 접수 상태가 아니면 거부) — 별도 함수 필요.

## Phase 4 — 대시보드 (최후순위)

- [ ] [본사] 본사 전체 대시보드 — `s6`
- [ ] [본청/지역청] 본청/지역청 대시보드 (공통 컴포넌트, scope만 다름) — `s1` `s1m` `s2` `s2m`

## Phase 5 — 백엔드 연동

초기 백엔드 Swagger(`docs/api-swagger.json`)와 실제 DB 스키마 덤프(`docs/db-dump/`)를
확보해 갭 분석을 진행(2026-08-31~09-01). 화면 자체는 이미 구현·승인된 상태라, 이 Phase는
화면별 mock API 호출을 실제 API 호출로 교체하는 작업이다. loop-screens와 완료 기준이
달라(스크린샷 승인이 아니라 API 연동 정확성+회귀 없음) 별도 loop로 분리해 진행한다
(`.claude/loop-backend/`, 2026-09-01 결정) — 정책/정지조건은
`.claude/loop-backend/TASK.md`, 절차는 `LOOP_INSTRUCTIONS.md`, 대상 목록은
`docs/backend-integration/matrix.md` 참고.

진행 순서는 **메인 워크플로우(경호건 생명주기) 우선**이다(2026-09-03 재정렬) — 그룹
A(피전 경호관리) → B(본사 메인 워크플로우 + 그 검증, 본부관리자 스코프 재검증 포함) →
C(이력 3종) → D(게스트 2종). 이전엔 계정권한 단위로 화면군을 통째로 끝내는 순서였는데
(2026-09-01), 배정 이후 상태를 만들어내는 화면(본사 배정·경호계획)이 뒤에 있어 피전
화면이 계속 "배정 후 미검증 → 재검증 이월"로 밀려 순서를 바꿨다. 그룹 안에서는 조회
API를 먼저 연결한다 — 정확한 순서는 `.claude/loop-backend/PROGRESS.md`를 따른다.

**개발은 화면 단위, 백엔드 요청은 섹션 단위**(2026-09-03): 연동은 화면 하나씩
진행하되, 설계 변경/누락 API 요청은 한 섹션(한 역할의 한 기능 영역)이 끝나는 시점에
쌓인 `issues.md`를 묶어 한 번에 백엔드로 보낸다. 응답을 기다리지 않고 다음 섹션을
계속하며, 완료 통보가 오면 다음 화면 착수 전에 반영·검증한다
(`.claude/loop-backend/TASK.md` 원칙 4). **그룹 B는 요청분이 커져 두 섹션으로
쪼갬(2026-09-04)** — B-1(#6~#9), B-2(#10~#12); B-1은 #9(사전미팅·파일업로드 포함)까지
하고 종료.

- [x] 로그인 (경찰·본사 실제로는 같은 엔드포인트 — 유일하게 역할보다 먼저, 커밋 `008383a`,
      2026-09-01) — 실제 응답 실측으로 `GetMyProfile` 병행 호출·`codeSeq`→`Role` 매핑·
      428 기반 최초 로그인 신호를 확인해 반영. 부수 발견: 백엔드가 로그인을 원래 하나로
      취급한다는 게 확인돼(`Login` 응답의 `code=100+codeSeq`) 지금 두 화면(경찰/본사 로그인)을
      하나로 합칠지 논의 중 — 아래 백로그 참고, 이번 연동 범위에서는 진행 안 함.
- [ ] **그룹 A — [경찰서] 피전 경호관리 섹션** (경호목록→접수→상세→수정)
      - [x] 경찰서 경호목록 — `GET Deploy/Police/W/GetDeployList` (2026-09-01). `groupSeq`
        필수라 `AuthUser`에 `groupSeq`/`groupName` 추가(로그인 시 `GetMyProfile`에서
        채움), 스코프는 서버가 403으로 강제. 배정 이후 상태 표시는 데이터가 없어 미검증 —
        그룹 B(본사 경호 상세) 이후 재검증 예정(`docs/backend-integration/findings.md`).
      - [x] 접수 / 배치요구서 작성 — `POST Deploy/Police/W/AddDeployRequest` (2026-09-02,
        배치장소 4필드 보정 2026-09-03). 폼→서버 DTO 매핑. 결정 3건: 요구자 3필드 분리,
        출생년도→생년월일 입력(`DateField` yearGrid 신규), 배치장소는 백엔드 수정으로
        `guardHomeLoc`/`guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2` 4필드 전송(D-2 제거,
        issues #5 해결).
      - [~] 경호 상세 — 조회 `GET Deploy/Police/W/GetDeployDetail`, 접수취소·경호취소
        `POST CancelGuardCase`, 연장/단축 `PATCH Extend|ShortenDeployPeriod`, 종결
        `POST CloseGuardCase` (2026-09-03). **접수 상태만 실측 검증**. 배정 이후 4종은
        코드만 교체·미검증 → 그룹 B(#9 본사 경호 상세) 이후 재검증. 근무 스케줄은
        `GetDeployGuardSchedule`로 재연결 완료(2026-09-09, findings #6).
        `GetDeployDetail`이 배치장소를 null로 줘서 상세 배치장소 표시는 빈 값. `완료`
        표시 보류(△).
      - [x] 배치요구서 수정 — `GET Deploy/Police/W/GetDeployDetailUpdate`(prefill) +
        `PUT Deploy/Police/W/UpdateDeployRequest`(저장) (2026-09-03, 블로커 해소 후).
        백엔드가 `GetDeployDetailUpdate` 응답을 구현해 배치요구서 원본 필드(성별·생년월일·
        직업·사건개요·참고사항·배치장소 4필드)를 전부 반환 → issues #7 해결. `getSecurityCase`
        에서 `getDeployRequestForEdit`로 분리(쿼리키 분리), 읽기/쓰기 필드명 비대칭 매핑.
        브라우저 왕복 검증. **피전 경호관리 섹션 종료** — issues #5·#6·#7은 백엔드 수정
        완료로 해결(전달→반영까지 끝).
- [ ] **그룹 B — 메인 워크플로우 (본사 중심) + 그 검증**
      (근무자→배치요청+배정→본사 경호목록→본사 경호상세→연장단축요청목록→관리자계정→
      본부관리자 스코프 재검증). 본사 경호 상세 직후 그룹 A의 2·4번 배정 이후 상태
      재검증. 여기까지가 본사 운영관리자 경호관리 섹션 — 종료 시 백엔드 일괄 요청.
      - [x] 근무자 목록/등록 — `GET GetGuardList` / `POST AddGuardInfo` /
        `PATCH PatchGuardInfo` / `DELETE DeleteGuardInfo` (2026-09-03). 4종 실측
        (생성→수정→삭제 원상복구). 수정/삭제는 mock에 없던 기능 → 행별 `⋮` 메뉴 +
        확인 다이얼로그 UI 신규. 부서 열 제거 — `GetGuardList` 응답에 `DEPT_NM`이
        빠져 있음(DB엔 있음, issues #8, 섹션 #12에서 일괄 요청). 조인용
        `listCaseJoinWorkers` 분리(#9·#13 회귀 차단).
      - [x] 배치요청 목록 + 본부 배정 — `GET GuardCase/Stec/W/GetDeployRequestList` /
        `GET User/Stec/W/GetStecUserList`(담당자 필터) / `POST GuardCase/Stec/W/AddGuardCase`
        (2026-09-03). deploySeq 81 실배정으로 GuardCase 최초 생성 검증(caseSeq 46,
        `mgmtNo`에 `ST0002` 부여). 담당자 목록에 소속 본부(issues #1)·배정 건수 필드
        없어 표시 축소. "취소"는 대응 API가 없어 메뉴 비활성화(issues #9 신규).
        조인용 `listCaseAssignees` 분리(#8 회귀 차단). **함께 수정**: `client.ts`
        `refreshAccessToken` single-flight — 동시 401 시 실백엔드 1회용 RefreshToken이
        회전돼 강제 로그아웃되던 문제.
      - [x] 본사 경호목록 — `GET GuardCase/Stec/W/GetGuardCaseList` (2026-09-04).
        응답 이중 래핑 `{meta,data:[...]}`, `pageSize` 상한 100이라 `meta.totalPages`까지
        클라이언트 순회. `caseSeq`→id, `mgmtNo` 완성형 분리, `statusName` 라벨 그대로,
        `userName`→`assigneeName`(담당자 id 없어 이름만 표시 — managers 조인 제거).
        진행중 건만 반환. 지역청·담당자 소속 본부 없어 필터/열 축소(exclusions).
        7번 배정 건 렌더 확인. 실백엔드 계정으로 이 화면 진입 시 나던 RefreshToken
        폭풍 해소(mock 호출 제거). 회귀 차단: `listManagerAssignedCases`(#11)·
        `listMockSecurityCases`(연장/단축=#10) 분리, 죽은 `listCaseAssignees` +
        `handlers/managers.ts` 제거.
      - [~] 본사 경호 상세 — **부분 연동(2026-09-04, △)**. 스웨거 갱신으로 상세가 조회
        5종(`GetGuardCaseDetail`/`GetCaseGuardList`/`GetCaseSchedule`/`GetCaseMeeting`/
        `GetCaseDoc`)으로 쪼개짐 → `getSecurityCase`가 조립. 연동·검증 완료: 조회 5종,
        경호계획 수정(`PATCH PatchCaseInfo`, 브라우저 왕복), 스케줄 자동생성
        (`POST AutoAddSchedule`)·근무조 저장/삭제(`PUT PatchScheduleGroup` — `order` 1+
        & 일자 유일, 근무자 중복시각/경호풀 밖 근무자 거부 / `DELETE DeleteScheduleGroup`
        — 그룹1 보호), **사전미팅 저장/삭제**(`PUT SaveCaseMeeting` — 근무자별 시간 없어
        min~max로 합침), **파일 업로드 3종**(`PatchGuardPlanDoc`/`PatchConsentDoc`/
        `PatchDestroyDoc`, multipart — 파일 시그니처 검사, 파기확인서는 경호중·경호완료
        에서만) + 파기확인서 다운로드. **블록**:
        경호계획 등록(`PUT AddGuardCaseInfo`) = 배치기간을 본사 조회로 못 얻음
        (`blockers.md`, issues #10 — 등록 버튼 비활성) / 경호취소 = 본사 API 없음
        (본사 토큰 → `Deploy/Police/W/CancelGuardCase` 403, issues #9, 버튼 비활성).
        조치 섹션 5개 ↔ `summary1~5`는 손실 매핑(선택 항목 `", "` 조인 + 기간 `"~"`
        문자열, issues #11). 대표근무자·그룹 메모는 조회에서 빠짐(issues #12).
        `getCaseGuards` 신규, `listCaseJoinWorkers`(mock)는 이력 상세 #13용으로만 잔존.
        테스트 더블 `handlers/guardCaseDetail.ts`. **함께: 기본정보 카드 통일** — 피전
        `BaseInfoReadCard` + 본사 `BaseInfoSummaryCard` → `shared/components/CaseBaseInfoCard`
        하나로(variant로만 분기). 이 과정에서 issues #13 발견(`GetDeployDetail`이 경호계획
        조치·근무시간을 안 줘서 피전 상세에서 `-`). **→ 섹션 B-1(#6~#9) 종료, 백엔드
        일괄 요청**(`docs/backend-integration/requests/2026-09-04-본사-경호관리-B1.md` —
        요청 9건). 이후 4·2번 배정 이후 상태 재검증(caseSeq 46에 경호계획+스케줄+미팅+
        첨부 데이터 생성됨).
      - [~] 연장/단축요청 목록 — **부분 연동(2026-09-07, △)**. *섹션 B-2 시작.*
        조회 2종(`GET GetExtendRequestList` / `GetShortenRequestList` — type으로 EP 분기,
        항목이 `GetDeployRequestList`와 유사 + `caseSeq`·`requestedEndDate`) + 승인
        (`POST ConfirmCasePeriod {caseSeq}`) 실 API 전환. `SecurityCaseTabs` 연장/단축
        배지 실카운트 배선(쿼리키 목록 화면과 공유). **거부는 대응 EP가 없어 UI에서
        `disabled`**(issues #2 — 승인만 연결하고 B-2 종료 시 거부 EP 일괄 요청, 사용자 결정).
        **△ 이유**: 연장/단축 신청은 업무상 경호중 상태만 대상인데 실백엔드에 경호중 건이
        없어, 배정 건에 요청을 주입해 본사 승인 왕복만 실측(원복). 피전이 경호상세에서
        직접 신청하는 부분(#4 `requestPeriodChange`, △)이 개발·검증돼야 실제 요청
        데이터가 생김 → **#4 "배정 이후 재검증"과 함께 재확인**.
      - [x] 관리자 계정 관리 — `GET User/Stec/W/GetStecUserList`(목록) /
        `PATCH User/Stec/W/UpdateUser`(정보수정·비번초기화) 실 API 전환(2026-09-07).
        `loginId→id`·`userSeq` 신규. 빈 연락처는 `""`로 전송(`null`은 백엔드가 무시).
        배정건수·담당경호는 `GetGuardCaseList`(실 API)를 담당자명으로 매칭(mock
        `listManagerAssignedCases` 제거, 동명이인 취약 — issues #1에 `userSeq` 요청).
        **본부관리자는 `GetStecUserList` 403** → "운영·시스템관리자만 이용" 안내(B).
        본부관리자 접근 자체(route/메뉴 제외 vs 백엔드가 본인 행만 반환)는 #12에서 결정.
        "본부" 열은 `groupName` null이라 "-"(issues #1). 계정 정지/재활성화(`useYn`)는
        UI 없어 범위 밖(백로그).
- [ ] **그룹 C — 이력** (본사 이력 → 경찰서 이력 → 본청/지역청 이력 + 진행중 건 상세
      조회전용). 그룹 B의 종결·취소가 터미널 데이터를 만든 뒤라야 의미 있음.
      - [~] [본사] 이력 조회 — **부분 연동(2026-09-08, △)**. 목록 `GET History/Stec/W/GetHistoryList`
        실 API 전환(`company/api/history.ts` 신규 분리 — 경찰 이력 화면 #14·#15는 mock 유지).
        응답 이중 래핑·행 축소 매핑, `statusName`("경호취소"→'취소'), `totalMin`→총경호시간.
        **본부관리자 스코프(HIST-003) 실제 적용 확인**(StecM3 배정 0건→이력 0건). 실서버에
        취소 건 5개 존재 → 브라우저 검증(StecM1 5건 / StecM2 동래 5건). **상세는 보류** —
        `History/Stec/W/GetHistoryDetail` 404, Police EP는 본사 토큰 403(issues #14) →
        `/admin/history/:id`는 "준비 중" 안내. 종결 건(종결코드 매핑·`totalMin` 실값) 재검증
        보류 — 사용자가 종결 데이터 생성 후.
        **→ 2026-09-09 회신 반영**: 백엔드가 `GET History/Stec/W/GetHistoryDetail?caseSeq=`
        신설(경찰용 shape + `groupName`·`parentGroupName`) → 상세 실 API 배선, "준비 중"
        placeholder·`CompanyHistoryDetailUnavailableError` 제거, `HistoryDetailPage`(company)
        실제 상세 렌더. 브라우저 검증. issues #14 종료. △ 유지 = 종결 데이터 대기만.
      - [~] [경찰서] 이력 조회 — **부분 연동(2026-09-08, △)**. 목록 `GET History/Police/W/GetHistoryList`
        + 상세 `GetHistoryDetail` 실 API 전환(`listPoliceStationHistory`/`getPoliceStationHistoryDetail`
        신규 분리 — 본청·지역청 #15는 mock 유지, `role === '경찰서'` 분기). `groupSeq`(세션) 필수,
        끝난 건만(HIST-001). 상세 `guards[]`(이름 인라인)→신규 `historyGuards` 필드로 근무자
        배정 이력 표. `caseType`·5개 조치·배치장소는 응답에 없어 축소(exclusions). 브라우저
        검증(SPoliceM5 동래, 취소 5건 + 상세). 종결 건 재검증 보류(#13과 동일).
        **→ 2026-09-09 회신 반영**: 목록 매퍼에 `deploySeq`·`status`(int) 추가,
        `SecurityCase.id`를 종결·취소면 `caseSeq`/그 외면 `deploySeq`로 분리(#15 라우팅용).
        `getPoliceStationHistoryDetail`을 3역할 공통으로 통합, `detailRowToSecurityCase`
        export해 본사(#13)와 매퍼 공유. 경찰서 경로 groupSeq 유지 → 회귀 0.
      - [~] [본청]/[지역청] 이력 조회 + 진행중 건 상세 — **실 API 전환 완료(2026-09-09, △)** —
        착수 프로브(2026-09-08)에선 전환 불가로 mock 유지했으나, **2026-09-09 스웨거 개정
        회신**으로 `GET History/Police/W/GetHistoryList`가 `groupSeq` **없이** 부르면 서버가
        토큰 역할대로 캐스케이드(본청=전국·지역청=관할 이하·전 구간) → `listSecurityCaseHistory`
        /`getSecurityCaseHistoryDetail` 실 API 전환. 접수·진행중 행은 `deploySeq`로 경호상세
        (`/security-cases/:id`), 종결·취소는 `caseSeq`로 이력상세(`/history/:id`). mock
        `/security-cases/history*` 제거. 브라우저 검증(SPoliceM1 전국 9건 / SPoliceM3 관할
        7건 / 진행중→`/security-cases/90` / 취소→`/history/46`). 요청서 회신 마킹 →
        `docs/backend-integration/requests/2026-09-08-이력-C.md`. issues #14·#15 🟢. 그룹 C
        섹션 종료. △ = 종결 건 데이터 대기 + URL 직접 접근 스코프 일괄 테스트(CARRYOVER).
- [x] **그룹 D — 게스트** — **완료(2026-09-08, #16·#17)**. 그룹 D 섹션 종료 → 백엔드
      일괄 요청서 `docs/backend-integration/requests/2026-09-08-게스트-D.md`.
      - [x] [경찰서] 게스트 계정 관리 — **연동 완료(2026-09-08, #16)**. `User/Police/W/`
        `GetGuestUserList`(평면 배열, `groupSeq` 필수)·`GetGuestCaseList`(발급 후보)·
        `GetGuestCaseDetail`(수정 후보, `isAccess`)·`AddGuestUser`(`{name,caseSeqs}`, 응답
        `{data:true}`)·`UpdateGuestCaseInfo`·`DeleteGuestUser` 6종. 아이디 미리보기 제거 →
        발급 후 목록 재조회(issues #3 프론트 UX로 해소). 중지 계정(`useYn`)은 화면 설계에
        없어 숨김(exclusions, 그룹 D 요청서에 전달). `SPoliceM5` 발급→수정→삭제 왕복 실측.
      - [x] [경찰서] 게스트 — 경호목록 + 상세(조회전용) — **연동 완료(2026-09-08, #17)**.
        피전 화면·API 재사용(코드 신규 없음). `GetDeployList`가 게스트 토큰에서 `groupSeq`
        무시하고 `GUEST_CASE_ACCESS` 스코프만 적용(실측). 상세 200·읽기전용. 조회권 없는
        건 상세 차단은 미검증(동래 활성 건 1개뿐, 이월). 게스트 쓰기/Stec/피전전용 EP 403.

**발견된 설계 이슈(백엔드/기획에 변경 요청, `docs/backend-integration/findings.md` 참고)**:
1. 본부관리자 계정에 소속 본부·담당자 개인정보 저장 공간 없음 → **본부 파트 종결(2026-09-09)**:
   `USER_INFO.groupSeq/groupName`은 경찰 전용 공유 컬럼이라 본사엔 안 둠 — 관리자 계정 관리
   "본부" 열·`branch` 필드 제거. 담당자 개인정보·`userSeq` 조인은 운영팀 문의 대기
2. 연장/단축 신청 "거부" API 없음
3. ~~게스트 계정 발급 아이디 "미리보기" API 없음~~ → **해결(2026-09-08, #16)**: 프론트 UX
   변경으로 흡수(발급 후 목록 재조회). 신규 EP 요청 안 함
4. `ChangePassword`가 기존 비밀번호를 검증하지 않음 — 비밀번호 정책 결정 시 함께 처리하기로
   보류(2026-09-01)
5. ~~배치요구서 배치장소 단일 필드~~ → **해결(2026-09-03)**: 백엔드가 `Add/UpdateDeployRequestDto`를
   `guardHomeLoc`/`guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2` 4필드로 수정. 프론트 4필드
   매핑 교체, D-2 제거. 남은 것: `GetDeployDetail`(상세용)은 아직 null 반환
6. ~~경호 상세 근무 스케줄 조회 API 누락~~ → **해결·연동 완료(2026-09-09)**: `GET Deploy/
   Police/W/GetDeployGuardSchedule`가 실데이터 반환(근무자 이름·연락처 인라인). 화면4
   `getDeployGuardSchedule` 신설, `WorkerAssignmentPanel` 재연결(`workers: never[] = []`
   제거). 브라우저 검증. 근무자별 동의서 조회(요청 3)는 여전히 전용 GET 미제공
7. ~~배치요구서 수정 화면용 원본 상세조회 API 없음~~ → **해결(2026-09-03)**: `GET Deploy/
   Police/W/GetDeployDetailUpdate`가 배치요구서 원본 필드 전부 반환. 화면5 연동 완료
8. 근무자 `deptName`이 조회 응답에 안 옴(2026-09-03) — DB(`GUARD_USER_INFO.DEPT_NM`,
   NOT NULL)·등록/수정 INPUT엔 있는데 `GetGuardList` 응답에만 빠짐. 근무자 목록에서
   부서 열 제거. `GetGuardList` 응답에 필드 추가 요청 예정(그룹 B 섹션 #12에서 일괄)
9. ~~[본사] 배치요청 "취소"에 대응하는 API 없음~~ → **해결(2026-09-09)**: `POST GuardCase/
   Stec/W/CancelGuardCase {deployReqSeq, reason?}` 신설. 접수취소/경호취소를 서버가 배정
   여부로 분기. `cancelPendingRequest`(#7)·`cancelAssignedCase`(#9) 배선, 버튼 활성. 실왕복
   미검(되돌릴 수 없음).
9b. [신규] `Deploy/Police/W/GetDeployDetail` 응답에 `caseSeq` 없음(2026-09-09) —
   `CloseGuardCase`·`GetDestroyDocDownload`가 `caseSeq`를 요구해 `GetDeployList` 재조회
   우회(`resolveCaseSeq`). 응답에 `caseSeq` 추가 요청.
10~13. issues.md 참고(#10·#13은 해결, #11·#12는 B-2 요청서로 전달).
14. [본사] 이력 조회 상세 API 없음(2026-09-08) → **해결(2026-09-09)** —
    `GET History/Stec/W/GetHistoryDetail?caseSeq=` 신설, 상세 실 API 연동 완료.
15. [본청]/[지역청] 이력 조회 — 관할 전체·진행중 조회 경로 없음(2026-09-08) →
    **해결(2026-09-09)** — 스웨거 개정으로 `GetHistoryList`를 `groupSeq` 없이 부르면 서버가
    역할 캐스케이드(본청=전국·지역청=관할 이하·전 구간). 본청/지역청 이력 실 API 전환 완료.
    (△ = 종결 건 데이터 대기, URL 직접 접근 스코프 일괄 테스트는 CARRYOVER)

**발견된 후속 항목 (이번 범위 밖, 별도 진행 예정)**:

- [ ] [공통] 경찰/본사 로그인 화면 통합 검토 — 로그인 연동(위 1번 항목) 중 실제 백엔드가
      로그인을 원래 하나로 취급한다는 게 확인됨(`Login` 응답의 `code` 필드가
      `100+codeSeq`라 역할까지 이미 구분 가능, 두 화면이 이미 내부적으로 같은 `login()`을
      공유하고 있어 접근 제어상 분리 효과도 없는 상태). PWA 전환까지 고려하면 진입점을
      하나로 합치는 쪽이 유리하다는 의견이 나왔으나, 이건 API 교체가 아니라 이미 승인된
      화면 UI를 바꾸는 제품/UX 결정이라 loop-backend 범위 밖으로 분리(2026-09-01 결정).
      화면 목업 없음 — 신규 설계 필요.
