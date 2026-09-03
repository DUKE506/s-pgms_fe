# 백엔드 설계 이슈 / 변경 요청 사항

`docs/backend-integration-analysis.md`의 "백엔드팀에 확인해야 할 것"과는 성격이 다릅니다 —
그쪽은 몰라서 묻는 질문 목록이고, 이 문서는 **실제 스키마·API 설계를 바꿔달라고 요청할
사항**을 기록합니다. 발견 즉시 추가하고, 논의 후 결론이 나면 상태를 갱신합니다.

## 상태 표시

- 🔴 검토 전 (발견만 됨, 아직 전달 안 함)
- 🟡 요청함 (백엔드/기획에 전달, 답변 대기)
- 🟢 해결됨 (반영 방식 확정)

---

## 1. 🔴 본부관리자 계정에 "소속 본부"와 "담당자 개인정보"를 둘 다 저장할 곳이 없음

**발견 경위**: `docs/db-dump/user_table_value.csv`(USER_INFO 실제 데이터) 확인 중
(2026-08-31).

**현재 상태**:
- `USER_INFO.CODE_ID`는 본부관리자 전부 동일하게 `3`(일반 역할코드)뿐 — `BASIC_CODE`에
  실제로 존재하는 본부 목록(`BASIC_CODE=3`, CODE_ID 8~14: "HS본부-경기본부" 등 6개 +
  "자산관리2본부")을 가리키는 컬럼이 `USER_INFO`에 없음. 소속 본부는 `NAME` 필드에
  자유텍스트로 섞어 적을 뿐(실제 데이터 예: `NAME="HS2본부"`).
- `USER_INFO.PHONE` 컬럼 코멘트가 "전화번호 (**대표번호**)" — 애초에 개인 휴대폰이 아니라
  조직/계정 대표번호 용도로 설계됨. 실제 데이터도 대부분 NULL이거나 테스트 쓰레기값.
- 경찰 계정도 마찬가지로 조직 공유 계정이라 `NAME`이 조직명("서울경찰청" 등)이지 실제
  담당자 개인 이름이 아님. 다만 경찰 쪽은 케이스 단위 담당자 인적사항
  (`DEPLOY_REQUEST.INVESTIGATOR`/`RESPONSIBLE_OFFICER`, 자유텍스트)이 이미 있어 문제
  없어 보임 — 본부관리자 쪽에만 해당하는 공백.

**왜 문제인가**: 이미 구현한 "관리자 계정 관리" 화면(Phase 3.6)이 `이름`=담당자 개인
성함, `연락처`=개인 연락처로 가정하고 정보수정 기능을 만들어뒀음. 실제로는:
- "본부" 소속을 구조화해서 저장/조회/필터링할 방법이 없어 화면의 "본부" 컬럼이 그대로는
  성립 안 함(자유텍스트 NAME을 파싱해야 함)
- "연락처"가 개인 번호가 아니라 대표번호 용도라 정보수정의 실제 의미가 기획 의도와 다름

**요청/제안** (트레이드오프 순, 셋 중 논의 필요):
1. `USER_INFO`에 본부(`BASIC_CODE` 8~14) FK 컬럼 신설 — 소속을 구조화. DB 스키마 변경.
2. 담당자 개인 이름/연락처용 컬럼 신설 논의 — `NAME`/`PHONE`은 계정(조직) 대표 정보로
   유지하고, 개인정보는 새 컬럼(`MANAGER_NAME`/`MANAGER_PHONE` 등)으로 분리. DB 스키마 변경.
3. 위 변경이 부담되면 최소한 "본부 소속"만이라도 자유텍스트가 아니라 FK로 구조화하는 것을
   우선 요청 (1번만 먼저).

**영향받는 화면/코드**: `ManagerAccountListPage.tsx`, `EditManagerAccountDialog.tsx`,
`ManagerAssignedCasesDialog.tsx`, `AssignManagerDialog.tsx`, `mocks/data/accounts.ts`
(`branch`/`phone` 필드), `SecurityCaseListPage.tsx`(본사 경호목록 본부 컬럼/필터).

---

## 2. 🔴 연장/단축 신청 "거부" API가 없음

**발견 경위**: `docs/api-swagger.json` 확인 중(2026-08-31), 화면×API 매트릭스 작성 중 재확인.

**현재 상태**: 연장/단축은 "신청(`ExtendDeployPeriod`/`ShortenDeployPeriod`) → 확정
(`ConfirmCasePeriod`)" 2단계 흐름인데, "확정(승인)"만 있고 "거부" 엔드포인트가 없음.
`ConfirmCasePeriod`는 `caseSeq`만 받고 연장/단축 여부·새 종료일 전부 서버가 배치요구서에
이미 들어있는 값을 읽어 처리 — 즉 "신청을 취소/무효화"하는 별도 경로 자체가 안 보임.
`GUARD_CASE_PERIOD_LOG` 테이블도 확정 이력만 남기지 거부 여부를 남기는 컬럼이 없음.

**왜 문제인가**: 우리가 이미 구현한 연장요청/단축요청 승인 화면
(`PeriodRequestActionDialog`)에 승인/거부 버튼이 둘 다 있고, 거부는 별도 API
(`rejectPeriodRequest`)로 처리 중. 대응하는 실제 엔드포인트가 없으면 이 버튼을 그대로
연동할 방법이 없음.

**요청/제안**:
1. `POST` 형태의 거부 전용 엔드포인트 신설(예: `RejectCasePeriod`) — 배치요구서 상태를
   신청 이전(1:배정)으로 되돌리고 `REQUESTED_END_DATE`를 비움.
2. 별도 엔드포인트 없이 신청 자체를 "취소"하는 걸로 처리해도 된다면, 그 방법(예: 경찰
   쪽에 신청 취소 API를 만들어 본사가 대신 호출하게 하는 방식)이 있는지 확인.

**영향받는 화면/코드**: `PeriodRequestActionDialog.tsx`, `features/company/api/requests.ts`
의 `rejectPeriodRequest`.

---

## 3. 🔴 게스트 계정 발급 아이디 "미리보기" API가 없음

**발견 경위**: 화면×API 매트릭스 작성 중 확인(2026-08-31).

**현재 상태**: mock은 `GET /guests/next-id`로 발급 전 자동생성될 아이디를 미리 보여주고,
사용자가 확인 후 `POST /guests`로 실제 발급하는 2단계. 실제 API는 `AddGuestUser`
하나뿐이고 미리보기용 엔드포인트가 없음 — 아이디는 서버가 발급 시점에 그때 확정해서
응답으로 돌려주는 구조로 보임.

**왜 문제인가**: `IssueGuestAccountDialog`가 "자동생성 아이디: GangnamGuest7" 처럼 발급
버튼을 누르기 전에 미리 보여주고 "초기비밀번호는 아이디와 동일합니다" 안내까지 하는
UX인데, 실제 API로는 발급 전에 그 값을 알 방법이 없음.

**요청/제안**:
1. 미리보기 전용 GET 엔드포인트 추가 요청, 또는
2. (더 간단) **UX를 바꿔서 해결** — "발급하기" 버튼을 누르면 바로 발급되고, 결과 화면에서
   발급된 아이디를 보여주는 방식으로 변경. 신규 엔드포인트 없이 프론트 화면 흐름만
   바꾸면 되는 선택지라 우선 이 방향을 검토.

**영향받는 화면/코드**: `IssueGuestAccountDialog.tsx`, `features/police/api/guests.ts`의
`previewNextGuestAccount`.

---

## 4. 🔴 `ChangePassword`가 기존 비밀번호를 검증하지 않음 (보류 — 비밀번호 정책 결정 시 함께 처리)

**발견 경위**: 로그인 연동(matrix 1번) 응답 실측 중(2026-09-01), 임시 테스트 계정으로
직접 확인.

**현재 상태**: 요청 바디가 `{loginId, loginPw}`뿐이라 기존 비밀번호를 증명할 방법이
요청에 전혀 없음 — 서버는 그 `loginId` 계정이 지금 `pwChangedYn=true`(최초 로그인/초기화
상태)인지만 확인하고, 맞으면 어떤 값을 보내든 새 비밀번호로 그대로 반영함. 초기
비밀번호=아이디라 원래도 추측 가능했지만, 이 API는 그마저 필요 없이 `loginId`만 알면
새 비밀번호를 임의로 설정할 수 있음(상세: `docs/backend-integration-responses/
Login-ChangePassword.md`).

**왜 문제인가**: 최초 로그인 강제 변경 구간에서 계정 탈취 여지가 있음(공격자가 loginId만
알면 실제 사용자보다 먼저 비밀번호를 바꿔치기 가능). 다만 이 구간은 발급 직후 짧은
시간에만 노출되는 상태라 심각도는 상황에 따라 다름.

**요청/제안**: **지금 당장 요청하지 않음 — 사용자 결정(2026-09-01)**: 비밀번호 정책
전반(복잡도 규칙, 초기 비밀번호 발급 방식 등)이 나중에 별도로 정해질 예정이라, 그때
이 항목도 같이 처리하기로 함. 후보안(그때 다시 검토):
1. `ChangePassword` 요청에 기존 비밀번호 필드를 추가해달라고 요청.
2. 최초 로그인 흐름 자체를 다른 방식(예: 이메일/SMS 인증 링크)으로 바꾸는 등 더 큰 정책
   변경과 묶어서 처리.

**영향받는 화면/코드**: `features/auth/api/auth.ts`의 `changeInitialPassword`,
`ForceChangePasswordDialog.tsx`.

---

## 5. 🔴 배치요구서의 `deploymentPlace`가 단일 필드 — 4필드(주거지/직장지/기타1/기타2)로 확장 요청

**발견 경위**: 화면3([경찰서] 접수/배치요구서 작성) 연동 중(2026-09-02), `AddDeployRequestDto`
스키마 확인.

**현재 상태**: 우리 신규접수 폼(5번 섹션 "배치장소")은 주거지·직장지·기타1·기타2 4개
입력을 받아 `SecurityCase.location` 4필드로 저장한다. 실제 API(`AddDeployRequestDto`/
`UpdateDeployRequestDto`)와 DB(`DEPLOY_REQUEST.DEPLOYMENT_PLACE varchar(255)`)는 배치장소가
**단일 문자열 1개**(`deploymentPlace`)뿐이다.

**화면4 연동으로 추가 확인된 것(2026-09-02)**: `GetDeployDetail` **응답에는 배치장소가
4필드로 존재한다** — `guardHomeLoc` / `guardWorkLoc` / `guardEtcLoc1` / `guardEtcLoc2`.
즉 **읽기 쪽 스키마는 이미 4필드를 지원하고, 쓰기 DTO(`AddDeployRequestDto.
deploymentPlace`)만 단일**이다. 게다가 #3에서 D-2로 `deploymentPlace`에 주거지 값을
보냈는데 `GetDeployDetail`의 `guardHomeLoc`을 포함해 4필드 전부 `null`로 내려온다 —
`deploymentPlace`(단일 컬럼)와 `guardHomeLoc`(4필드)이 서로 다른 저장소이고, 생성
시점에 단일→4필드 매핑이 안 걸린 것으로 보인다. **결론: 쓰기 DTO에 4필드를 추가하고
생성 시 `guardHomeLoc` 등에 저장되도록 해주면 읽기(`GetDeployDetail`)는 그대로 쓸 수
있다.**

**왜 문제인가**: 경호 대상자는 보통 주거지와 직장 등 복수 지점에서 경호를 받고, 근무
스케줄·근무조도 장소별로 편성된다(이미 승인된 화면 설계). 4필드를 1필드에 합쳐 저장하면
(a) 상세/수정 화면에서 다시 4칸으로 분리 표시할 방법이 없고, (b) 본사 경호계획 단계에서
장소별 배치를 못 잡는다. 사용자 결정(2026-09-02): **폼을 줄이지 말고 API를 4필드로
맞춘다.**

**요청/제안**:
1. `AddDeployRequestDto`/`UpdateDeployRequestDto`에 `deploymentPlaceResidence`/
   `deploymentPlaceWorkplace`/`deploymentPlaceEtc1`/`deploymentPlaceEtc2`(또는 유사 명칭)
   4필드 신설, `GetDeployDetail` 응답에도 동일 반영. DB `DEPLOY_REQUEST`에 컬럼 3개 추가.
2. 1번이 부담되면 최소한 주거지/직장지 2필드만이라도 구조화.

**임시 처리(D-2, 백엔드 반영 전까지)**: 연동은 진행하되 `deploymentPlace`에 **주거지
(`location.residence`)만** 전송하고 직장지·기타1·기타2는 전송하지 않는다. 상세(화면4)
연동 시 주거지만 채워지고 나머지는 빈 값. 상세 내용은
`docs/backend-integration-exclusions.md` · `docs/backend-integration-blockers.md` 참고.

**영향받는 화면/코드**: `SecurityCaseForm.tsx`(5번 섹션), `features/police/api/securityCases.ts`
(`createSecurityCase`/`updateSecurityCase` 매핑), `DispatchRequestViewDialog.tsx`,
`features/police/api/securityCaseDetail.ts`(화면4 — 지금은 `guardHomeLoc` 등 4필드를
`location.*`로 매핑, D-2로 전부 빈 값), `mocks/data/securityCases.ts`.

---

## 6. 🟡 경호 상세에서 "경호건에 배정된 근무 스케줄"을 조회하는 API가 누락됨

**발견 경위**: 화면4([경찰서] 피전 · 경호 상세) 연동 중(2026-09-02). 상세 페이지가
근무자 배정 패널(`WorkerAssignmentPanel`)·개인정보동의서 카드(`ConsentDocsCard`)를
채우려고 근무자 마스터 목록(`GET /api/workers`, mock 전용)을 호출하고 있었는데, 실제
백엔드 연동 대상 엔드포인트를 찾다 **해당 API가 스웨거에 없음**을 확인. 백엔드 개발자에게
문의한 결과 **"경호 상세에서 근무 스케줄을 조회하는 API를 누락했다"**는 답변을 받음
(2026-09-02).

**현재 상태**:
- mock에서는 `SecurityCase.workSchedule.days[].groups[].assignments[].workerId`와
  `baseInfo.defaultWorkers[].workerId`처럼 **근무자 ID만** 케이스 데이터에 들어 있고,
  화면이 그 ID를 근무자 마스터 목록(`GET /api/workers`)과 클라이언트에서 조인해
  이름·연락처를 표시했다.
- 실제 백엔드에는 (a) 경호건별 근무 스케줄(일자별 근무조·근무자·시간)을 돌려주는
  조회 엔드포인트가 없고, (b) `GetDeployDetail`/`GetGuardCaseDetail` 응답에도 스케줄
  블록이 없다(`GetDeployDetail`은 `docAgreeDetail: []` 정도만).
- 참고: 근무자 마스터 목록 API(`GET Guard/Stec/W/GetGuardList`)는 **본사 전용**이라
  피전(경찰서) 계정이 호출할 수 없다 — 애초에 이 방식으로는 실백엔드에서 동작 불가.

**왜 문제인가**: 경찰 경호 상세의 우측 "근무자 배정" 카드와 "보안서약 및
개인정보동의서" 카드가 이미 승인된 화면인데, 이를 채울 데이터 소스가 실백엔드에 없다.
배정 이후 상태(경호중/경호완료)에서 이 두 카드가 항상 비게 된다.

**요청/제안**:
1. 경호건(`deployReqSeq`/`caseSeq`) 기준으로 **일자별 근무 스케줄 + 각 근무자의 표시
   정보(이름/사번/연락처)를 embed**해서 돌려주는 조회 엔드포인트 신설
   (예: `GET Deploy/Police/W/GetCaseSchedule` 또는 `GetGuardCaseDetail` 응답에 스케줄
   블록 추가). 근무자 정보는 ID만 주고 프론트가 다시 조인하게 하지 말 것(피전은 근무자
   마스터에 접근 권한 없음).
2. 개인정보동의서(`docAgreeDetail`)도 같은 응답에 근무자별로 실어줄 것.

**임시 처리(연동 진행)**: 화면4 연동에서 `SecurityCaseDetailPage`의 mock
`listWorkers`(`GET /api/workers`) 호출을 **제거**했다. `workers`를 빈 배열로 넘겨
두 카드는 렌더되지만 근무자 이름 대신 ID가, 연락처는 "-"가 표시된다(접수 단계에선
스케줄·명부 자체가 없어 영향 없음). 상세는 `docs/backend-integration-exclusions.md` 참고.

**영향받는 화면/코드**: `features/police/pages/SecurityCaseDetailPage.tsx`,
`WorkerAssignmentPanel.tsx`, `ConsentDocsCard.tsx`, `features/police/api/workers.ts`
(`listWorkers` — 경찰 이력 상세에서는 아직 사용), `features/police/api/securityCaseDetail.ts`.

---

<!-- 다음 이슈는 위와 같은 형식으로 아래에 추가 -->
