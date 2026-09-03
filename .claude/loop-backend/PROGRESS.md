# 진행 상태

상태값: `대기` / `구현중` / `승인대기` / `부분완료(△)` / `완료`

`부분완료(△)` = 엔드포인트 교체는 끝났으나 실백엔드 데이터가 없어 일부 경로만 실측
검증된 상태. 남은 경로는 비고에 적은 후속 번호에서 재검증해야 하며, 그전까지 `완료`로
올리지 않는다.

각 화면의 상세 API 목록은 `docs/backend-integration-screen-api-matrix.md` 참고. 이 표는
**그 문서의 "권장 진행 순서"와 동일한 순서**로 정렬돼 있다.

**큰 틀(2026-09-03 재정렬)**: 경호건 생명주기(**메인 워크플로우**)를 앞으로 당기고, 그
검증까지 끝난 뒤 이력 → 게스트로 간다. 이전(2026-09-01)엔 계정권한 단위로 화면군을
통째로 끝내는 순서였는데, 배정 이후 상태를 만들어내는 화면(본사 배정·경호계획)이 뒤에
있어 앞쪽 피전 화면이 계속 "배정 후 미검증 → 재검증 이월"로 밀렸다. 그룹 안에서는
조회 API를 먼저 연결해 생성/수정 결과를 확인할 수 있게 한다. "다음 대상"은 항상 이
표에서 상태가 `대기`인 것 중 번호가 가장 빠른 행이다.

**개발은 화면 단위 / 백엔드 요청은 섹션 단위**(2026-09-03): 연동 작업은 지금까지처럼
표 한 행 = 1 iteration으로 진행한다. 다만 `issues.md`(설계 변경 요청)·`exclusions.md`를
**섹션이 끝나는 시점에 한 번에 묶어** 백엔드로 요청하고(화면마다 찔끔찔끔 아님), 응답을
기다리지 않고 다음 섹션을 계속한다. 백엔드가 요청분을 완료하면 지금 화면은 마무리하고
**다음 화면 착수 전에** 변경분 확인·수정·반영·검증을 끼워 넣는다. 섹션 경계 = 아래
그룹 경계(단, 그룹 B는 본사 운영관리자 경호관리 전체가 한 섹션, 그룹 C 이력도 한 섹션).
상세 절차는 `docs/backend-integration-process.md` 원칙 4, `LOOP_INSTRUCTIONS.md` 1·7단계.

| # | 그룹 | 역할 | 화면 | 상태 | 커밋 | 비고 |
|---|---|---|---|---|---|---|
| 1 | 전제 | 공통 | 로그인 | 완료 | `008383a` | 경찰/본사 실제로는 같은 엔드포인트 — 유일하게 역할보다 먼저 |
| 2 | A | [경찰서] 피전 | 경찰서 경호목록 | 완료 | `2679751` | 스코프는 서버가 403으로 강제(analysis.md 4-6 해소). 3번 직후 재검증 완료(새 접수 반영·mgmtNo 조합형태 확인). **7번 배정 직후 부분 재검증(2026-09-03)**: 배정 건이 `statusName:"배정"`(프론트 라벨과 일치)·`mgmtNo:"…동래경찰서 ST0002"`(경호코드 조합)로 반환됨 확인. 경호중/경호완료/종결/취소는 **9번 이후 재검증** |
| 3 | A | [경찰서] 피전 | 접수/배치요구서 작성 | 완료 | `5074920` | `POST AddDeployRequest`. 2번 재검증 동시 소화(새 접수 반영·mgmtNo 조합형태·"접수" 라벨 확인). 배치장소는 API가 단일 필드라 주거지만 전송(D-2, issues #5). 폼: 요구자 3필드 분리 + 생년월일 입력(+ `DateField` yearGrid) |
| 4 | A | [경찰서] 피전 | 경호 상세 | 부분완료(△) | `19786c4` | **접수 상태만 실측 검증**(2026-09-03). 상세 조회·접수취소 정상. 배정 이후(경호취소·연장·단축·종결)는 데이터가 없어 코드만 교체·**미검증** → 9번(본사 경호 상세) 이후 재검증 필수. 근무 스케줄/근무자 표시는 조회 API 누락(issues #6)이라 mock 연결 끊음. **완료 표시 보류** |
| 5 | A | [경찰서] 피전 | 배치요구서 수정 | 보류(블로커) | | **prefill 소스 없음** — `GetDeployDetail`은 상세페이지 표시용 "기본정보" 뷰(배정 후 본사 등록, 접수단계엔 배치요구서 임시 매핑)라 배치요구서 원본 필드(성별·생년월일·직업·사건개요·참고사항·배치장소 4필드)를 안 줌. 배치요구서 원본 상세조회 API 신설 필요(issues #7, blockers). **a안(2026-09-03): 화면5 통째 보류, 그룹 B로 진행, 신규 API 오면 조회+저장 함께 연동·복귀.** 피전 경호관리 섹션 마지막 화면 → 섹션 일괄 요청(#5·#6·#7)에 포함 |
| 6 | B | [본사] 운영/시스템관리자 | 근무자 목록/등록 | 완료 | `b5f5738` | `GetGuardList`/`AddGuardInfo`/`PatchGuardInfo`/`DeleteGuardInfo` 4종 실측(생성→수정→삭제 원상복구). 수정/삭제 mock에 없던 기능 → 행별 `⋮` 메뉴 UI 신규. 부서 열 제거(GetGuardList 응답에 `DEPT_NM` 누락 — DB엔 있음, issues #8 신규, 섹션 #12에서 일괄 요청). 조인용 `listCaseJoinWorkers` 분리(#9·#13 회귀 차단) |
| 7 | B | [본사] 운영/시스템관리자 | 배치요청 목록(+본부 배정) | 완료 | (이번 커밋) | `GetDeployRequestList`/`GetStecUserList`(담당자 필터)/`AddGuardCase` 3종. deploySeq 81 실배정 → **GuardCase 최초 생성 검증**(caseSeq 46, `ST0002`). 담당자 목록 본부(#1)·배정건수 필드 없어 표시 축소. "취소" API 없어 메뉴 비활성화(**issues #9 신규**). 조인용 `listCaseAssignees` 분리(#8 회귀 차단). **함께 수정**: `client.ts` refresh single-flight(동시 401 → 1회용 RefreshToken 회전 → 강제 로그아웃되던 문제) |
| 8 | B | [본사] 운영/시스템관리자 | 경호목록 | 대기 | | ← **다음 대상**. 7번에서 배정한 건(caseSeq 46)이 보여야 함. `GetGuardCaseList` 실측 HTTP 200 확인(응답: `{meta,data:[{caseSeq,mgmtNo,groupName,userName,statusName,startDate,endDate}]}`). 연동 시 `SecurityCaseTabs`·`SecurityCaseListPage`의 `listSecurityCases` 실 API 전환 → 전환기 401·탭 배지 누락 해소 |
| 9 | B | [본사] 운영/시스템관리자 | 경호 상세 | 대기 | | 7·8 이후, 6번 근무자 필요. 첨부 3종 파일 업로드 재구현 필요(JSON→multipart). 완료 직후 **4번·2번의 배정 이후 상태 재검증**(새 iteration 아님, 비고에 결과만) |
| 10 | B | [본사] 운영/시스템관리자 | 연장/단축 요청 목록 | 대기 | | 4번(재검증)에서 경찰이 신청한 데이터 필요. 거부 API 이슈(issues.md #2) 방향 확정 후 |
| 11 | B | [본사] 운영/시스템관리자 | 관리자 계정 관리 | 대기 | | 8번 이후. 본부 이슈(issues.md #1) 방향 확정 후 |
| 12 | B | [본사] 본부관리자 | 스코프 재검증(경호목록/상세/연장단축/관리자계정/근무자) | 대기 | | 새 API 연동 아님 — 6~11 화면을 본부관리자로 재확인("본인 배정 건만"). 이력 스코프는 그룹 C 후 꼬리 확인. **여기까지 = 메인 워크플로우 검증 완료**, 본사 운영관리자 경호관리 섹션 종료 → 백엔드 일괄 요청 |
| 13 | C | [본사] 운영/시스템관리자 | 이력 조회 | 대기 | | 4·9의 종결·취소가 실제 터미널 데이터를 만들어야 의미 있음 |
| 14 | C | [경찰서] 피전 | 이력 조회 | 대기 | | 접수취소 + (그룹 B 이후) 종결 데이터 확인 |
| 15 | C | [본청]/[지역청] | 이력 조회 + 진행중 건 상세(조회전용) | 대기 | | 4·9 데이터 필요. 진행중 건은 경호 상세 화면을 조회 전용 재사용. + 본부관리자 이력 스코프 꼬리 확인. **이력 섹션 종료 → 백엔드 일괄 요청** |
| 16 | D | [경찰서] 피전 | 게스트 계정 관리 | 대기 | | 아이디 미리보기 이슈(issues.md #3) |
| 17 | D | [경찰서] 게스트 | 경호목록 + 상세(조회전용) | 대기 | | 16·2 완료 후 |
| — | 보류 | [본사]/[본청]/[지역청] | 대시보드 | 보류 | | Phase 4 자체가 보류 중 |

## 최근 iteration 로그

(진행하면서 아래에 짧게 기록 — 날짜, 무엇을 했는지, 막힌 점)

- 2026-09-03: 7번([본사] 운영/시스템관리자 · 배치요청 목록 + 본부 배정) — **연동 완료**.
  그룹 B 두 번째 화면, 메인 워크플로우의 핵심(여기서 GuardCase 최초 생성).
  - `company/api/requests.ts::listPendingRequests` → `GET GuardCase/Stec/W/GetDeployRequestList`.
    응답 `{deploySeq,caseSeq(null),mgmtNo,groupName,parentGroupName,createDt,periodFrom,
    periodTo,requestedEndDate}` → `SecurityCase`로 매핑(`id←deploySeq`,
    `receiptNumber←mgmtNo` 그대로, `policeStation←groupName`, `jurisdiction←parentGroupName`,
    `createdAt←createDt`, 기간←`periodFrom/To`). 파라미터 없이 전량 반환, 스코프 필터
    없음(운영/시스템관리자 전국). 본부관리자 403.
  - `company/api/requests.ts::assignManager` → `POST GuardCase/Stec/W/AddGuardCase`
    `{deploySeq:Number(id), userSeq:Number(managerId)}`, 성공 `{data:true}`. 반환형
    `Promise<SecurityCase>` → `Promise<void>`(호출부 미사용).
  - `company/api/managers.ts::listManagers` → `GET User/Stec/W/GetStecUserList`,
    `codeName==='본부관리자' && useYn` 필터 → `{id:String(userSeq), name:userName}`.
    `Manager.branch`(issues #1 — 응답에 본부 필드 없음)·`assignedCount`(없음)는
    `undefined`, `AssignManagerDialog`에서 배지/접미사 생략(조건부 렌더).

  주요 발견 — **issues #9 신규(🔴)**: [본사] 배치요청 "취소"에 붙일 API가 없음.
  `GuardCase/Stec/W`에 케이스 취소 EP 없고, 유일한 `POST Deploy/Police/W/CancelGuardCase`는
  Police 태그(본사 토큰 `GetDeployDetail` 403으로 방증, 하드삭제라 실제 호출 테스트 안 함).
  → `RequestListPage`의 ⋮ "취소" 메뉴 `disabled`(데스크톱·모바일), `cancelPendingRequest`/
  `CancelPendingCaseDialog` 코드는 존치. **issues #7 보강**: 본사가 배치요구서 전문을 볼
  API도 없음(`DispatchRequestViewDialog`는 목록 필드만 표시, 사용자 지시로 "놔둠").

  **함께 수정(사용자 보고로 발견)**: 실백엔드 계정으로 로그인 후 아직 mock인 화면
  (`/admin/security-cases` 등)에 들어가면 **바로 로그인으로 튕기던** 문제. 원인은
  `apiFetch`의 refresh 처리 — 한 화면이 여러 요청을 동시에 던져 전부 401 → 각자
  `RefreshToken` 호출 → 실백엔드 `RefreshToken`은 1회용(refreshToken 회전)이라 두
  번째부터 무효 토큰으로 호출 → 401 → `logout()`. `features/auth/api/client.ts`의
  `refreshAccessToken`을 single-flight화(진행 중 refresh promise 공유). `client.test.ts`에
  동시 401 3개 → refresh 1회 회귀 테스트 추가. curl로 `RefreshToken` 1회용 동작 확인
  (1번째 200 + 새 토큰 / 같은 토큰 2번째 401).

  회귀 차단: `listManagers`를 실 API로 바꾸면 아직 mock인 `SecurityCaseListPage`(#8)의
  담당자 id 조인(`hqmanager*` vs 실 `userSeq`)이 깨져서 → `listCaseAssignees`
  (`/api/managers` mock 유지, 쿼리키 `['managers','case-list']`)로 분리(#2·#6과 같은 처리).

  인프라: 테스트 전용 더블 `mocks/handlers/guardCase.ts`(3종, `testOnlyHandlers` 등록) —
  `GetDeployRequestList`(접수 상태 securityCases 매핑)/`GetStecUserList`(companyAccounts
  매핑)/`AddGuardCase`(mock `assignManager` 호출). `RequestListPage.test.tsx` 2건 갱신
  (배치요구서 모달 → 목록 필드만 확인, 취소 메뉴 → `aria-disabled` 확인).

  검증: `npm run test` 117/117(116→117, client 테스트 +1)·lint·build 통과. 실백엔드
  `run-s-pgms` — `StecM1`(운영관리자) 로그인 → 배치요청 목록 4건 렌더(86/82/71/70,
  경찰서·지역청·요청일·배치기간) → ⋮ 메뉴 `배정 / 취소(disabled)` → 배정 다이얼로그에
  `HS2본부 본부관리자` 1명(본부/건수 배지 없음). **deploySeq 81 실배정**(curl,
  `{data:true}`) → `GetDeployRequestList`에서 81 사라짐 + `GetGuardCaseList`에 caseSeq 46
  (`26-09-동래경찰서 ST0002` / `HS2본부` / `배정`) — 유지(8·9 입력 데이터). `/admin/security-cases`
  진입해도 **로그아웃 안 됨** 확인. 콘솔 401은 미연동 `listSecurityCases`(#8) 전환기
  노이즈뿐. 사용자 추가 확인: 피전(`SPoliceM5`) 접속 시 해당 건 "배정" 상태로 표시됨(2번 부분 재검증).
  응답 샘플: `GuardCase-Stec-GetDeployRequestList.md`, `GuardCase-Stec-AddGuardCase.md`,
  `User-Stec-GetStecUserList.md`.

- 2026-09-03: 6번([본사] 운영/시스템관리자 · 근무자 목록/등록) — **연동 완료**. 그룹 B
  첫 화면. `company/api/workers.ts`의 `listWorkers`/`registerWorker`를 실 엔드포인트로
  교체하고 `updateWorker`/`deleteWorker` 신규:
  - `GET Guard/Stec/W/GetGuardList` — 응답 `{guardSeq,sabun,name,phone}`. `Worker`
    타입 `id←String(guardSeq)`·`employeeId←sabun`, `department` 제거.
  - `POST AddGuardInfo` — `{sabun,name,deptName,phone}` → `{message,data:true,code:200}`
    (생성 seq 안 줌, 목록 재조회로 확인). `deptName` required.
  - `PATCH PatchGuardInfo` — `{guardSeq,name?,phone?,deptName?}`. `sabun` 수정 불가.
    `deptName`은 현재값 조회 불가라 입력했을 때만 body에 실음(빈 값 전송 시 서버 기존
    부서 덮어쓰기 방지).
  - `DELETE DeleteGuardInfo?guardSeq=` — 쿼리 파라미터, 바디 없음.

  UI 변경(수정/삭제가 mock에 없던 기능): `WorkerListPage`에 행별 `⋮` 드롭다운
  (정보수정/삭제, `ManagerAccountListPage` 패턴), 신규 `EditWorkerDialog`(사번 읽기전용,
  부서 빈 칸)·`DeleteWorkerDialog`(확인). 부서 열은 테이블·모바일 카드에서 제거.

  주요 발견 — **issues #8 신규(🔴)**: 근무자 부서(`deptName`)가 조회 응답에 안 온다.
  DB엔 `GUARD_USER_INFO.DEPT_NM varchar(255) NOT NULL`로 존재하고 Add/Patch INPUT도
  받는데(저장 정상), `GetGuardList` 응답에서만 빠짐. 근무자 단건 상세 API도 없음. →
  목록 부서 열 제거(`exclusions.md`), `GetGuardList` 응답에 필드 추가 요청 예정. 그룹
  B는 #6~#12가 한 섹션 → **#12 섹션 종료 시 일괄 요청**(비블로킹, 지금은 기록만).

  회귀 차단: `company/api/workers.ts::listWorkers`를 실 API로 바꾸면 아직 mock인
  `SecurityCaseDetailPage`(#9)·`company/HistoryDetailPage`(#13)의 근무자 조인이 깨져서
  (`guardSeq` vs mock `worker-N`), mock 조인 경로를 `listCaseJoinWorkers`
  (`GET /api/workers` 유지 + 쿼리키 `['workers','case-join']`)로 분리 — 2번
  GuestListPage 분리와 같은 처리. 두 화면 동작 불변. mock `handlers/workers.ts`는
  GET만 남기고 POST/`createWorker` 제거, `mocks/data/workers.ts`는 자체 `MockWorker`
  타입으로 전환(부서 유지).

  인프라: 테스트 전용 더블 `mocks/handlers/guard.ts`(4종, 인메모리, `resetGuardDouble()`
  export) → `testOnlyHandlers`에 등록. `WorkerListPage.test.tsx`를 더블 기반으로
  재작성 + 수정/삭제 테스트 2건 추가.

  검증: `npm run test` 116/116(114→116)·lint·build 통과. 실백엔드 `run-s-pgms` —
  `StecM1`(운영관리자) 로그인 → 근무자 목록 5건 렌더(부서 열 없음) → **등록→정보수정→
  삭제 end-to-end** 정상, 콘솔 에러 없음. curl로 4종 응답·검증 별도 확인. 테스트로
  만든 근무자(`ZZUI9002`)는 삭제로 원상복구, 백엔드 5행(13·14·15·16·19) 복귀 확인.
  응답 샘플: `docs/backend-integration-responses/Guard-Stec-GuardInfo.md`.

- 2026-09-03: 5번([경찰서] 피전 · 배치요구서 수정) — **착수했으나 블로커로 보류(코드
  변경 없음, 기록만)**. `SecurityCaseForm`의 필수 필드(성별·생년월일·직업·사건개요·
  배치장소 직장지)를 prefill할 소스가 없음. 사용자 설명으로 데이터 모델 확정:
  `GetDeployDetail`은 피전 상세페이지에 보이는 **"기본정보" 뷰**이고, 그 기본정보는
  원래 **본사 관리자가 배정 이후에 등록**하는 데이터 — 접수 단계엔 없으므로 백엔드가
  배치요구서 내용을 기본정보 형태로 임시 매핑해 내려준다. 따라서 배치요구서 원본
  (성별/생년월일/직업/사건개요/참고사항/배치장소 4필드)을 그대로 주는 **별도 조회
  API가 필요**한데 스웨거에 없음. → `issues.md` #7 신규, `blockers.md` 신규 항목.
  **a안 채택**: 화면5 통째 보류, 그룹 B(#6)로 진행, 신규 조회 API가 오면 조회+저장
  (`PUT UpdateDeployRequest`)을 함께 연동·실측하고 복귀. `UpdateDeployRequestDto`는
  `AddDeployRequestDto`와 대칭(스웨거 확인, `groupSeq`↔`deployReqSeq`만 차이).
  5번이 피전 경호관리 섹션(2~5번)의 마지막 → 섹션 일괄 요청서 작성·**백엔드 전달 완료**
  (`docs/backend-integration-requests/2026-09-03-피전-경호관리.md` — 요청 1 배치장소
  4필드 / 2 근무 스케줄 조회 API / 3 근무자별 보안서약·개인정보동의서 조회 API /
  4 배치요구서 원본 상세조회 API). `issues.md` #5·#6·#7 → 🟡(답변 대기). 응답 안
  기다리고 그룹 B로 진행.

- 2026-09-03: 4번([경찰서] 피전 · 경호 상세) — **접수 상태만 부분 연동/검증(△, 완료 아님)**.
  `securityCaseDetail.ts` 5개 함수를 mock(`/security-cases/*`)에서 실엔드포인트로 교체:
  조회 `GET Deploy/Police/W/GetDeployDetail`, 접수취소·경호취소 공용 `POST CancelGuardCase`,
  연장/단축 `PATCH Extend|ShortenDeployPeriod`, 종결 `POST CloseGuardCase`. `splitMgmtNo`를
  `shared/lib/managementNumber.ts`로 추출(목록 연동과 공유). 취소/연장/종결 함수 반환형은
  `Promise<SecurityCase>` → `Promise<void>`(호출부가 결과를 안 씀).

  검증 범위: **접수 상태 상세 조회만 사용자 확인**. 접수취소는 버려도 되는 84·85번 건을
  새로 만들어 end-to-end 검증(생성 → UI/curl 취소 → 목록에서 사라짐, 81·82 무손상). 배정
  이후가 필요한 경호취소·연장·단축·종결은 실백엔드에 배정 건이 없어 **코드만 교체하고
  미검증**. 종결 DTO는 `caseSeq`를 요구하는데 `GetDeployDetail`이 안 줘서 `deployReqSeq`를
  임시로 넘김 — 9번(본사 경호 상세)에서 `GetGuardCaseDetail` 분기와 함께 재검증/수정.
  (※ 아래 순서 재정렬 전 기준으로는 "12번"이었음)

  주요 발견: (a) `GetDeployDetail` 접수단계 응답은 `startDt`/`endDt` null, 경호기간은
  `periodFrom`/`periodTo`. 배치장소 4필드(`guardHomeLoc` 등)는 스키마에 존재하나 전부
  null(작성 때 D-2로 주거지만 보낸 값도 안 돌아옴) — issues #5 보강. (b) 성별·생년월일·
  직업·사건개요·참고사항 없음 → 5번(배치요구서 수정) prefill에서 별도 확인 필요
  (exclusions.md `경호 상세` 섹션). (c) 상세 진입 시 `RefreshToken` 4회 호출 문제 —
  원인은 `SecurityCaseDetailPage`가 mock 전용 `GET /api/workers`(본사 `GetGuardList`)를
  근무자 조인용으로 부르던 것. 실백엔드에서 401 → RefreshToken → React Query retry×3로
  증폭. 백엔드 확인 결과 **경호 상세에서 배정된 근무 스케줄을 조회하는 API 자체가 누락**
  (issues #6 신규). mock 연결을 끊어(`workers = []`) 상세 진입 API 호출을 `GetDeployDetail`
  1건으로 축소, 콘솔 에러 없음 확인.

  인프라: `mocks/handlers/deploy.ts`에 테스트 전용 더블 5개 추가(`GetDeployDetail` 외 4종).
  `GetDeployDetail` 더블은 `mock` 필드로 전체 `SecurityCase` 레코드를 실어 보내 배정 이후
  상태(baseInfo/schedule/attachments 등) 화면 회귀를 vitest 오프라인으로 유지 —
  9번(본사 경호 상세) 실측에서 정리.

  검증: `npm run test`(114/114)·lint·build 통과. 실백엔드 `run-s-pgms` — 동래
  (`SPoliceM5`) 로그인 → 경호목록 → 접수건 상세 진입 정상 렌더, 접수취소 end-to-end,
  콘솔 에러 없음. 응답 샘플: `docs/backend-integration-responses/Deploy-Police-GetDeployDetail.md`,
  `Deploy-Police-CancelGuardCase.md`.

  ⚠️ **완료 표시 보류** — 배정 이후 상태 + 9번(본사 경호 상세) 이후 재확인 필요.

- 2026-09-03: **작업 순서 재정렬 확정** (사용자 결정). 이전 "계정권한 단위로 화면군을
  통째로 끝내고 다음 역할로"(2026-09-01) → **메인 워크플로우(경호건 생명주기) 우선**으로
  변경. 이유: 배정 이후 상태를 만들어내는 화면(본사 배정·경호계획)이 뒤에 있어 피전
  2·4번이 계속 "배정 후 미검증 → 재검증 이월"로 밀렸음. loop-screens에서 메인 흐름
  화면을 앞당긴 것과 같은 논리.
  - 그룹 A(피전 경호관리) → 그룹 B(본사 메인 워크플로우 + 검증, 본부관리자 스코프
    재검증 포함) → 그룹 C(이력 3종) → 그룹 D(게스트 2종). 18행 → 17행.
  - 피전 게스트관리·피전 이력·게스트 계정을 뒤로, 본사 근무자~본부관리자 재검증을 앞으로.
  - 함께 확정: **개발은 화면 단위(1 iteration = 표 1행) 유지, 백엔드에 요청하는 건 섹션
    단위** — 한 섹션의 화면을 다 훑으며 쌓인 issues/exclusions를 섹션 종료 시 한 번에
    묶어 백엔드로 전달, 응답 안 기다리고 다음 섹션 진행. 백엔드 완료분은 화면 경계에서
    (현재 화면 마무리 → 다음 화면 착수 전 확인·수정·반영·검증) 흡수.
  - 반영 파일: 이 표, `docs/backend-integration-screen-api-matrix.md` "권장 진행 순서",
    `docs/roadmap.md` Phase 5, `TASK.md` "Loop 단위", `LOOP_INSTRUCTIONS.md` 1·7단계,
    `docs/backend-integration-process.md` 원칙 4(신규).

- 2026-09-02: 3번([경찰서] 피전 · 접수/배치요구서 작성) 연동 완료. `createSecurityCase`를
  mock(`POST /security-cases`) → `POST Deploy/Police/W/AddDeployRequest`로 교체.
  `SecurityCaseCreateInput`(폼) → `AddDeployRequestDto`(서버) 매핑, envelope 성공 판정.

  사전 결정 3건(사용자와 논의): (1) **요구자**를 단일 자유입력에서 `clientDept`/
  `clientPosition`/`clientName` 3필드로 분리 — 타입 `requester: string` → `{dept,
  position, name}`, 폼 8번 섹션 UI 변경. (2) **생년월일** — 출생년도 입력을 `DateField`
  생년월일 입력으로 교체, 타입 `subject.birthYear` → `birthDate`, `age` 제거(만나이는
  `shared/lib/subject.ts` `calcAge`로 계산해 표시). (3) **배치장소** — 폼은 주거지/직장지/
  기타1/기타2 4필드인데 실제 API는 `deploymentPlace` 단일. 폼을 줄이지 않고 백엔드에
  4필드 확장 요청(`issues.md` #5, `blockers.md`), 반영 전까지 **주거지만 전송하는 D-2
  임시 처리**(`exclusions.md`). 폼 변경분은 loop-screens 승인 절차대로 스크린샷 제시 후
  승인받음.

  주요 발견: (a) 성공 응답이 `{message, data:true, code:200}` — 생성된 `deployReqSeq`/
  `mgmtNo`를 안 돌려줌(프론트는 목록으로 이동해 확인). (b) 스웨거 `required`는
  `[groupSeq, suspectName]`뿐이지만 서버는 `suspectJob`/`suspectAddress`/
  `deploymentPlace`/`clientDept`/`clientPosition`/`clientName`도 필수로 강제(400 +
  `errors` 맵, DB `NOT NULL` 컬럼과 일치) — 우리 폼이 이미 전부 필수 검증이라 추가 대응
  불필요. (c) `mgmtNo` 조합형태 `"26-09-동래경찰서 접수"` 확정(2번 재검증). (d)
  `suspectGender` 코드 `0=남/1=여`(`genderLabelToCode`). (e) Windows Git Bash에서
  인라인 `curl -d` 한글이 cp949로 깨져 500 → UTF-8 파일 바디(`--data-binary @file`)로
  확인.

  캘린더: 생년월일용으로 `DateField`에 opt-in `yearGrid` prop 신규 — 캡션 클릭 시 9칸
  (3×3) 연도 그리드로 전환, ‹ › 9년 페이징, 값 있으면 그 연도 중앙. 배치기간 등 다른
  DateField는 기본값(off)이라 무변경. 이 테마에서 `--muted`/`--accent`가 `--background`와
  같은 색이라 header hover는 `color-mix(secondary, foreground 8%)` 사용. `YearGrid`는
  DayPicker root와 별개로 렌더돼 `--cell-size`/`--cell-radius`를 못 물려받아 고정값
  (`w-7 h-7`/`rounded-sm`) 사용. 부수 수정: `CalendarDayButton`의 `[&>span]:opacity-70`
  제거(선택일 흰 글자가 회색으로 보이던 문제, 앱 전체 date picker 공통 개선).

  인프라: 테스트 더블 `mocks/handlers/deploy.ts`에 `POST AddDeployRequest` 핸들러 추가
  (DTO를 다시 `SecurityCaseCreateInput`으로 되돌려 mock `createSecurityCase`에 넘겨
  같은 인메모리 배열에 쌓음). 캘린더 팝오버 3개를 순차 조작하는 폼 제출 테스트가 풀
  스위트 부하에서 기본 5초를 간헐 초과 → `vite.config.ts`에 `testTimeout: 15000`.

  검증: `npm run test`(114/114, 풀 스위트 3회 연속)·lint·build 통과. 실제 백엔드
  `run-s-pgms` — 동래(`SPoliceM5`) 로그인 → 신규접수 폼 작성 → 등록 → 경호목록에
  `"26-09-동래경찰서 · 접수" / 홍** / 2026.09.10~20` 렌더 확인, 콘솔 에러 없음. curl로
  성공 응답·검증 규칙 별도 확인. 검증 과정에서 동래에 실제 접수건 2건 생성됨(deploySeq
  81·82) — 되돌리지 않고 남겨둠, matrix 10번(본사 배치요청→배정) 입력 데이터로 재사용.

- 2026-09-01: 2번([경찰서] 피전 · 경찰서 경호목록) 연동 완료(구현 커밋 `2679751`).
  `listSecurityCases`를 `GET Deploy/Police/W/GetDeployList`로 교체.

  주요 발견/결정: (1) `groupSeq`가 필수 파라미터 — 토큰 소속으로 자동 추론 안 하고
  없으면 400. 로그인 시 `GetMyProfile.groupSeq`를 세션에 실어야 해서 `AuthUser`에
  `groupSeq?`/`groupName?`(optional) 추가, `login()`이 채우도록 함(로그인 iteration의
  exclusions 항목 해소). (2) 스코프 우려(analysis.md 4-6 / issues 스코프) 해소 —
  동래 토큰으로 타 `groupSeq` 요청 시 전부 403, 서버가 강제. (3) `mgmtNo`가 서버에서
  이미 조합된 완성 문자열("26-08-동래경찰서 접수" / 배정 후 "… ST###" 가정) — 사용자
  지시로 **마지막 공백에서 slice** 후 `formatManagementNumber`로 "· "재조합("… · 접수").
  기존 접수 행 표기가 "접수번호"만 → "접수번호 · 접수"로 바뀜(승인된 화면 대비 이
  부분만 변화, 관련 테스트 갱신). (4) 페이지네이션·status 파라미터 없음(전량 로드 +
  클라이언트 필터라 무관), `keyword`는 관리번호에만 매칭. (5) 배정 이후 `statusName`
  문자열이 프론트 라벨과 일치하는지는 데이터가 "접수" 1건뿐이라 미검증 —
  exclusions.md 기록, **3번 직후 + 12·16번 이후 목록 재검증** 필요.

  구현 결정(백엔드 갭 아님): `GuestListPage`(matrix 6번, 미연동)가 경호목록과
  `listSecurityCases`+쿼리키를 공유하고 있어, 실제 API로 교체하면 게스트 화면의
  `caseIds` 대조가 깨짐 — `GuestListPage`를 별도 mock 함수(`listGuestScopeSecurityCases`)
  +별도 쿼리키로 분리해 동작 불변으로 유지(6번 연동 때 정식 처리).

  인프라: 실제 연동 완료 경로(`GET /api/v1/Deploy/Police/W/GetDeployList`)를
  `mocks/handlers/deploy.ts`(테스트 전용, `server.ts`에만 등록)로 옮겨 브라우저는
  vite 프록시로 실제 백엔드, vitest는 오프라인 더블 사용 — 로그인 때 `auth.ts`
  분리와 동일 패턴. `index.ts`의 `testOnlyHandlers`를 `[...authHandlers,
  ...deployTestHandlers]`로 확장.

  검증: `npm run test`(114/114)·lint·build 통과. 실제 백엔드 `run-s-pgms` —
  `SPoliceM5`(동래경찰서→"피전") 로그인 시 세션 `groupSeq:32` 확인, 경호목록에
  실데이터 1건("26-08-동래경찰서 · 접수" / 접수 / 2026.08.19~23) 렌더, 데스크톱·
  모바일 회귀 없음, 콘솔 에러 없음. 응답 샘플:
  `docs/backend-integration-responses/Deploy-Police-GetDeployList.md`.

- 2026-09-01: 1번(로그인) 연동 완료(커밋 `008383a`). 응답 샘플 5개 확보 —
  Login/GetMyProfile/RefreshToken/Logout은 사용자가 준 실제 백엔드 주소로 직접
  curl해서 확보, ChangePassword는 임시 본부관리자 테스트 계정(`AddStecUser`로
  생성한 `StecM4`)을 만들어 최초 로그인 강제변경 흐름 전체(428 응답 → 변경 →
  재로그인)를 실제로 검증한 뒤 `useYn=false`로 비활성화(삭제 API 없어 완전
  삭제는 불가, 사용자 승인 하에 진행).

  주요 발견: (1) 로그인 응답엔 role이 없어 `GetMyProfile`을 이어서 호출해야
  함 — 다만 `Login` 응답의 `code` 필드가 `100+codeSeq`라 사실 로그인 응답만으로도
  역할 구분 자체는 가능하다는 것도 확인(사용자가 이 발견을 근거로 로그인 화면
  통합을 제안, roadmap.md 백로그로 별도 분리). (2) `codeSeq`→프론트 `Role` 매핑이
  꼭 필요 — 본청관리자/지방청관리자/피전처럼 실제 `codeName`과 우리 라벨이
  다름(`features/auth/lib/roleMapping.ts` 신규). (3) 응답이 공통으로
  `{message,data,code}` envelope — `shared/api/envelope.ts`로 공용 헬퍼화(앞으로
  연동하는 모든 화면이 재사용). (4) 최초 로그인은 200이 아니라 HTTP 428로 신호.
  (5) `ChangePassword`가 기존 비밀번호를 검증하지 않는 설계 특이점 발견 —
  issues.md #4로 기록, 사용자 결정으로 비밀번호 정책 확정 시까지 보류. (6)
  `RefreshToken`은 accessToken+refreshToken 둘 다 필요(mock은 refreshToken만
  보냈었음). (7) `Logout`은 mock에 없던 신규 기능이라 AppShell 로그아웃
  버튼에 새로 연결, 서버 세션이 실제로 끊기는 것까지 확인.

  인프라: vite dev 서버에 `/api/v1` 프록시 추가(`.env.local`의
  `API_PROXY_TARGET`, git 미커밋) — 연동 완료 경로는 실제 백엔드로, 나머지는
  MSW가 계속 처리하도록 분리(`mocks/handlers/index.ts`의 `handlers`/
  `testOnlyHandlers` 분리 — 브라우저는 `handlers`만, vitest는 둘 다 등록해
  연동된 화면도 오프라인 테스트 가능하게 함). 알려진 전환기 현상: 아직
  미연동인 화면(경호목록 등)은 실제 백엔드 계정으로 로그인하면 401 — mock
  seed 계정과 실제 백엔드 계정이 서로 다른 데이터라 생기는 것으로, 다음
  iteration들이 그 화면을 연결하면서 자연 해소(exclusions.md 기록).

  검증: `npm run test`(114/114)·lint·build 통과. 실제 백엔드 대상
  `run-s-pgms` 브라우저 검증 — 경찰(`SPoliceM5`, 동래경찰서→"피전" 배지)·
  본사(`StecM1`→"운영관리자") 로그인/로그아웃 정상, 콘솔에는 예상된(미연동
  화면의) 401 외 에러 없음.
