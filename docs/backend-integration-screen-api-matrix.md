# 화면 × API 매트릭스 (계정권한별)

`docs/backend-integration-analysis.md`(스웨거/DB 갭 분석)를 화면 단위로 재가공한
작업 체크리스트입니다. `.claude/loop-backend/`가 이 문서를 순회하며 화면 단위로
연동 작업을 진행합니다. 화면 하나에 API가 여러 개 걸리는 경우 한 줄에 몰아 적지
않고 API 하나당 한 행으로 나눴습니다.

**⚠️ 표시 = mock엔 있지만 실제 백엔드 API에 없는 것.** 연동 시 반드시 짚고 넘어가야
할 항목이며, 상세 내용은 `docs/backend-integration-issues.md` 또는
`docs/backend-integration-blockers.md`로 옮겨 기록합니다.

같은 화면 컴포넌트를 여러 역할이 공유하는 경우(예: 회사 쪽 경호 상세는 시스템/운영/
본부관리자가 다 씀) 화면 자체는 한 번만 상세히 적고, 역할별로는 접근 가능 여부와
권한 차이만 표시합니다.

## 권장 진행 순서 (2026-09-02, 계정권한별 완전 분리로 재정렬)

큰 틀은 **계정권한 단위로 화면군을 통째로 끝내고 다음 역할로 넘어가는 것**입니다
— 피전 → 운영관리자(+시스템관리자) → 본부관리자 → 본청/지역청 순서(2026-09-01
결정). 그 안에서 화면 하나하나의 순서는 여전히 의존성 기준(조회를 먼저 연결해야
뒤이어 연결하는 생성/수정 결과를 확인할 수 있음)입니다.

1. **로그인** — 경찰/본사 전부의 전제조건, 유일하게 역할보다 먼저 오는 항목
2. **[경찰서] 피전 — 경찰서 경호목록** (조회) — 이후 피전 작업 결과를 확인할 창구.
   ✅ 연동 완료(2026-09-01). 단 실측 시점 데이터가 "접수" 1건뿐이라 **3번(신규 접수)
   직후, 그리고 12·16번(배정→경호중→경호완료 데이터 생성) 이후에 목록을 다시 열어
   재검증** 필요 — 새 접수가 목록에 반영되는지, 배정 이후 `statusName` 문자열이 화면
   `SecurityCaseStatus` 라벨과 일치하는지, 관리번호가 배정 후 실제 경호코드로 조합되는지
3. **[경찰서] 피전 — 접수/배치요구서 작성** (생성) — 2에서 바로 결과 확인
   (작성 직후 2번 목록 재검증)
4. **[경찰서] 피전 — 경호 상세** (조회 + 접수취소/연장단축요청/종결) — 접수 단계는
   지금 검증 가능. 배정 이후 상태(연장/단축/경호취소/종결)는 아직 배정된 건이 없어
   12번(본사 경호 상세) 이후에 재검증
5. **[경찰서] 피전 — 배치요구서 수정**
6. **[경찰서] 피전 — 게스트 계정 관리** (목록 → 발급 → 수정 → 삭제)
7. **[경찰서] 피전 — 이력 조회** — 이 시점엔 접수취소 데이터 정도만 있고 종결 데이터는
   없을 수 있음(종결은 배정→경호중→경호완료를 거쳐야 함) — 16번 이후 재확인
8. **[경찰서] 게스트 — 경호목록 + 상세** (조회 전용, 6·2 이후)
9. **[본사] 운영관리자/시스템관리자 — 근무자 목록/등록** — 12번(경호계획 등록)이
   근무자 드롭다운으로 의존하므로 선행
10. **[본사] 운영관리자/시스템관리자 — 배치요청 목록 (+본부 배정 액션)** — 3의 접수
    데이터로 배정 실행. **여기서 처음으로 GuardCase(경호건)가 실제로 생성됨**
11. **[본사] 운영관리자/시스템관리자 — 경호목록** (조회) — 10에서 만든 배정 건이
    이제 보여야 함
12. **[본사] 운영관리자/시스템관리자 — 경호 상세** (경호계획 등록/수정, 스케줄,
    사전미팅, 첨부, 취소) — 10·11 이후, 9의 근무자 데이터 필요. 완료 후 **4번(경찰
    쪽 경호 상세)의 배정 이후 상태 + 2번(경찰서 경호목록)의 배정 이후 상태 표시를
    재검증**
13. **[본사] 운영관리자/시스템관리자 — 연장/단축요청 목록 (+승인/거부)** — 4번
    재검증에서 경찰이 신청한 데이터 필요
14. **[본사] 운영관리자/시스템관리자 — 관리자 계정 관리** — 11 이후(담당경호 조회가
    경호목록 API 재사용)
15. **[본사] 운영관리자/시스템관리자 — 이력 조회** — 4·12의 종결·취소 처리가 실제로
    터미널 데이터를 만들어야 의미 있음, 운영관리자 화면군 중 가장 나중
16. **[본사] 본부관리자 — 스코프 재검증** (경호목록/상세/연장단축/이력/관리자계정/
    근무자) — API 연동 자체는 9~15에서 이미 끝나 있으므로, 본부관리자로 재로그인해서
    "본인 배정 건만" 스코프 제한이 실제로 걸리는지 확인하는 단계. 이때 7번([경찰서]
    이력 조회)도 함께 재확인해 종결 데이터가 정상 반영됐는지 본다
17. **[본청]/[지역청] — 이력 조회 + 진행중 상세** — 4·12의 데이터 필요, 전체 중
    가장 나중
18. **대시보드류** — Phase 4 자체가 보류 중이라 순서에서 제외, 착수 시 참고만

이 순서는 `.claude/loop-backend/PROGRESS.md`의 표 순서와 그대로 맞춰뒀습니다 — 그
문서의 "다음 대상"이 곧 이 번호 순서입니다.

---

## 1. [경찰서] 피전

#### 경찰서 경호목록 (`/security-cases`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listSecurityCases` | `GET Deploy/Police/W/GetDeployList` | ✅ 연동 완료(2026-09-01). `groupSeq`(필수)는 로그인 시 `GetMyProfile`로 받아 세션에 저장한 값 사용, 권한 밖 `groupSeq`는 서버가 403으로 막음(analysis.md 4-6 스코프 우려 해소). status/페이지네이션 파라미터 없음 — 화면이 전량 로드 후 클라이언트 필터라 무관. `mgmtNo`는 서버 조합 완성형("… 접수" / "… ST###")이라 마지막 공백에서 잘라 `formatManagementNumber`로 재조합. **배정 이후 상태 문자열은 데이터 없어 미검증 → 12·16번 이후 재검증**(exclusions.md). 응답 샘플: `docs/backend-integration-responses/Deploy-Police-GetDeployList.md` |

#### 접수/배치요구서 작성 (`/security-cases/new`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 접수 등록 | `createSecurityCase` | `POST Deploy/Police/W/AddDeployRequest` | 필드 거의 1:1 |

#### 경호 상세 (`/security-cases/:id`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 조회 | `getSecurityCase` | `GetDeployDetail` / `GetGuardCaseDetail` | 배정 이후 상태(연장/단축요청 등)는 12번(본사 경호 상세) 이후에나 재현 가능 |
| 접수취소 | `cancelPendingCase` | `POST CancelGuardCase` | 접수 단계에서 바로 검증 가능 |
| 경호취소 | `cancelAssignedCase` | `POST CancelGuardCase` | 위와 동일 엔드포인트 — 배정 이후 상태 필요, 12번 이후 재검증 |
| 연장/단축 요청 | `requestPeriodChange` | `PATCH ExtendDeployPeriod` / `ShortenDeployPeriod` | 배정 이후 상태 필요, 12번 이후 재검증 |
| 종결 | `closeCase` | `POST CloseGuardCase` | 배정 이후 상태 필요, 12번 이후 재검증. 종결 시 배치요구서·첨부파일 3종이 실제로 삭제됨(mock은 안 지움) — 이력 화면 영향(analysis.md 6-5) |

#### 배치요구서 수정 (`/security-cases/:id/edit`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 조회 | `getSecurityCase` | `GetDeployDetail` / `GetGuardCaseDetail`(배정 여부로 분기) | |
| 수정 저장 | `updateSecurityCase` | `PUT UpdateDeployRequest` | 배정 후엔 배치기간 필드가 서버에서 조용히 무시됨(화면은 이미 UI에서 비활성화 처리해뒀음) |

#### 게스트 계정 관리 (`/guests`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listGuestAccounts` | `GET User/Police/W/GetGuestUserList` | |
| 발급 후보 조회 | (없음, `listSecurityCases` 재사용) | `GET GetGuestCaseList` | 실제 API는 발급용 후보 조회가 전용 엔드포인트로 분리돼 있음 |
| 아이디 미리보기 | `previewNextGuestAccount`(`/guests/next-id`) | ⚠️ **없음** | issues.md #3 — 발급 시 서버가 즉시 확정해 응답으로 내려주는 구조로 보임 |
| 발급 | `issueGuestAccount` | `POST AddGuestUser` | |
| 수정 후보 조회 | (없음, `listSecurityCases` 재사용) | `GET GetGuestCaseDetail` | 실제 API는 수정용 후보 조회(`isAccess` 포함)도 별도 엔드포인트 |
| 조회권 수정 | `updateGuestAccount` | `PATCH UpdateGuestCaseInfo` | |
| 삭제 | `deleteGuestAccount` | `POST DeleteGuestUser` | |

#### 이력 조회 (`/history`, `/history/:id`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listSecurityCaseHistory` | `GET History/Police/W/GetHistoryList` | 이 시점엔 접수취소 정도만 있고 종결 데이터는 없을 수 있음(종결은 배정→경호중→경호완료를 거쳐야 함) — 16번 이후 재확인 |
| 상세 조회 | `getSecurityCaseHistoryDetail` | `GET History/Police/W/GetHistoryDetail` | 위와 동일 |

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

6·2번(게스트 계정 관리, 경찰서 경호목록) 연동 완료 후 진행.

#### 경호목록 (`/security-cases`, 조회 전용)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listSecurityCases` | `GET Deploy/Police/W/GetDeployList`(조회권 있는 건만) | 게스트 전용 필터가 이 API에 있는지, `GUEST_CASE_ACCESS` 조인을 서버가 알아서 적용하는지 확인 필요 |

#### 경호 상세 (`/security-cases/:id`, 조회 전용)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 조회 | `getSecurityCase` | `GetDeployDetail` / `GetGuardCaseDetail` | 액션 버튼 없음(화면단 처리) |

#### 로그인 (`/`) — ✅ 연동 완료(1번 표와 동일 구현, 커밋 `008383a`)

---

## 3. [본사] 운영관리자 / 시스템관리자

두 역할이 접근 가능한 화면이 거의 동일(운영관리자도 시스템관리자와 동일 범위 —
`docs/project-overview.md`). 시스템관리자만 추가로 접근하는 화면: **배치요청 목록**
(운영관리자도 접근 가능). 본부관리자는 API 연동 자체가 끝난 뒤 별도 4번 섹션에서
스코프만 재검증한다(2026-09-01 결정 — 계정권한 단위로 화면군을 통째로 진행).

#### 근무자 목록/등록 (`/admin/workers`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listWorkers` | `GET Guard/Stec/W/GetGuardList` | |
| 등록 | `registerWorker` | `POST AddGuardInfo` | |
| 수정 | (mock에 없음) | `PATCH PatchGuardInfo` | 반대 방향 공백 — 연동하면 새로 얻는 기능 |
| 삭제 | (mock에 없음) | `DELETE DeleteGuardInfo` | 반대 방향 공백 — 연동하면 새로 얻는 기능 |

#### 배치요청 목록 (`/admin/requests`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listPendingRequests` | `GET GuardCase/Stec/W/GetDeployRequestList` | 3번(경찰 접수) 데이터 필요 |
| 담당자 선택 목록 | `listManagers` | ⚠️ 전용 엔드포인트 불명확 | `GetStecUserList`를 역할 필터링해서 재사용할 가능성 |
| 본부 배정 | `assignManager` | `POST GuardCase/Stec/W/AddGuardCase` | **여기서 GuardCase(경호건)가 처음 생성됨** — 이후 모든 본사 화면의 전제 |
| 취소 | `cancelPendingRequest` | `POST CancelGuardCase` | |

#### 경호목록 (`/admin/security-cases`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listSecurityCases` | `GET GuardCase/Stec/W/GetGuardCaseList` | 페이지네이션 있음. 직전(배치요청목록) 단계에서 배정한 건이 보여야 함 |

#### 경호 상세 (`/admin/security-cases/:id`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 조회 | `getSecurityCase` | `GET GuardCase/Stec/W/GetGuardCaseDetail` | |
| 경호계획 등록 | `registerBaseInfo` | `PUT AddGuardCaseInfo` | 근무자 목록(위 표) 필요. 스케줄 생성 후엔 409 — mock에 이 가드 없음, 추가 필요 |
| 경호계획 부분수정 | (mock에 없음) | `PATCH PatchCaseInfo` | mock 미구현 기능 — 지금은 항상 `AddGuardCaseInfo` 전체 덮어쓰기만 함, 연동 시 새로 붙여야 함(반대 방향 공백) |
| 경호취소 | `cancelAssignedCase` | `POST CancelGuardCase` | |
| 스케줄 자동생성 | `createSchedule` | `POST AutoAddSchedule` | 대표 경호원만 자동 반영 — mock은 전원 반영, 재구현 필요(analysis.md 6-4) |
| 근무조 저장 | `upsertScheduleGroup` | `PUT PatchScheduleGroup` | |
| 사전미팅 저장 | `setPreMeeting` | `PUT SaveCaseMeeting` | |
| 경호계획서 업로드 | `setSecurityPlanFile` | `PUT PatchGuardPlanDoc` | ⚠️ 실제로는 `multipart/form-data` 파일 업로드, mock은 `{fileName}` JSON만 보냄 — 프론트 구현 새로 해야 함 |
| 개인정보동의서 업로드 | `setWorkerConsentFile` | `PUT PatchConsentDoc` | 위와 동일한 형태 차이 |
| 파기확인서 업로드 | `setDestructionCertFile` | `PUT PatchDestroyDoc` | 위와 동일한 형태 차이 |

이 화면 완료 후 **4번([경찰서] 경호 상세)의 배정 이후 상태(연장/단축요청, 경호취소,
종결)를 재검증**한다 — 그때는 배정된 건이 없어서 못 본 부분.

#### 연장요청/단축요청 목록 (`/admin/period-requests/extension`, `/shorten`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listPeriodRequests` | `GET GetExtendRequestList` / `GetShortenRequestList` | 경찰 쪽에서 신청한 데이터 필요(위 재검증 단계에서 만들어짐) |
| 승인 | `approvePeriodRequest` | `POST ConfirmCasePeriod` | |
| 거부 | `rejectPeriodRequest` | ⚠️ **없음** | issues.md #2 — 방향 확정 전까지 블로커 후보 |

#### 관리자 계정 관리 (`/admin/managers`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listManagerAccounts` | `GET User/Stec/W/GetStecUserList` | "본부" 컬럼/필터는 issues.md #1 방향 확정 전까지 보류 대상 |
| 정보수정 | `updateManagerAccountInfo` | `PATCH User/Stec/W/UpdateUser` | |
| 비밀번호 초기화 | `resetManagerAccountPassword` | `PATCH User/Stec/W/UpdateUser` | 정보수정과 동일 엔드포인트, 파라미터만 다름 |
| 계정 정지/재활성화 | (mock에 없음) | `PATCH UpdateUser`의 `useYn` | 반대 방향 공백 — 연동하면 새로 얻는 기능 |
| 담당경호 조회 | `listSecurityCases`(재사용, `ManagerAssignedCasesDialog`) | `GET GetGuardCaseList` | 위 경호목록 연동 이후 |

#### 이력 조회 (`/admin/history`, `/admin/history/:id`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listSecurityCaseHistory`(경찰 쪽 함수 재사용) | `GET History/Stec/W/GetHistoryList` | 종결·취소 데이터 필요 — 본사 쪽에서 가장 나중에 진행 |
| 상세 조회 | `getSecurityCaseHistoryDetail`(경찰 쪽 함수 재사용) | `GET GetHistoryDetail` | Police와 동일 엔드포인트 공용인지 확인 필요 |

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

#### 이력 조회 (`/history`, `/history/:id`)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 목록 조회 | `listSecurityCaseHistory` | `GET History/Police/W/GetHistoryList` | mock은 본청/지역청에 한해 진행중 건도 이력 화면에 같이 보여주는데(Phase3 항목1 결정), 실제 `GetHistoryList`는 "끝난 경호건만"(HIST-001) — 진행중 건은 별도로 `GetGuardCaseList`류를 호출해야 할 수 있음, 본청/지역청이 그 API(Stec 태그)에 접근 권한이 있는지 확인 필요 |
| 상세 조회 | `getSecurityCaseHistoryDetail` | `GET History/Police/W/GetHistoryDetail` | |

#### 진행중 건 상세 (`/security-cases/:id`, 조회 전용)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 조회 | `getSecurityCase` | `GetDeployDetail` / `GetGuardCaseDetail` | 위와 같은 이유로 실제 접근 가능한 엔드포인트인지 확인 필요 |

#### 대시보드 (`/dashboard`, 아직 미구현·Phase 4)

| API 기능 | mock 함수 | 실제 엔드포인트 | 비고 |
|---|---|---|---|
| 상태별/조직별 건수 | (미구현) | `GetDashBoardCount` / `GetDashBoardGroupCount` | |

#### 로그인 (`/`) — ✅ 연동 완료(1번 표와 동일 구현, 커밋 `008383a`)

---

## 전체 요약 — ⚠️ mock과 실제 API가 어긋나는 지점

**mock에만 있고 실제 API엔 없음** (issues.md로 옮겨 관리):
1. 연장/단축 거부 (`rejectPeriodRequest`) — issues.md #2
2. 게스트 아이디 미리보기 (`previewNextGuestAccount`) — issues.md #3

**실제 API에만 있고 mock엔 없음** (이슈 아님 — 연동하면서 새로 구현할 기능, `.claude/loop-backend/PROGRESS.md`에서 화면 단위로 자연 처리):
3. 경호계획 부분수정(`PatchCaseInfo`)
4. 근무자 수정/삭제(`PatchGuardInfo`/`DeleteGuardInfo`)
5. 관리자 계정 정지/재활성화(`UpdateUser`의 `useYn`)
6. 로그아웃(`Logout`)

**구조가 다름** (없는 기능은 아니지만 연동 방식 자체를 바꿔야 함):
7. 로그인 엔드포인트 통합 — mock은 경찰/본사 2개, 실제는 1개
8. 첨부파일 업로드 — mock은 `{fileName}` JSON, 실제는 `multipart/form-data`
