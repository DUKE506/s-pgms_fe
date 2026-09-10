# 발견 레지스터 (findings)

연동을 진행하며 발견한 **mock ↔ 실제 API/DB 간극**을 한곳에 모은다. 이전에는 네 개
문서(issues / blockers / exclusions / analysis)로 나뉘어 있었고, 항목이 서로 이동하면서
(blocker → issues, issues → 해결) 추적이 어려워 통합했다.

## 종류 · 상태

| 종류 | 뜻 | 어디서 |
|---|---|---|
| **요청** | 백엔드가 스키마/API를 고쳐야 함 | PART 1 |
| **질문** | 몰라서 확인이 필요한 것 (설계 변경 요청 아님) | PART 1 · PART 4 |
| **블로커** | 지금 진행을 막는 불일치 | PART 2 |
| **제외** | 우리가 "이 필드/동작은 빼고 연결한다"고 판단한 것 | PART 3 |

상태: 🔴 검토 전 · 🟡 요청함(백엔드 응답 대기) · 🟢 해결됨 · (블로커) 확인 대기 / 진행 중 / 해결됨 ·
(제외) 제외 확정 / 재검증 예정.

- **"데이터 없어 재검증 예정"** 인 제외 항목은 백엔드 요청이 아니라 `../../.claude/loop-backend/CARRYOVER.md` 소관.
- 섹션 종료 시 PART 1·2의 🔴/🟡 항목을 묶어 `requests/`로 전달한다 (`../../.claude/loop-backend/guides/SECTION_BOUNDARY.md`).

---
---

# PART 1 — 요청 · 질문  (구 backend-integration-issues.md)


`docs/backend-integration-analysis.md`의 "백엔드팀에 확인해야 할 것"과는 성격이 다릅니다 —
그쪽은 몰라서 묻는 질문 목록이고, 이 문서는 **실제 스키마·API 설계를 바꿔달라고 요청할
사항**을 기록합니다. 발견 즉시 추가하고, 논의 후 결론이 나면 상태를 갱신합니다.

## 상태 표시

- 🔴 검토 전 (발견만 됨, 아직 전달 안 함)
- 🟡 요청함 (백엔드/기획에 전달, 답변 대기)
- 🟢 해결됨 (반영 방식 확정)

---

## 1. 🟡 본부관리자 계정에 "소속 본부"와 "담당자 개인정보"를 둘 다 저장할 곳이 없음 — **본부 파트 종결(제외), 담당자 개인정보는 운영팀 문의 대기**

**본부 파트 종결(2026-09-09, 사용자 확인)**: `USER_INFO.groupSeq/groupName`은 경찰 관계자용
공유 컬럼이라 본사 계정은 항상 null — 본사에 "소속 본부" 개념을 두지 않기로 결정. 관리자
계정 관리의 **"본부" 열 제거**(`ManagerAccountListPage` 헤더·셀·모바일), `ManagerAccount.branch`
·`Manager.branch` 필드 삭제, 담당자 배정 다이얼로그 2개의 `· {branch}` suffix 제거. → 본부
소속 구조화(요청 1·3) 요청 취소. **담당자 개인정보(성명·직급·연락처) + `GetGuardCaseList`
담당자 `userSeq` 조인**은 여전히 미해결 — 운영팀 문의 대기(B-2 나머지).

---

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

## 3. 🟢 게스트 계정 발급 아이디 "미리보기" API가 없음 — 프론트 UX 변경으로 해소

**발견 경위**: 화면×API 매트릭스 작성 중 확인(2026-08-31).

**현재 상태(당시)**: mock은 `GET /guests/next-id`로 발급 전 자동생성될 아이디를 미리
보여주고, 사용자가 확인 후 `POST /guests`로 실제 발급하는 2단계. 실제 API는 `AddGuestUser`
하나뿐이고 미리보기용 엔드포인트가 없음.

**왜 문제인가**: `IssueGuestAccountDialog`가 "자동생성 아이디: GangnamGuest7"처럼 발급
버튼을 누르기 전에 미리 보여주는 UX인데, 실제 API로는 발급 전에 그 값을 알 방법이 없음.

**결론(2026-09-08, #16 연동 · 사용자 결정)**: 제안 2안 채택 — **신규 엔드포인트 요청 없이
프론트 UX만 변경**. 발급 다이얼로그의 아이디 미리보기 자리를 "발급 시 자동으로
생성됩니다" 안내로 바꾸고(초기비밀번호=아이디 안내는 유지), 발급 후 목록을 재조회해
새 계정(loginId)을 보여준다. `previewNextGuestAccount` / `GET /guests/next-id` 제거.
`AddGuestUser` 응답은 `{data:true}`뿐이라 발급된 아이디를 돌려주지 않는 점도 이 방식으로 흡수.

**영향받는 화면/코드**: `IssueGuestAccountDialog.tsx`, `features/police/api/guests.ts`
(`previewNextGuestAccount` 삭제), `mocks/data/guests.ts`(`previewNextGuestId` 삭제).

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

## 6. 🟢 경호 상세 근무 스케줄 조회 API → **해결·연동 완료(2026-09-09)** / 동의서 조회(요청 3)는 여전히 미제공

**전달**: 2026-09-03, 피전 경호관리 섹션 일괄 요청서
(`docs/backend-integration-requests/2026-09-03-피전-경호관리.md` 요청 2·3 — 스케줄 조회 /
근무자별 보안서약·개인정보동의서 조회 2개 엔드포인트로 분리)로 백엔드 전달.

**해결(2026-09-03)**: **요청 2** — `GET Deploy/Police/W/GetDeployGuardSchedule?deployReqSeq=`
가 있고 200 반환(현재 `data: []` — 스케줄은 화면 9에서 생성되므로 그 후 채워짐). 화면4
연동 시 이 엔드포인트로 근무자 표시를 다시 연결한다. **요청 3**(근무자별 보안서약·
개인정보동의서 조회) — 피전용 전용 GET은 아직 안 보임. `GetDeployDetail.docAgreeDetail`
(현재 `[]`)이 후보. 화면 9 이후 데이터가 생기면 재확인 → 필요하면 섹션 종료 시 재요청.

**요청 2 실측·연동 완료(2026-09-09)**: `GET Deploy/Police/W/GetDeployGuardSchedule?
deployReqSeq=90`(경호중, 스케줄 생성됨) → **200 + 실데이터**. 응답 = 일자별 평면 배열
`[{ dates: "YYYY-MM-DD", guardSchedule: [{ guardSeq, name, phone, deptName, isWork }] }]`
(envelope 이중 래핑 없음). **근무자 `name`·`phone` 인라인** — 요청 1의 "표시정보 embed" 충족.
근무 시각은 응답에 없음 → 경호계획 근무시간(`baseInfo.workHours`, 화면 공통) 적용. 접수·배정
(스케줄 미생성) → `data: []`. 본청/지역청 토큰도 200.
- **연동**: `police/api/securityCaseDetail.ts::getDeployGuardSchedule(id, workHours?)` 신설
  (응답 → `WorkSchedule` + `workers: Worker[]` — id=`String(guardSeq)`). `SecurityCaseDetailPage`
  의 `workers: never[] = []` 제거 → `useQuery`로 병합(`enabled = status !== '접수'`).
  `WorkerAssignmentPanel`이 근무자 이름·시각·연락처를 다시 그린다. 테스트 더블
  `mocks/handlers/deploy.ts`에 핸들러 추가.
- **브라우저 검증(2026-09-09)**: SPoliceM5 `/security-cases/90` → 김가드·이가드 09:00~18:00·
  연락처 렌더. SPoliceM1(조회전용) 동일. 접수 건(91)은 안내 문구 유지. 콘솔 에러 0.
- 응답 샘플 `Deploy-Police-GetDeployGuardSchedule.md`. `ConsentDocsCard`(요청 3, 근무자별
  동의서)는 전용 GET 없어 미연결 유지(`baseInfo.defaultWorkers` 빈 배열이라 표시 영향 없음).

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

## 9. 🟢 [본사] 배치요청 "취소"에 대응하는 API가 없음 → **해결(2026-09-09, EP 신설)**

**해결(2026-09-09)**: 백엔드가 `POST GuardCase/Stec/W/CancelGuardCase { deployReqSeq, reason? }`
신설. 경찰용(`Deploy/Police/W/CancelGuardCase`)과 같은 동작 — 서버가 배정 여부로 접수취소
(배치요구서 hard delete, reason 없음, 시스템·운영만) / 경호취소(상태 '취소', reason 필수)를
갈라 처리. 본부관리자는 자기 배정 건만(아니면 403). 취소 가능 상태 = 배정·경호중·경호완료
(경찰용은 배정뿐), 종결·취소면 409.
- **연동**: `requests.ts::cancelPendingRequest`(#7 ⋮"취소") + `securityCaseDetail.ts`(company)
  `::cancelAssignedCase`(#9 경호상세 "경호취소"). 두 화면의 `disabled` 제거. `SecurityCase`에
  `deploySeq` 필드 추가(company `getSecurityCase`가 `GetCaseDoc.deploySeq`로 채움 — 키가
  caseSeq가 아니라 deployReqSeq라서).
- **프로브(옵션 C, 상태 안 바꿈)**: 없는 deployReqSeq → 400. StecM3(본부 0건) 남 배정건 →
  403 "담당하지 않는 경호건입니다", 접수건 → 403 "담당하지 않는 배치요구서입니다".
- **미검(이월)**: 실제 취소 왕복(접수취소 hard delete / 경호취소 상태전환)은 되돌릴 수 없어
  미테스트 — 버려도 되는 데이터로 사용자 확인 예정(CARRYOVER B).

---

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

## 14. 🟢 [본사] 이력 조회 — 상세 조회 API가 없음 → **해결(2026-09-09, EP 신설)**

**해결(2026-09-09)**: 백엔드가 `GET History/Stec/W/GetHistoryDetail?caseSeq=` 신설
(스웨거 개정). 응답 = `History/Police/W/GetHistoryDetail` + `groupName`·`parentGroupName`.
상태 안 가림(진행중도 200), 본부관리자 스코프(범위 밖 → 404). `getCompanyHistoryDetail`
실 API 배선, `CompanyHistoryDetailUnavailableError`·"준비 중" placeholder 제거,
`HistoryDetailPage`(company) 실제 상세 렌더. 브라우저 검증(StecM1, `/admin/history/46`).
응답 샘플 `History-Stec-GetHistoryDetail.md`. blockers 종료. **남은 것**: 종결 건(status=3)
데이터 없어 `totalGuardWorkMinutes`·종결코드 매핑 미검 → CARRYOVER B.

---

**발견 경위**: 화면13([본사] 이력 조회) 연동(2026-09-08). 목록(`History/Stec/W/GetHistoryList`)은
정상 연동됐으나, 상세(`/admin/history/:id`)에 붙일 EP가 없다.

**현재 상태**(2026-09-08 실측):
- `GET History/Stec/W/GetHistoryDetail?caseSeq=46` (StecM1) → **HTTP 404** (경로 자체 없음).
  스웨거에도 `History/Stec/W`엔 `GetHistoryList`만 있고 `GetHistoryDetail`이 없다.
- `GET History/Police/W/GetHistoryDetail?caseSeq=46` (본사 토큰) → **HTTP 403**.
- `GET History/Police/W/GetHistoryDetail?caseSeq=46` (피전 토큰 `SPoliceM5`) → **HTTP 200**,
  정상. 응답: `{caseSeq, mgmtNo, statusName, suspectUserName(마스킹), startDate, endDate,
  totalGuardWorkMinutes, investigator, responsibleOfficer, guardWorkLoc, guardHomeLoc,
  endDt, remark, guards:[{guardSeq, guardName, workDays, totalMinutes}]}`.
- 즉 상세 데이터·EP는 존재하나 **Police 태그 전용**이고 본사(Stec) 토큰엔 막혀 있다.
  목록은 `History/Stec/W`·`History/Police/W` 둘 다 있는데 상세는 Police만 있는 비대칭.

**왜 문제인가**: [본사] 이력 목록에서 행을 클릭하면 종결/취소 건의 기본정보·근무자별
투입실적·종결(취소) 사유를 봐야 하는데(HIST-002, 승인된 화면
`features/company/pages/HistoryDetailPage.tsx`), 조회할 방법이 없다.

**요청/제안**: 아래 중 하나.
1. `History/Stec/W/GetHistoryDetail` 신설 — `History/Police/W/GetHistoryDetail`과 같은
   응답, 본사 스코프(운영/시스템=전국, 본부관리자=본인 배정 건, HIST-003) 적용.
2. 기존 `History/Police/W/GetHistoryDetail`을 본사 토큰도 호출 가능하게 권한 확장.

**임시 처리**: `/admin/history/:id`는 "이력 상세 조회는 준비 중입니다" 안내만 표시
(`getCompanyHistoryDetail`은 `CompanyHistoryDetailUnavailableError` throw).
목록은 정상 연동. `blockers.md` 참고.

**전달**: 그룹 C(이력) 섹션 종료(#15) 시 일괄 요청서에 포함 예정. 🔴 유지.

**영향받는 화면/코드**: `features/company/api/history.ts`(`getCompanyHistoryDetail`),
`features/company/pages/HistoryDetailPage.tsx`.

## 15. 🟢 [본청]/[지역청] 이력 조회 — 관할 전체를 한 번에 못 받고, 진행중 건이 안 나옴 → **해결(2026-09-09)**

**해결(2026-09-09, `_probe-C-reply-b.sh`)**: 스웨거 개정으로 `GET History/Police/W/GetHistoryList`가
`groupSeq` **없이** 부르면 서버가 토큰 역할대로 캐스케이드 — 본청 = 전국 전 구간(접수·진행중·
종결·취소), 지역청 = 관할 이하 전 구간, 피전 = 자기 경찰서 끝난 건만. `groupSeq`는 leaf
경찰서 필터로만 동작(부모 노드·권한 밖 → 0건). 행에 `deploySeq`·`status`(int) 추가, 접수행
`caseSeq: null`. → `listSecurityCaseHistory`/`getSecurityCaseHistoryDetail` mock → 실 API 전환.
접수·진행중 행은 `deploySeq`로 경호상세(`/security-cases/:id`), 종결·취소는 `caseSeq`로
이력상세(`/history/:id`). 브라우저 검증(SPoliceM1 전국 9건 / SPoliceM3 관할 7건 / 진행중→
`/security-cases/90` / 취소→`/history/46`). ⚠️ Police `GetHistoryDetail`은 스웨거 설명("종결/
취소만")과 달리 진행중 건도 200이나 화면이 그 경로로 안 보내 **영향 없음**(제외). **남은 것**:
종결 건 데이터 대기 + 타 관할 상세 스코프 차단 미검 → CARRYOVER B·C절.

---

**발견 경위**: 화면15([본청]/[지역청] 이력 조회 + 진행중 건 상세) 착수 프로브(2026-09-08,
`_probe-15.sh`·`_probe-15b.sh`). 이 화면은 경찰서·본청·지역청이 role로 갈라 쓰고, #14에서
경찰서 경로만 실 API(`listPoliceStationHistory`)로 전환했다. 본청/지역청 경로를 전환하려
했으나 아래 두 벽에 막힘.

**현재 상태**(2026-09-08 실측, `SPoliceM1` 본청 groupSeq 22 · `SPoliceM3` 지방청 groupSeq 24):

1. **관할 캐스케이드 없음** — `GET History/Police/W/GetHistoryList`는 `groupSeq`가 **경찰서
   (leaf) 노드일 때만** 데이터를 준다. 파라미터 없음 / 부모 노드(`groupSeq=22` 본청,
   `groupSeq=24` 지방청) → 전부 0건. `groupSeq=32`(동래) 넣어야 5건. 지방청·본청이
   관할 전체를 한 번에 조회할 방법이 없다. `Deploy/Police/W/GetDeployList`(진행중 목록)도
   동일하게 leaf `groupSeq` 필수.
2. **진행중 건이 이력 목록에 안 나옴** — 본청/지역청은 대시보드(Phase 4)가 아직 없어
   이력 화면이 전체 현황(배정·경호중·경호완료 + 종결·취소)을 겸한다(2026-08-27 결정,
   `roadmap.md` Phase 3-1). 그러나 `GetHistoryList`는 종결·취소만 주고, `status`·
   `includeActive`·`all`·`isEnd` 파라미터를 다 무시한다. 진행중은 `GetDeployList`를
   경찰서마다 따로 불러 합쳐야 나온다.

**참고로 확인된 것**:
- `GET Login/W/GetGroupTree`는 경찰 3역할 공통으로 200, **토큰 역할의 서브트리**를 준다
  (본청=전국, 지방청=자기 지방청+산하 경찰서, 경찰서=자기 노드). leaf `groupSeq` 목록을
  여기서 뽑을 수 있다 → 클라이언트 팬아웃은 기술적으로 가능하나 임시방편(경찰서 수만큼
  N×2 호출)이라 채택 안 함(사용자 결정 2026-09-08).
- `GetHistoryDetail?caseSeq=`·`Deploy/Police/W/GetDeployDetail?deployReqSeq=`는 본청/지역청
  토큰에도 200 → **진행중 건 상세 재사용(`/security-cases/:id`)은 EP 자체는 열려 있음**.
  다만 목록이 mock인 동안은 상세로 넘길 실 id(deploySeq)가 없어 함께 보류.

**요청/제안**: 아래 중 하나 (근거: 사용자가 "기존 API에 토큰으로 계정 확인해서 모든
경호건을 달라"는 방향 선호, 2026-09-08).
1. **(선호)** `GetHistoryList`(+ 진행중 목록 EP)가 **부모 `groupSeq`를 받으면 그 노드
   이하 전체를 캐스케이드**로 반환. 본청 토큰 = 전국, 지방청 토큰 = 관할 이하. 역할
   스코프는 `GetGroupTree`가 이미 서브트리로 나누므로 그 규칙 재사용.
2. 본청/지역청 이력 화면용 **통합 조회 EP 신설** — 진행중(배정·경호중·경호완료) +
   종결·취소를 한 응답으로, 토큰 역할 기준 스코프. 페이지네이션·정렬 포함.
3. 최소안: `GetHistoryList`에 `groupSeq` 부모 허용 + `status` 파라미터로 진행중 포함
   토글. 프론트가 `GetDeployList`와 합치는 부담은 남음.

**임시 처리**: 본청/지역청 이력 목록·상세·진행중 상세는 **mock 유지**
(`listSecurityCaseHistory`/`getSecurityCaseHistoryDetail`, `HistoryListPage`/`HistoryDetailPage`의
`role !== '경찰서'` 분기). 경찰서 경로(#14)는 실 API 그대로. PROGRESS #15 = 부분완료(△).

**전달**: 그룹 C(이력) 섹션 종료 일괄 요청서(`docs/backend-integration-requests/
2026-09-08-이력-C.md`)에 #14와 함께 포함. 🔴 유지.

**영향받는 화면/코드**: `features/police/api/history.ts`(`listSecurityCaseHistory`/
`getSecurityCaseHistoryDetail`), `features/police/pages/HistoryListPage.tsx`·
`HistoryDetailPage.tsx`, `features/police/pages/SecurityCaseDetailPage.tsx`(본청/지역청
진행중 건 상세 재사용).

<!-- 다음 이슈는 위와 같은 형식으로 아래에 추가 -->

## 16. 🟢 `Deploy/Police/W/GetDeployDetail` 응답에 `caseSeq`가 없음 → **해결(2026-09-10, 두 EP 키를 `deploySeq`로 통일)**

**해결(2026-09-10)**: 백엔드가 "GetDeployDetail에 caseSeq 추가" 대신 **`CloseGuardCase`·
`GetDestroyDocDownload` 두 EP가 `caseSeq` 대신 `deploySeq`(배치요구서 PK = 프론트가 라우트
id로 이미 갖고 있는 값)를 받도록** 수정. 스웨거 개정: `CloseGuardCaseDto.caseSeq` →
`deploySeq`(required 배열엔 `endReason`만 남았으나 서버는 `deploySeq`도 실제 필수 검증 —
누락 시 `{ "deploySeq": ["배치요구서를 선택해주세요."] }`), `GetDestroyDocDownload` 쿼리
파라미터 `caseSeq` → `deploySeq`.
- **연동**: `police/api/securityCaseDetail.ts`의 `resolveCaseSeq`(GetDeployList 재조회 우회)
  **함수 통째 제거**. `closeCase`는 `{ deploySeq: <id 숫자부>, endReason }`, `downloadDestructionCert`는
  `?deploySeq=<id 숫자부>` 직접 전송. 테스트 더블 `mocks/handlers/deploy.ts`의 `CloseGuardCase`
  핸들러도 `deploySeq`(`findBySeq`)로.
- **프로브(2026-09-10, `local/_probe-4.sh` — 상태 안 바꿈)**: `{deploySeq:92}`(배정→경호중
  실재 건) → 409 "경호완료 후에 종결"(무변경) / `{caseSeq:92}` 구 키 → 400 검증오류
  `deploySeq` 필수 / 타 경찰서 M3 → 403. 성공 왕복(다운로드→종결)은 사용자가 실백엔드에서
  실제 확인(2026-09-10).
- **잔존(별건)**: `docGuardDetail`(경호계획서) 파일명 필드는 실측 데이터가 없어 미확정 —
  CARRYOVER A절에 별도로 남김. 이번 건과 무관.

---

**발견 경위**: 사용자가 종결 건을 만드는 중(2026-09-09). 경호완료 상태 건이 처음 생겨서
피전 경호상세의 배정 이후 액션(파기확인서 다운로드·종결)을 실측할 수 있게 됐는데 둘 다
400/실패.

**현재 상태**:
- `POST Deploy/Police/W/CloseGuardCase`의 DTO는 `{ caseSeq(int, required), endReason(1~500) }`.
- `GET Deploy/Police/W/GetDestroyDocDownload`의 파라미터도 `caseSeq`.
- 그런데 `GET Deploy/Police/W/GetDeployDetail`(피전 경호상세 조회) 응답엔 `deployReqSeq`만
  있고 **`caseSeq`가 없다**(실측 키 목록에 없음). 피전 경호목록(`GetDeployList`) 행에는
  `{deploySeq, caseSeq}`가 둘 다 온다.
- 기존 `closeCase`가 `caseSeq` 자리에 `deployReqSeq`(라우트 id)를 그대로 넣어 보내고 있어
  서버가 "없는 caseSeq"로 **400 "잘못된 요청입니다"**.

**임시 처리**: `police/api/securityCaseDetail.ts::resolveCaseSeq(deployReqSeq)` 신설 —
`GetDeployList`를 한 번 더 불러 `deploySeq → caseSeq`를 매핑. `closeCase`·
`downloadDestructionCert`가 이걸로 실제 `caseSeq`를 얻어 전송.

**요청**: `GetDeployDetail` 응답에 `caseSeq` 추가(경호계획 등록 이후 건). 추가되면
`resolveCaseSeq` 제거. (또는 `CloseGuardCase`/`GetDestroyDocDownload`가 `deployReqSeq`도
받도록 — `CancelGuardCase`처럼.)

## 17. 🟢 피전 경호상세 문서함(파기확인서/경호계획서) 매핑 누락 → **해결(2026-09-09)**

**발견 경위**: 본사가 파기확인서를 업로드했는데 피전 경호상세 문서함이 "대기중" 고정,
종결 버튼도 비활성(2026-09-09).

**현재 상태 / 해결**: `GET GetDeployDetail` 응답이 문서함 필드를 주고 있었는데
(`docDestructionDetail: {drtFileName, drtFileExt}`, `docGuardDetail`, `docAgreeDetail: []`,
`downloadYn`) `toSecurityCase`가 안 읽어 `attachments`가 항상 undefined였다. →
`attachments` 조립 추가(`docFileNameOf` 헬퍼로 `drtFileName` 등 추출). `downloadYn`
(= `DESTROY_DOC_DOWNLOAD_YN`, 파기확인서를 받아야 켜지고 종결 선결조건 — 안 받고 종결하면
409)을 `SecurityCase.destructionCertDownloaded`로 매핑하고 `canClose`에 포함. 파기확인서
다운로드(`Deploy/Police/W/GetDestroyDocDownload?caseSeq=`)도 배선(이전엔 no-op).
- **미확정**: `docGuardDetail`(경호계획서)은 실측 데이터가 null이라 필드명 확정 못 함 —
  폴백 3개(`drtFileName`/`docFileName`/`fileName`). 본사 경호계획서 업로드 건으로 재확인.
  → **해결(2026-09-10, #18)**: 본사가 실제로 업로드 → `docGuardDetail =
  {docSeq, docType:0, docPath, fileName, fileExt}`. 파일명은 `fileName`(기존 폴백에 포함,
  표시 정상), 다운로드 경로는 `docPath`.

## 18. 🟢 경호계획서·개인정보동의서 다운로드가 프론트에 연결 안 돼 있음 → **해결(2026-09-10, `/files/{path}`)**

**발견 경위**: CARRYOVER 재검증 중 사용자가 "본사에서 경호계획서 업로드는 되는데 피전에서
다운로드가 안 된다"고 지적(2026-09-10).

**현재 상태 / 원인**: 경호계획서·동의서는 **전용 다운로드 API가 없다**(스웨거
`GetDestroyDocDownload` 설명: *"경호계획서·동의서는 PATH가 곧 다운로드 URL이라 이 API가
필요 없고, 파기확인서만 여기를 거친다"*). 백엔드가 정적 파일을 `{API}/files/{경로}`로 서빙
(2026-09-10 실측 — `application/pdf`, **인증 불필요**, `Content-Disposition` 없음). 그런데
프론트는:
- 피전 `DocumentsCard`의 경호계획서 "다운로드" 버튼 `onClick: () => {}` (빈 함수)
- 피전 `ConsentDocsCard`의 동의서 다운로드도 `onClick: () => {}`
- **본사** `AttachmentsSection`의 경호계획서·동의서 행엔 다운로드 버튼 자체가 없음(올리기만 됨)
- `docPath`/`filePath`를 `SecurityCase.attachments`에 매핑조차 안 함

**응답 필드 (2026-09-10 실측)**:
- 피전 `GetDeployDetail.docGuardDetail = {docSeq, docType:0, docPath:"guardcase/53/202609/….pdf", fileName, fileExt}` / `docAgreeDetail: []`(동의서, 실데이터 없어 shape 미확정)
- 본사 `GetCaseDoc.caseInfoDto = {docSeq, filePath:"guardcase/53/…", fileName, fileExt}` / `guardAgreementDtos[].filePath`(동의서, 전부 null)
- 다운로드 URL: `{API}/files/{docPath}` — 200, `application/pdf`. 없는 경로 404.

**해결**: `shared/lib/download.ts::downloadFileByPath(docPath, fileName?)` 신설(`/files/{path}`
blob 받아 `a.download` 저장 — 파기확인서 다운로드와 같은 패턴). `vite.config.ts` dev 프록시에
`/files` 추가. `CaseAttachments`에 `securityPlanFilePath`/`workerConsentFilePaths` 추가,
피전·본사 매퍼가 `docPath`/`filePath`를 채움. 피전 `DocumentsCard`·`ConsentDocsCard`,
본사 `AttachmentsSection` 다운로드 배선. 브라우저 검증(SPoliceM5 `/security-cases/93` —
`/files/…` 200·콘솔 에러 0 / StecM1 `/admin/security-cases/53` — 다운로드 버튼 표시).

**잔존**: 동의서(`docAgreeDetail`)는 실서버에 업로드 파일이 없어(항상 `[]`) 응답 shape
미확정 — 본사 `guardAgreementDtos` 미러링으로 방어적 매핑, 데이터 생기면 재검증(CARRYOVER).
피전 `ConsentDocsCard`는 `baseInfo.defaultWorkers`가 비어(findings #6) 아직 렌더 안 됨.

## 19. 🔴 `GetDeployList`·`GetDeployDetail` 응답에 숫자 `status`(경호상태 코드)가 없음 — `statusName`이 신청 대기와 뒤섞임

**발견 경위**: 사용자 재검증(2026-09-10) — 피전이 경호중 건에서 연장/단축을 신청하면
경호목록에서 그 건이 사라진다.

**현재 상태**: `GET Deploy/Police/W/GetDeployList` 행은 `statusName`(표시용 한글 문자열)만
준다. 연장/단축 신청이 걸린 경호중 건은 `statusName`이 **"경호중"이 아니라 "연장"/"단축"**으로
온다(실측). 프론트 `SecurityCaseListPage`가 `VISIBLE_STATUSES = ['접수','배정','경호중','경호완료']`
로 거르므로 그 건이 목록에서 통째로 빠진다. `GetDeployDetail`의 `statusName`,
`GetDeployDetailUpdate`의 `deployStatus`도 같은 문제(스웨거 GetDeployDetailUpdate 설명:
"연장·단축 신청이 올라와 있으면 그쪽을 우선한다").

**대비**: `GET History/*/W/GetHistoryList`는 **이미** 숫자 `status`(0:배정 1:경호중 2:경호완료
3:종결 4:경호취소)와 `statusName`을 함께 준다(스웨거 명시). 배치관리 계열만 문자열 하나뿐.

**요청**: `GetDeployList`·`GetDeployDetail`(가능하면 `GetDeployDetailUpdate`도) 응답에
`GetHistoryList`와 동일한 숫자 `status` 필드 추가. 연장/단축 신청 여부는 별도 플래그
(예: `pendingPeriodType`)나 기존 `requestedEndDate`(GetDeployDetail엔 이미 있음)로.

**임시 처리(2026-09-10)**: `shared/lib/deployStatus.ts::resolveDeployStatus(statusName)` —
"연장"/"단축"을 `경호중` + `pendingRequestType`으로 정규화. 피전 목록/상세/수정 매퍼 3곳에
적용해 목록에서 안 사라지게 함. 상세는 `requestedEndDate`가 있으면 `pendingPeriodRequest`도
조립("연장 요청 중 · 승인 대기" 배너·재요청 차단). 숫자 `status` 오면 그걸 소스로 전환.

**영향받는 화면/코드**: `features/police/api/securityCases.ts`(`toSecurityCase`),
`features/police/api/securityCaseDetail.ts`(`toSecurityCase`·`toSecurityCaseFromEdit`),
`features/police/pages/SecurityCaseListPage.tsx`, `shared/lib/deployStatus.ts`.

<!-- 다음 이슈는 위와 같은 형식으로 아래에 추가 -->




---
---

# PART 2 — 블로커  (구 backend-integration-blockers.md)


`docs/backend-integration-process.md` 원칙 2 적용 항목을 기록합니다. 사전 분석에서
걸러지지 않은 채로 실제 연동 작업 중 발견된, 진행을 막는 수준의 불일치를 기록합니다.
사용자에게 바로 물어봐서 그 자리에서 해결된 경우는 여기 남기지 않아도 됩니다 — 당장 답을
듣기 어렵거나 다른 작업을 먼저 이어가야 할 때만 기록합니다.

## 형식

```
## [블로커 제목]

**상황**: 어떤 작업을 하다가 무엇을 발견했는지
**문제**: 왜 이 상태로는 계속할 수 없는지
**해결되어야 하는 것**: 진행하려면 무엇이 확정/변경돼야 하는지
**해결방안 후보**:
1. 방안 A — 설명, 트레이드오프
2. 방안 B — 설명, 트레이드오프
**상태**: 확인 대기 / 진행 중 / 해결됨
```

---

## 배치요구서 배치장소 4필드 ↔ 실제 API 단일 필드 (`deploymentPlace`)

**상황**: 화면3([경찰서] 접수/배치요구서 작성) 연동 중(2026-09-02). 우리 폼은 배치장소를
주거지/직장지/기타1/기타2 4필드로 받는데 `AddDeployRequestDto`·DB는 `deploymentPlace`
단일 varchar(255) 1개뿐.
**문제**: 4필드를 1필드에 합치면 상세/수정 화면에서 다시 분리 표시가 불가능하고, 본사
경호계획의 장소별 배치·스케줄 편성 전제가 깨진다.
**해결되어야 하는 것**: 백엔드가 배치장소를 4필드(또는 최소 주거지/직장지 2필드)로 확장
(`docs/backend-integration-issues.md` #5).
**해결방안 후보**:
1. 백엔드 4필드 확장 대기 후 정식 매핑 — 깔끔하나 확장 전까지 화면4(상세)에서 배치장소가
   불완전.
2. **(채택, D-2)** 나머지 필드는 지금 다 연동하고 `deploymentPlace`엔 주거지만 전송,
   직장지·기타는 임시 제외. 백엔드 4필드 반영 시 매핑만 교체. — 피전 화면군 진행을 막지
   않음. 트레이드오프: 확장 전까지 직장지·기타 장소가 백엔드에 저장 안 됨.
**상태**: **해결됨(2026-09-03)** — 백엔드가 `Add/UpdateDeployRequestDto`를 `guardHomeLoc`/
`guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2` 4필드로 수정. 프론트가 4필드 매핑으로 교체,
D-2 제거. 쓰기 테스트(deploySeq 87)로 왕복 확인(issues #5).

---

## 배치요구서 수정(화면5) prefill 소스가 없음 — 배치요구서 원본 상세조회 API 부재

**상황**: 화면5([경찰서] 피전 · 배치요구서 수정) 연동 착수(2026-09-03). prefill 소스로
`GetDeployDetail`을 쓰려 했으나, 사용자 설명으로 이 엔드포인트가 **상세페이지 표시용
"기본정보" 뷰**(배정 후 본사가 등록, 접수단계엔 배치요구서를 임시 매핑)임을 확인.
배치요구서 원본에만 있는 필드(성별·생년월일·직업·사건개요·참고사항·배치장소 4필드)를
안 돌려준다.
**문제**: `SecurityCaseForm`의 필수 필드를 prefill할 수 없어 저장이 불가능하고, 빈 값을
`UpdateDeployRequest`에 실으면 기존 DB 값을 덮어쓸 위험. 조회/저장을 같이 붙여야 실측이
되는데 조회 소스 자체가 없음.
**해결되어야 하는 것**: 배치요구서 원본을 그대로 돌려주는 조회 API 신설
(`docs/backend-integration-issues.md` #7).
**해결방안 후보**:
1. **(채택, a안)** 화면5 전체를 보류하고 그룹 B(#6 본사 근무자 목록)로 진행. 신규 조회
   API가 오면 조회+저장을 함께 연동·실측하고 복귀. — 피전 경호관리 섹션의 마지막 화면이라
   섹션 일괄 요청(#5·#6·#7)에 묶어 전달하면 진행이 막히지 않음.
2. 저장 API(`PUT UpdateDeployRequest`)만 코드 교체(미검증, △) 후 그룹 B로. — #4의 배정
   이후 액션과 같은 패턴이나, prefill이 없어 어차피 화면 자체가 동작 안 함 → 반쪽짜리.
**상태**: **해결됨(2026-09-03)** — 백엔드가 `GET Deploy/Police/W/GetDeployDetailUpdate`
응답을 구현(배치요구서 원본 필드 전부 반환, 접수·배정 모두 200). 화면5를 이걸로 prefill +
`PUT UpdateDeployRequest`로 저장 연동 완료, 브라우저 왕복 검증(issues #7). a안대로 그룹 B를
먼저 돌고(#6·#7) 복귀해 마무리.

---

## 경호계획 등록(AddGuardCaseInfo)에 필요한 "배치기간"을 본사 조회로 얻을 수 없음

**상황**: 화면9([본사] 경호 상세) 연동(2026-09-04). 경호계획 등록 폼(`BaseInfoForm`)은
배치기간(시작일/종료일)을 배치요구서 값 그대로 고정 표시(disabled)하고, `AddGuardCaseInfo`
DTO는 `startDt`/`endDt`(배치기간+배치시간 결합)를 **required**로 받는다.
**문제**: 경호계획 미등록(배정) 상태에서 `GetGuardCaseDetail`은 `startDate`/`endDate`를
`null`로 준다(등록 후에만 채워짐). `GetGuardCaseList`도 배정 건은 기간이 null,
`GetDeployRequestList`는 배정되면 목록에서 빠진다. 본사 토큰으로 `Deploy/Police/W/
GetDeployDetail*`(배치요구서 기간 보유)을 부르면 **403**(2026-09-04 실측). → 본사가
배정 건의 배치기간을 조회할 경로가 없다. 폼의 배치기간 칸이 빈 값이라 등록 시 `startDt`가
`"T09:00:00"`(날짜 없음)로 나가 실패한다.
**해결되어야 하는 것**: 아래 중 하나.
1. `GetGuardCaseDetail`(또는 `GetGuardCaseList`)이 경호계획 미등록 상태에서도 배치요구서
   기간(`periodFrom`/`periodTo`)을 실어준다.
2. `AddGuardCaseInfo`가 `startDt`/`endDt`를 optional로 받고, 미지정 시 서버가 배치요구서
   기간 + 폼이 보낸 배치시간으로 조합한다.
3. 본사용 배치요구서 원본 조회 API 신설(issues #7 3항과 동일 — 본사 권한 확장/대칭 EP).
**해결방안 후보(프론트)**:
1. **(채택)** 코드는 폼값(`securityCase.startDate/endDate`) 기준으로 `startDt`/`endDt`를
   보내도록 구현해 두고, 값이 있는 경우(= 백엔드가 기간을 주게 되면)엔 그대로 동작.
   그전까지 **경호계획 "등록" 경로는 실백엔드에서 미검증**(수정=PatchCaseInfo 경로는
   기간 불필요라 완전 동작, 브라우저 검증 완료). PROGRESS #9 = 부분완료(△).
2. 등록 폼의 배치기간을 사용자 입력 가능하게 전환 — 승인된 화면 설계("고정 적용")를
   바꿔야 하고 오입력 위험. 보류.
**상태**: **해결됨(2026-09-07) — 연동·검증 완료**. 백엔드가 섹션 B-1 요청서(요청 1·2)
응답으로 `GET GuardCase/Stec/W/GetDeployDetail?deployReqSeq=`를 신설(접수·배정·경호계획
미등록 무관하게 `periodFrom`/`periodTo` 반환). 화면9 `getSecurityCase`가 `GetCaseDoc`의
`deploySeq`로 이 EP를 호출(`fetchDeployRequestDetail`) → `mergeDeployRequest`가 경호계획
미등록 건의 `startDate`/`endDate`를 배치요구서 기간으로 채운다. 브라우저 검증(caseSeq 48,
배정+미등록): `BaseInfoForm` 배치기간 2026-09-12 ~ 2026-09-22 표시, `periodMissing` 경고
사라짐, "등록" 버튼 활성. issues #7·#10 → 🟢. 응답 샘플
`docs/backend-integration-responses/GuardCase-Stec-GetDeployDetail.md`.

---

## [본사] 이력 조회 상세 — 본사(Stec)용 조회 EP가 없음

**상황**: 화면13([본사] 이력 조회) 연동(2026-09-08). 목록(`History/Stec/W/GetHistoryList`)은
정상 연동했으나 상세(`/admin/history/:id`)에 붙일 엔드포인트가 없다.
**문제**: `History/Stec/W/GetHistoryDetail`은 404(경로 없음), `History/Police/W/GetHistoryDetail`은
본사 토큰에 403(피전 토큰으론 200). → [본사] 이력 상세를 조회할 방법이 없다.
**해결되어야 하는 것**: `History/Stec/W/GetHistoryDetail` 신설 또는 Police EP 권한 확장
(`docs/backend-integration-issues.md` #14).
**해결방안 후보(프론트)**:
1. **(채택)** 목록만 연동하고 상세 화면은 "준비 중" 안내로 둔다(`getCompanyHistoryDetail`은
   `CompanyHistoryDetailUnavailableError` throw). 목록 행 클릭 → 안내 화면. EP가 오면
   조회 연동 + 기존 상세 레이아웃 복원. — 그룹 C 진행을 막지 않음.
2. 목록 행을 클릭 불가로 바꾼다 — 승인된 화면(행 클릭 → 상세) 동작을 더 크게 바꾸게 됨. 보류.
**상태**: 확인 대기 — 그룹 C(이력) 섹션 종료(#15) 시 일괄 요청. PROGRESS #13 = 부분완료(△).
→ **전달됨**: `docs/backend-integration-requests/2026-09-08-이력-C.md`(2026-09-08).

---

## [본청]/[지역청] 이력 조회 — 관할 전체·진행중 조회 경로가 없음

**상황**: 화면15([본청]/[지역청] 이력 조회) 착수 프로브(2026-09-08). 경찰서 경로(#14)는
실 API 전환됐고 본청/지역청 경로를 전환하려 했다.
**문제**: (1) `History/Police/W/GetHistoryList`·`Deploy/Police/W/GetDeployList` 둘 다
`groupSeq`가 **경찰서(leaf) 노드일 때만** 데이터를 준다 — 부모 노드(본청 22·지방청 24)로는
0건이라 관할 전체를 한 번에 못 받는다. (2) `GetHistoryList`는 종결·취소만 주고 진행중
포함 토글이 없다 — 본청/지역청 이력 화면은 진행중 건도 보여야 하는데(2026-08-27 결정).
**해결되어야 하는 것**: `GetHistoryList`(+진행중 목록)가 부모 `groupSeq` 캐스케이드를
지원하거나, 본청/지역청용 통합 조회 EP 신설 (`docs/backend-integration-issues.md` #15).
**해결방안 후보(프론트)**:
1. `Login/W/GetGroupTree`(3역할 공통 200, 서브트리 반환)로 leaf `groupSeq` 목록을 뽑아
   경찰서마다 `GetHistoryList`+`GetDeployList`를 호출해 합친다 — 스코프는 안전하나
   경찰서 수만큼 N×2 호출. **임시방편이라 채택 안 함(사용자 결정 2026-09-08).**
2. **(채택)** 본청/지역청 이력은 mock 유지, #15는 부분완료(△)로 두고 백엔드 요청 후
   회신 시 실 API 전환. 경찰서 경로(#14)는 실 API 그대로 — 그룹 C 진행을 막지 않음.
**상태**: 확인 대기 — 전달됨 `docs/backend-integration-requests/2026-09-08-이력-C.md`
(2026-09-08). PROGRESS #15 = 부분완료(△).


---
---

# PART 3 — 제외 기록  (구 backend-integration-exclusions.md)


`docs/backend-integration-process.md` 원칙 1(사소한 불일치는 묻지 않고 제외 후 진행) 적용
항목을 기록합니다. 실제 연동을 진행하면서 "이 필드/동작은 빼고 연결한다"고 판단한 것을
발견하는 즉시 아래 형식으로 추가합니다.

## 형식

**화면 → 그 화면이 호출하는 API → API별 제외 항목** 3단으로 적습니다. 같은 화면이라도
어느 엔드포인트에서 생긴 문제인지 구분되도록 API 단위로 나눠 기록합니다.

```
## [화면명] (라우트)

### [METHOD] path — [엔드포인트 용도]

#### [제외한 필드 또는 동작]
- **왜 제외했는지**: 백엔드에 없음 / 의미가 다름 / 임시 처리(D-N) / 등
- **사용자가 잃는 것**: 화면에서 뭐가 안 보이거나 동작 안 하는지
- **연동 커밋 / 해소 예정**: (커밋 해시) / (해소 조건 — issues #N 반영 시 등)
```

---

## 로그인 (`/`, `/admin`)

### POST /api/v1/Login/W/Login, GET /api/v1/Login/W/GetMyProfile — 로그인 + 프로필

#### `GetMyProfile`의 `groupSeq`/`groupName`(경찰 계정 조직 정보) → **해소됨**
- **왜 제외했었는지**: 로그인 연동 시점엔 세션(`AuthUser`)에 `id`/`name`/`role`만 두면
  됐고 당장 이 값을 쓰는 화면이 없었음.
- **해소**: 경찰서 경호목록(matrix 2번) 연동에서 `GetDeployList`가 `groupSeq`를 필수
  파라미터로 요구 → `AuthUser`에 `groupSeq?`/`groupName?`(optional) 추가, `login()`이
  `GetMyProfile` 응답에서 채우도록 함. 이후 조직 스코프가 필요한 화면(matrix 3·17·18번
  등)이 이 값을 재사용.
- **연동 커밋 / 해소 예정**: `008383a` 제외 → `2679751`에서 해소.

#### 아직 미연동인 화면에서 실제 백엔드 세션으로 401 발생 → 순차 해소 중
- **왜 제외했는지**: 버그가 아니라 마이그레이션 전환기의 예상된 상태 — 아직 mock인
  화면(`mocks/handlers/securityCases.ts` 등)은 `access.<mock계정id>.<nonce>` 토큰을
  파싱해 로컬 seed를 찾는데, 실제 JWT는 형식도 다르고 그 계정이 mock seed에 없음. 두
  시스템의 계정이 다른 namespace라 토큰 파싱을 고쳐도 안 됨.
- **사용자가 잃는 것**: 실제 백엔드 계정으로 로그인 후 아직 미연동 화면에 들어가면 콘솔에
  401(화면은 빈 목록/에러 상태). 로그인과 이미 연동된 화면은 영향 없음.
- **연동 커밋 / 해소 예정**: `008383a` → 경찰서 피전 화면군(matrix 2~7번)을 순서대로
  연결하며 자연 해소.

---

## 경찰서 경호목록 (`/security-cases`)

### GET /api/v1/Deploy/Police/W/GetDeployList — 목록 조회

#### `jurisdiction`(관할 지방청) 표기
- **왜 제외했는지**: `GetDeployList` 응답 항목에 관할/지방청 정보가 없음. mock은
  `jurisdictionForStation` 매핑으로 화면 상단을 "관할 / 계정명"으로 보여줬음.
- **사용자가 잃는 것**: 상단 breadcrumb이 "부산지방경찰청 / 동래경찰서"류에서
  "동래경찰서"만으로 축소(실측상 `GetMyProfile.groupName`이 계정명과 동일이라 사실상 같은
  정보). 목록 데이터 자체엔 영향 없음.
- **연동 커밋 / 해소 예정**: `2679751` / 백엔드 응답에 관할 필드가 추가되면.

#### 목록 → 상세 이동이 전환기 동안 미동작
- **왜 제외했는지**: 목록 행 클릭 시 `/security-cases/:id`로 이동하는데 상세 화면(matrix
  4번)이 아직 mock(`findSecurityCase`)이라 실제 `deploySeq` id로는 건을 못 찾음.
- **사용자가 잃는 것**: 실제 백엔드 로그인 상태에서 목록 행 클릭 시 상세가 비어 보임.
- **연동 커밋 / 해소 예정**: `2679751` / matrix 4번(경호 상세) 연동 시.

#### 배정 이후 `statusName` 문자열 미검증
- **왜 제외했는지**: 실측 시점에 동래경찰서 데이터가 "접수" 1건뿐이라, 배정/경호중/
  경호완료/종결/취소 상태의 `statusName`이 프론트 `SecurityCaseStatus` 라벨과 정확히
  일치하는지 확인 불가.
- **사용자가 잃는 것**: 문자열이 다르면 해당 건이 `VISIBLE_STATUSES` 필터에서 빠져 목록에
  안 보일 수 있음.
- **연동 커밋 / 해소 예정**: `2679751` / 그룹 B(#9 본사 경호 상세로 배정 데이터 생성) 이후 재검증.

---

## 접수 / 배치요구서 작성 (`/security-cases/new`)

### POST /api/v1/Deploy/Police/W/AddDeployRequest — 접수 등록

#### ~~배치장소: `deploymentPlace`에 주거지만 전송 (직장지 / 기타1 / 기타2 제외) — 임시(D-2)~~ → **해소(2026-09-03)**
- **왜 제외했었는지**: 실제 API가 배치장소를 `deploymentPlace` 단일 문자열 1개로만 받는
  줄 알고(2026-09-02 스웨거 판독), 폼의 4필드 중 주거지만 전송했음.
- **해소**: 백엔드가 `AddDeployRequestDto`/`UpdateDeployRequestDto`를 `guardHomeLoc`/
  `guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2` 4필드로 수정(issues #5 해결). `createSecurityCase`/
  `updateSecurityCase`가 공유 `toDeployRequestDto`로 4필드를 전부 전송하도록 교체, D-2 제거.
  쓰기 테스트(deploySeq 87)로 4필드 저장·왕복 확인.
- **연동 커밋 / 해소 예정**: (화면5 iteration 커밋) / 해소 완료.

#### 대상자 만나이(`age`)를 전송하지 않음
- **왜 제외했는지**: 실제 API·DB에 나이 필드가 없고 `suspectBirthDate`(생년월일)만 있음.
  이번 연동에서 폼을 출생년도 입력 → 생년월일 입력으로 바꿨으므로 나이는 저장 대상이
  아니라 파생값.
- **사용자가 잃는 것**: 없음 — 나이는 `shared/lib/subject.ts`의 `calcAge(birthDate)`로
  화면에서 계산해 표시(신규접수 폼의 "나이(만)"은 읽기전용 계산값,
  `DispatchRequestViewDialog`도 동일).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 해소 불필요(설계상 확정).

#### ~~`crimeType`을 라벨 문자열 그대로 전송~~ → 해소(2026-09-09, enum 전환)
- **경위**: DB `DEPLOY_REQUEST.CRIME_TYPE`은 "범죄유형 코드" 컬럼이고 스웨거(대시보드
  `crimeType` 파라미터)에 enum이 `stalking/domestic/dating/threat/etc/none`으로 명시됨.
  등록 시 체크버튼(한글 라벨)과 enum을 매칭하므로 조회도 enum으로 통일.
- **처리**: `shared/lib/crimeType.ts` 신규 — `caseTypeToCrimeCode`(쓰기) /
  `crimeCodeToCaseType`(읽기, enum·레거시 한글 둘 다 수용). 쓰기 `toDeployRequestDto`
  (Add/UpdateDeployRequest 공유) 1곳, 읽기 매퍼 3곳(`GetDeployDetail`·
  `GetDeployDetailUpdate`·`GetGuardCaseDetail`) 전환.
- **백엔드 요청 전달**: 위 4개 GET 응답 `crimeType`을 enum으로 반환 + Add/Update는
  enum 수신 그대로 저장 + 레거시 행(한글·영문 혼재) 정규화 방침 회신 (사용자 전달 완료).
  회신 오면 읽기 헬퍼의 레거시 한글 폴백 제거 여부 판단.
- **검증**: 브라우저(`SPoliceM5`) 배치요구서 수정에서 사건유형 협박으로 변경 → 재진입
  협박 유지 → 스토킹 원복. 경찰/본사 경호상세 사건유형 정상 렌더.

---

## 경호 상세 (`/security-cases/:id`)

### GET /api/v1/Deploy/Police/W/GetDeployDetail — 상세 조회

#### `caseSummary`(사건개요) / `additionalNotes`(참고사항) / 대상자 성별·생년월일·직업
- **왜 제외했는지**: `GetDeployDetail` 응답이 이 필드들을 돌려주지 않는다(`AddDeployRequest`
  로는 보냈지만 상세 조회 스키마에 없음).
- **사용자가 잃는 것**: 경찰 상세 화면(화면4)은 원래 이 필드들을 표시하지 않으므로 **화면4
  영향 없음**. 다만 같은 `getSecurityCase`를 프리필에 쓰는 **배치요구서 수정(화면5,
  `SecurityCaseEditPage`)에서 사건개요·성별·생년월일·직업 칸이 빈 값으로 뜬다.**
- **화면5 착수로 확정된 것(2026-09-03)**: `GetDeployDetail`은 상세페이지 표시용
  "기본정보" 뷰(배정 후 본사가 등록, 접수단계엔 배치요구서를 임시 매핑)라서 배치요구서
  원본을 프리필 소스로 쓸 수 없다 — **별도 조회 API 신설 필요**(`docs/backend-integration-issues.md`
  #7, `blockers.md`). 화면5는 그 API가 올 때까지 **보류(a안)**, 그룹 B로 진행.
- **연동 커밋 / 해소 예정**: `19786c4` / issues #7(배치요구서 원본 상세조회 API) 반영 시
  화면5 조회+저장 연동과 함께 해소.

#### `GetDeployDetail` 응답의 배치장소 4필드(`guardHomeLoc` 등) → **대체로 해소(2026-09-07)**
- **현재**: 경찰용 `GetDeployDetail`은 **경호계획 등록된 건**에서 배치장소 4필드
  (`guardHomeLoc`/`guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2`)를 정상 반환한다
  (브라우저 검증 deployReqSeq 81: "부산 동래구 낙민동 100 (수정됨)" 등). 경호계획
  미등록 건은 null(경호계획이 없으니 정상). 옛 D-2 시절 생성분(deploySeq 82 등)은
  원본에 배치장소가 없어 null 유지 — EP 갭이 아니라 데이터 문제.
- **연동 커밋**: (이번 iteration) — 화면4 통합 카드에 배치장소 4필드가 채워짐.

#### 5개 조치(안전/긴급응급/잠정/긴급임시/임시) + 배치시간(근무시간)이 빈 값 → **해소(2026-09-07)**
- **해소**: 백엔드가 경찰용 `Deploy/Police/W/GetDeployDetail`을 본사 `GetGuardCaseDetail`과
  같은 구조로 변경 — `startDt`/`endDt` → `startDate`/`endDate` + **`startTime`/`endTime`**
  (근무시간 명시 필드), `summary1~5`/`summary1~5Date`(조치 5개), `guardUserList` 추가.
  피전 `securityCaseDetail.ts`가 `startDate != null`이면 이 필드들로 `baseInfo`를 조립
  (공유 헬퍼 `@/shared/lib/caseMeasures`) → 통합 카드의 조치 5칸·배치시간이 채워진다.
  브라우저 검증(deployReqSeq 81): "배치시간 매일 09:00 ~ 18:00 / 안전조치 맞춤형 순찰,
  CCTV / 잠정조치 1호". **issues #13 → 🟢.**
- (경위) 근무시간·조치 5개는 본사가 배정 후 등록하는 "경호계획"의 일부라 애초에 경찰용
  응답에 없었고, 기본정보 카드 통일(2026-09-04)로 본사 화면과 나란히 보이면서 공백이
  드러났던 것. 회귀 아님(기존 `BaseInfoReadCard`도 `baseInfo` 없으면 `-`였음).

#### `jurisdiction`(관할 지방청) — 목록 연동과 동일
- **왜 제외했는지**: `GetDeployDetail` 응답에 관할 정보 없음. 세션 `groupName`으로 상단
  소속 표기를 대체(목록 연동과 같은 처리).
- **사용자가 잃는 것**: 상단 소속 표기가 계정명(`groupName`)만. 상세 데이터엔 영향 없음.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 백엔드 응답에 관할 필드 추가 시.

### POST CancelGuardCase (경호취소) / PATCH ExtendDeployPeriod·ShortenDeployPeriod / POST CloseGuardCase

#### 배정 이후 상태 4종(경호취소/연장/단축/종결)은 코드만 교체, 실측 미검증
- **왜 제외했는지**: 이 액션들은 배정~경호완료 상태에서만 열리는데, 실제 백엔드에 아직
  배정된 건이 없어 재현 불가(matrix 4번 비고).
- **사용자가 잃는 것**: 없음(현재 접수 상태 건만 존재). 실 엔드포인트로 교체는 해뒀으나
  응답/부작용은 미확인.
- **연동 커밋 / 해소 예정**: `19786c4` / 그룹 B #9(본사 경호 상세로 배정→경호중→
  경호완료 데이터 생성) 이후 재검증. 특히 `CloseGuardCase`는 `caseSeq`가 필요한데
  `GetDeployDetail`이 안 주므로, 그 시점에 `GetGuardCaseDetail` 분기와 함께 정리.

### (제거) GET /api/workers (listWorkers) — 상세 페이지가 근무자 이름/연락처 조인용으로 호출하던 것

#### 근무자 마스터 목록 조인 방식 자체를 폐기 — mock 호출 제거
- **왜 제외했는지**: 상세 페이지가 근무자 배정 패널(`WorkerAssignmentPanel`)·개인정보
  동의서 카드(`ConsentDocsCard`)를 채우려고 mock 근무자 마스터 목록(`GET /api/workers`)을
  받아 `workerId`로 클라이언트 조인했는데 — (1) 그 API(`GET Guard/Stec/W/GetGuardList`)는
  **본사 전용**이라 피전(경찰서) 계정이 호출 불가, (2) 백엔드 확인 결과 **경호 상세에서
  근무 스케줄을 조회하는 API 자체가 누락**(2026-09-02, `docs/backend-integration-issues.md`
  #6). mock인 채로 두면 실백엔드 로그인 시 `/api/workers`가 401 → `apiFetch`의 refresh +
  React Query retry×3가 겹쳐 `RefreshToken`이 4회 호출되고 상세 진입이 느려졌다.
- **조치**: `SecurityCaseDetailPage.tsx`에서 `listWorkers`/`workersQuery` 호출을 제거하고
  `workers`를 빈 배열로 넘긴다. 두 카드는 그대로 렌더되지만 근무자 이름 대신 `workerId`,
  연락처는 "-"가 표시된다.
- **사용자가 잃는 것**: 접수 단계는 스케줄·명부 자체가 없어 영향 없음(두 카드 미표시).
  배정 이후 상태에서 근무자 이름/연락처가 ID로만 표시된다 — 단 배정 이후는 어차피
  그룹 B(#9 본사 경호 상세) 이후 검증 대상이고, 그 시점엔 근무 스케줄 조회 API(issues #6)가
  개발돼 있어야 두 카드를 제대로 채울 수 있다.
- **연동 커밋 / 해소 예정**: `19786c4` / issues #6(경호 상세 근무 스케줄 조회 API 신설)
  반영 시 `WorkerAssignmentPanel`/`ConsentDocsCard`를 그 응답으로 다시 연결
  (스케줄·근무자 정보 embed 예상). 그룹 B #9에서 함께 처리.

### GET GetGuardList (근무자 목록) — 응답에 부서가 없음

#### 근무자 목록/카드에서 "부서" 열 제거
- **왜 제외했는지**: `GetGuardList` 응답 항목이 `{ guardSeq, sabun, name, phone }`뿐 —
  `deptName`이 없다(`AddGuardInfo`/`PatchGuardInfo`는 받는데). 근무자 상세조회 API도
  없어서 부서 값을 읽을 소스가 전혀 없다(`issues.md` #8).
- **조치**: `WorkerListPage`의 데스크톱 테이블·모바일 카드에서 "부서" 열/줄 제거
  (이름·사번·연락처만). 등록 다이얼로그의 부서 입력은 유지(서버 필수, 저장은 정상).
  정보수정 다이얼로그는 부서를 빈 칸으로 두고 입력했을 때만 `deptName` 전송
  (빈 값 전송 시 서버 기존 부서를 덮어쓸 위험 회피).
- **사용자가 잃는 것**: 근무자 목록에서 소속 부서를 볼 수 없다. 등록 때 입력한 부서는
  서버에 저장되지만 조회 불가.
- **연동 커밋 / 해소 예정**: (이번 iteration) / `issues.md` #8 반영 시(1안 = 응답에
  `deptName` 추가) 열만 되살리면 됨. 그룹 B #12 섹션 종료 시 일괄 요청에 포함.

### GET /api/workers → listCaseJoinWorkers 로 분리 (경호 상세 #9 / 이력 상세 #13용)

#### admin 근무자 CRUD를 실 백엔드로 옮기면서, 조인용 mock 경로를 분리
- **왜 분리했는지**: `company/api/workers.ts::listWorkers`를 실 `GetGuardList`로 교체하면,
  아직 mock인 `SecurityCaseDetailPage`(#9)·`company/HistoryDetailPage`(#13)가 근무자
  이름/연락처 조인에 쓰던 데이터가 바뀌어(실 `guardSeq` vs mock `worker-N`) 조인이
  깨진다 — 아직 연동 안 한 화면의 회귀.
- **조치**: mock 조인 경로를 `listCaseJoinWorkers`(`GET /api/workers` mock 유지) +
  쿼리키 `['workers','case-join']`로 분리. `WorkerListPage`만 실 `listWorkers`
  (`['workers']`) 사용. 2번(GuestListPage) 분리와 같은 처리.
- **사용자가 잃는 것**: 없음(두 화면은 계속 mock으로 동작, 동작 불변).
- **연동 커밋 / 해소 예정**: (이번 iteration) / #9는 `GetGuardCaseDetail` + 스케줄 조회
  (issues #6)로, #13은 이력 상세 연동에서 각각 `listCaseJoinWorkers` 제거.

---

## 배치요구서 수정 (`/security-cases/:id/edit`)

### GET /api/v1/Deploy/Police/W/GetDeployDetailUpdate — 수정 화면 prefill

#### 응답에 `mgmtNo` 없음 → breadcrumb 축소
- **왜 제외하는지**: `GetDeployDetailUpdate` 응답에 관리번호가 없다(issues #7 요청엔
  포함했으나 미반영).
- **사용자가 잃는 것**: 수정 화면 상단 breadcrumb이 "경호관리 / 26-02-… · ST###"에서
  "경호관리"로 축소. 폼 내용·저장엔 영향 없음.
- **연동 커밋 / 해소 예정**: (화면5 iteration 커밋) / 응답에 `mgmtNo` 추가 시.

#### ~~레거시 건의 `crimeType`이 영문값이라 사건유형 미선택으로 뜸~~ → 해소(2026-09-09)
- **경위**: 폼이 쓰는 사건유형은 한글 라벨('스토킹' 등)인데, 백엔드에 직접 들어간 오래된
  테스트 건(예: deployReqSeq 71)은 `crimeType: "stalking"` 영문값이라 폼 Select와 매칭이
  안 됐다.
- **처리**: 프론트가 이제 사건유형을 enum 코드로 통일(위 "crimeType enum 전환" 항목).
  읽기 헬퍼 `crimeCodeToCaseType`이 영문 enum·레거시 한글 둘 다 라벨로 변환하므로 레거시
  영문 건도 수정 화면에서 정상 선택 상태로 뜬다.
- **잔여**: 백엔드가 레거시 행을 정규화하고 읽기 응답을 enum으로 통일하면 헬퍼의 한글
  폴백 제거 가능(회신 대기).

---

## [본사] 배치요청 목록 (`/admin/requests`)

### GET /api/v1/GuardCase/Stec/W/GetDeployRequestList — 목록 조회

#### 행 클릭 시 뜨는 배치요구서 전문(`DispatchRequestViewDialog`)이 목록 필드만 표시
- **왜 제외했는지**: `DispatchRequestViewDialog`는 대상자 성별·생년월일·직업·거주지,
  사건개요, 배치장소 4필드, 참고사항, 수사관·요구자 정보를 읽는데 `GetDeployRequestList`
  응답엔 전부 없다. 본사가 배치요구서 원본을 볼 API 자체가 없다 — 본사(Stec) 토큰으로
  경찰용 `Deploy/Police/W/GetDeployDetail` 호출 시 403 확인(issues #7과 동일 이슈, 본사
  케이스로 보강). 사용자 결정(2026-09-03): 다이얼로그는 지금 손대지 말고 놔둔다.
- **사용자가 잃는 것**: 행 클릭 시 배치요구서 다이얼로그는 열리지만 관리번호·경찰서 외
  대부분 칸이 "-"로 뜬다. 배정 판단에 필요한 배치요구서 내용을 본사가 이 화면에서
  확인할 수 없다.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / issues #7(배치요구서 원본 상세조회
  API)을 본사도 접근 가능하게 신설·반영 시 다이얼로그를 그 응답으로 채운다.

#### 대상자명(`suspectUserName`) 열 없음
- **왜 제외했는지**: 응답에 대상자명이 없다. 단 이 화면의 목록 테이블은 원래 대상자명
  열이 없어(관리번호/경찰서/지역청/요청일/배치기간) 표시상 영향 없음.
- **사용자가 잃는 것**: 없음(테이블 컬럼 구성상 원래 안 보임). `AssignManagerDialog`
  헤더도 관리번호·경찰서만 쓴다.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 해소 불필요.

### GET /api/v1/User/Stec/W/GetStecUserList — 담당자 선택 목록

#### `Manager.branch`(소속 본부) 표시 생략
- **왜 제외했는지**: 응답에 본부 필드가 없다(`groupSeq`/`groupName` 전부 null). 본부명은
  `userName`("HS2본부")에 자유텍스트로 섞여 있을 뿐 — issues.md #1(🔴, 본부 소속 구조화
  저장 없음)의 실측 확인.
- **사용자가 잃는 것**: `AssignManagerDialog`의 담당자 항목이 "이름 본부관리자 · 서울본부"
  → "이름 본부관리자"로 축소(소속 본부 배지 없음).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / issues #1 반영 시(본부 FK 컬럼 신설)
  `Manager.branch` 다시 채움.

#### `Manager.assignedCount`(담당 배정 건수) 배지 생략
- **왜 제외했는지**: 응답에 없고, 담당자별 건수를 세는 전용 API도 없음(`GetGuardCaseList`를
  담당자별로 N번 호출하는 방법뿐).
- **사용자가 잃는 것**: `AssignManagerDialog`의 담당자 항목 우측 "배정 N건" 배지가 안 뜬다.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 담당자별 건수 API가 생기거나
  `GetStecUserList` 응답에 카운트가 추가되면.

#### "취소" 액션 비활성화 (붙일 API 없음)
- **왜 제외했는지**: 배치요청 취소 엔드포인트가 없다. `GuardCase/Stec/W/CancelGuardCase`는
  스웨거에 없고, 유일한 취소 API `POST Deploy/Police/W/CancelGuardCase`는 Police 태그라
  본사 토큰으로 호출 불가(본사 토큰 `GetDeployDetail` 403으로 방증). → `issues.md` 신규.
- **조치**: `RequestListPage`의 ⋮ 메뉴 "취소" 항목을 `disabled` 처리(데스크톱·모바일 둘
  다). `cancelPendingRequest`/`CancelPendingCaseDialog` 코드는 남겨둠(호출 경로만 차단,
  API 오면 `disabled` 제거).
- **사용자가 잃는 것**: 본사가 배치요청(미배정 배치요구서)을 이 화면에서 취소할 수 없다.
  (경찰서는 자기 경호 상세에서 접수취소 가능 — 화면4, 이미 연동.)
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 본사용 배치요청 취소 API 신설 시.

#### 미연동 화면(`SecurityCaseTabs`의 `listSecurityCases`)에서 실백엔드 세션 401
- **왜 제외했는지**: 버그가 아니라 전환기 상태(로그인 exclusions와 동일). 공통 탭 바
  `SecurityCaseTabs`가 경호목록 탭 카운트용으로 `listSecurityCases`(`GET /api/security-cases`,
  아직 mock)를 부르는데, 실 JWT는 mock 계정 토큰이 아니라 mock 핸들러가 401을 준다 →
  React Query retry×3로 콘솔에 401 몇 줄.
- **사용자가 잃는 것**: `/admin/requests`에서 경호목록/연장요청/단축요청 탭의 건수 배지가
  안 뜬다(배치요청 탭 배지는 실 API라 정상). 목록·배정 다이얼로그 등 이 화면 본 기능은
  영향 없음.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / **바로 다음 iteration인 #8(본사
  경호목록, `GetGuardCaseList`)** 연동 시 `listSecurityCases`가 실 API로 바뀌며 해소.

#### (함께 수정) 미연동 화면에서 강제 로그아웃되던 문제 — `client.ts` single-flight refresh
- **증상**: 실백엔드 계정으로 로그인 후 아직 mock인 화면(`/admin/security-cases` 등)에
  들어가면 **바로 로그인 화면으로 튕겼다.** 원인은 전환기 401 자체가 아니라 `apiFetch`의
  refresh 처리: 한 화면이 여러 요청을 동시에 던지면 전부 401 → 각자 `RefreshToken` 호출
  → 실백엔드 `RefreshToken`은 **1회용**(호출 시 refreshToken 회전)이라 두 번째부터
  이미 무효가 된 토큰으로 호출 → 401 → `logout()`.
- **조치**: `features/auth/api/client.ts`의 `refreshAccessToken`을 single-flight로 —
  진행 중인 refresh가 있으면 새로 만들지 않고 그 promise를 공유한다. 동시에 들어온
  N개의 401이 `RefreshToken` 1회로 합쳐진다. (버그가 전환기에만 드러났을 뿐, 실
  백엔드에서 동시 요청이 몰릴 때 언제든 날 수 있던 문제라 근본 수정.)
- **남는 것**: 로그아웃은 안 되지만 mock 화면의 401 콘솔 노이즈는 그대로 — 위 항목대로
  화면이 순차 연동되며 사라진다.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 근본 수정 완료. `client.test.ts`에
  동시 401 → refresh 1회 회귀 테스트 추가.

## [본사] 경호목록 (`/admin/security-cases`)

### GET /api/v1/GuardCase/Stec/W/GetGuardCaseList — 목록 조회

#### 지역청(`jurisdiction`) 열·필터 빈 값
- **왜 제외했는지**: 응답에 지역청(경찰서 상위 조직)이 없다 — `groupName`(경찰서)만 온다.
  경찰서 경호목록(`GetDeployList`)과 같은 상황.
- **사용자가 잃는 것**: "지역청" 필터 드롭다운이 "지역청 전체" 하나만 남아 사실상 무력화.
  지역청 단위로 경호건을 좁혀 볼 수 없다(경찰서 필터는 정상).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 응답에 상위 조직명(예: `parentGroupName`)
  추가 요청 시 — 그룹 B 섹션 일괄 요청 후보(`GetDeployList`와 묶어서).

#### 담당자 소속 본부 열 "-" 고정
- **왜 제외했는지**: `GetGuardCaseList`는 담당자 이름(`userName`)만 주고 담당자 id·소속
  본부는 안 준다. 본부 소속 구조화 저장이 없어(issues.md #1) 이름으로 조인할 곳도 없다.
- **사용자가 잃는 것**: 경호목록 테이블의 "본부" 열이 전부 "-". 담당자 열엔 이름이 뜨지만
  그 이름이 실서버 데이터상 "HS2본부"처럼 본부명 같은 자유텍스트일 수 있다(계정 `userName`
  값 그대로).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / issues #1 반영(본부 FK) + 응답에
  담당자 소속 본부 포함 시.

#### 담당자 필터가 id 아닌 이름 문자열 기준
- **왜 제외했는지**: 담당자 id가 응답에 없어 이름(`userName`)으로 필터한다. 동명이인이
  있으면 구분 못 하고, 담당자 목록(`GetStecUserList`)과 조인하지 않는다.
- **사용자가 잃는 것**: 실사용상 거의 없음(본부관리자 수가 적고 이름 중복 가능성 낮음).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 응답에 담당자 id(`userSeq`) 포함 시.

#### 서버 페이지네이션을 클라이언트에서 전체 순회
- **왜 제외했는지**: `GetGuardCaseList`는 `pageNumber`/`pageSize`(1~100) 페이지네이션이
  있는데 화면엔 페이지네이션 UI가 없다(필터·검색이 전부 클라이언트). `pageSize=100`으로
  `meta.totalPages`까지 순회해 이어붙인 뒤 클라이언트에서 필터한다(방어적으로 50페이지
  = 5000건 상한). 경찰서 경호목록·URL 쿼리 필터 계획과 같은 방향.
- **사용자가 잃는 것**: 없음(현재 데이터량에선 1페이지). 활성 경호건이 5000건을 넘으면
  초과분이 안 보인다.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 목록 화면에 서버 페이지네이션 +
  서버측 필터(상태/경찰서/담당자/검색) 도입 시(URL 쿼리 필터 계획과 함께).

#### 배정 직후 경호기간 "-" 표시
- **왜 제외했는지**: 제외가 아니라 정상 처리 — 배정 상태 건은 `startDate`/`endDate`가
  `null`이다(경호계획 등록(#9) 전까지 배치요구서 기간과 별개로 비어 있음). `formatDate`가
  빈 값이면 "-"를 반환하도록 가드.
- **사용자가 잃는 것**: 없음(정확한 표시). 경호계획 등록 후 채워진다.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 해소 불필요.

#### (제거) `listCaseAssignees` + `GET /api/managers` mock 핸들러
- **왜**: 이번 연동으로 경호목록이 담당자 id 조인을 안 하게 되면서 `listCaseAssignees`
  (7번에서 회귀 차단용으로 분리해뒀던 mock 함수)와 `mocks/handlers/managers.ts`가
  완전히 죽은 코드가 됐다 — 삭제.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 해소 불필요.

#### 아직 mock인 다른 본사 화면의 401 폭풍은 그대로
- **왜 제외했는지**: 전환기 상태. `/admin/managers`(관리자 계정, matrix 11번)와
  `/admin/period-requests/*`(연장/단축, 10번)는 아직 mock(`listManagerAssignedCases`/
  `listPeriodRequests` → `GET /api/security-cases`)이라, 실백엔드 계정으로 열면 mock이
  실 JWT를 거부해 401 → React Query retry×3 → 매 retry마다 `RefreshToken` 재호출
  (기본 `retry: 3` + 401 시 refresh). 화면이 로딩/에러에 머문다.
- **조치(이번 iteration)**: 8번이 `listSecurityCases`를 실 API로 바꾸면서, 그 함수를
  같이 쓰던 10·11번을 각각 `listPeriodRequests`(mock 유지)·`listManagerAssignedCases`
  (mock 유지, 쿼리키 `['manager-assigned-cases']`)로 분리 — 8번 화면은 mock 쿼리가 0이
  돼 폭풍이 사라졌다. 10·11번의 폭풍은 각 화면 연동에서 해소.
- **사용자가 잃는 것**: `/admin/managers`·`/admin/period-requests/*`를 실백엔드 계정으로
  열면 여전히 목록이 안 뜬다(그 화면들이 아직 mock이라 실백엔드엔 데이터도 없음).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / matrix 10·11번 연동 시. (전역
  `QueryClient` retry 정책으로 폭풍 자체를 막는 방어책은 사용자와 별도 논의 예정.)

## [본사] 경호 상세 (`/admin/security-cases/:id`)

### PUT/PATCH GuardCase/Stec/W/AddGuardCaseInfo·PatchCaseInfo — 경호계획 등록/수정

#### 5개 조치 섹션(안전조치/긴급응급/잠정/긴급임시/임시) → `summary1~5` 손실 매핑
- **왜 제외했는지**: 폼은 섹션당 **다중선택 배열 + {시작일, 종료일} 기간**인데 백엔드는
  섹션당 **단일 문자열(`summaryN`) + 단일 문자열(`summaryNDate`)** 2개뿐. 사용자 결정
  (2026-09-04): 폼은 그대로 두고, 저장 시 선택 항목을 `", "`로 조인해 `summaryN`,
  기간을 `"시작일 ~ 종료일"` 문자열로 `summaryNDate`에 넣는다. 읽을 때 역파싱
  (`", "` split / `" ~ "` split). 섹션↔번호 대응: 1=안전조치, 2=긴급응급, 3=잠정,
  4=긴급임시, 5=임시(폼 7~11번 순서).
- **사용자가 잃는 것**: 실사용상 없음 — 실측(caseSeq 46)에서 `"맞춤형 순찰, CCTV"` /
  `"2026-09-10 ~ 2026-09-20"`가 정확히 왕복됨. 다만 다른 클라이언트가 `summaryN`에
  칩 선택지 밖 자유텍스트를 넣으면 프론트 칩이 매칭 안 돼 그 항목이 안 보인다. 저장
  포맷 규칙이 프론트에만 있다(백엔드 계약 아님).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / issues #11(summary 필드 구조화 =
  항목 배열 + 기간 2필드) 반영 시.

#### 대표근무자(`isDefault`) 여부가 조회에 없음 → 이름으로 추정
- **왜 제외했는지**: `GetGuardCaseDetail.guardUserList`는 대표근무자만, 그것도 이름
  (`guardName`)만 준다. `GetCaseGuardList`는 배정된 근무자 전체(`isAssigned`)를 주지만
  대표 플래그가 없다. → 배정 근무자 중 이름이 `guardUserList`에 있으면 대표로 본다.
- **사용자가 잃는 것**: 동명이인이 배정돼 있고 한 명만 대표면 둘 다 대표로 표시될 수
  있다(실사용 가능성 낮음). 경호계획 수정 화면 재진입 시 대표 체크가 이 추정값으로
  prefill된다 — 수정 없이 저장하면 추정이 그대로 굳는다.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / `GetCaseGuardList`(또는
  `guardUserList`)에 `isRepresentative`/`guardSeq` 포함 시 — issues #12.

#### 경호풀(기본 근무자) 명단을 `GetCaseGuardList.isAssigned`로 대체
- **왜 제외했는지**: 경호계획에 등록한 근무자 명단(`AddGuardCaseInfoDto.guards`)을 그대로
  돌려주는 조회가 없다. `toBaseInfo`가 `GetCaseGuardList`에서 `isAssigned:true`인 근무자를
  `baseInfo.defaultWorkers`로 쓴다. 실측상 `isAssigned`는 경호계획 `guards`로 등록된
  근무자와 일치하는 것으로 보인다(caseSeq 29: 풀 {13} = `isAssigned` {13}).
- **사용자가 잃는 것**: 현재까진 없음. 단 `isAssigned`의 의미가 "경호계획 풀"이 아니라
  "이 건에 어떤 형태로든 배정됨"으로 넓어지면(예: 스케줄 그룹 배정만으로 `isAssigned`가
  서면) "기본정보 수정" 저장 시 그 근무자가 풀에 편입될 수 있다. 현재 "수정" 저장은
  화면에 보이는 근무자 목록을 그대로 `guards`로 재전송한다.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / `GetGuardCaseDetail`에 등록된 풀
  명단(guardSeq 배열)을 반환하거나 issues #12에 함께 요청.

### PUT GuardCase/Stec/W/PatchScheduleGroup — 근무조 저장

#### 그룹 메모(특이사항, `ScheduleGroup.note`)가 재조회 시 안 보임
- **왜 제외했는지**: 쓰기 DTO엔 `memo`가 있어 저장은 되지만(실측 200), `GetCaseSchedule`
  응답에 그룹 메모 필드가 없다. 화면4 배치장소 `GetDeployDetail` null과 같은 패턴
  (쓰기만 되고 읽기 없음).
- **사용자가 잃는 것**: 근무조에 특이사항을 입력해 저장해도, 상세를 다시 열면 "특이사항 ·
  없음"으로 보인다.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / `GetCaseSchedule`의 그룹 항목에
  `memo` 포함 시 — issues #12.

### GET GuardCase/Stec/W/GetGuardCaseDetail — 헤더/기본정보

#### 접수번호·요구자·사건개요·등록일 등 배치요구서 원본 필드 빈 값
- **왜 제외했는지**: 이 응답은 경호계획(baseInfo) 뷰라 배치요구서 원본
  (요구자 부서/직급/성명, 사건개요, 참고사항, 문서 등록일, 대상자 성별/생년월일/직업)이
  없다. 본사가 배치요구서 전문을 보는 API 자체가 없다(issues #7 보강, 사용자 지시로 "놔둠").
- **사용자가 잃는 것**: `DispatchRequestViewDialog`("배치요구서 원본보기")가 관리번호·
  경찰서 정도만 표시하고 나머지는 "-". `AttachmentsSection`의 "배치요구서 등록일 · "이 빈 값.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 본사용 배치요구서 원본 조회 API 신설 시
  (issues #7).

#### ~~`crimeType` 레거시 영문값~~ → 해소(2026-09-09, enum 전환)
- **경위**: 옛 데이터(caseSeq 29 등)는 `crimeType`이 `"stalking"` 같은 영문.
- **처리**: `GetGuardCaseDetail` 매퍼도 `crimeCodeToCaseType`으로 전환 — 영문 enum·레거시
  한글 모두 라벨로 변환. 위 "crimeType enum 전환" 항목과 동일 건.

### (없는 API) 본사 경호계획 등록 폼 — 프리필/등록 전용 조회 API 부재

#### 등록 폼이 상세 조회 API(`GetGuardCaseDetail` 등 5종)를 그대로 재사용
- **왜 제외하는지**: 경호계획 등록(`BaseInfoForm`)에 들어가도 별도 호출이 없다 — 페이지
  진입 시 받은 `getSecurityCase` 결과(상세 조회용 5종 GET)를 폼이 그대로 쓴다. 경찰
  배치요구서 수정(화면5)은 전용 프리필 EP(`GET Deploy/Police/W/GetDeployDetailUpdate`)를
  받았지만, 본사 경호계획 등록에는 그 대칭 API가 없다.
- **사용자가 잃는 것**:
  - **배치기간(폼 2번 섹션)이 빈 값** — 등록(`AddGuardCaseInfo`)에 `startDt`/`endDt`가
    필수인데 `GetGuardCaseDetail`이 배정·미등록 상태에선 기간을 null로 준다 → 배정 건에서
    경호계획 "등록" 자체가 실동작 불가(issues #10, blockers). "수정"(`PatchCaseInfo`,
    기간 불필요)은 정상.
  - **"배치요구서 원본보기"(`DispatchRequestViewDialog`)가 사실상 빈 값** — 이 다이얼로그는
    **API를 아예 호출하지 않고** props(`securityCase`)만 렌더한다. 요구자 3필드·사건개요·
    참고사항·성별/생년월일/직업·문서 등록일이 `GetGuardCaseDetail`에 없어 전부 "-".
    (위 "#### 접수번호·요구자… 빈 값" 항목과 같은 뿌리.)
- **사용자 제안 검증(2026-09-04)**: `GetDeployDetailUpdate`를 본사에서 쓰면 되지 않냐 →
  **`StecM1`(운영관리자)·`232727`(시스템관리자) 토큰 둘 다 HTTP 403**. `Deploy/Police/W/*`
  태그 전체가 경찰 토큰 전용이라 어떤 본사 역할로도 호출 불가(`GetDeployDetail`,
  `GetDeployGuardSchedule`도 동일). → 프론트에서 해결 불가, 백엔드 신설/권한확장 필요.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋 = 9번) / 아래 중 하나로 해소 —
  (a) `GetGuardCaseDetail`/`GetGuardCaseList`가 미등록 상태에서도 배치기간
  (`periodFrom`/`periodTo`) 포함(등록 블로커만), (b) 본사용 배치요구서 원본 조회 EP 신설
  (`GuardCase/Stec/W/GetDeployRequestDetail`류 — 등록 배치기간 + 원본보기 둘 다),
  (c) `Deploy/Police/W/GetDeployDetailUpdate` 본사 토큰 허용. issues #7·#10. #12 섹션
  종료 시 일괄 요청.

### PUT SaveCaseMeeting — 사전미팅 저장

#### 근무자별 개별 시간이 미팅 전체 1구간으로 합쳐짐
- **왜 제외했는지**: `PreMeetingDialog`은 근무자마다 시작/종료 시간을 따로 받는데
  `SaveCaseMeetingDto`는 미팅 전체 1구간(`meetingStart`/`meetingEnd`) + `guardSeqs[]`뿐.
  `GetCaseMeeting`도 `guardInfo:[{guardSeq,guardName}]` — 시간은 미팅 레벨만. 사용자
  결정(2026-09-04, 조치 섹션과 동일): 폼은 그대로 두고 저장 시 가장 이른 시작 ~ 가장
  늦은 종료로 합쳐 보낸다.
- **사용자가 잃는 것**: 근무자별로 다른 시간을 입력해 저장하면, 재조회 시 전원이 같은
  구간(합쳐진 min~max)으로 보인다.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / issues #11(사전미팅 항목 — DTO에
  `guards:[{guardSeq,start,end}]` 확장) 반영 시. 아니면 폼을 단일 구간으로 단순화(백엔드
  회신에 따라).

### PUT PatchGuardPlanDoc / PatchConsentDoc / PatchDestroyDoc — 첨부 업로드

#### 파일 시그니처(매직바이트) 검사 — 임의 확장자 불가
- **왜 기록**: 제외가 아니라 정상 동작 — 서버가 실제 파일 시그니처를 검사한다(비허용 시
  400 "File signature is not allowed"). 프론트는 이 메시지를 "허용되지 않는 파일
  형식입니다. PDF 또는 이미지 파일을 올려주세요."로 바꿔 노출.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 해소 불필요.

#### 파기확인서는 경호중·경호완료 상태에서만 등록 가능
- **왜 기록**: `PatchDestroyDoc`는 배정 등 그 외 상태에서 409("파기확인서는 경호중·
  경호완료 상태에서만..."). 프론트는 `status`가 경호중/경호완료가 아니면 파기확인서
  업로드 행을 `disabled` + 안내 처리.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 해소 불필요(설계상 의도된 제약).

#### `destoryDocDownloadYn`(GetGuardCaseDetail)의 의미
- **왜 기록**: 파기확인서를 업로드해도 이 플래그는 `false` 유지(실측). 파일 존재 여부는
  `GetCaseDoc.guardDeployDocDto`로 판정한다. `destoryDocDownloadYn`은 "피전이 파기확인서를
  다운로드했는지"(종결 전제 조건)로 추정 — 종결 흐름 검증(화면4/이력) 시 확정.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 종결 흐름 재검증 시 확정.

#### `GetCaseDoc.guardDeployDocDto`에 `filePath`가 없음
- **왜 제외**: `caseInfoDto`·`guardAgreementDtos[]`는 `filePath`를 주는데 파기확인서
  (`guardDeployDocDto`)는 `{docSeq, fileName, fileExt}`만. 프론트는 파일명 표시 +
  `GetDestroyDocDownload`로 받으므로 영향 없음.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 필요 시 응답에 `filePath` 추가 요청.

### GET GetExtendRequestList / GetShortenRequestList — 연장/단축 요청 목록

#### 항목에 "신청 시각" 필드가 없어 "요청일" 컬럼을 `createDt`로 대체
- **왜 제외**: 응답 항목에 연장/단축을 *언제 신청했는지* 타임스탬프가 없다. `createDt`는
  배치요구서(`AddDeployRequest`) 최초 생성일이라 신청일과 다르다. 화면의 "요청일" 컬럼은
  `pendingPeriodRequest.requestedAt`을 표시하는데, 여기에 `createDt`를 넣어 대신 보여준다.
- **사용자가 잃는 것**: "요청일"이 실제 연장/단축 신청일이 아니라 배치요구서 접수일로
  보인다(대개 더 이른 날짜). 승인 판단에는 영향 없음(요청 종료일은 정확).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 응답 항목에 신청일 필드 추가 요청
  시(B-2 일괄 요청에 포함 검토).

#### 거부(reject) 기능 UI 차단
- **왜 기록**: 제외가 아니라 의도된 비활성 — 연장/단축 "거부"에 대응하는 백엔드 EP가
  없다(issues.md #2). `PeriodRequestListPage`의 ⋮ 메뉴에서 "거부"를 `disabled` +
  title 안내로 두고, `rejectPeriodRequest`는 throw로 유지(호출 안 됨).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / issues #2에 거부 EP 신설 요청
  (B-2 섹션 종료 시 일괄) → 회신 오면 연결.

### GET User/Stec/W/GetStecUserList — 관리자 계정 관리 (matrix 11번)

#### "본부" 열이 항상 "-"
- **왜 제외**: 응답에 관리자의 소속 본부를 나타내는 필드가 없다(`groupSeq`/`groupName`
  전부 `null`, 본부명은 `userName`에 자유텍스트로 섞임 — "HS2본부" 등). issues.md #1.
- **사용자가 잃는 것**: 목록·모바일 카드의 "본부" 열/접미사가 전부 "-". 본부별 필터도 불가.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / issues #1(본부 소속 구조화) 반영 시.
  B-2 섹션 종료 시 일괄 재요청.

#### "배정건수" 열 · "담당경호" 다이얼로그 — 담당자명으로 매칭
- **왜 제외**: `GetGuardCaseList` 행에 담당자 식별자가 없다(`userSeq`/`managerName`
  필드는 스키마에 있으나 백엔드가 `null`로 내려줌 — issues.md #8 `deptName`과 같은 성격).
  담당자명(`userName`, 예 "HS2본부")은 `GetStecUserList`의 `userName`과 같은 값이라,
  `SecurityCase.assigneeName === ManagerAccount.name` 문자열 매칭으로 건수/목록을 계산한다.
  진행중(배정·경호중·경호완료) 건만 반환하므로 종결/취소 제외는 자동으로 맞다.
- **사용자가 잃는 것**: 관리자 `userName`이 겹치는 동명이인이 생기면 두 사람의 배정건이
  섞여 보인다(현재 실서버 계정은 전부 유니크). 본부관리자 토큰으로는 서버가 본인 배정
  건만 내려줘 다른 관리자 건수가 0으로 보임 → matrix #12 스코프 재검증 대상.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / `GetGuardCaseList` 행에 담당자
  `userSeq` 채워주면 id 매칭으로 전환(issues #1에 함께 기록, B-2 일괄 요청).

#### 연락처(phone) — "대표번호" 의미 / `null`로는 못 지움
- **왜 기록**: `USER_INFO.PHONE`은 스키마상 "대표번호" 용도라(issues.md #1) 정보수정의
  "연락처"가 담당자 개인 번호라는 화면 전제와 어긋난다 — 화면 문구는 그대로 두고 값만
  왕복. 또한 `UpdateUser`는 `null` 필드를 "변경 안 함"으로 무시하므로, 빈 연락처는
  `""`(빈 문자열)로 전송해야 지워진다(`updateManagerAccountInfo` 반영, 실측 확인).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / issues #1(개인정보 컬럼 분리) 논의 시.

### GET History/Stec/W/GetHistoryList — [본사] 이력 조회 (matrix 13번)

#### 목록 행 필드가 축소됨 (대상자·담당자·사건유형 등 없음)
- **왜 제외**: 응답 항목이 `{caseSeq, mgmtNo, groupName, parentGroupName, startDt, endDt,
  totalMin, statusName, remark}`뿐이다. 화면 목록이 실제로 그리는 값(관리번호·지역청·
  경찰서·경호기간·총경호시간·최종상태)은 다 채워지므로 목록 표시엔 문제 없음.
- **사용자가 잃는 것**: 없음(목록엔 원래 이 필드들만 나온다). 담당자·대상자 등은 상세에서
  볼 값인데 상세 EP 자체가 없다(issues #14).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 상세 EP 신설 시 자연 해소.

#### `status` / `searchKey` 파라미터 대신 클라이언트 필터 유지
- **왜 제외**: `status`는 정수 코드인데 종결/취소 코드 매핑을 확정할 실데이터(종결 건)가
  아직 없다. `searchKey`는 관리번호 부분일치가 아니라 다른 매칭으로 동작(`26-09`로 5건 중
  2건만). 목록량이 작아(전국 5건) 화면의 기존 클라이언트 필터로 충분.
- **사용자가 잃는 것**: 없음(동작 동일). 목록이 커지면 서버 페이지네이션/필터로 전환 필요
  (URL 쿼리 필터 후속 작업과 함께).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 종결 데이터 확보 후 재검토.

#### 종결 사유(`remark`)를 코드값 그대로 표시
- **왜 제외**: 종결 건에서 `remark`는 종결 코드(END_REASON)다. 프론트 `ClosureReason`은
  한글 라벨 enum이라 코드→라벨 매핑이 필요하나 실데이터가 없어 미확정. 일단 `remark`
  원문을 `closureReason`에 그대로 담는다(레거시 `crimeType` 영문값과 같은 처리). 취소 건의
  `remark`(취소 사유)는 자유문자라 그대로 표시하면 정확.
- **사용자가 잃는 것**: 종결 건 상세가 생기면 사유가 코드로 보일 수 있음(상세 EP 없어 현재
  영향 없음).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 종결 데이터 + 상세 EP 확보 후.

### GET History/Police/W/GetHistoryList · GetHistoryDetail — [경찰서] 이력 조회 (matrix 1번)

#### 상세에 사건유형·5개 조치·배치장소가 없음
- **왜 제외**: `GetHistoryDetail` 응답에 `caseType`(사건유형), 안전/긴급응급/잠정/긴급임시/
  임시조치와 각 적용기간, 배치장소가 없다. 화면(`police/pages/HistoryDetailPage`)엔 칸이 있음.
  → 사건유형은 `'사건미접수'` 플레이스홀더로, 5개 조치는 "-"로 표시(배치장소는 이 화면이
  원래 안 보여줌). 취소 건은 원래 경호계획이 없던 상태라 무관, 종결 건은 실제 갭.
- **사용자가 잃는 것**: 종결 이력 상세에서 어떤 조치가 적용됐는지·사건유형을 못 봄
  (현재 실서버에 종결 건 0개라 영향 없음).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 종결 데이터 확보 후 재확인, 갭이 남으면
  issues 신규(본사 `GetGuardCaseDetail`엔 `summary1~5`가 있으므로 경찰용에도 요청 — #13(경찰
  상세 조치)과 같은 성격) → 그룹 C 종료 시 일괄.

#### `status` / `searchKey` 파라미터 대신 클라이언트 필터 유지
- **왜 제외**: `status`는 정수 코드인데 종결 코드 매핑 미확정(종결 데이터 없음). `searchKey`는
  경호코드는 매칭되나 동작 범위 불확실. 경찰서 1개 이력은 소량이라 화면의 기존 클라이언트
  필터로 충분.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 이력이 많아지면 서버 필터/페이지네이션
  전환(URL 쿼리 필터 후속과 함께).

#### 접수단계 취소 건은 이력에 안 나타남
- **왜 기록**: 제외가 아니라 설계 그대로 — 접수단계(배정 전) 취소는 DB에서 완전 삭제
  (hard-delete)라 이력에 흔적이 없다. 이력엔 배정 이후 취소(`경호취소`)만 나온다.
- **사용자가 잃는 것**: 없음(설계 의도).

### [본청]/[지역청] 이력 조회 — mock 유지 (matrix 5번, #15 부분완료 △)

#### 본청/지역청 이력 목록·상세·진행중 상세를 이번엔 전환하지 않음
- **왜 제외(보류)**: 착수 프로브(2026-09-08)에서 `GetHistoryList`·`Deploy/Police/GetDeployList`가
  경찰서(leaf) `groupSeq` 단위라 본청/지역청이 관할 전체를 한 번에 못 받고(캐스케이드 없음),
  `GetHistoryList`는 진행중 건을 안 준다. `Login/W/GetGroupTree`로 leaf 팬아웃은 가능하나
  임시방편이라 미채택(사용자 결정). 경찰서 경로(#14)는 실 API 그대로, 본청/지역청 경로만
  mock(`listSecurityCaseHistory`/`getSecurityCaseHistoryDetail`) 유지.
- **사용자가 잃는 것**: 없음 — 화면 동작은 mock 데이터로 승인된 그대로. 실서버 데이터로는
  본청/지역청 계정이 이력 화면에서 아직 실데이터를 못 봄(백엔드 회신 전까지).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋 — 문서만) / 백엔드가 부모 groupSeq
  캐스케이드 또는 통합 조회 EP 제공 시 전환(`requests/2026-09-08-이력-C.md`, issues #15).
  진행중 상세(`GetDeployDetail`)·상세(`GetHistoryDetail`) EP는 본청/지역청 토큰에 이미
  200이라, 목록만 전환되면 상세는 코드 변경 최소로 따라온다.

### User/Police/W/Guest* — [경찰서] 게스트 계정 관리 (matrix 그룹 D #16)

#### 중지된 게스트 계정(`useYn=false`)을 목록에서 숨김
- **왜 제외**: `GetGuestUserList`는 중지된 계정도 `useYn=false`로 함께 내려주지만, 우리
  화면 설계엔 "게스트 계정 중지" 기능이 없다(중지는 안 하기로 결정, 2026-09-08 사용자
  확인). `listGuestAccounts`가 `useYn === false` 행을 걸러낸다.
- **사용자가 잃는 것**: 없음 — 화면에서 중지를 만들 수 없으므로 정상 운영에선 `useYn=false`
  행이 생기지 않는다(스웨거/DB에만 있는 상태 축).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 백엔드 스키마가 이 화면 설계보다 넓은
  것 → **그룹 D 마무리(#17) 시 전달사항**으로 정리(고쳐달라가 아니라 "우리 화면엔 중지가
  없음" 공유).

#### 게스트 표시명(`userName`)을 화면에 안 씀 / 발급 시 고정값 전송
- **왜 제외**: `AddGuestUser.name`이 필수(minLength 1)라 게스트 표시명을 받게 돼 있으나,
  화면엔 표시명 입력칸이 없고(아이디는 서버 자동 생성) 목록도 `loginId`만 쓴다. 발급 시
  `name`에 고정값 `"게스트"`를 보낸다(2026-09-08 사용자 결정 — A안).
- **사용자가 잃는 것**: 게스트별 표시명 구분 불가. 실제 식별은 `loginId` + 조회가능
  경호건으로 충분.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 표시명이 필요해지면 발급 다이얼로그에
  "이름" 입력 + 목록 열 추가(승인 스크린샷 변경 동반).

#### GetGuestCaseDetail 응답에 관리번호 라벨이 없음 → 프론트 머지
- **왜 기록**: 제외가 아니라 처리 방식 — `GetGuestCaseDetail`은 `{caseSeq,guardCode,isAccess}`만
  주고 `mgmtNo`(접수번호)가 없다. 수정 다이얼로그가 `GetGuestCaseList`(발급 후보, 같은
  집합)를 함께 불러 `caseSeq`로 머지해 라벨을 얻는다. 후보에 없는데 부여된 건(엣지)은
  `guardCode`만으로 렌더.
- **사용자가 잃는 것**: 없음(정상 케이스에선 두 후보 집합이 동일).

### Deploy/Police/W/GetDeployDetail — [경찰서] 게스트 상세 조회권 차단 미검증 (matrix 2번 #17)

#### 조회권 없는 건 상세 접근 시 차단되는지 양성 테스트 못 함
- **왜 기록**: 제외가 아니라 재검증 이월 — `GetDeployList`는 게스트 토큰에서 `groupSeq`를
  무시하고 `GUEST_CASE_ACCESS` 스코프만 적용함을 실측했으나(조회권 건만 반환), 동래에
  게스트가 조회권 없는 *진행중* 건이 없어(활성 1건뿐, 그것도 게스트가 봄) `GetDeployDetail`
  로 남의 건을 직접 조회했을 때 403/404로 막히는지는 확인 못 함.
- **사용자가 잃는 것**: 없음(추정상 막힘 — `GetDeployList` 스코프 동작과 같은 컨트롤러).
  UI는 조회권 건만 목록에 뜨므로 정상 흐름에선 남의 건 링크 자체가 없다.
- **연동 커밋 / 해소 예정**: (#17 커밋) / 동래에 게스트 미부여 활성 건이 생기면 재검증.
  그룹 D 요청서(`requests/2026-09-08-게스트-D.md`)에 "게스트 상세 스코프 서버 보장 확인"
  논의 항목으로 포함.


---
---

# PART 4 — 착수 전 갭 분석  (구 backend-integration-analysis.md · 참고)

> 초기 Swagger/DB 스캔. 지금은 화면별 프로브(`../../.claude/loop-backend/guides/PROBE.md`)가
> 이 역할을 대체한다. 살아있는 항목은 PART 1 또는 `matrix.md`로 옮겼고, 여기는 배경 참고용.


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
6. ~~**`Deploy/Police/GetDeployList`의 스코프**~~ → **실측으로 해소(2026-09-01, matrix 2번
   연동)**: `groupSeq`가 필수 파라미터이며 서버가 토큰 소속과 대조해 권한 밖 `groupSeq`는
   403으로 막는다 — 스코프는 서버가 강제. 상태 커버리지는 응답 항목이 `statusName`(표시용
   한글 문자열)을 그대로 내려주는 구조로, 실측 시점 데이터가 "접수" 1건뿐이라 배정 이후
   상태까지 다 포함되는지는 12·16번 이후 재검증 예정. 응답 샘플:
   `docs/backend-integration-responses/Deploy-Police-GetDeployList.md`.
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
