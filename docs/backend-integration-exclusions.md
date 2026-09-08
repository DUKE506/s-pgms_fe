# 백엔드 연동 — 제외 항목 로그

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

#### `crimeType`을 라벨 문자열 그대로 전송
- **왜 제외했는지**: DB `DEPLOY_REQUEST.CRIME_TYPE` 코멘트는 "범죄유형 코드"지만 대응하는
  코드표(`BASIC_CODE`)가 없음. 폼은 사건유형 라벨('스토킹' 등)을 그대로 씀.
- **사용자가 잃는 것**: 없음 — 화면4 연동 검증에서 `GetDeployDetail`의 `crimeType`이
  `"스토킹"` 문자열로 그대로 돌아오는 것 확인(round-trip 정상).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 해소 불필요(문자열 저장 확인됨).

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

#### 레거시 건의 `crimeType`이 영문값이라 사건유형 미선택으로 뜸
- **왜 제외하는지**: 폼이 쓰는 사건유형은 한글 라벨('스토킹' 등)인데, 백엔드에 직접
  들어간 오래된 테스트 건(예: deployReqSeq 71)은 `crimeType: "stalking"` 영문값이라
  폼 Select와 매칭이 안 된다. 우리 폼으로 생성/수정한 건은 한글이라 정상.
- **사용자가 잃는 것**: 그런 레거시 건을 수정 화면에서 열면 사건유형이 미선택 상태 —
  저장하려면 다시 골라야 한다(필수 항목).
- **연동 커밋 / 해소 예정**: (화면5 iteration 커밋) / 백엔드 사건유형 코드표(`BASIC_CODE`)가
  생기고 프론트가 코드↔라벨 매핑을 붙이면. 그전까지는 신규 건엔 영향 없어 경미.

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

#### `crimeType` 레거시 영문값
- **왜 제외했는지**: 화면4에서 이미 기록 — 옛 데이터(caseSeq 29 등)는 `crimeType`이
  `"stalking"` 같은 영문. 신규 접수분은 `"스토킹"` 정상.
- **사용자가 잃는 것**: 옛 건의 사건유형이 영문 그대로 표시.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / 백엔드 데이터 정규화 시.

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
