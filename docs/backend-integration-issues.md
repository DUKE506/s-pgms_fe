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

**부분 진전(2026-09-04)**: B-1 섹션 응답으로 `GET GuardCase/Stec/W/GetPoliceInfo` 신설
(지방청→경찰서 2단 트리, `[{groupSeq, groupName, childPoliceInfo:[{childGroupSeq,
childGroupName}]}]`). 이건 **경찰 조직(지방청/경찰서) 축**이라 본사 경호목록의 "지역청
필터 옵션"은 이걸로 채울 수 있다(단 `GetGuardCaseList` 행에 상위 지방청이 없어 행↔지방청
매칭은 경찰서명 문자열 역탐색 — 취약, `GetGuardCaseList`에 `parentGroupName` 추가 필요).
**담당자(본부관리자) 소속 "본부" 축은 여전히 미해소** — B-2(관리자 계정 관리)에서 재요청.
응답 샘플: `docs/backend-integration-responses/GuardCase-Stec-GetPoliceInfo.md`.

**재확인(2026-09-07, matrix #11 관리자 계정 관리 연동)**: `GET User/Stec/W/GetStecUserList`
실측에서도 `groupSeq`/`groupName` 전부 `null` — 본부 소속을 구조화해 조회할 방법 여전히
없음. `UpdateUser` DTO에도 본부(그룹) 필드 없음. → 화면의 "본부" 열은 "-" 고정
(`exclusions.md`). **B-2 섹션 종료 시 일괄 요청에 포함**할 항목:
1. `USER_INFO`에 본부(`BASIC_CODE` 8~14) FK 컬럼 신설 + `GetStecUserList`·`UpdateUser`
   응답/입력에 반영 (위 요청/제안 1·3항 그대로).
2. **`GetGuardCaseList` 행에 담당자 `userSeq` 채워달라** — 필드(`userSeq`, `managerName`)는
   응답 스키마에 이미 있는데 값이 `null`이다. 지금은 담당자명(`userName`) 문자열 매칭으로
   배정건수·담당경호 목록을 계산 중(동명이인 취약, `exclusions.md`). id를 주면 정확한
   조인으로 전환. issues #8(`deptName`)과 같은 "select/DTO 매핑 한 줄" 수준으로 보임.

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

**처리 방향 확정(2026-09-07, matrix #10 연동 시 사용자 결정)**: 이번 연동에서는 **승인만
연결하고 거부는 UI에서 차단**한다. `PeriodRequestListPage`의 ⋮ 메뉴에서 "거부"를
`disabled` + title 안내로 두고, `rejectPeriodRequest`는 throw로 유지(호출 안 됨).
거부 EP 신설(위 1안)은 **B-2 섹션 종료 시 일괄 요청**에 포함. 회신이 오면 그때 연결한다.
(`exclusions.md` [본사] 연장/단축 요청 목록 항목에도 기록.)

**영향받는 화면/코드**: `PeriodRequestListPage.tsx`(거부 메뉴 비활성),
`PeriodRequestActionDialog.tsx`(거부 분기 dormant), `features/company/api/requests.ts`
의 `rejectPeriodRequest`(throw).

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

## 5. 🟢 배치요구서 배치장소 — 4필드로 확장 요청 → **해결(백엔드 수정 완료)**

**발견 경위**: 화면3([경찰서] 접수/배치요구서 작성) 연동 중(2026-09-02), `AddDeployRequestDto`
스키마 확인.

**전달**: 2026-09-03, 피전 경호관리 섹션 일괄 요청서
(`docs/backend-integration-requests/2026-09-03-피전-경호관리.md` 요청 1)로 백엔드 전달.

**해결(2026-09-03)**: 백엔드가 `AddDeployRequestDto`/`UpdateDeployRequestDto`를
`guardHomeLoc` / `guardWorkLoc` / `guardEtcLoc1` / `guardEtcLoc2` **4필드**로 수정.
쓰기 테스트(deploySeq 87)로 4필드 저장·왕복 확인. 프론트 `createSecurityCase`/
`updateSecurityCase`가 `deploymentPlace`(구 단일 필드)를 보내던 것을 4필드 매핑으로 교체,
D-2 임시처리(주거지만 전송) 제거. 읽기: `GetDeployDetail`은 여전히 `guard*Loc`를
null로 주지만(아래 참고) `GetDeployDetailUpdate`는 정상 반환. **남은 것**: `GetDeployDetail`
(상세 화면용)에도 배치장소 값을 실어주면 좋음 — 지금은 화면4가 `GetDeployDetailUpdate`를
쓰거나 "-"로 표시. 섹션 종료 시 일괄 요청 후보로만 남김(경미).

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

## 6. 🟢 경호 상세 근무 스케줄 조회 API → **해결(엔드포인트 확인)** / 동의서 조회는 미확인

**전달**: 2026-09-03, 피전 경호관리 섹션 일괄 요청서
(`docs/backend-integration-requests/2026-09-03-피전-경호관리.md` 요청 2·3 — 스케줄 조회 /
근무자별 보안서약·개인정보동의서 조회 2개 엔드포인트로 분리)로 백엔드 전달.

**해결(2026-09-03)**: **요청 2** — `GET Deploy/Police/W/GetDeployGuardSchedule?deployReqSeq=`
가 있고 200 반환(현재 `data: []` — 스케줄은 화면 9에서 생성되므로 그 후 채워짐). 화면4
연동 시 이 엔드포인트로 근무자 표시를 다시 연결한다. **요청 3**(근무자별 보안서약·
개인정보동의서 조회) — 피전용 전용 GET은 아직 안 보임. `GetDeployDetail.docAgreeDetail`
(현재 `[]`)이 후보. 화면 9 이후 데이터가 생기면 재확인 → 필요하면 섹션 종료 시 재요청.

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
2. 근무자별 보안서약·개인정보동의서(`docAgreeDetail`)는 스케줄과 성격이 달라
   (스케줄 = 일자·근무조·시간, 동의서 = 근무자별 파일 메타) **별도 조회 엔드포인트**로
   분리 신설 요청 — `GET Deploy/Police/W/GetCaseConsentDocs`류. 근무자 식별·표시정보 +
   파일명 + 업로드 여부 + 다운로드 경로. (2026-09-03 사용자 지시로 1번과 분리)

**임시 처리(연동 진행)**: 화면4 연동에서 `SecurityCaseDetailPage`의 mock
`listWorkers`(`GET /api/workers`) 호출을 **제거**했다. `workers`를 빈 배열로 넘겨
두 카드는 렌더되지만 근무자 이름 대신 ID가, 연락처는 "-"가 표시된다(접수 단계에선
스케줄·명부 자체가 없어 영향 없음). 상세는 `docs/backend-integration-exclusions.md` 참고.

**영향받는 화면/코드**: `features/police/pages/SecurityCaseDetailPage.tsx`,
`WorkerAssignmentPanel.tsx`, `ConsentDocsCard.tsx`, `features/police/api/workers.ts`
(`listWorkers` — 경찰 이력 상세에서는 아직 사용), `features/police/api/securityCaseDetail.ts`.

---

## 7. 🟢 배치요구서 수정 화면용 "배치요구서 원본 상세조회" API → **해결(백엔드 수정 완료)**

**전달**: 2026-09-03, 피전 경호관리 섹션 일괄 요청서
(`docs/backend-integration-requests/2026-09-03-피전-경호관리.md` 요청 4)로 백엔드 전달.

**해결(2026-09-03)**: `GET Deploy/Police/W/GetDeployDetailUpdate?deployReqSeq=`가 배치요구서
원본 필드를 전부 반환한다(성별·생년월일·직업·사건개요·참고사항·배치장소 4필드 + 요구자/
수사관). 접수·배정 상태 모두 200(`deployStatus`로 구분). 화면5를 이 엔드포인트로 prefill +
`PUT UpdateDeployRequest`로 저장 연동 완료, 브라우저 왕복 검증(2026-09-03).
응답 샘플: `docs/backend-integration-responses/Deploy-Police-GetDeployDetailUpdate.md`,
`Deploy-Police-UpdateDeployRequest.md`. **남은 것**: 응답에 `mgmtNo` 없음(수정 화면
breadcrumb만 영향, 경미) / 읽기·쓰기 필드명 비대칭(`suspectBirth`↔`suspectBirthDate`,
`etcLoc1/2`↔`guardEtcLoc1/2` — 프론트에서 매핑 처리).

**해결(2026-09-04) — 본사 측(위 요청/제안 3항)**: 백엔드가 섹션 B-1 요청서(요청 2)
응답으로 `GET GuardCase/Stec/W/GetDeployDetail?deployReqSeq=`를 신설. 운영관리자(`StecM1`)
토큰으로 실측(2026-09-04) — 접수·배정 모두 200(없는 seq는 404), 배치요구서 원본 전 필드
반환: 요구자 3필드·`caseSummary`·`caseMemo`·`suspectGender`(0남/1여)·`suspectBirth`·
`suspectJob`·`suspectAddress`·`investigator`/`responsibleOfficer`·`documentDt`(문서 등록일)
+ **배치장소 4필드**(`guardHomeLoc`/`guardWorkLoc`/`etcLoc1`/`etcLoc2`, deploySeq 88·89
정상 데이터 기준 — 81·82가 null이던 건 4필드 쓰기 수정 전(2026-09-02) 생성분이라 원본에
없던 것, EP 갭 아님) + `periodFrom`/`periodTo`. 읽기·쓰기 필드명 비대칭은 위와 동일
(`suspectBirth`↔`suspectBirthDate`, `etcLoc1/2`↔`guardEtcLoc1/2`). `mgmtNo` 없음(목록에서
받은 값 사용). 응답 샘플: `docs/backend-integration-responses/GuardCase-Stec-GetDeployDetail.md`.
경로·이름이 경찰용 `Deploy/Police/W/GetDeployDetail`과 겹치므로 프론트 api 레이어에서 구분
필요. → `DispatchRequestViewDialog`(화면7·9) 전체 필드 표시, 경호계획 등록 배치기간(#10)에도
사용.

**연동·검증 완료(2026-09-07) — 화면9**: `features/company/api/securityCaseDetail.ts`의
`getSecurityCase`가 `GetCaseDoc.deploySeq`로 이 EP를 호출해(`fetchDeployRequestDetail`),
`GetGuardCaseDetail`이 안 주는 원본 필드를 `mergeDeployRequest`로 병합 — 성별/생년/직업/
거주지·사건개요·참고사항·요구자 3필드·문서 등록일. 브라우저 검증(caseSeq 48):
경호계획 등록 폼의 "배치요구서 원본보기" 다이얼로그에 성별 여·생년월일 1992-01-01·
직업 회사원·거주지·사건개요·요구자(여성청소년과 여성청소년계/경사/홍길동)·작성일
2026-09-02 전부 표시. 배치장소는 deploySeq 82가 옛 데이터(D-2 시절)라 여전히 "-"(88·89
같은 정상 데이터는 채워짐 — EP 갭 아님). 첨부 카드 "등록일 · 2026-09-02"(`documentDt`)도
채워짐(exclusions 화면9 항목 해소). **화면7(`RequestListPage`)의 같은 다이얼로그는
목록 필드만 표시 유지 — 후속.**

**발견 경위**: 화면5([경찰서] 피전 · 배치요구서 수정) 연동 착수(2026-09-03), prefill
소스 확인 중. 사용자 설명으로 데이터 모델 확정.

**현재 상태**:
- `GET Deploy/Police/W/GetDeployDetail`은 **피전 상세페이지에 보이는 "기본정보" 뷰**다.
  이 기본정보는 원래 **본사 관리자가 배정 이후에 등록**하는 데이터이고, 접수 단계에서는
  아직 없으므로 백엔드가 **배치요구서 내용을 기본정보 형태로 임시 매핑**해서 내려준다.
- 그래서 접수 단계 `GetDeployDetail` 응답에는 배치요구서 원본에만 있는 값
  (성별 `suspectGender` / 생년월일 `suspectBirthDate` / 직업 `suspectJob` /
  사건개요 `caseSummary` / 참고사항 `caseMemo` / 배치장소 4필드)이 빠져 있다.
- 스웨거 `Deploy/Police/W`에는 `GetDeployList` / `GetDeployDetail`뿐 —
  배치요구서 원본을 그대로 돌려주는 조회 엔드포인트가 없다.

**왜 문제인가**: 배치요구서 수정 화면(`SecurityCaseEditPage`)은 `SecurityCaseForm`을
재사용하는데, 이 폼의 **필수 필드**(성별·생년월일·직업·사건개요·배치장소 직장지)를
`GetDeployDetail`로는 prefill할 수 없다. 빈 값으로 두면 필수검증에 막혀 저장 불가,
억지로 `UpdateDeployRequest`에 빈 값을 실으면 (Add 때처럼) 400이 나거나 **기존 DB 값을
빈 값으로 덮어쓸** 위험이 있다. → `GetDeployDetail`을 편집 소스로 쓸 수 없음.

**요청/제안**:
1. `deployReqSeq` 기준으로 **배치요구서에 제출된 원본 값을 그대로** 돌려주는 GET
   엔드포인트 신설(예: `GetDeployRequestForEdit` / `GetDeployRequestDetail`).
   응답 스키마는 `UpdateDeployRequestDto`와 대칭이면 이상적 —
   `suspectName`/`suspectGender`/`suspectBirthDate`/`suspectJob`/`suspectAddress`/
   `crimeType`/`caseSummary`/`deploymentPeriodFrom`/`deploymentPeriodTo`/
   배치장소(#5 4필드)/`caseMemo`/`clientDept`/`clientPosition`/`clientName`/
   `investigator`/`responsibleOfficer` + 상태(`statusName`, 배치기간 잠금 판정용) + `mgmtNo`.
2. 배정 이후 상태에서 이 화면에 들어오는 경우의 소스도 함께 정리
   (`GetGuardCaseDetail` 분기 여부 — #9 본사 경호 상세와 연계).
3. **(2026-09-03 보강) 본사 쪽에서도 같은 데이터가 필요하다.** [본사] 배치요청 목록
   (`/admin/requests`)의 행 클릭 배치요구서 전문 다이얼로그(`DispatchRequestViewDialog`)가
   같은 필드(대상자 성별·생년월일·직업·거주지·사건개요·배치장소 4필드·참고사항·수사관/
   요구자 정보)를 표시하는데, `GetDeployRequestList`엔 없고 본사(Stec) 토큰으로 경찰용
   `Deploy/Police/W/GetDeployDetail` 호출 시 **403**이다. 신설 API를 **운영/시스템관리자
   토큰으로도 조회 가능**하게 하거나(권한 공유), 본사용 대칭 엔드포인트
   (`GuardCase/Stec/W/GetDeployRequestDetail`류)를 함께 만들어달라.

**임시 처리**: 화면5는 이 API 없이는 end-to-end 성립 불가 → `blockers.md`에 등록하고
**그룹 B로 진행**, 백엔드 반영 후 복귀(`docs/backend-integration-process.md` 원칙 2).
본사 배치요청 목록의 다이얼로그는 목록 필드(관리번호·경찰서·지역청·요청일·배치기간)만
표시하고 나머지는 "-"로 둔 채 진행(`exclusions.md`, 사용자 결정 2026-09-03 "놔둔다").

**영향받는 화면/코드**: `features/police/pages/SecurityCaseEditPage.tsx`,
`features/police/api/securityCaseDetail.ts`(`getSecurityCase` — 지금은 화면4와 공유,
화면5는 별도 조회 함수로 분리 예정), `features/police/api/securityCases.ts`
(`updateSecurityCase`), `features/police/components/SecurityCaseForm.tsx`,
`features/company/components/DispatchRequestViewDialog.tsx`(본사 케이스).

---

## 8. 🟡 근무자(경호원) — `deptName`이 쓰기 전용, 조회로 다시 못 읽음

**발견 경위**: 화면6([본사] 운영/시스템관리자 · 근무자 목록/등록) 연동(2026-09-03),
`Guard/Stec/W/*` 4종 실측 중.

**현재 상태**:
- **DB에는 부서가 있다** — `GUARD_USER_INFO.DEPT_NM varchar(255) NOT NULL`
  (`docs/db-dump/stecPgms_GUARD_USER_INFO.sql:30`, 코멘트 "부서명"). 별도 참조
  테이블이 아니라 경호원 레코드의 필수 컬럼.
- **INPUT도 있다** — `POST AddGuardInfo`는 `deptName`을 **required**로 받고
  (`required: [deptName, name, sabun]`), `PATCH PatchGuardInfo`도 받는다. 실측 시
  입력한 `deptName`이 400 없이 저장됨(= 서버가 `DEPT_NM`에 정상 기록).
- **조회 응답에서만 빠진다** — `GET GetGuardList` 응답 항목은
  `{ guardSeq, sabun, name, phone }`뿐, **`deptName`이 없다**. 근무자 단건 상세조회
  API도 스웨거에 없음(`Guard/Stec/W`의 read는 `GetGuardList` 하나).
- 즉 부서는 DB에 실제로 저장돼 있는데 백엔드가 목록 응답에 실어주지 않을 뿐이다 —
  프론트가 그 값을 어느 화면에서도 다시 읽을 수 없다.

**왜 문제인가**: 근무자 목록 화면의 "부서" 열을 채울 수 없다(실측: 화면에서 부서 열을
제거함, `exclusions.md`). 정보수정 화면에서도 현재 부서를 prefill할 수 없어, 사용자가
부서를 바꾸려면 값을 새로 입력해야 하고(빈 값이면 서버 기존 값 유지되도록 프론트가
`deptName` 필드를 아예 빼고 전송), "현재 부서가 무엇인지"를 확인할 방법이 없다.

**요청/제안**:
- **`GetGuardList` 응답 항목에 `DEPT_NM`(`deptName`)을 실어달라.** 데이터는 이미 DB에
  있고 컬럼도 `NOT NULL`이라, select 컬럼/DTO 매핑에 한 줄 추가하는 수준일 것으로 보임.
  근무자 단건 상세 API를 새로 만들 필요는 없음. 프론트는 응답에 필드가 오면 목록/카드의
  "부서" 열, 정보수정의 부서 prefill을 바로 되살린다.
- (대안) `deptName`을 실제로 근무자 모델에서 안 쓸 거면 `AddGuardInfo`의 required에서
  빼고 optional로. 지금은 "DB 필수 컬럼 + 입력 필수인데 조회에는 안 나오는" 어정쩡한 상태.

**임시 처리**: 목록/카드에서 부서 열 제거(`exclusions.md`). 등록 폼의 부서 입력은 유지
(서버 저장은 정상). 정보수정은 부서를 빈 칸으로 두고 입력했을 때만 전송.

**전달**: 2026-09-04 섹션 B-1(#6~#9) 요청서(`docs/backend-integration-requests/2026-09-04-본사-경호관리-B1.md`)로 정리 — 백엔드 전달 예정, 답변 대기.

**영향받는 화면/코드**: `features/company/pages/WorkerListPage.tsx`,
`features/company/components/EditWorkerDialog.tsx`,
`features/company/api/workers.ts`.

---

## 9. 🟡 [본사] 배치요청 "취소"에 대응하는 API가 없음

**발견 경위**: 화면7([본사] 운영/시스템관리자 · 배치요청 목록) 연동(2026-09-03),
`GuardCase/Stec/W/*` 스웨거 확인 중.

**현재 상태**:
- 배치요청 목록(`/admin/requests`)의 ⋮ 메뉴에 "배정"과 "취소"가 있다. "취소" =
  아직 배정 안 된 배치요구서를 본사가 반려/취소하는 동작(mock은 `DELETE /security-cases/:id`
  → 하드 삭제).
- 스웨거에 `GuardCase/Stec/W/CancelGuardCase`가 **없다**. 케이스 취소 엔드포인트는
  `POST Deploy/Police/W/CancelGuardCase`(Police 태그, DTO `{deployReqSeq, reason?}`)
  **하나뿐**이고, 이건 경찰(피전)이 자기 접수건을 취소하는 용도다.
- 본사(운영관리자 `StecM1`) 토큰으로 Police 태그 엔드포인트 `Deploy/Police/W/GetDeployDetail`
  호출 시 **403** — Police 태그는 본사 토큰으로 못 부를 가능성이 크다(하드삭제라 실제
  `CancelGuardCase` 호출 테스트는 안 함).

**왜 문제인가**: 배치요청 목록의 "취소" 버튼을 연결할 실제 엔드포인트가 없다.

**요청/제안**:
1. 본사 운영/시스템관리자가 미배정 배치요구서를 취소(반려)하는 엔드포인트 신설 —
   예: `POST GuardCase/Stec/W/CancelDeployRequest {deploySeq, reason?}`. 상태를
   반려로 남길지, 경찰 접수취소처럼 하드 삭제할지도 함께 정의.
2. 별도 신설이 부담이면 기존 `Deploy/Police/W/CancelGuardCase`를 본사 토큰으로도
   호출 가능하게 권한 확장(단 "배치요청 취소"와 "경호취소"의 의미 차이는 정리 필요).

**임시 처리**: `RequestListPage`의 "취소" ⋮ 메뉴 항목을 `disabled` 처리
(`exclusions.md`). `cancelPendingRequest`/`CancelPendingCaseDialog` 코드는 남겨둠 —
API 오면 `disabled`만 제거하면 됨.

**전달**: 2026-09-04 섹션 B-1(#6~#9) 요청서(`docs/backend-integration-requests/2026-09-04-본사-경호관리-B1.md`)로 정리 — 백엔드 전달 예정, 답변 대기.

**영향받는 화면/코드**: `features/company/pages/RequestListPage.tsx`,
`features/company/components/CancelPendingCaseDialog.tsx`,
`features/company/api/requests.ts`(`cancelPendingRequest`).

## 10. 🟢 [본사] 경호계획 등록 — 배정 건의 "배치기간" 조회 → **해결(신규 EP)**

**해결(2026-09-04)**: 백엔드가 섹션 B-1 요청서(요청 1·2) 응답으로 신설한
`GET GuardCase/Stec/W/GetDeployDetail?deployReqSeq=`가 **접수·배정·경호계획 미등록 무관하게
`periodFrom`/`periodTo`를 항상 반환**한다(운영관리자 토큰 실측 2026-09-04, deploySeq
70·71·81·82·86·88·89). 화면9는 이미 `GetCaseDoc` 응답으로 `deploySeq`를 갖고 있으므로
(46→81, 47→86, 48→82) 그 값으로 이 EP를 호출해 경호계획 등록 폼 배치기간을 채운다.

**연동·검증 완료(2026-09-07)**: `getSecurityCase` → `fetchDeployRequestDetail` →
`mergeDeployRequest`가 경호계획 미등록 배정 건의 `startDate`/`endDate`를 이 EP의
`periodFrom`/`periodTo`로 채운다 → `BaseInfoForm`의 `periodMissing`이 false가 되어
"등록" 버튼 활성화. 브라우저 검증(caseSeq 48, 배정+미등록): 배치기간 2026-09-12 ~
2026-09-22 표시, "배치기간 정보를 불러올 수 없어…" 경고 사라짐, 등록 버튼 활성.
`blockers.md` 해당 항목 종료. 응답 샘플:
`docs/backend-integration-responses/GuardCase-Stec-GetDeployDetail.md`. (아래는 발견 당시 기록.)

**발견 경위**: 화면9([본사] 운영/시스템관리자 · 경호 상세) 연동(2026-09-04),
`AddGuardCaseInfo` 실측 중. 상세는 `docs/backend-integration-blockers.md` "경호계획
등록(AddGuardCaseInfo)에 필요한 배치기간…" 참고.

**현재 상태**:
- `AddGuardCaseInfo` DTO는 `startDt`/`endDt`(배치기간 시작·종료 + 배치시간 결합)를
  **required**로 받는다(실측: 스케줄 생성 후 재호출 시 409, 등록 자체는 이 필드 필요).
- 경호계획 미등록(배정) 상태에서 `GetGuardCaseDetail.startDate`/`endDate`는 `null` —
  경호계획을 등록해야 채워진다(닭-달걀). `GetGuardCaseList`도 배정 건은 기간 null.
  `GetDeployRequestList`는 배정되면 목록에서 빠진다.
- 본사(운영관리자 `StecM1`) 토큰으로 `Deploy/Police/W/GetDeployDetail`·
  `GetDeployDetailUpdate`(배치요구서 기간 보유) 호출 시 **403**(2026-09-04 실측).
- → 본사 화면이 "배정된, 아직 경호계획 없는" 건의 배치요구서 기간을 조회할 경로가 전무.
  경호계획 등록 폼의 배치기간 칸이 빈 값이 되고, 등록 시 `startDt`가 날짜 없는
  `"T09:00:00"`로 나가 실패한다.

**왜 문제인가**: 본사 메인 워크플로우의 핵심 단계(배정 → 경호계획 등록)를 실백엔드에서
완주할 수 없다. 프론트 코드는 폼값 기준으로 `startDt`/`endDt`를 보내도록 구현해 뒀지만
소스가 없어 **등록 경로가 미검증(△)**으로 이월된다. (수정 = `PatchCaseInfo`는 기간
불필요라 완전 동작·검증 완료.)

**요청/제안** (하나면 충분):
1. `GetGuardCaseDetail`(또는 `GetGuardCaseList`)이 경호계획 미등록 상태에서도 배치요구서
   기간(`periodFrom`/`periodTo`)을 함께 반환.
2. `AddGuardCaseInfo`가 `startDt`/`endDt`를 optional로 받고, 미지정 시 서버가 배치요구서
   기간 + 폼이 보낸 배치시간으로 조합.
3. 본사용 배치요구서 원본 조회 API 신설(#7 3항과 동일).

**임시 처리**: 등록 경로 코드는 완성해 두고 미검증 이월(`blockers.md`). caseSeq 46에는
curl로 기간을 직접 넣어 등록·스케줄 생성을 실측(DTO 스펙 자체는 정확 — 화면4·2 재검증용
데이터로도 사용).

**전달**: 2026-09-04 섹션 B-1(#6~#9) 요청서(`docs/backend-integration-requests/2026-09-04-본사-경호관리-B1.md`)로 정리 — 백엔드 전달 예정, 답변 대기.

**영향받는 화면/코드**: `features/company/components/BaseInfoForm.tsx`,
`features/company/api/securityCaseDetail.ts`(`registerBaseInfo` — `options.period`).

---

## 11. 🟡 [본사] 경호계획 — 5개 조치 섹션 ↔ `summary1~5` (단일 문자열 2개)

**발견 경위**: 화면9 연동(2026-09-04), `AddGuardCaseInfoDto` 스키마 확인.

**현재 상태**: 경호계획 등록 폼의 조치 섹션 5개(안전조치/긴급응급조치/잠정조치/
긴급임시조치/임시조치)는 각각 **다중선택 배열 + {시작일, 종료일} 기간**이다. 백엔드는
섹션당 `summaryN`(단일 문자열) + `summaryNDate`(단일 문자열) 2개뿐 — 배열도 기간 객체도
아니다. `AddGuardCaseInfoDto`/`PatchCaseInfoDto`/`GetGuardCaseDetail` 모두 동일.
(필드명이 `summary`라 조치 섹션 대응인지도 스키마상 불명확 — 폼 순서로 1=안전조치…
5=임시조치로 매핑 중.)

**왜 문제인가**: 사용자 결정(2026-09-04)으로 **폼은 그대로 두고 손실 매핑**한다 —
선택 항목을 `", "`로 조인해 `summaryN`, 기간을 `"시작일 ~ 종료일"` 문자열로
`summaryNDate`에 넣고 읽을 때 역파싱. 실측(caseSeq 46)에서 왕복은 정확하나:
(a) 저장 포맷 규칙이 프론트에만 존재(백엔드 계약 아님), (b) 다른 클라이언트가 칩 선택지
밖 자유텍스트를 넣으면 프론트 칩이 매칭 안 됨, (c) 항목별 개별 기간을 표현할 수 없음.

**요청/제안**:
1. `summaryN`을 구조화 — 항목 배열(코드/라벨) + 적용기간(from/to) 2필드. 5개 섹션 각각.
   DB `GUARD_CASE_INFO`(또는 관련 테이블)에 컬럼/자식테이블 추가.
2. 최소한 `summaryNDate`를 단일 문자열이 아니라 `summaryNFrom`/`summaryNTo` 2필드로.

**임시 처리(D-형)**: 위 손실 매핑으로 연동 진행(`exclusions.md` [본사] 경호 상세).

**전달**: 2026-09-04 섹션 B-1(#6~#9) 요청서(`docs/backend-integration-requests/2026-09-04-본사-경호관리-B1.md`)로 정리.
**백엔드에 전달 완료(2026-09-04, 사용자가 #13과 함께 별도로 요청)** — `summaryN` 항목
구조화 + `summaryNDate` → from/to 2필드. 답변 대기(🟡 유지). 실측 근거:
`GetGuardCaseDetail?caseSeq=46` 응답에 `summary1:"맞춤형 순찰, CCTV"` /
`summary1Date:"2026-09-10 ~ 2026-09-20"`처럼 프론트 손실 매핑이 그대로 저장돼 있는 것 확인.

**영향받는 화면/코드**: `features/company/components/BaseInfoForm.tsx`(7~11번 섹션),
`features/company/api/securityCaseDetail.ts`(`toBaseInfo`/`toCaseInfoBody`,
`parseMeasure*`/`joinMeasure*`/`formatMeasurePeriod`),
`features/company/components/BaseInfoSummaryCard.tsx`.

---

## 12. 🟡 [본사] 경호 상세 — 조회에서 빠지는 저장값들 (대표근무자 플래그·그룹 메모)

**발견 경위**: 화면9 연동(2026-09-04), 조회 5종 + 쓰기 3종 실측.

**현재 상태**: 쓰기 DTO는 받는데 조회 응답엔 없는 필드들 —
- **대표근무자 여부**: `AddGuardCaseInfoDto.guards[].isRepresentative`로 저장되고
  `GetGuardCaseDetail.guardUserList`에 대표만 나오지만 **이름(`guardName`)만** 준다
  (guardSeq 없음). `GetCaseGuardList`는 배정 근무자 전체(`isAssigned`)를 주지만
  `isRepresentative` 플래그가 없다. → 프론트가 "이름이 guardUserList에 있으면 대표"로
  추정(동명이인 취약).
- **근무조 메모**: `PatchScheduleGroupDto.memo`로 저장되고 실측 200이나,
  `GetCaseSchedule` 응답의 그룹 항목에 `memo`가 없다 → 재조회 시 "특이사항 · 없음".
- (참고) `GetGuardCaseDetail`은 경호계획 뷰라 배치요구서 원본 필드(요구자 3필드·사건개요·
  참고사항·문서 등록일·대상자 성별/생년월일/직업)가 없다 — 본사용 배치요구서 원본 조회
  API 부재(#7)와 같은 뿌리.

**왜 문제인가**: 저장은 되는데 화면을 다시 열면 사라진 것처럼 보인다(대표 체크는 추정값,
그룹 특이사항은 항상 빈 값). 화면4 배치장소 `GetDeployDetail` null과 같은 패턴.

**요청/제안**:
1. `GetCaseGuardList` 항목(또는 `guardUserList`)에 `guardSeq` + `isRepresentative` 포함.
2. `GetCaseSchedule`의 그룹 항목에 `memo` 포함.

**임시 처리**: 대표 여부는 이름 추정, 그룹 메모는 표시 생략(`exclusions.md`).

**전달**: 2026-09-04 섹션 B-1(#6~#9) 요청서(`docs/backend-integration-requests/2026-09-04-본사-경호관리-B1.md`)로 정리 — 백엔드 전달 예정, 답변 대기.

**영향받는 화면/코드**: `features/company/api/securityCaseDetail.ts`(`toBaseInfo`·
`toWorkSchedule`), `features/company/components/ScheduleSection.tsx`(그룹 특이사항 표시).

## 13. 🟢 [경찰서] 경호 상세 — `GetDeployDetail`에 조치 5개·근무시간 → **해결(백엔드 수정 + 연동 완료)**

**해결(2026-09-07)**: 백엔드가 경찰용 `Deploy/Police/W/GetDeployDetail` 응답을 본사
`GetGuardCaseDetail`과 같은 구조로 맞췄다 — `startDt`/`endDt` 제거 →
`startDate`/`endDate` + **`startTime`/`endTime`(근무시간 명시 필드)**, `summary1~5` /
`summary1~5Date`(조치 5개), `guardUserList`(대표근무자 이름) 추가. 경호계획 미등록이면
전부 null. 프론트 `features/police/api/securityCaseDetail.ts`가 `startDate != null`일 때
`summary1~5`+`startTime`/`endTime`으로 `baseInfo`를 조립(공유 헬퍼
`@/shared/lib/caseMeasures`) → 통합 기본정보 카드의 조치·배치시간이 채워진다.
브라우저 검증(deployReqSeq 81): "배치시간 매일 09:00 ~ 18:00 / 안전조치 맞춤형 순찰,
CCTV / 잠정조치 1호" 렌더 확인. 응답 샘플: `Deploy-Police-GetDeployDetail.md`.
남은 것: `suspectUserName`은 마스킹("홍**") — 실명 비노출 정책(프론트는 `nameInitial`로
취급, 대응 불필요). (아래는 발견 당시 기록.)

**발견 경위**: 화면9 연동 후 기본정보 카드를 피전/본사 공유(`CaseBaseInfoCard`, 2026-09-04)
하면서, 같은 건(deploySeq 81 = caseSeq 46)을 두 화면이 나란히 볼 때 피전 쪽만 조치·
배치시간이 빈 값(`-`)으로 나오는 것을 사용자가 발견. `GetDeployDetail?deployReqSeq=81`
실측으로 확인.

**현재 상태**:
- 근무시간(배치시간)·5개 조치(안전조치/긴급응급조치/잠정조치/긴급임시조치/임시조치 +
  각 적용기간)는 **본사가 배정 후 등록하는 "경호계획"의 일부**다. 본사용
  `GetGuardCaseDetail`은 이를 `startTime`/`endTime` + `summary1~5`/`summary1~5Date`로
  반환한다(화면9에서 연동).
- 경찰용 `GetDeployDetail`은 배정·경호계획 등록 이후에도 이 필드들을 **응답에 싣지
  않는다**. 실측(deploySeq 81, 배정+경호계획 등록됨, 2026-09-04) 응답에 `summary1~5`/
  `summary1~5Date`가 **아예 없고**, `startTime`/`endTime` **명시 필드도 없다** —
  근무시간은 `startDt`/`endDt`(datetime, 예 `"2026-09-10T09:00:00"` ~ `"...T18:00:00"`)의
  시각부로 유추만 가능(조치는 유추 불가). 경호계획 미등록 건(82·86)은 `startDt`/`endDt`도
  null이라 그마저 없음.
- 배치장소 4필드(`guardHomeLoc` 등)·경호기간·담당 경찰관은 `GetDeployDetail`에도 있어
  (경호계획 등록 후) 정상 표시된다 — 조치·근무시간만 공백.
- **데이터는 백엔드에 있다(2026-09-04 재확인)**: 같은 건을 본사용
  `GetGuardCaseDetail?caseSeq=46`으로 보면 `startTime:"09:00:00"` / `endTime:"18:00:00"` +
  `summary1`/`summary1Date`/`summary3`/`summary3Date`가 전부 채워져 있다. 즉 "데이터 부재"가
  아니라 **경찰용 EP의 select/DTO 누락**이다(issues #8 `deptName`과 같은 성격).

**왜 문제인가**: 피전(경찰)이 자기 경호 대상 건의 경호계획(어떤 안전조치가 어느 기간
적용되는지, 근무시간이 몇 시부터인지)을 상세 화면에서 볼 수 없다. 이미 승인된 화면
(`BaseInfoReadCard` → 통합 후 `CaseBaseInfoCard`)이 이 5개 조치 칸을 갖고 있는데 채울
데이터가 없다. (회귀 아님 — 기존 피전 카드도 `baseInfo` 없으면 `-`였고, 화면4는 원래
"접수 상태만 검증"이라 배정 이후 경호계획 표시는 미검증/이월 상태였음.)

**요청/제안**:
1. `GetDeployDetail` 응답에 `summary1~5` / `summary1~5Date`(조치 5개 + 적용기간) 추가.
2. 근무시간을 명시 필드로(`startTime`/`endTime` 또는 `workHours`) 추가 —
   `GetGuardCaseDetail`과 대칭.
3. (선택) 배정 이후 경찰 상세를 `GetDeployDetail` 대신 `GetGuardCaseDetail` 대칭
   엔드포인트로 분기하는 방안도 함께 검토(경찰 토큰으로 `GuardCase/Stec/*` 호출은
   현재 불가 — 별도 경찰용 EP 필요).

**임시 처리**: 피전 경호 상세에서 조치 5개·배치시간은 `-`로 둔다
(`exclusions.md` [경찰서] 경호 상세). **화면4 "배정 이후 재검증"**(matrix 9번 완료 후)
시점에 이 API가 반영되면 함께 검증.

**전달**: 2026-09-04 섹션 B-1(#6~#9) 요청서(`docs/backend-integration-requests/
2026-09-04-본사-경호관리-B1.md` 요청 7)로 정리 — 화면4가 피전 섹션(2~5번)이지만
그땐 배정 데이터가 없어 못 잡은 항목이라 본사 B-1에 함께 실었다.
**백엔드에 전달 완료(2026-09-04, 사용자가 #11 `summaryN` 구조화와 함께 별도로 요청)** —
경찰용 `GetDeployDetail`에 `summary1~5`/`summary1~5Date` + `startTime`/`endTime` 명시 필드
추가(본사 `GetGuardCaseDetail`엔 이미 있음, 같은 컬럼). 답변 대기(🟡 유지). B-1 섹션
응답으로 온 신규 EP 2개는 둘 다 본사용이라 이 건은 손대지 않았다 — B-2 재요청 목록에 이월.

**영향받는 화면/코드**: `features/police/api/securityCaseDetail.ts`(`toSecurityCase` —
현재 `baseInfo` 자체를 만들지 않음), `shared/components/CaseBaseInfoCard.tsx`,
`features/police/pages/SecurityCaseDetailPage.tsx`.

<!-- 다음 이슈는 위와 같은 형식으로 아래에 추가 -->
