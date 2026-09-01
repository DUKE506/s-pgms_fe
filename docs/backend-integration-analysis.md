# 백엔드 연동 분석 (초기 Swagger 기준)

`docs/api-swagger.json` (OpenAPI 3.0.4, 62개 엔드포인트, 스키마 29개 — 전부 Request DTO)를
현재 MSW mock(`src/mocks/handlers/*.ts`, 41개 라우트)과 대조한 결과입니다. 백엔드 연동
계획을 세우기 전 단계의 갭 분석이며, 실제 마이그레이션 작업 순서/일정은 아직 정하지
않았습니다.

**2026-08-31 갱신**: `docs/db-dump/*.sql`(실제 DB 스키마 전용 덤프, 14개 테이블)을 추가로
확인해 Swagger만으로는 추정에 그쳤던 부분들을 검증·정정했습니다 — 6번 섹션 참고. 이어서
실제 데이터(`basic_code_table_value.csv`, `user_table_value.csv`)까지 확인한 결과 "본부"는
`BASIC_CODE`에 데이터로 존재하지만 `USER_INFO`와 연결돼 있지 않다는 것으로 재정정됐습니다
(6-1) — 이 설계 공백은 `docs/backend-integration-issues.md`에 변경 요청으로 별도 기록.
연동 작업 시 mock/백엔드 불일치를 다루는 방식은 `docs/backend-integration-process.md` 참고.

## 0. 이 Swagger 문서의 성격

- **Request DTO만 있고 Response 스키마가 전혀 없습니다.** 모든 엔드포인트가
  `"200": { "description": "OK" }`뿐이라, 응답 필드 구조는 이 문서만으로는 알 수 없습니다.
  대신 `description`에 비즈니스 규칙이 매우 상세히 적혀 있어(작업코드 `WORK-XXX`,
  `END-XXX`, `EXT-XXX`, `BR-XXX`, `HIST-XXX`, `GRP-XXX`, `GUARD-XXX` 참조), 동작 방식
  자체는 상당 부분 파악 가능합니다.
- 라우팅 스타일이 REST가 아니라 **RPC 스타일**입니다: `/api/v1/{도메인}/{Police|Stec}/W/{동사+명사}`.
  예: `POST /api/v1/GuardCase/Stec/W/AddGuardCase`. 지금 mock의 `POST /api/security-cases/:id/assign` 같은
  리소스 중심 경로와는 구조가 다릅니다 — API 클라이언트 함수를 "base URL만 바꿔 끼우는" 수준이
  아니라 경로/메서드 자체를 다시 매핑해야 합니다.
- **ID 체계가 완전히 다릅니다.** 실제 API는 전부 정수 `Seq`(시퀀스) 기반입니다
  (`caseSeq`, `userSeq`, `groupSeq`, `guardSeq`, `deployReqSeq`, `regionSeq`, `stecDeptSeq` 등).
  지금 mock은 의미 있는 문자열 id(`'case-seed-6'`, `'hqmanager1'`)를 씁니다. 라우트 파라미터,
  로그인 토큰 구조, 화면 상태 전부가 이 영향을 받습니다.
- **상태값도 다릅니다.** 실제 API는 `status`를 정수 코드로 받습니다
  (예: `DEPLOY_STATUS` — 0:접수/대기, 2:연장신청, 3:단축신청으로 설명에서 확인됨).
  지금 mock은 `'접수'|'배정'|'경호중'|'경호완료'|'종결'|'취소'` 한국어 문자열 리터럴 유니온을 씁니다.
  반대로 `crimeType`(사건유형)은 영문 코드 문자열(`stalking`/`domestic`/`dating`/`threat`/`etc`/`none`)이라
  지금 mock의 `CaseType`(`'스토킹'|'가정폭력'|'교제폭력'|'협박'|'기타'|'사건미접수'`)와 1:1 매핑 가능—
  이쪽은 이름표만 바꾸면 됩니다.

## 1. 아키텍처 수준의 중요한 차이

### 1-1. "배치요구서(Deploy)"와 "경호건(GuardCase)"이 별도 엔티티다

지금 mock은 `SecurityCase` 하나로 접수~종결 전체 라이프사이클을 표현합니다(상태값만 바뀜).
실제 백엔드는 **두 개의 백엔드 엔티티**로 나뉘는 것으로 보입니다:

- **DeployRequest**(배치요구서) — 접수 시점에 생기고, `deployReqSeq`로 식별. 연장/단축
  *신청*도 이 엔티티의 상태(`DEPLOY_STATUS`)로 관리됩니다.
- **GuardCase**(경호건) — 본부 배정(`AddGuardCase`) 시점에야 생기고, `caseSeq`로 식별.
  경호계획·스케줄·문서·사전미팅이 전부 이쪽에 붙습니다.

`GetDeployDetail`의 설명이 이 관계를 명시합니다: *"경호건이 있으면 경호건 기준으로, 없으면
접수 기준으로 읽는다"*. 즉 배정 이후엔 GuardCase가 사실상 소스오브트루스가 되고
DeployRequest는 신청(연장/단축)과 취소 처리의 키 역할만 남습니다.

지금 mock의 `assigneeId`/`securityCode` optional 필드로 "배정 여부"를 표현하는 방식과
개념적으로는 같지만, 실제로는 테이블(엔드포인트)이 분리돼 있어 프론트 상태 관리 방식도
영향을 받을 가능성이 있습니다.

### 1-2. 연장/단축이 "신청 → 확정" 2단계인 것은 동일 — 단, **거부(reject) API가 안 보입니다**

`ExtendDeployPeriod`/`ShortenDeployPeriod`(경찰이 신청) → `ConfirmCasePeriod`(에스텍이 확정)
2단계 흐름은 지금 우리가 구현한 `requestPeriodChange` → `approvePeriodRequest`/`rejectPeriodRequest`
패턴과 정확히 일치합니다 — 설계가 맞았다는 뜻이라 좋은 신호입니다.

**다만 이 Swagger엔 "확정(승인)"만 있고 "거부" 엔드포인트가 없습니다.** `ConfirmCasePeriod`는
연장/단축 여부·새 종료일도 요청 바디로 안 받고(`caseSeq`만 받음 — 이미 배치요구서에 들어있는
값을 서버가 읽음) 전부 서버 판단입니다. 우리 화면(`PeriodRequestActionDialog`)엔 승인/거부
버튼이 둘 다 있는데, 거부 쪽을 처리할 API가 이 문서엔 없습니다 → **백엔드팀 확인 필요**
(후속 버전에 추가 예정인지, 아니면 거부는 다른 방식—예: 신청 자체를 취소하는 API가
따로 있는지).

### 1-3. "본부(StecDept)" — 데이터는 있으나 계정과 연결이 안 돼 있음 (6-1 참고, 두 번 정정됨)

Swagger만 봤을 때는 "본부(StecDept)"가 관리그룹(Group)과 별도인 조직 축일 거라고
추정했습니다. `GUARD_CASE_INFO.STEC_DEPT_ID`가 실제로는 `FK → USER_INFO.USER_ID`(담당자
개인 계정)인 걸 보고 처음엔 "본부 엔티티 자체가 없다"고 결론 냈으나, 실제 코드/데이터
(`basic_code_table_value.csv`)를 보니 **본부 목록 자체는 `BASIC_CODE`에 실존**하고
있었습니다 — 다만 `USER_INFO`(계정)에 그 본부를 가리키는 컬럼이 없어서 계정별 소속이
연결이 안 되는 것이었습니다. 상세는 6-1, 변경 요청은 `docs/backend-integration-issues.md`
1번 참고. 우리가 만든 "관리자 계정 관리" 화면의 `branch`(서울본부/경인본부 등) 컬럼은
**실제 DB 관계로는 뒷받침되지 않는, mock 단계에서 지어낸 필드**입니다.

- `Group/Stec/*` API들(`AddGroup`/`GetGroupTree`/`UpdateGroup`/`DeleteGroup`)은 **경찰 조직
  트리**(본청/지방청/경찰서, `POLICE_GROUP_INFO`)를 에스텍이 관리하는 기능입니다. *"경찰
  계정은 조직 노드별 1개 공유이므로 그룹과 함께 만들어진다"* — 그룹(경찰서 등)을 등록하면
  그 조직의 로그인 계정도 같이 생깁니다. **지금 우리 앱엔 이 기능 자체가 전혀 없습니다**
  (경찰 계정 3개가 seed에 하드코딩돼 있을 뿐). 완전히 새로운 화면/기능입니다.

### 1-4. 최초 로그인 강제 변경 — 우리가 방금 만든 것과 설계가 일치, 필드 의미는 DB로 확정

- `AddStecUser` 설명: *"아이디는 StecM# 로 자동채번되고 초기 비밀번호는 아이디와 같다"*
- `USER_INFO.PW_CHANGED_YN` 컬럼 코멘트: *"비번변경 필요여부(0:불필요/1:변경필요)"*,
  **DEFAULT '1'**(신규 계정은 전부 기본값이 "변경 필요" — 게스트/초기화된 계정만이 아니라
  **모든 신규 계정이 기본적으로 이 상태로 생성됨**).

이름(`PW_CHANGED_YN` = "비밀번호 변경됨 여부"로 읽힘)과 실제 의미(1 = 아직 안 바꿔서
"변경 필요")가 반대로 보였던 것이 DB 코멘트로 확정됐습니다 — **우리가 지은
`mustChangePassword`라는 이름이 오히려 실제 의미에 더 가깝습니다**(그대로 써도 무방,
매핑만 `pwChangedYn(1) ↔ mustChangePassword(true)`로 하면 됨).

### 1-5. `UpdateUser`는 계정 정지도 겸합니다 — 단, DB 기본값이 이상합니다

`useYn`을 false로 주면 계정이 정지되고 **발급된 토큰까지 다음 요청에서 401**이 됩니다
(본인 계정은 정지 불가, 400). 우리 관리자 계정 관리 화면엔 "계정 정지/활성화" 기능이
아예 없습니다 — 이번 스코프에 없던 액션이 하나 추가로 필요합니다.

**DB에서 이상한 점 발견**: `USER_INFO.USE_YN`의 컬럼 코멘트가 `'삭제여부'`인데,
Swagger 설명(`useYn=false`→정지)과 앞뒤가 안 맞습니다 — 코멘트가 다른 테이블 것을
복붙한 실수로 보입니다. 게다가 `DEFAULT '0'`이라 신규 계정이 기본값 그대로면 "정지"
상태로 생성되는 셈이라, 애플리케이션 코드에서 계정 생성 시 명시적으로 1을 넣어주고
있을 가능성이 큽니다 — **문서상 사소한 흠이라 넘어가도 되지만, 실제 계정 생성 로직이
USE_YN을 어떻게 세팅하는지는 확인해두는 게 안전합니다.**

## 2. 화면/기능별 매핑 (신뢰도 표시)

| 우리 화면·mock 로직 | 실제 API | 신뢰도 |
|---|---|---|
| 접수/배치요구서 작성 (`createSecurityCase`) | `POST Deploy/Police/W/AddDeployRequest` | 높음 |
| 배치요구서 수정 (`updateSecurityCase`) | `PUT Deploy/Police/W/UpdateDeployRequest` — 배정 후엔 기간 필드 무시됨(서버가 조용히 무시, 에러 아님) | 높음 |
| 접수취소/경호취소 (`cancelPendingCase`/`cancelAssignedCase`) | `POST Deploy/Police/W/CancelGuardCase` (키가 `deployReqSeq` 하나, 배정 여부로 서버가 분기) | 높음 — **단, 우리는 두 액션을 분리해서 다른 다이얼로그/사유 필드로 구현했는데 실제 API는 엔드포인트 하나** |
| 연장/단축 요청 (`requestPeriodChange`) | `PATCH Deploy/Police/W/ExtendDeployPeriod` / `ShortenDeployPeriod` | 높음 |
| 연장/단축 승인 (`approvePeriodRequest`) | `POST GuardCase/Stec/W/ConfirmCasePeriod` | 높음 |
| 연장/단축 거부 (`rejectPeriodRequest`) | **없음** | 확인 필요 (1-2 참고) |
| 배치요청 목록 (`RequestListPage`) | `GET GuardCase/Stec/W/GetDeployRequestList` (DEPLOY_STATUS=0) | 높음 |
| 연장요청/단축요청 목록 | `GET GuardCase/Stec/W/GetExtendRequestList` / `GetShortenRequestList` | 높음 |
| 본부 배정 (`assignManager`) | `POST GuardCase/Stec/W/AddGuardCase` | 높음 |
| 경호계획 등록 (`registerBaseInfo`) | `PUT GuardCase/Stec/W/AddGuardCaseInfo` — **스케줄 생성 후엔 409**(우리 mock엔 이 가드가 없음, 추가 필요) | 높음 |
| 경호계획 부분 수정 | `PATCH GuardCase/Stec/W/PatchCaseInfo` — Add와 달리 부분 갱신, 경호중/완료에서도 가능 | 높음 |
| 경호목록(본사, `SecurityCaseListPage`) | `GET GuardCase/Stec/W/GetGuardCaseList` (페이지네이션 있음, status 필터는 진행중만 포함되는 듯) | 중간 — status enum 표 확인 필요 |
| 경찰 경호목록(`PoliceSecurityCaseListPage`) | `GET Deploy/Police/W/GetDeployList` (params: `groupSeq, keyword`만 — 페이지네이션·status 파라미터 없음) | **낮음** — 이 엔드포인트가 전체 상태를 다 포함하는지, 페이지네이션이 왜 없는지 확인 필요 |
| 이력 조회(본사/경찰) | `GET History/Stec 또는 Police/W/GetHistoryList` (status·endReason·searchKey·페이지네이션 있음) | 높음 |
| 스케줄 자동생성 (`createInitialSchedule`) | `POST GuardCase/Stec/W/AutoAddSchedule` — 최초 1회 전용(이미 있으면 400), 대표 경호원만 깔림 | 높음 — **로직 디테일이 우리 mock보다 훨씬 정교함(야간 근무 자정 처리 등), 재구현 필요** |
| 근무조 수정 (`upsertScheduleGroup`) | `PUT GuardCase/Stec/W/PatchScheduleGroup` — "그 조의 근무자 전체를 통째로 교체" 방식 | 높음 |
| 근무조 삭제 | `DELETE GuardCase/Stec/W/DeleteScheduleGroup` — 하루의 마지막 조는 삭제 불가(409) | 높음 |
| 사전미팅 (`setPreMeeting`) | `PUT GuardCase/Stec/W/SaveCaseMeeting` | 높음 |
| 첨부(경호계획서/동의서/파기확인서) | `PUT .../PatchGuardPlanDoc` `/PatchConsentDoc` `/PatchDestroyDoc` — **전부 `multipart/form-data` 실제 파일 업로드** | 높음이지만 **구현 자체가 신규**(지금 mock은 boolean 플래그뿐, 실제 파일 처리 없음) |
| 파기확인서 다운로드 | 경찰용 `GetDestroyDocDownload`(Deploy/Police, 수령기록 O) / 에스텍용(GuardCase/Stec, 수령기록 X) — **동명이지만 별도 엔드포인트 2개, 사이드이펙트 다름** | 높음 |
| 최종 종결 (`closeCase`) | `POST Deploy/Police/W/CloseGuardCase` — 종결 시 배치요구서·문서 3종·게스트 조회권까지 삭제(개인정보 파기) | 높음 — **우리 mock은 데이터를 안 지우고 상태만 바꿈. 실제로 물리 삭제되면 이력 화면에서 보여줄 데이터가 없어짐 → 이력 조회 설계 재검토 필요할 수 있음** |
| 게스트 계정 발급/목록/삭제/수정 | `AddGuestUser`/`GetGuestUserList`/`DeleteGuestUser`/`UpdateGuestCaseInfo` | 높음 |
| 게스트 발급 후보 (`assignableCases` 로직) | `GetGuestCaseList`(발급용, isAccess 없음) / `GetGuestCaseDetail`(수정용, isAccess 붙음) — **후보 조회가 발급/수정 2개 엔드포인트로 분리** | 높음 |
| 관리자 계정 관리(방금 구현) | `AddStecUser`/`GetStecUserList`/`UpdateUser` | 높음 — **단, 계정 정지(`useYn`) 액션 신규 필요, 정보수정 권한 매트릭스는 API가 강제 안 함(호출 가능 여부만 체크, "본인만" 같은 세부 규칙은 화면 책임일 수 있어 확인 필요)** |
| 최초 로그인 강제 변경(방금 구현) | `ChangePassword` + `UpdateUser`의 `pwChangedYn` | 높음(1-4 참고 — 필드 의미 재확인 필요) |
| 경호원(근무자) 관리 | `GetGuardList`/`AddGuardInfo`/`PatchGuardInfo`/`DeleteGuardInfo` | 높음 |
| 조직 관리(신규) | `Group/Stec/*` 4종 | **완전 신규 기능 — 로드맵에 없음** |
| 대시보드(Phase 4, 보류 중) | `DashBoard/Police/W/GetDashBoardCount`/`GetDashBoardGroupCount` | 참고용 — 착수 시 사용 |
| 엑셀 다운로드 3종(신규) | `DownloadCaseSchedule`/`DownloadCaseDeploy`/`DownloadCaseInfo` | **완전 신규 기능 — 로드맵에 없음** |

## 3. 완전히 새로운 기능 (로드맵에 없던 것)

1. **조직(그룹) 관리** — 경찰 조직 트리(본청/지방청/경찰서) 등록·수정·삭제, 등록 시
   경찰 로그인 계정이 자동 생성됨. 지금은 seed에 3개 계정이 고정 하드코딩.
2. **엑셀 다운로드 3종** — 경호 투입 현황, 배치요구서, 경호계획서. 매번 서버에서
   생성(저장 파일 아님).
3. **실제 파일 업로드/다운로드** — 지금 mock은 첨부를 boolean으로만 흉내냄. 실제로는
   `multipart/form-data` 업로드 + 파기확인서는 별도 다운로드 엔드포인트(수령 기록 사이드이펙트 포함).
4. **계정 정지/재활성화**(`useYn`) — 관리자 계정 관리 화면에 액션 추가 필요.
5. **대시보드**(Phase 4) — 이미 로드맵에 있지만 최후순위로 보류 중. Swagger엔 계산 규칙까지
   상세히 나와 있어 착수 시 바로 참고 가능.

## 4. 백엔드팀에 확인해야 할 것 (우선순위순, db-dump 확인 후 갱신)

`db-dump/*.sql`(스키마 전용 덤프, 14개 테이블)을 대조해 아래 목록 중 상당수가
**해소**됐습니다. 취소선 항목은 DB로 확정된 것 — 6번 섹션 참고.

1. **모든 엔드포인트의 응답(Response) 스키마** — 이 Swagger엔 전무. 실제 연동 전 필수.
   DB 컬럼으로 필드 존재는 상당히 추정 가능해졌지만, 응답 JSON의 필드명·중첩 구조·
   페이지네이션 envelope 형태는 여전히 확인 필요.
2. **연장/단축 "거부" API** — 존재 여부 (1-2, 미해소 — DB에 `GUARD_CASE_PERIOD_LOG`가
   있지만 이건 승인 이력 로그일 뿐 거부 여부를 기록하는 컬럼은 없음)
3. ~~상태값 정수 코드 매핑표~~ → **DB로 확정**: `DEPLOY_STATUS`(0:접수/1:배정/2:연장/
   3:단축), `GUARD_CASE_INFO.STATUS`(0:배정/1:경호중/2:경호완료/3:종결/4:경호취소).
   두 상태가 서로 다른 테이블의 별도 컬럼이라는 것도 함께 확정(6-3 참고).
4. ~~`pwChangedYn` 필드의 정확한 의미~~ → **DB 코멘트로 확정** (1-4)
5. ~~본부(StecDept) 관리 방식~~ → **DB로 확정: 본부 데이터는 `BASIC_CODE`에 있으나
   `USER_INFO`와 연결 안 됨** — 백엔드 확인 사항이 아니라 변경 요청 사항으로 전환,
   `docs/backend-integration-issues.md` 1번 참고 (1-3, 6-1)
6. **`Deploy/Police/GetDeployList`의 스코프** — 여전히 미해소. `DEPLOY_REQUEST` 테이블
   자체엔 상태 무관 전체 이력이 다 남는 구조라(물리 삭제되는 접수취소 제외), 이 API가
   전체 상태를 다 내려주는 것으로 보이나 응답 스키마가 없어 확정은 못 함.
7. **로그인 응답 구조** — 미해소. `USER_INFO`에 `LOGIN_PW`가 "해시"라고 명시돼 있어
   (컬럼 코멘트 확인) 최소한 평문 저장은 아님을 확인. 토큰 형식·클레임 구조는 별도 확인 필요.
8. ~~종결 시 물리 삭제 범위가 이력 조회에 미치는 영향~~ → **DB로 일부 확정**: `GUARD_CASE_INFO`
   자체(및 `PROTECTION_DURATION_MINUTES`/`TOTAL_GUARD_WORK_MINUTES` 집계값, 근무·조·
   사전미팅)는 종결 후에도 남습니다. 지워지는 건 `DEPLOY_REQUEST`(배치요구서)와
   `GUARD_CASE_DOC`(첨부파일 3종)뿐 — 이력 화면에서 기본정보·근무 실적은 계속 보여줄 수
   있지만 배치요구서 원본 내용(피의자 상세정보 등)과 첨부파일은 이력에서도 못 봄.
9. **접수취소/경호취소가 API 하나(`CancelGuardCase`)인데 우리는 화면을 두 개 사유
   흐름으로 나눠뒀음** — 미해소, 통합해도 되는지 확인 필요.
10. **(신규) `DEPLOY_REQUEST` FK 제약과 "경호취소 시 배치요구서 삭제" 설명이 서로
    모순됩니다** — `GUARD_CASE_INFO.DEPLOY_REQ_ID`가 `DEPLOY_REQUEST`를 참조하는데 `ON
    DELETE` 옵션이 없어(기본 RESTRICT) 배정된 뒤엔 배치요구서를 못 지웁니다. 그런데
    Swagger 설명은 "경호취소 시에도 배치요구서가 트랜잭션에서 정리(삭제)된다"고 돼
    있어 모순 — 실제로는 `DEPLOY_REQ_ID`를 NULL로 끊은 뒤 지우는 것인지, 아니면
    설명이 부정확한 것인지 확인 필요.
11. **(신규) `USE_YN` 컬럼 코멘트("삭제여부")가 실제 용도(활성/정지)와 안 맞고
    DEFAULT도 0(=정지?)** — DDL 코멘트 정합성 확인 필요 (1-5)

## 6. DB 스키마 대조 결과 (`docs/db-dump/*.sql`, 14개 테이블, 2026-08-31 확인)

Swagger에는 없던 실제 테이블 구조를 확인해 위 섹션들의 추정을 검증/정정했습니다.
스키마 전용 덤프(데이터 없음, 컬럼 코멘트 포함)라 필드 의미가 대부분 명확합니다.

### 6-1. 계정은 전부 `USER_INFO` 하나의 테이블 — "본부"는 데이터로는 있지만 연결이 안 돼 있다

경찰·에스텍·게스트 계정이 전부 `USER_INFO` 한 테이블에 있고, `CODE_ID`(`BASIC_CODE` FK)로
역할만 구분합니다. 처음엔 `BASIC_CODE`가 "역할 마스터"뿐인 줄 알고 "본부 엔티티 자체가
없다"고 결론 냈으나(최초 판단, 아래는 정정 내용), **실제 `basic_code_table_value.csv`를
보니 `BASIC_CODE` 컬럼값 자체가 코드 그룹을 구분하는 용도**였습니다:

- `BASIC_CODE=1` → 에스텍 역할(1시스템관리자/2운영관리자/3본부관리자)
- `BASIC_CODE=2` → 경찰 역할(4본청/5지방청/6피전/7게스트)
- `BASIC_CODE=3` → **실제 본부 목록**(8~13: "HS본부" 계열 6개 지사, 14: "자산관리2본부")

즉 본부 데이터 자체는 이미 존재합니다. 문제는 **`USER_INFO`에 이 본부 코드를 가리키는
컬럼이 없다는 것** — `user_table_value.csv`(실 데이터)로 확인한 결과, 본부관리자 계정의
`CODE_ID`는 전부 그냥 일반 역할코드 `3` 그대로고, 소속 본부는 `NAME` 필드에 자유텍스트로
섞어 적혀 있습니다(예: `NAME="HS2본부"`). `PHONE` 컬럼도 코멘트상 "대표번호" 용도라 개인
연락처가 아닙니다. 이 공백은 백엔드에 확인할 질문이 아니라 **실제로 스키마를 바꿔달라고
요청할 사항**이라 `docs/backend-integration-issues.md` 1번 항목으로 별도 기록했습니다.

영향받는 파일(현재 mock 기준, 실제 연동 시 재검토 대상):
`src/mocks/data/accounts.ts`(`branch`/`phone` 필드), `AssignManagerDialog.tsx`,
`ManagerAssignedCasesDialog.tsx`, `ManagerAccountListPage.tsx`, `EditManagerAccountDialog.tsx`,
`SecurityCaseListPage.tsx`(본사 경호목록의 "본부" 컬럼/필터), `mocks/handlers/
companyAccounts.ts`, `mocks/handlers/managers.ts`.

`AddStecUser` 요청 바디가 `codeSeq, name`뿐인 것도 이걸로 설명됩니다 — 만들 때 넣을
"본부" 정보 자체가 없으니까 필드도 없는 것입니다.

### 6-2. 게스트도 `USER_INFO`의 일부, 조회권은 별도 조인 테이블

게스트 계정은 전용 테이블이 아니라 `USER_INFO`에 역할 코드로만 구분되고, 조회 가능
경호건은 `GUEST_CASE_ACCESS`(`USER_ID` × `CASE_ID` 유니크) 조인 테이블입니다. 우리
mock의 `GuestAccount.caseIds` 배열과 개념은 동일 — 다만 실제로는 정규화된 테이블이라
"게스트별 조회권 조회"와 "경호건별 조회 게스트 조회"가 둘 다 인덱스로 지원됩니다.

### 6-3. 상태값은 두 개의 독립된 축입니다

- `DEPLOY_REQUEST.DEPLOY_STATUS`(신청 상태): **0=접수, 1=배정, 2=연장신청, 3=단축신청**
- `GUARD_CASE_INFO.STATUS`(진행 상태): **0=배정, 1=경호중, 2=경호완료, 3=종결, 4=경호취소**

지금 우리 mock의 `SecurityCase.status`는 이 둘을 하나로 합친 6개 값
(`'접수'|'배정'|'경호중'|'경호완료'|'종결'|'취소'`)입니다. 실제 연동 시엔 두 상태를
따로 받아서 화면에서 조합해 보여줘야 할 가능성이 있습니다 — 특히 "배정" 상태 동안
경찰이 연장/단축을 신청하면 `DEPLOY_STATUS`만 2·3으로 바뀌고 `GUARD_CASE_INFO.STATUS`는
그대로 0(배정)인 채로 유지되는 구조로 보입니다(우리가 만든 `pendingPeriodRequest`
필드와 같은 역할).

### 6-4. 대표 경호원(`IS_REPRESENTATIVE`) 개념이 우리 mock엔 없습니다

`GUARD_CASE_ASSIGNMENT.IS_REPRESENTATIVE`(대표 경호원 여부) — 스케줄 자동생성
(`AutoAddSchedule`)이 대표 경호원의 근무만 자동으로 깔고, 일반 경호원은 이후 일자별
수정에서 수동으로 추가하는 구조입니다(Swagger 1-설명에서도 확인). 지금 우리 mock의
`ScheduleInitDialog`/`createInitialSchedule`은 선택한 근무자 전원을 동일하게 초기
스케줄에 반영합니다 — **"대표/일반" 구분 자체가 없어서, 실제 연동 시 경호풀 등록
화면(경호계획 등록)에 대표 지정 UI를 추가해야 합니다.**

### 6-5. 종결 시 실제로 지워지는 것 / 남는 것

`GUARD_CASE_INFO` 자체, 근무(`GUARD_SCHEDULE_DAY`)·근무조(`GUARD_SCHEDULE_GROUP`)·
사전미팅(`GUARD_CASE_MEETING`)·집계값(`PROTECTION_DURATION_MINUTES`/
`TOTAL_GUARD_WORK_MINUTES`)은 테이블에 `DELETE_YN` 같은 소프트삭제 컬럼이 없어
**종결 후에도 그대로 남습니다.** 반면 `DEPLOY_REQUEST`(배치요구서 원본)와
`GUARD_CASE_DOC`(첨부파일 3종)은 Swagger 설명대로 삭제 대상이고 DB에도 이를 막을
장치가 없어 실제로 지워지는 것으로 보입니다 — 지금 우리 mock은 이 셋을 전혀 지우지
않고 상태값만 바꾸는데, 실제 연동 시 이력 상세 화면에서 배치요구서/첨부파일 관련
필드를 어떻게 처리할지(애초에 안 보여주거나, "삭제됨" 표시) 다시 설계해야 합니다.

### 6-6. 그 외 자잘하지만 유용한 확인

- `POLICE_GROUP_INFO`에 `HQ_FLAG`라는 생성 컬럼 + 유니크 제약으로 **"본청(레벨1)은
  시스템 전체에 딱 1개만" DB 레벨에서 강제**됩니다.
- `GUARD_SCHEDULE_GROUP.NAME`의 타입이 `date`입니다 — 근무조 이름 자체가 날짜값이라는
  Swagger 설명("조 이름이 곧 그 날짜")이 그대로 확정.
- `GUARD_SCHEDULE_DAY`는 `ASSIGNMENT_ID`(현재 배정풀 참조, 경호원이 풀에서 빠지면
  `SET NULL`)와 별개로 `GUARD_ID`를 직접 들고 있어 "지난 근무 이력은 배정 여부와
  무관하게 보존"이 DB 구조로 보장됩니다.
- `LOGIN_PW`는 컬럼 코멘트에 명시적으로 "(해시)"라고 돼 있어 평문 저장이 아님을 확인.

## 7. 다음 단계 제안 (실행은 아직 안 함)

이 문서는 갭 분석까지입니다. 위 4번 목록에 대한 답을 받은 뒤에:

- `features/*/api/*.ts` 파일 단위로 실제 엔드포인트 매핑 작업 순서 정하기
- ID 체계 전환(문자열 → 정수 seq) 영향 범위 파악 — 라우트 파라미터, localStorage
  persist 스키마, 테스트 픽스처 전부 포함
- MSW를 테스트용으로 유지할지, 실제 API 프록시로 완전히 전환할지 결정
  (`vite.config.ts`에 아직 proxy/env 설정 없음)
