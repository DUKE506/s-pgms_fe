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

#### 배치장소: `deploymentPlace`에 주거지만 전송 (직장지 / 기타1 / 기타2 제외) — 임시(D-2)
- **왜 제외했는지**: 실제 API가 배치장소를 `deploymentPlace` 단일 문자열 1개로만 받음.
  폼은 주거지/직장지/기타1/기타2 4필드. 사용자 결정(2026-09-02)으로 폼을 줄이지 않고
  백엔드에 4필드 확장을 요청(`docs/backend-integration-issues.md` #5,
  `docs/backend-integration-blockers.md`) — 반영 전까지 주거지만 전송.
- **사용자가 잃는 것**: 신규 접수 시 입력한 직장지·기타1·기타2 장소가 백엔드에 저장되지
  않음(폼 입력·검증은 그대로 동작). 화면4(상세) 연동 시 배치장소에 주거지만 채워짐.
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / issues #5의 백엔드 4필드 확장 반영 시
  `createSecurityCase` 매핑 교체.

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

#### 배치장소 4필드가 전부 빈 값 (`guardHomeLoc`/`guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2`)
- **왜 제외했는지**: 응답 스키마엔 4필드가 있으나(→ `location.*`로 매핑함), #3의 D-2
  임시처리로 생성 시 `deploymentPlace` 단일 필드만 보냈고 서버가 그 값을 `guardHomeLoc`
  등에 매핑하지 않아 전부 `null`로 내려온다(issues.md #5).
- **사용자가 잃는 것**: 상세 화면 "배치장소" 4칸이 전부 "-"로 표시(#3에서 이미 예고된 상태).
- **연동 커밋 / 해소 예정**: (이번 iteration 커밋) / issues #5의 백엔드 4필드 확장 반영 시.

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
