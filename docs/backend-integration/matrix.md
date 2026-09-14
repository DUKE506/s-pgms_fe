# 화면 × API 매트릭스 (계정권한별)

`docs/backend-integration/findings.md` PART 4(초기 스웨거/DB 갭 분석)를 화면 단위로
재가공한 작업 체크리스트입니다. `.claude/loop-backend/`가 이 문서를 순회하며 화면 단위로
연동 작업을 진행합니다. 화면 하나에 API가 여러 개 걸리는 경우 한 줄에 몰아 적지
않고 API 하나당 한 행으로 나눴습니다.

**⚠️ 표시 = mock엔 있지만 실제 백엔드 API에 없는 것.** 연동 시 반드시 짚고 넘어가야
할 항목이며, 상세 내용은 `docs/backend-integration/findings.md`에 기록합니다.

같은 화면 컴포넌트를 여러 역할이 공유하는 경우(예: 회사 쪽 경호 상세는 시스템/운영/
본부관리자가 다 씀) 화면 자체는 한 번만 상세히 적고, 역할별로는 접근 가능 여부와
권한 차이만 표시합니다.

## 권장 진행 순서 (2026-09-03, 메인 워크플로우 우선으로 재정렬)

### 큰 틀 (2026-09-03 변경)

이전(2026-09-01)엔 **계정권한 단위로 화면군을 통째로 끝내고 다음 역할로** 갔다.
그런데 배정 이후 상태를 *만들어내는* 화면(본사 배정·경호계획)이 뒤에 있어서, 앞쪽
피전 화면이 계속 "배정 후 미검증 → 나중에 재검증"으로 이월됐다(2·4번 실제로 그 상태).
이력·게스트도 종결/취소 데이터가 없어 반쪽만 검증 가능했다.

그래서 **경호건 생명주기(메인 워크플로우)를 앞으로 당기고, 그 검증까지 끝난 뒤 이력 →
게스트로** 간다(loop-screens에서 메인 흐름 화면을 앞당긴 것과 같은 논리). 그룹 안에서
화면 순서는 여전히 의존성 기준(조회를 먼저 연결해야 생성/수정 결과를 확인).

### 개발 단위 vs 백엔드 요청 단위 (2026-09-03 명시)

- **개발(연동)은 화면 단위** — 지금까지처럼 PROGRESS.md 표 한 행 = 1 iteration. 한
  섹션이 끝날 때까지 다른 섹션을 안 건드린다는 뜻이 아니다.
- **백엔드에 요청하는 건 섹션 단위** — 한 섹션(한 역할의 한 기능 영역, 예: 피전
  경호관리 = 경호목록·신규접수·상세·수정·접수취소)의 화면을 다 훑으며 쌓인
  `issues.md`(설계 변경 요청) / `exclusions.md`(제외 항목)를, **섹션이 끝나는 시점에
  한 번에 묶어서** 백엔드로 전달한다. 화면마다 찔끔찔끔 요청하지 않는다.
- **비블로킹** — 요청 후 응답을 기다리지 않고 다음 섹션 작업을 계속한다.
- **백엔드 완료분 반영은 화면 경계에서** — 백엔드가 요청분을 완료하면, 지금 붙잡은
  화면은 마무리까지 하고, **다음 화면 착수 전에** 백엔드 변경분 확인 → 코드 수정 →
  반영 → 검증 → 그 다음 화면으로. (절차 상세는 `.claude/loop-backend/TASK.md`
  "원칙 4", `.claude/loop-backend/LOOP_INSTRUCTIONS.md` 1·7단계)

### 순서

**전제 — 로그인** ✅ 연동 완료(2026-09-01). 경찰/본사 공통, 유일하게 역할·그룹보다 먼저.

#### 그룹 A — [경찰서] 피전 경호관리 섹션

2. **[경찰서] 피전 — 경찰서 경호목록** (조회) — ✅ 연동 완료(2026-09-01). **부분
   재검증(2026-09-03, 7번 배정 직후)**: 동래에 배정 건이 생기자 `GetDeployList`가
   `statusName:"배정"`(프론트 라벨과 일치), `mgmtNo:"26-09-동래경찰서 ST0002"`(경호코드
   조합)로 반환 확인. 나머지 상태(경호중/경호완료/종결/취소)는 여전히 **9번 이후 재검증**
3. **[경찰서] 피전 — 접수/배치요구서 작성** (생성) — ✅ 연동 완료(2026-09-02, **배치장소
   4필드로 보정 2026-09-03**). `POST AddDeployRequest`. 결정 3건: 요구자 3필드 분리,
   생년월일 입력(만나이 계산), 배치장소는 백엔드 수정 완료로 `guardHomeLoc`/`guardWorkLoc`/
   `guardEtcLoc1`/`guardEtcLoc2` **4필드 전송**(D-2 제거, issues #5 해결)
4. **[경찰서] 피전 — 경호 상세** (조회 + 접수취소/연장단축요청/종결) — △ **부분 연동
   (2026-09-03)**. 접수 상태 조회·접수취소는 실측 검증 완료. 배정 이후 4종(연장/단축/
   경호취소/종결)은 코드만 교체·미검증 → **9번(본사 경호 상세) 이후 재검증**. 근무 스케줄은
   `GetDeployGuardSchedule`로 재연결 완료(2026-09-09, findings #6).
   `GetDeployDetail`이 배치장소 4필드를 null로 줘서 상세의 배치장소 표시는 아직 빈 값
   (`GetDeployDetailUpdate` 전환 검토)
5. **[경찰서] 피전 — 배치요구서 수정** — ✅ 연동 완료(2026-09-03, **블로커 해소 후**).
   `GET GetDeployDetailUpdate`(prefill, 배치요구서 원본 필드 전부 반환)로 issues #7 해소 →
   + `PUT UpdateDeployRequest`(저장, `AddDeployRequestDto` 대칭 + `deployReqSeq`). 브라우저
   왕복 검증(prefill·저장·배치장소 4필드). 읽기/쓰기 필드명 비대칭(`suspectBirth`↔
   `suspectBirthDate` 등)은 프론트 매핑 처리
   → **여기까지가 피전 경호관리 섹션.** 섹션 issues #5·#6·#7은 백엔드 수정 완료로 해결
   (전달 → 반영까지 끝). `GetDeployDetail` 배치장소 표시·동의서 조회 API는 화면 9 이후
   재확인 후 필요 시 재요청

#### 그룹 B — 메인 워크플로우 (경호건 생명주기) + 그 검증

6. **[본사] 운영/시스템관리자 — 근무자 목록/등록** — ✅ 연동 완료(2026-09-03).
   `GetGuardList`/`AddGuardInfo`/`PatchGuardInfo`/`DeleteGuardInfo` 4종 실측(생성→
   수정→삭제 원상복구). 수정/삭제는 mock에 없던 기능 → 행별 `⋮` 메뉴 UI 신규. 부서
   열은 제거(`GetGuardList`가 `DEPT_NM`을 응답에 안 실어줌 — issues #8, 그룹 B 섹션
   #12에서 일괄 요청). 조인용 `listCaseJoinWorkers` 분리(#9·#13 회귀 차단)
7. **[본사] 운영/시스템관리자 — 배치요청 목록 (+본부 배정 액션)** — ✅ 연동 완료
   (2026-09-03). `GetDeployRequestList`(목록)/`GetStecUserList`(담당자 필터)/
   `AddGuardCase`(배정) 3종. deploySeq 81 실배정으로 **GuardCase 최초 생성 검증**
   (caseSeq 46, `mgmtNo`에 `ST0002` 부여). 담당자 목록에 본부(issues #1)·배정 건수
   필드 없어 표시 축소. "취소"는 대응 API 없어 메뉴 비활성화(issues #9 신규). 함께
   수정: `client.ts` refresh single-flight(동시 401 → 1회용 RefreshToken 회전으로
   강제 로그아웃되던 문제)
8. **[본사] 운영/시스템관리자 — 경호목록** (조회) — ✅ 연동 완료(2026-09-04).
   `GetGuardCaseList` 실 API 전환(응답 이중 래핑, `pageSize` 상한 100 → 클라이언트
   페이지 순회, `caseSeq`→id, `userName`→`assigneeName`). 7번 배정 건(caseSeq 46~48)
   렌더 확인. 아직 mock인 화면 회귀 차단 위해 `listManagerAssignedCases`(#11)·
   `listMockSecurityCases`(연장/단축=#10) 분리, 죽은 `listCaseAssignees` 제거
9. **[본사] 운영/시스템관리자 — 경호 상세** — △ **부분 연동(2026-09-04)**. 조회 5종
   조립 + 경호계획 수정(`PatchCaseInfo`) + 스케줄(자동생성/근무조 저장·삭제) + **사전미팅
   저장/삭제**(`SaveCaseMeeting`) + **파일 업로드 3종**(`PatchGuardPlanDoc`/`PatchConsentDoc`/
   `PatchDestroyDoc`, multipart) + 파기확인서 다운로드 연동·검증 완료.
   **미검증/블록**: 경호계획 등록(`AddGuardCaseInfo`) = 배치기간 조회 경로 없음
   (blockers, issues #10, 버튼 비활성) / 경호취소 = 본사 API 없음(issues #9, 버튼 비활성).
   손실 매핑: 조치 섹션↔`summary1~5`, 사전미팅 근무자별 시간(issues #11).
   → **섹션 B-1(#6~#9) 종료 → issues/exclusions 백엔드 일괄 요청**
   (`docs/backend-integration/requests/2026-09-04-본사-경호관리-B1.md`). 이후 **4번·2번의
   배정 이후 상태 표시를 재검증**(caseSeq 46에 경호계획+스케줄+미팅+첨부 데이터 생성됨)
10. **[본사] 운영/시스템관리자 — 연장/단축요청 목록 (+승인/거부)** — *섹션 B-2 시작.*
    △ **부분 연동 (2026-09-07)**: 조회 2종(`GetExtend/ShortenRequestList`)·승인
    (`ConfirmCasePeriod`) 실 API 전환, 탭 배지 실카운트. 거부는 EP 없어 UI 차단
    (issues #2). **테스트 데이터로만 검증** — 실백엔드에 경호중 건이 없어 배정 건에
    연장/단축 요청을 주입해 승인 왕복 실측(원복). **연장/단축 신청은 업무상 경호중 상태만
    대상**이므로, 피전이 경호상세에서 직접 신청하는 부분(#4 `requestPeriodChange`, △)이
    개발·검증돼 실제 요청 데이터가 생긴 뒤 재검증 필요 → **#4 "배정 이후 재검증"과 함께**.
11. **[본사] 운영/시스템관리자 — 관리자 계정 관리** — 8 이후(담당경호 조회가 경호목록
    API 재사용). 본부 이슈(issues #1) 방향 확정 후
12. **[본사] 본부관리자 — 스코프 재검증** (경호목록/상세/연장단축/관리자계정/근무자) —
    새 API 연동 아님. 본부관리자로 재로그인해 "본인 배정 건만" 스코프 제한이 실제로
    걸리는지 확인. (이력 스코프는 그룹 C 후 꼬리 확인)
    → **여기까지 = 메인 워크플로우 검증 완료.** **섹션 B-2(#10~#12) 종료** 시 쌓인
    issues/exclusions 백엔드 일괄 요청

#### 그룹 C — 이력 (종결·취소·연장 데이터가 실제로 생긴 뒤)

13. **[본사] 운영/시스템관리자 — 이력 조회** — 4·9의 종결·취소가 실제 터미널 데이터를
    만들어야 의미 있음
14. **[경찰서] 피전 — 이력 조회** — 접수취소 + (그룹 B 이후) 종결 데이터 확인
15. **[본청]/[지역청] — 이력 조회 + 진행중 건 상세** (조회 전용) — 4·9의 데이터 필요.
    진행중 건은 경호 상세 화면을 조회 전용으로 재사용. (+ 본부관리자 이력 스코프 꼬리 확인)
    → 이력 섹션 종료 시 issues/exclusions 백엔드 일괄 요청

#### 그룹 D — 게스트 (부가, 조회 전용 스코프)

16. **[경찰서] 피전 — 게스트 계정 관리** (목록 → 발급 → 수정 → 삭제) — ✅ **연동 완료
    (2026-09-08)**. 아이디 미리보기(issues #3)는 프론트 UX 변경으로 해소
17. **[경찰서] 게스트 — 경호목록 + 상세** (조회 전용, 16·2 이후)

#### 보류

- **대시보드류** — Phase 4 자체가 보류 중이라 순서에서 제외

이 순서는 `.claude/loop-backend/PROGRESS.md`의 표 순서와 그대로 맞춰뒀습니다 — 그
문서의 "다음 대상"이 곧 이 순서입니다.

---

## 1. [경찰서] 피전

#### 경찰서 경호목록 (`/security-cases`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listSecurityCases` | `GET Deploy/Police/W/GetDeployList` | ✅ 연동 완료(2026-09-01). `groupSeq`(필수)는 로그인 시 `GetMyProfile`로 받아 세션에 저장한 값 사용, 권한 밖 `groupSeq`는 서버가 403으로 막음(analysis.md 4-6 스코프 우려 해소). status/페이지네이션 파라미터 없음 — 화면이 전량 로드 후 클라이언트 필터라 무관. `mgmtNo`는 서버 조합 완성형("… 접수" / "… ST###")이라 마지막 공백에서 잘라 `formatManagementNumber`로 재조합. **배정 이후 상태 문자열은 데이터 없어 미검증 → 그룹 B(#9 본사 경호 상세) 이후 재검증**(exclusions.md). **2026-09-11**: `remainDays`(당시 미사용 필드)를 경호중 임박 하이라이트("D-{n}" 배지 + 빨간 배경, remainDays≤2)에 사용하도록 추가 연동. 응답 샘플: `docs/backend-integration/responses/Deploy-Police-GetDeployList.md` |

#### 접수/배치요구서 작성 (`/security-cases/new`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 접수 등록 | `createSecurityCase` | `POST Deploy/Police/W/AddDeployRequest` | ✅ 연동 완료(2026-09-02, **배치장소 4필드 보정 2026-09-03**, **사건유형 enum 2026-09-09**). 성공 응답 `{message,data:true,code}` — 생성 id 안 돌려줌. 폼 변경: 요구자 3필드 분리, 생년월일 입력. 배치장소는 `guardHomeLoc`/`guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2` **4필드 전송**(공유 `toDeployRequestDto`, issues #5 해결). 사건유형은 `caseTypeToCrimeCode`로 enum(`stalking` 등) 전송(`shared/lib/crimeType.ts`, findings "crimeType 라벨 전송" 해소). 응답 샘플: `Deploy-Police-AddDeployRequest.md` |

#### 경호 상세 (`/security-cases/:id`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 조회 | `getSecurityCase` | `GET Deploy/Police/W/GetDeployDetail` (배정 이후는 `GetGuardCaseDetail` 분기 예정) | △ 연동(2026-09-03), **접수 상태만 실측**. 접수단계 응답: `startDt`/`endDt` null(기간은 `periodFrom`/`periodTo`). 배치장소 4필드는 저장돼 있어도 **이 응답은 항상 null**(`GetDeployDetailUpdate`만 실제 값 반환 — 화면4 배치장소 표시는 빈 값, exclusions). 성별·생년월일·직업·사건개요·참고사항 없음. `crimeType`은 `crimeCodeToCaseType`으로 변환(2026-09-09 enum 전환). 배정 이후 `GetGuardCaseDetail` 분기·`caseSeq` 확보는 그룹 B(#9). 응답 샘플: `Deploy-Police-GetDeployDetail.md` |
| 접수취소 | `cancelPendingCase` | `POST CancelGuardCase` | ✅ 연동+검증 완료(2026-09-03). 성공 `{data:true}` + 하드 삭제, 실패 시 400 `{data:false}`. 응답 샘플: `Deploy-Police-CancelGuardCase.md` |
| 경호취소 | `cancelAssignedCase` | `POST CancelGuardCase` | △ 코드만 교체, **실왕복 미검**(되돌릴 수 없음). 피전 경호취소는 `Deploy/Police/W/CancelGuardCase {deployReqSeq, reason}` |
| 연장/단축 요청 | `requestPeriodChange` | `PATCH ExtendDeployPeriod` / `ShortenDeployPeriod` | △ 코드만 교체, **미검증** — 배정 이후 상태 필요, 그룹 B(#9 본사 경호 상세) 이후 재검증 |
| 종결 | `closeCase` | `POST Deploy/Police/W/CloseGuardCase {deploySeq, endReason}` | ✅ **연동·검증 완료(2026-09-09 최초 종결 / 2026-09-10 키 변경 재확인)**. **2026-09-10**: DTO 키 `caseSeq`→`deploySeq`(배치요구서 PK = 라우트 id) → `resolveCaseSeq` 우회 제거, `{deploySeq,endReason}` 직접 전송(findings #16 🟢). 선결조건: 파기확인서 다운로드로 `DESTROY_DOC_DOWNLOAD_YN` 켜야 함(안 받고 종결 → 409) → `canClose`에 `destructionCertDownloaded` 포함. 종결 시 배치요구서·문서·배치장소가 서버에서 파기됨(END-007) |
| 근무 스케줄 / 근무자 표시 | `getDeployGuardSchedule`(신규, `securityCaseDetail.ts`) | `GET Deploy/Police/W/GetDeployGuardSchedule?deployReqSeq=` | ✅ 연동 완료(**2026-09-09**, findings #6 근무일정 파트). 평면 배열 `[{ dates, guardSchedule:[{guardSeq,name,phone,deptName,isWork}] }]` — 근무자 이름·연락처 인라인(피전은 근무자 마스터 접근 불가). 근무 시각은 응답에 없어 `baseInfo.workHours` 공통 적용. `SecurityCaseDetailPage`의 `workers: never[] = []` 제거 → `useQuery`로 병합, `enabled = status !== '접수'`. 브라우저 검증(SPoliceM5·SPoliceM1 `/security-cases/90`). 응답 샘플 `Deploy-Police-GetDeployGuardSchedule.md`. 근무자별 동의서 조회(요청 3)는 여전히 전용 GET 미확인 |
| 경호계획서·동의서 다운로드 | `downloadFileByPath`(`shared/lib/download.ts`) | `GET /files/{docPath}` (전용 API 없음) | ✅ 연동(**2026-09-10**, findings #18). `GetDeployDetail.docGuardDetail.docPath`(경호계획서 `{docSeq,docType,docPath,fileName,fileExt}`)·`docAgreeDetail[].docPath`(동의서). 정적 파일 — `application/pdf`, 인증 불필요, `Content-Disposition` 없어 blob 저장. `DocumentsCard`/`ConsentDocsCard`의 `onClick: () => {}` → 실제 다운로드. 브라우저 검증(SPoliceM5 `/security-cases/93` — `/files/…` 200). 동의서는 실데이터 없어 shape 재검증 이월 |

#### 배치요구서 수정 (`/security-cases/:id/edit`) — ✅ 연동 완료(2026-09-03)

블로커였던 prefill 소스가 해결됐다: `GET Deploy/Police/W/GetDeployDetailUpdate`가 배치요구서
원본 필드(성별·생년월일·직업·사건개요·참고사항·배치장소 4필드 + 요구자/수사관)를 전부
반환한다(접수·배정 모두 200, `deployStatus`로 구분).

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 조회(prefill) | `getDeployRequestForEdit`(신규, `getSecurityCase`에서 분리) | `GET Deploy/Police/W/GetDeployDetailUpdate?deployReqSeq=` | ✅ issues #7 해결. 상세(화면4, `GetDeployDetail`)와 소스가 달라 쿼리키도 분리(`['deploy-request-edit', id]`). 읽기 필드명이 쓰기 DTO와 다름(`suspectBirth`↔`suspectBirthDate`, `etcLoc1/2`↔`guardEtcLoc1/2`, `deployStatus`) — 프론트 매핑. `crimeType`은 `crimeCodeToCaseType`으로 변환(2026-09-09, 레거시 영문 건도 정상 선택). `mgmtNo` 없어 breadcrumb 축소(exclusions). 응답 샘플: `Deploy-Police-GetDeployDetailUpdate.md` |
| 수정 저장 | `updateSecurityCase` | `PUT Deploy/Police/W/UpdateDeployRequest` | ✅ `UpdateDeployRequestDto` = `AddDeployRequestDto` + `deployReqSeq`(공유 `toDeployRequestDto`). 성공 `{data:true}`. 브라우저 왕복 검증(prefill·저장·배치장소 4필드). **2026-09-09**: 사건유형 enum 전환 — 저장은 `caseTypeToCrimeCode`, prefill은 `crimeCodeToCaseType`(레거시 영문·한글 모두 라벨로). 협박↔스토킹 왕복 검증(deploySeq 90). 배정 후 배치기간은 서버 무시/경호중+ 409/소속 밖 403 — 배치기간 UI 비활성화. 응답 샘플: `Deploy-Police-UpdateDeployRequest.md` |

#### 게스트 계정 관리 (`/guests`)

**✅ 연동 완료(2026-09-08, #16)** — 응답 샘플 `docs/backend-integration/responses/User-Police-Guest.md`.
`handlers/guests.ts`(`guestTestHandlers`)를 실 6종으로 재작성해 `testOnlyHandlers`로 이동.

| API 기능 | mock 함수 → 실 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listGuestAccounts` | `GET User/Police/W/GetGuestUserList?groupSeq=` | ✅ `groupSeq` 필수(세션 값). `data` 평면 배열. `useYn=false`(중지) 행 숨김(exclusions). 행: `loginId`→아이디, `accessList[].guardCode`→"조회가능 경호건", `createDt`→발급일 |
| 발급 후보 조회 | `listGuestCaseCandidates`(신규) | `GET GetGuestCaseList` | ✅ 서버가 소속·종결/취소 필터. `mgmtNo`에 경호코드 미포함 → `+guardCode` 재조합 |
| 아이디 미리보기 | ~~`previewNextGuestAccount`~~ 제거 | — | ✅ issues #3 해소 — 프론트 UX 변경(발급 후 목록 재조회). EP 요청 안 함 |
| 발급 | `issueGuestAccount` | `POST AddGuestUser` | ✅ `{name:"게스트"(고정), caseSeqs:int[]}`. 응답 `{data:true}`(아이디 미반환) |
| 수정 후보 조회 | `getGuestCaseAccess`(신규) | `GET GetGuestCaseDetail?userSeq=` | ✅ `{caseSeq,guardCode,isAccess}` — 라벨(mgmtNo) 없어 발급 후보와 머지. 타 경찰서 403 |
| 조회권 수정 | `updateGuestAccountAccess` | `PATCH UpdateGuestCaseInfo` | ✅ `{userSeq, accessList:[{caseSeq,guardCode,isAccess}]}`. 후보 전체를 명시적 true/false로 |
| 삭제 | `deleteGuestAccount` | `POST DeleteGuestUser` | ✅ `{userSeq}`. 복구 불가. 타 경찰서 403 |

#### 이력 조회 (`/history`, `/history/:id`)

이 화면(과 상세)은 **경찰서·본청·지역청이 role로 갈라 공유**한다(`POLICE_HISTORY`).
#14(경찰서)·#15(본청·지역청) **모두 실 API로 전환 완료**(2026-09-09 회신 반영). 목록은
`GetHistoryList`를 경찰서면 세션 groupSeq 붙여서, 본청/지역청은 groupSeq 없이 호출(서버가
역할 캐스케이드). 상세는 종결·취소만 `GetHistoryDetail`, 진행중·접수는 `deploySeq`로
경호상세(`/security-cases/:id`)로 라우팅.

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 (경찰서) | `listPoliceStationHistory`(신규, `police/api/history.ts` — 기존 함수에서 분리) | `GET History/Police/W/GetHistoryList` | ✅ 연동 완료(2026-09-08, **부분완료 △** — 종결 데이터 없어 취소 5건만 실측). `groupSeq`(세션 저장, `GetMyProfile`) 필수 — 없으면 빈 목록, 역할 스코프는 서버가 안 검. 끝난 건만(HIST-001). 응답 이중 래핑 `{meta,data:[...]}` → `unwrapEnvelope` + 페이지 순회. 행: `caseSeq`→id, `mgmtNo` `splitMgmtNo`, `groupName`/`parentGroupName`→경찰서/지역청, `startDt`/`endDt`(취소 건 null), `totalMin`→`totalGuardMinutes`, `statusName`("경호취소"→'취소'). `status`/`searchKey` 파라미터는 클라 필터로 대체(exclusions). 응답 샘플 `History-Police-GetHistoryList.md`. **2026-09-09 회신 반영**: 매퍼에 `deploySeq`·`status`(int) 추가(공유 매퍼 `listRowToSecurityCase`). 경찰서 경로는 세션 groupSeq 유지 — 회귀 0 |
| 상세 조회 (경찰서) | `getPoliceStationHistoryDetail` (3역할 공통) | `GET History/Police/W/GetHistoryDetail?caseSeq=` | ✅ 연동(2026-09-08). 응답(이중 래핑 아님): `suspectUserName`(마스킹)→`nameInitial`, `responsibleOfficer`→"경찰관 정보", `startDate`/`endDate`(ISO)→날짜, `totalGuardWorkMinutes`→`totalGuardMinutes`, `endDt`→취소일/종결일, `remark`→취소사유/종결사유, `guards[]`(이름·일수·분 인라인)→신규 `historyGuards` 필드로 "근무자 배정 이력" 표. `caseType`·5개 조치·배치장소는 응답에 없음 → 표시 축소(exclusions). **2026-09-09**: `detailRowToSecurityCase` export해 본사(#13)·본청/지역청(#15)과 매퍼 공유, `HistoryDetailRow`에 `groupName`·`parentGroupName` optional. 응답 샘플 `History-Police-GetHistoryDetail.md` |
| 목록 조회 (본청·지역청) | `listSecurityCaseHistory` (실 API) | `GET History/Police/W/GetHistoryList` (groupSeq 없이) | ✅ 연동 완료(**2026-09-09 회신 반영**). `groupSeq` 없이 부르면 서버가 역할 캐스케이드 — 본청=전국 전 구간, 지역청=관할 이하 전 구간(접수·진행중·종결·취소). 행에 `deploySeq`·`status`(int) 추가, 접수행 `caseSeq: null`. `SecurityCase.id` = 종결·취소면 `caseSeq`, 그 외면 `deploySeq`. pageSize 상한 100. 응답 샘플 `History-Police-GetHistoryList.md` "회신 반영" 섹션. △ = 종결 데이터 대기 |
| 상세 조회 (본청·지역청, 종결·취소) | `getSecurityCaseHistoryDetail` → `getPoliceStationHistoryDetail`로 통합 | `GET History/Police/W/GetHistoryDetail?caseSeq=` | ✅ 3역할 공통 함수로 통합(role 분기 제거). 본청/지역청 토큰도 관할 건이면 200. ⚠️ 스웨거는 "종결·취소만"인데 진행중도 200(화면 미도달 → 제외). 타 관할 차단은 CARRYOVER C절 |
| 상세 조회 (본청·지역청, 진행중·접수) | `getSecurityCase` (경호상세 재사용) | `GET Deploy/Police/W/GetDeployDetail?deployReqSeq=` | 이력 목록 행(진행중·접수)의 `id`=`deploySeq` → `/security-cases/:id` 라우팅 → 경호상세 조회전용. `isReadOnlyViewer`가 액션 숨김. 브라우저 검증(SPoliceM1 → `/security-cases/90`) |

#### 대시보드 (`/dashboard`, 아직 미구현·Phase 4)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 상태별 건수 | (미구현) | `GET DashBoard/Police/W/GetDashBoardCount` | 착수 시 참고 |
| 조직별 건수 | (미구현) | `GET DashBoard/Police/W/GetDashBoardGroupCount` | 착수 시 참고 |

#### 로그인 (`/`) — ✅ 연동 완료 (커밋 `008383a`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 로그인 | `login`(구 `policeLogin`) | `POST Login/W/Login` | 경찰/본사 공용 엔드포인트로 통합, `login()` 하나로 합침. 응답에 role 없음 — `code=100+codeSeq`로 역할을 이미 알 수 있다는 것도 확인했지만, 이름 등 다른 필드가 필요해 `GetMyProfile` 호출은 유지 |
| 내 프로필 조회 | (신규) | `GET Login/W/GetMyProfile` | 로그인 직후 호출해 role/이름을 채움. `codeSeq`→프론트 `Role` 매핑 필요(`features/auth/lib/roleMapping.ts`) — 본청관리자/지방청관리자/피전처럼 codeName 자체가 다름 |
| 최초 로그인 강제 변경 | `changeInitialPassword`(구 `policeChangeInitialPassword`) | `POST Login/W/ChangePassword` | 인증 헤더·기존 비밀번호 둘 다 불필요, HTTP 428로 신호. 기존 비밀번호 미검증 이슈는 issues.md #4(보류) |
| 로그아웃 | `logout`(신규) | `POST Login/W/Logout` | AppShell 로그아웃 버튼에 신규 연결, 서버 세션 실제 종료 확인 |

---

## 2. [경찰서] 게스트

**✅ 연동 완료(2026-09-08, #17)** — 피전 경호목록/상세 화면·API를 role로만 갈라 재사용,
별도 코드 없음. 응답 샘플 `docs/backend-integration/responses/Deploy-Police-GetDeployList.md`
"#17 관찰" 섹션.

#### 경호목록 (`/security-cases`, 조회 전용)

| API 기능 | 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listSecurityCases` (피전과 공유) | `GET Deploy/Police/W/GetDeployList` | ✅ **게스트 토큰이면 서버가 `?groupSeq=` 무시하고 `GUEST_CASE_ACCESS` 스코프만 적용** — 조회권 부여된 건만 반환(실측: groupSeq 32/22/999 다 동일 1건). 프론트 role 분기는 "신규접수" 버튼 숨김뿐 |

#### 경호 상세 (`/security-cases/:id`, 조회 전용)

| API 기능 | 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 조회 | `getSecurityCase` (피전과 공유) | `GET Deploy/Police/W/GetDeployDetail?deployReqSeq=` | ✅ 조회권 있는 건 200, 피전과 동일 shape. `isReadOnlyViewer`(본청/지역청/게스트) → 액션 버튼 0개·문서함 readOnly. 조회권 없는 건 상세 차단은 **미검증(이월)** — 동래에 활성 미부여 건이 없음. 게스트 토큰 쓰기·Stec·피전전용 EP는 403 확인 |

#### 로그인 (`/`) — ✅ 연동 완료(1번 표와 동일 구현, 커밋 `008383a`)

---

## 3. [본사] 운영관리자 / 시스템관리자

두 역할이 접근 가능한 화면이 거의 동일(운영관리자도 시스템관리자와 동일 범위 —
`docs/project-overview.md`). 시스템관리자만 추가로 접근하는 화면: **배치요청 목록**
(운영관리자도 접근 가능). 본부관리자는 이 화면군의 API 연동이 끝난 뒤 그룹 B #12에서
스코프만 재검증한다("본인 배정 건만" 제한 확인 — 새 API 연동 아님).

#### 근무자 목록/등록 (`/admin/workers`)

✅ 연동 완료(2026-09-03, 커밋은 PROGRESS.md).

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listWorkers` | `GET Guard/Stec/W/GetGuardList` | ✅ 응답 `{guardSeq,sabun,name,phone}` — `deptName` 빠짐(issues #8). `id←String(guardSeq)` |
| 등록 | `registerWorker` | `POST AddGuardInfo` | ✅ `{sabun,name,deptName,phone}` → `data:true`(생성 seq 안 줌) |
| 수정 | (mock에 없음) | `PATCH PatchGuardInfo` | ✅ `{guardSeq,name?,phone?,deptName?}`. sabun 수정 불가. 행별 `⋮` 메뉴 UI 신규 |
| 삭제 | (mock에 없음) | `DELETE DeleteGuardInfo?guardSeq=` | ✅ 쿼리 파라미터. 확인 다이얼로그 UI 신규 |

#### 배치요청 목록 (`/admin/requests`)

✅ 연동 완료(2026-09-03, 커밋은 PROGRESS.md).

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listPendingRequests` | `GET GuardCase/Stec/W/GetDeployRequestList` | ✅ 파라미터 없이 전량 반환, 스코프 필터 없음(운영/시스템관리자 전국 미배정 건 전부). 본부관리자 403. 응답 `{deploySeq,caseSeq(null),mgmtNo,groupName,parentGroupName,createDt,periodFrom,periodTo,requestedEndDate}` — `mgmtNo`는 접미사 없는 `"26-09-동래경찰서"`라 그대로 사용. 응답 샘플: `GuardCase-Stec-GetDeployRequestList.md` |
| 담당자 선택 목록 | `listManagers` | `GET User/Stec/W/GetStecUserList` | ✅ 전용 EP 없음 — 클라이언트에서 `codeName==='본부관리자' && useYn`로 필터. `assignedCount` 필드 없어 배지 생략. **본부(`branch`)는 제외 확정**(2026-09-09, findings #1). matrix 11번과 같은 응답. 응답 샘플: `User-Stec-GetStecUserList.md` |
| 본부 배정 | `assignManager` | `POST GuardCase/Stec/W/AddGuardCase` | ✅ DTO `{deploySeq,userSeq}`, 성공 `{data:true}`(seq 안 줌). **여기서 GuardCase가 처음 생성됨** — 배정 즉시 `statusName:"배정"` + `mgmtNo`에 `ST####`. deploySeq 81 실배정(caseSeq 46)해 검증·유지(8·9 입력 데이터). 응답 샘플: `GuardCase-Stec-AddGuardCase.md` |
| 취소 | ~~`cancelPendingRequest`~~ | `POST GuardCase/Stec/W/CancelGuardCase {deployReqSeq}` | ✅ 연동(2026-09-09, findings #9 🟢) 했으나 **2026-09-11 운영팀 결정으로 UI에서 제거**(⋮ "취소" 메뉴·다이얼로그·함수 삭제). API 자체는 살아있음 — 재도입 시 그대로 재사용 가능 |
| (인프라) refresh single-flight | — | `POST Login/W/RefreshToken` | `client.ts` 수정 — 동시 401 시 각자 refresh 호출 → 실백엔드 1회용 RefreshToken이 회전돼 두 번째부터 401 → 강제 로그아웃되던 문제. 진행 중 refresh를 공유하도록 single-flight화(아직 mock인 화면에 실백엔드 계정으로 들어갈 때 재현됨) |
| 행 클릭 → 배치요구서 원본보기 | `getDeployRequestDetail`(신규, `requests.ts`) | `GET GuardCase/Stec/W/GetDeployDetail?deployReqSeq=` | ✅ 연동(**2026-09-11**). 지금까지 `DispatchRequestViewDialog`가 목록 필드(관리번호·경찰서·기간)만 표시해 대상자·사건개요 등 대부분 "-"였음 — 화면9가 이미 쓰던 이 EP를 화면7도 재사용해 원본 전체를 채움. `fetchDeployRequestDetail`(company/api/securityCaseDetail.ts)을 export하고 `DeployRequestDetailData`에 `crimeType`·`suspectUserName`·`investigator`·`responsibleOfficer` 4필드 추가(응답엔 원래 있었으나 화면9는 안 읽어 인터페이스에 없었음). 브라우저 검증(StecM1, deployReqSeq 실측 — 대상자 "이동희" 등 전체 필드 렌더), 콘솔 에러 0. 테스트 더블(`mocks/handlers/guardCase.ts`) 신규 |

#### 경호목록 (`/admin/security-cases`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listSecurityCases` | `GET GuardCase/Stec/W/GetGuardCaseList` | ✅ 연동 완료(2026-09-04). 응답 이중 래핑 `{meta,data:[...]}` → `unwrapEnvelope` 후 `.data`. `pageSize` 상한 100이라 `meta.totalPages`까지 클라이언트 순회. `caseSeq`→`id`, `mgmtNo` 완성형 `splitMgmtNo`, `statusName` 라벨 그대로, `userName`→`assigneeName`(담당자 id 없어 이름만 표시). 진행중(배정/경호중/경호완료)만 반환. 지역청·담당자 소속 본부 없음 → 필터/열 축소(exclusions). 7번 배정 건(caseSeq 46~48) 렌더 확인. 응답 샘플: `GuardCase-Stec-GetGuardCaseList.md` |

#### 경호 상세 (`/admin/security-cases/:id`) — △ 부분 연동(2026-09-04)

스웨거가 갱신돼 조회가 5종으로 쪼개짐(매트릭스 최초 작성 시엔 `GetGuardCaseDetail` 1종만).
`getSecurityCase`가 5개 GET을 조립한다. 응답 샘플: `GuardCase-Stec-GetGuardCaseDetail.md`,
`GetCaseGuardList.md`, `GetCaseSchedule.md`, `GetCaseMeeting-GetCaseDoc.md`.

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 조회(경호계획/헤더) | `getSecurityCase` | `GET GuardCase/Stec/W/GetGuardCaseDetail?caseSeq=` | ✅ 연동. 경호계획 등록 판정 = `startDate != null`. 배치요구서 원본 필드(요구자·사건개요·등록일·성별/생년월일/직업) 없음(issues #7·#12, exclusions). `crimeType`은 `crimeCodeToCaseType`으로 변환(2026-09-09, 레거시 영문값 해소) |
| 조회(경호원 배정) | `getCaseGuards`(신규, `workers.ts`) | `GET GuardCase/Stec/W/GetCaseGuardList?caseSeq=` | ✅ 연동. `{guardSeq,name,sabun,deptName,isAssigned,phone}` — 경호건 스코프라 부서도 옴(issues #8 무관). `listCaseJoinWorkers`(mock)는 이력 상세 #13용으로만 잔존 |
| 조회(스케줄) | `getSecurityCase` | `GET GuardCase/Stec/W/GetCaseSchedule?caseSeq=` | ✅ 연동. `data[]={groupName(일자),groups[]{groupSeq,order,guards[]}}` → `WorkSchedule.days[].groups[].assignments[]`. **그룹 메모 응답에 없음**(issues #12, exclusions) |
| 조회(사전미팅) | `getSecurityCase` | `GET GuardCase/Stec/W/GetCaseMeeting?caseSeq=` | ⚠️ 현재 모든 케이스 `data:null` — 응답 스키마 미실측. 저장 연동은 **후속** |
| 조회(첨부 메타) | `getSecurityCase` | `GET GuardCase/Stec/W/GetCaseDoc?caseSeq=` | ✅ 읽기만. `{caseInfoDto,guardAgreementDtos[],guardDeployDocDto}` → `attachments`. 필드↔문서 대응은 업로드된 데이터 없어 추정(후속에서 확정) |
| 경호계획 등록 | `registerBaseInfo(...,{isNew:true,period})` | `PUT AddGuardCaseInfo` | ⚠️ **코드 완성·미검증(△)** — 배치기간 조회 경로 없음(blockers, issues #10) → **배정 건에서 등록 버튼 비활성 + 안내문**. 스케줄 생성 후 재호출 시 409(실측). caseSeq 46은 curl로 등록 |
| 경호계획 부분수정 | `registerBaseInfo(...,{isNew:false})` | `PATCH PatchCaseInfo` | ✅ 연동·브라우저 검증. `startDt/endDt` 없음(기간 잠금). `isNew`로 등록/수정 분기 |
| 경호취소 | ~~`cancelAssignedCase`~~ | `POST GuardCase/Stec/W/CancelGuardCase {deployReqSeq, reason}` | ✅ 연동(2026-09-09, findings #9 🟢) 했으나 **2026-09-11 운영팀 결정으로 UI에서 제거**("경호취소" 버튼·다이얼로그·함수 삭제, 배정 상태). API는 살아있음 — 재도입 시 재사용 가능 |
| 스케줄 자동생성 | `createSchedule` | `POST AutoAddSchedule` | ✅ 연동·curl 검증. `{caseSeq,startDate,endDate,startTime:"HH:MM:SS",endTime}`. 대표(isRepresentative) 근무자만 자동 배정(실측 — matrix 최초 우려 해소) |
| 근무조 저장 | `upsertScheduleGroup(...,order)` | `PUT PatchScheduleGroup` | ✅ 연동·curl 검증. `groupSeq` 있으면 수정/없으면 추가. `order`(신규 인자)는 1+ & 일자 내 유일 필수(중복 시 409). 근무자 중복시각 배정도 409, 경호풀 밖 근무자 400. `memo` 저장되나 조회엔 없음(issues #12) |
| 근무조 삭제 | `deleteScheduleGroup` | `DELETE DeleteScheduleGroup?groupSeq=&caseSeq=` | ✅ 연동·브라우저 검증. 그룹1(첫 조)은 삭제 불가(일자별 최소 1개 유지) — 모달에서 버튼 숨김 |
| 사전미팅 저장/삭제 | `setPreMeeting` | `PUT SaveCaseMeeting` | ✅ 연동·브라우저 검증. `{caseSeq,hasMeeting,meetingStart,meetingEnd,guardSeqs[]}`. 읽기 `GetCaseMeeting` = `{meetingSeq,meetingDate,meetingStartDt,meetingEndDt,guardInfo[]}` 또는 null. **근무자별 시간 없음** → 폼의 개별 시간을 min시작~max종료로 합쳐 저장(issues #11, exclusions). `hasMeeting:false` = 삭제 |
| 경호계획서 업로드 | `uploadSecurityPlanDoc` | `PUT PatchGuardPlanDoc` | ✅ 연동·브라우저 검증. `multipart`(`caseSeq`+`file`). `GetCaseDoc.caseInfoDto`에 반영. 파일 시그니처 검사(비허용 시 400 "File signature is not allowed") |
| 경호계획서·동의서 다운로드 | `downloadFileByPath`(`shared/lib/download.ts`) | `GET /files/{filePath}` (전용 API 없음) | ✅ 연동(**2026-09-10**, findings #18). `GetCaseDoc.caseInfoDto.filePath`·`guardAgreementDtos[].filePath` → `/files/…`. 본사엔 올린 파일 다운로드 버튼이 아예 없었음 → `AttachmentsSection`에 `onDownload` 추가. 브라우저 검증(StecM1 `/admin/security-cases/53`). 동의서는 실데이터 없어 이월 |
| 개인정보동의서 업로드 | `uploadWorkerConsentDoc` | `PUT PatchConsentDoc` | ✅ 연동·curl+오프라인 검증. `multipart`(`caseSeq`+`guardSeq`+`file`). `GetCaseDoc.guardAgreementDtos[]` — 경호풀 근무자별 1행, 해당 `guardSeq` 행에 파일 채워짐 |
| 파기확인서 업로드 | `uploadDestructionCertDoc` | `PUT PatchDestroyDoc` | ✅ 연동·브라우저 검증. `multipart`(`caseSeq`+`file`). **경호중·경호완료 상태에서만**(그 외 409) → UI에서 상태 가드. `GetCaseDoc.guardDeployDocDto`(filePath 없음) |
| 파기확인서 다운로드 | `downloadDestructionCert` | `GET GetDestroyDocDownload?deploySeq=` | ✅ 연동·브라우저 검증. **2026-09-10**: 쿼리 파라미터 `caseSeq`→`deploySeq` → `resolveCaseSeq` 우회 제거(findings #16). 바이너리 + `Content-Disposition`. Authorization 필요 → blob 받아 저장 트리거. 파일 없으면 404 |

이 화면(및 #12) 완료 후 **4번([경찰서] 경호 상세)의 배정 이후 상태(연장/단축요청,
경호취소, 종결)를 재검증**한다 — caseSeq 46에 경호계획+스케줄 데이터가 생겼다.

#### 연장요청/단축요청 목록 (`/admin/period-requests/extension`, `/shorten`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listPeriodRequests` | `GET GetExtendRequestList` / `GetShortenRequestList` | ✅ 실 API 전환(2026-09-07). type으로 EP 분기, `caseSeq`→id 매핑. 항목 구조는 `GetDeployRequestList`와 유사(`caseSeq` 채워짐 + `requestedEndDate`). 응답 샘플 `GuardCase-Stec-GetExtend-GetShortenRequestList.md` |
| 승인 | `approvePeriodRequest` | `POST ConfirmCasePeriod` | ✅ 실 API 전환. body `{caseSeq}` 하나, 서버가 배치기간·스케줄 반영. 응답 샘플 `GuardCase-Stec-ConfirmCasePeriod.md` |
| 거부 | `rejectPeriodRequest` | ⚠️ **없음** | issues.md #2 — **처리 방향 확정**: 승인만 연결, 거부는 UI에서 `disabled`. `rejectPeriodRequest`는 throw. B-2 종료 시 거부 EP 신설 일괄 요청 |

**△ 부분완료 — 재검증 필요**: 실백엔드에 경호중 건이 없어 배정 건에 연장/단축 요청을
주입해 승인 왕복만 실측(원복 완료). 연장/단축 신청은 업무상 경호중 상태만 대상 —
피전이 경호상세에서 직접 신청하는 부분(#4 `requestPeriodChange`, △)이 개발·검증돼야
실제 요청 데이터가 생긴다. **#4 "배정 이후 재검증"과 함께 재확인.**

#### 관리자 계정 관리 (`/admin/managers`) — ✅ 연동 완료(2026-09-07)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listManagerAccounts` | `GET User/Stec/W/GetStecUserList` | ✅ `loginId→id`·`userSeq`·`codeSeq→roleFromCodeSeq`. **2026-09-09**: 본부관리자도 **200**(스웨거 회신) → 403 안내 제거, 목록 노출(수정은 `canEdit`=운영·시스템만). **"본부" 열 제거**(findings #1 본부 파트 🟢). 403 안전망(`ManagerListForbiddenError`)만 존치. 응답 샘플 `User-Stec-GetStecUserList.md` |
| 정보수정 | `updateManagerAccountInfo` | `PATCH User/Stec/W/UpdateUser` | ✅ `{userSeq,name,phone}`. **빈 연락처는 `""` 전송** — `null`은 백엔드가 "변경 안 함"으로 무시(실측). StecM1 왕복 검증. 응답 샘플 `User-Stec-UpdateUser.md` |
| 비밀번호 초기화 | `resetManagerAccountPassword` | `PATCH User/Stec/W/UpdateUser` | ✅ `{userSeq, loginPw:loginId, pwChangedYn:true}`. StecM4(폐기용)에서 `pwChangedYn false→true` 확인 |
| 계정 정지/재활성화 | — | `PATCH UpdateUser`의 `useYn` | 스키마상 가능하나 대응 UI 없음 → 이번 범위 밖(roadmap 백로그) |
| 담당경호 조회 · 배정건수 | (mock 제거) | `GET GetGuardCaseList`(실 API, 8번) | ✅ mock `listManagerAssignedCases` 제거, `listSecurityCases`로 통일(쿼리키 `['security-cases-all']` 공유). 담당자 id 없어 **담당자명 매칭**(`assigneeName === userName`, 동명이인 취약 — issues #1에 `userSeq` 요청). 진행중 건만 반환 → 종결/취소 제외 자동 |

#### 이력 조회 (`/admin/history`, `/admin/history/:id`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listCompanyHistory`(신규, `company/api/history.ts` — 경찰 쪽 `listSecurityCaseHistory`에서 분리) | `GET History/Stec/W/GetHistoryList` | ✅ 연동 완료(2026-09-08). 응답 이중 래핑 `{meta, data:[...]}` → `unwrapEnvelope` + `.data`, `pageSize` 100 순회(경호목록과 동일). 행 축소: `{caseSeq, mgmtNo, groupName, parentGroupName, startDt, endDt, totalMin, statusName, remark}` → `caseSeq`→id, `splitMgmtNo`, `groupName/parentGroupName`→경찰서/지역청, `statusName`("경호취소"→'취소'), `totalMin`→`totalGuardMinutes`(분, 종결만 실값), `remark`→취소사유/종결코드. 종결·취소만 반환(HIST-001). **본부관리자 스코프(HIST-003) 실제 적용됨** — StecM3(배정 0건)→이력 0건, StecM2(동래 담당)→동래 취소 5건. `status`/`searchKey` 파라미터는 클라 필터로 대체(exclusions). 응답 샘플: `History-Stec-GetHistoryList.md` |
| 상세 조회 | `getCompanyHistoryDetail`(신규) | `GET History/Stec/W/GetHistoryDetail?caseSeq=` **(2026-09-09 신설)** | ✅ 연동 완료(**2026-09-09 회신 반영**). 응답 = 경찰용 `GetHistoryDetail` + `groupName`·`parentGroupName`(매퍼 `detailRowToSecurityCase` 공유). 상태 안 가림(진행중도 200, 화면은 종결·취소만 도달). 스코프: 운영/시스템=전국, 본부관리자=본인 배정 건(범위 밖 → 404, StecM3 실측). `CompanyHistoryDetailUnavailableError`·"준비 중" placeholder 제거, `HistoryDetailPage`(company) 실제 상세 렌더. 브라우저 검증(StecM1 `/admin/history/46`). issues #14 종료. 응답 샘플 `History-Stec-GetHistoryDetail.md` |

#### 대시보드 (`/admin/dashboard`, 아직 미구현·Phase 4)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 상태별/조직별 건수 | (미구현) | `GetDashBoardCount` / `GetDashBoardGroupCount` | Police 태그만 있고 Stec(본사)용은 안 보임 — analysis.md 참고 |

#### 로그인 (`/admin`) — ✅ 연동 완료(1번 표와 동일 구현, 커밋 `008383a`)

---

## 4. [본사] 본부관리자

3번(운영관리자/시스템관리자)에서 화면별 API 연동 자체는 이미 끝난 상태 — 이 단계는
**새로운 API를 붙이는 게 아니라, 본부관리자로 재로그인해서 서버 스코프 제한이 실제로
걸리는지 재검증**하는 단계다. 배치요청 목록(`/admin/requests`)은 애초에 접근 불가라
검증 대상에서 빠진다.

| 화면 | 재검증할 것 |
|---|---|
| 경호목록 | 본인이 배정받은 건만 보이는지(`GetGuardCaseList`의 WORK-009 규칙 — mock의 `scopeForCompanyAccount`와 동일 컨셉) |
| 경호 상세 | 본인 배정 건이 아닌 다른 건에 URL로 직접 접근 시 차단되는지 |
| 연장/단축 요청 목록 | 본인 배정 건 요청만 보이고 승인/거부도 그 건에만 가능한지 |
| 이력 조회 | 본인 배정 건만 보이는지 — **7번([경찰서] 이력 조회)에서 미뤄뒀던 종결 데이터 확인도 이 시점에 함께 한다** |
| 관리자 계정 관리 | 본인 정보수정/비밀번호초기화만 가능(권한 매트릭스, Phase 3.6에서 이미 구현) — API 호출 자체는 동일 엔드포인트, 서버 응답의 허용 여부만 다름 |
| 근무자 목록 | 3번과 동일(조회 범위 제한 없음) |

---

## 5. [본청] / [지역청]

두 역할이 접근 가능한 화면이 동일(스코프만 다름 — 본청은 전국, 지역청은 관할 이하).
**전체 중 가장 나중에 진행** — 아래 두 화면 다 종결·취소(터미널) 데이터, 그리고
진행중 상세는 배정 이후 데이터가 실존해야 의미 있어서, 1~4번 섹션이 전부 끝난 뒤가
자연스럽다.

#### 이력 조회 (`/history`, `/history/:id`) — #15 ✅ **실 API 전환 완료(2026-09-09 회신 반영)**, △ = 종결 데이터 대기

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listSecurityCaseHistory` (실 API) | `GET History/Police/W/GetHistoryList` (groupSeq 없이) | ✅ 스웨거 개정으로 `groupSeq` 없이 부르면 서버 역할 캐스케이드 — 본청=전국, 지역청=관할 이하, **전 구간**(접수·진행중·종결·취소). `GetDeployList` 팬아웃 불필요. 행 `deploySeq`·`status`(int), 접수행 `caseSeq: null`. `SecurityCase.id` = 종결·취소면 `caseSeq`, 그 외면 `deploySeq`. 응답 샘플 `History-Police-GetHistoryList.md` "회신 반영" |
| 상세 조회 (종결·취소) | `getSecurityCaseHistoryDetail` → `getPoliceStationHistoryDetail` 통합 | `GET History/Police/W/GetHistoryDetail?caseSeq=` | ✅ 3역할 공통 함수. 본청/지역청 관할 건 200. ⚠️ 스웨거는 "종결·취소만"인데 진행중도 200(화면 미도달 → 제외). 타 관할 차단은 CARRYOVER C절 |

#### 진행중·접수 건 상세 (`/security-cases/:id`, 조회 전용) — #15 ✅ 라우팅 연결됨

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 조회 | `getSecurityCase` | `GET Deploy/Police/W/GetDeployDetail?deployReqSeq=` | ✅ 이력 목록 행(진행중·접수)의 `id`=`deploySeq` → `historyTarget()`이 `/security-cases/:id`로 라우팅 → 경호상세 조회전용. `isReadOnlyViewer`가 액션 숨김. 브라우저 검증(SPoliceM1 → `/security-cases/90`, deployReqSeq 90 경호중). 근무일정 패널도 `GetDeployGuardSchedule` 연결됨(2026-09-09) — 위 화면4 표 참고 |

#### 대시보드 (`/dashboard`, 아직 미구현·Phase 4)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 상태별/조직별 건수 | (미구현) | `GetDashBoardCount` / `GetDashBoardGroupCount` | |

#### 로그인 (`/`) — ✅ 연동 완료(1번 표와 동일 구현, 커밋 `008383a`)

---

## 전체 요약 — ⚠️ mock과 실제 API가 어긋나는 지점

**mock에만 있고 실제 API엔 없음** (issues.md로 옮겨 관리):
1. ~~연장/단축 거부 (`rejectPeriodRequest`)~~ — issues.md #2 **해소(2026-09-11)**: 거부 EP를
   기다리지 않고 본사 화면에서 거부 기능 자체를 제거(운영팀 결정), 요청 대상에서 제외
2. ~~게스트 아이디 미리보기 (`previewNextGuestAccount`)~~ — issues.md #3 **해소(2026-09-08)**:
   프론트 UX 변경(발급 후 목록 재조회)으로 흡수, 함수 제거

**실제 API에만 있고 mock엔 없음** (이슈 아님 — 연동하면서 새로 구현할 기능, `.claude/loop-backend/PROGRESS.md`에서 화면 단위로 자연 처리):
3. 경호계획 부분수정(`PatchCaseInfo`)
4. 근무자 수정/삭제(`PatchGuardInfo`/`DeleteGuardInfo`)
5. 관리자 계정 정지/재활성화(`UpdateUser`의 `useYn`)
6. 로그아웃(`Logout`)

**구조가 다름** (없는 기능은 아니지만 연동 방식 자체를 바꿔야 함):
7. 로그인 엔드포인트 통합 — mock은 경찰/본사 2개, 실제는 1개
8. 첨부파일 업로드 — mock은 `{fileName}` JSON, 실제는 `multipart/form-data`
