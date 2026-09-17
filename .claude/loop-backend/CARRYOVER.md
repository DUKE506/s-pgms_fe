# CARRYOVER — 이월·재검증 레지스터

한 iteration에서 끝내지 못하고 **조건이 충족돼야 다시 볼 수 있는** 것들. `PROGRESS.md`
비고에도 남기되, 흩어지지 않게 여기 한곳에 모은다. 조건이 충족되면 회신반영/재검증
iteration으로 소진한다(`LOOP_INSTRUCTIONS.md` 0단계).

## A. 백엔드 회신 대기

전달한 요청서의 응답 대기. 완료 통보가 오면 **다음 화면 착수 전** 회신반영 iteration.
B-2·C·D 통합 전달본: `requests/2026-09-08-미회신-B2-C-D.xlsx`(시트 3개).

| 요청서 | 대상 | 회신 시 반영할 것 |
|---|---|---|
| `requests/2026-09-08-본사-경호관리-B2.md` | 섹션 B-2 (#10~#12) | **부분 반영(2026-09-09~10)**: `CancelGuardCase` 배선(#7·#9), `GetStecUserList` 본부관리자 200(#11), **"본부" 열 제거**(findings #1 본부 파트 🟢), **`GetCaseSchedule.memo` 반영**(2026-09-10, 근무조 특이사항 — findings #12 memo 파트 🟢). **2026-09-11 운영팀 결정으로 2건 요청 자체가 불필요해짐**: 사전미팅 근무자별 시간(UI를 미팅 단위로 재설계, findings SaveCaseMeeting 항목 🟢) / 연장·단축 거부 EP(본사에서 거부 기능 자체를 제거, 항목1). `GetGuardList.deptName`은 **회신 완료(2026-09-10)** — `deptNm` 필드로 실려 옴, `WorkerListPage` 부서 컬럼 복원 완료(findings #8 🟢). **본부관리자 "소속 본부" FK·"담당자 개인정보"(성명/직급/연락처) 구조화는 사용자 결정으로 종결(2026-09-14)** — 지금 형태(조직 공유 계정 NAME/PHONE) 그대로 사용, 백엔드에 요청 안 함(findings #1). **`GetGuardCaseList` 담당자 `userSeq` 조인도 회신 완료(2026-09-14)** — 응답에 실값(`userSeq:104` 등) 채워짐, `ManagerAccountListPage`·`ManagerAssignedCasesDialog`를 이름 매칭→id 매칭으로 전환(findings #1 🟢 전체 종결). **findings #1 완전 종료.** **`isRepresentative`도 회신 완료(2026-09-14)** — `GetCaseGuardList` 응답에 실값 채워짐, `toBaseInfo`가 이름 추정 대신 실값 사용(findings #12 🟢 전체 종결). **추가 요청(2026-09-10)**: `GetDeployList`·`GetDeployDetail`에 숫자 `status`(findings #19). **2026-09-11 확인**: 요청 대상(피전 `Deploy/Police/W/GetDeployList`·`GetDeployDetail`·`GetDeployDetailUpdate`)엔 아직 없음(라이브 프로브 3곳 다 없음) — **여전히 미회신**, `resolveDeployStatus` 임시 처리 유지 필요. 대신 **본사** `GuardCase/Stec/W/GetGuardCaseList`(화면8)엔 별도로 `guardCaseStatus`(0:배정/1:경호중/2:경호완료/3:종결/4:경호취소) 신규 확인됨 — 요청한 적 없는 엔드포인트에 붙음. 사용자 결정: 본사 경호목록 상태를 `statusName` 대신 이 코드로 전환(D절 신규 행) |
| ~~`GetDeployDetail`에 `caseSeq` 추가 요청 + `docGuardDetail` 필드명~~ | `Deploy/Police/W/GetDeployDetail` | **✅ 전부 해결** — caseSeq 파트(2026-09-10): 백엔드가 `CloseGuardCase`·`GetDestroyDocDownload` 두 EP를 `deploySeq` 키로 바꿔 `resolveCaseSeq` 우회 제거(findings #16 🟢). `docGuardDetail` 파트(2026-09-10, findings #18): 본사 업로드 실측 → `{docSeq, docType:0, docPath, fileName, fileExt}`, 다운로드 `/files/{docPath}` 연결 |
| ~~`requests/2026-09-08-이력-C.md`~~ | 섹션 C (#13~#15) | **✅ 회신 반영 완료(2026-09-09)** — `History/Stec/W/GetHistoryDetail` 신설(#13), `GetHistoryList` 역할 캐스케이드(#15). 상세 스코프 차단 적용·종결 시 배치장소 NULL 확정. 남은 것: 종결 건 데이터 대기(B절) + URL 직접 접근 스코프 일괄 테스트(아래 C절) |
| `requests/2026-09-08-게스트-D.md` | 섹션 D (#16~#17) | `useYn` = **종결**(백엔드 소프트삭제 전용, 경찰서 삭제 대비 — 프론트 무관, `useYn=false` 숨김 유지). `GetDeployDetail` 게스트 스코프 서버 보장 확인 → 아래 C절로 이관 |
| ~~사건유형 `crimeType` enum (2026-09-09 전달)~~ | `GetDeployDetail`·`GetDeployDetailUpdate`·`GetGuardCaseDetail`·`GuardCase/Stec/W/GetDeployDetail` | **✅ 종료(2026-09-11)** — 사용자 확인 + 라이브 프로브 추가 샘플(`stalking`/`threat`)로 enum 코드 일관 반환 재확인. `crimeCodeToCaseType`의 레거시 한글 폴백은 **유지**(방어적 코드라 제거 실익 없음, 사용자 판단) — 추가 작업 없음 |
| ~~[신규] 이력조회 종결 건 응답 필드 유지 요청~~ (2026-09-11) | `History/*/GetHistoryDetail` | **✅ 전부 해결(2026-09-14)** — 사건유형(`crimeType`)·5개 조치(summary1~5) 둘 다 실값 확인. 5개 조치는 처음 caseSeq 46·51(오염된 오래된 테스트 건)로는 "내용만 null"이라 매핑 누락으로 의심했으나, caseSeq 48(ST0004)로 재확인하니 실제 텍스트가 정상 반환 — 반복 테스트로 인한 데이터 오염이었을 뿐 엔드포인트 문제 아님(사용자 확인). 재요청 불필요, 코드 반영 완료 |
| [신규] 홈 대시보드 집계 API (2026-09-15, 사용자가 loop-backend 세션 밖에서 직접 요청) | `DashBoard/Police/W/GetDashBoardCount`·`GetDashBoardGroupCount`로 추정(findings.md #2022) — 정확한 EP는 회신 시 확인 | **화면(`DashboardPage.tsx`)에 지금 떠 있는 요소 전부**를 커버하는 집계 API 요청 — 상태별 현황 4종(접수/배정/경호중/경호완료), 지역별 건수 순위, 이번달 신규 접수+평균 경호기간, 연령·성별 비율, 접수 월별 추이(최근 6개월), 안전조치 항목별 적용률(4종). 지금은 전부 `DashboardPage.tsx` 상단 정적 더미 상수(`SUMMARY`/`REGION_RANKING`/`AGE_GROUPS`/`GENDER_SPLIT`/`MONTHLY_TREND`/`SAFETY_MEASURES`). 회신 오면 이 상수들을 쿼리 결과로 교체 — loop-backend 그룹 목록에 없던 화면이라(Phase4가 원래 보류 중이었음) 새 섹션으로 추가해 진행. 조직 트리 스코프 선택(조회범위 pill/사이드바) 연동 여부도 회신 시 같이 확인 필요(지금은 트리 노드에 박아둔 더미값끼리만 전환됨, 실제 서버 재조회 아님) |
| [신규] 계정 비밀번호 초기화 API 2종 (2026-09-17, 사용자가 세션 밖에서 직접 요청) | 목록조회(신규, 계층형 트리) + 초기화(신규, userSeq 지정) — 정확한 EP명은 회신 시 확인 | **스캐폴딩(A안) 완료(2026-09-17), API 연동은 회신 대기.** ① `/accounts`(본청·지역청, `AccountManagementPage.tsx`) ② `/guests`→"계정 관리"로 확장(`GuestListPage.tsx`, "내 계정" 카드+게스트 행 초기화) ③ `/admin/managers/police`·`/admin/managers/guests`(`ManagerTabs.tsx` 3탭) ④ `authStore.userSeq` 배선 — 전부 구현·빌드/lint/test(161개)·브라우저 검증(①③은 MSW 더블, ②는 실백엔드 SPoliceM5로 확인) 완료. 엔드포인트 경로는 전부 임시 추정치(`features/police/api/accountManagement.ts`의 `/v1/User/Police/W/GetPoliceAccountTree`·`ResetPoliceAccountPassword`) — **회신 오면 이 경로/필드명만 실제 스펙으로 교체**. 더블: `mocks/data/policeAccountTree.ts`+`mocks/handlers/policeAccounts.ts`(아직 mock인 화면 취급으로 `handlers`에 등록, 실 연동 완료 시 `testOnlyHandlers`로 이관). **열려있는 것**: 게스트 노드가 트리 안에서 정확히 어떤 필드 모양(레벨/이름/부모관계)으로 붙는지 예시 미확인 — 더블은 `levelName:'게스트'`·`groupSeq:null`로 임시 가정, 실 스펙 오면 `RawAccountNode`/mock 둘 다 맞춰 조정 필요 |

## B. 데이터·상태 대기 재검증

터미널 상태(종결·취소)나 배정 이후 상태의 실데이터가 있어야 검증 가능. 사용자가 오늘
날짜 경호건을 생성→배정→종결시키는 방식으로 데이터를 만들 수 있음.

| # | 화면 | 확인할 것 | 소진 조건 |
|---|---|---|---|
| ~~2~~ | [경찰서] 경호목록 | ✅ 소진(2026-09-09) — 경호중/경호완료/종결/취소 `statusName` 프론트 라벨 일치 확인 | |
| ~~4~~ | [경찰서] 경호 상세 | ✅ 소진(2026-09-10) — 종결(2026-09-09)에 이어 **경호취소·연장·단축도 사용자 확인** | |
| ~~9~~ | [본사] 경호 상세 | ✅ 소진(2026-09-10) — **본사 경호취소 사용자 확인** | |
| ~~10~~ | [본사] 연장/단축 요청 목록 | ✅ 소진(2026-09-10) — **피전이 실제 신청한 연장/단축 요청으로 승인 왕복, 사용자 재검증** | |
| ~~13~~ | [본사] 이력 조회 | ✅ 소진(2026-09-09) — 종결 건(caseSeq 51) status 3·`totalGuardMinutes` 36시간·종결코드 "경호기간 만료" 렌더 확인 | |
| ~~14~~ | [경찰서] 이력 조회 | ✅ 전부 소진(2026-09-14) — 종결코드·`totalGuardMinutes`·사건유형·5개 조치까지 전부 실값 확인·반영 | |
| ~~15~~ | [본청]/[지역청] 이력 | ✅ 소진(2026-09-09) — 종결 건 `status:3`→'종결' 매핑·목록·상세 확인 | |
| ~~17~~ | [경찰서] 게스트 경호상세 | ✅ 소진(2026-09-14) — SPoliceGuest4(조회권=deploySeq 100=ST0017)가 조회권 없는 deploySeq 92(ST0010) URL 직접 접근 → 차단 확인 | |
| ~~신규~~ | [경찰서] 취소 | **✅ 전부 소진(2026-09-11)** — 경호취소(2026-09-10)에 이어 접수취소(배치요구서 hard delete)도 사용자 확인 | |

## C. URL 직접 접근 스코프 일괄 테스트 — ✅ 전부 소진(2026-09-11)

목록을 안 거치고 주소창으로 상세 EP를 직접 호출했을 때 서버가 스코프를 강제하는지 —
여러 화면에 흩어진 미검증 항목을 **한 번에 몰아서** 프로브했다. 전부 차단 확인, 회귀 없음.
프로브: `local/_probe-url-scope.sh`(0단계 대상 ID 확보) + 본문 curl(무변경, 전부 GET).

| EP | 확인한 것 | 결과 |
|---|---|---|
| `History/Police/W/GetHistoryDetail?caseSeq=` | SPoliceM3(부산지역청)가 타 관할(강남경찰서, `caseSeq=29`) 호출 | **404**(대조군 SPoliceM1은 200) → 차단 확인 |
| `History/Stec/W/GetHistoryDetail?caseSeq=` | StecM3(본부관리자, 배정 0건)가 StecM2 소유 종결 건(`caseSeq=51`) 호출 | **404** → 차단 확인(2026-09-08 기존 확인과 일치) |
| `Deploy/Police/W/GetDeployDetail?deployReqSeq=` (게스트) | SPoliceGuest3가 조회권 없는 동래 건(`deployReqSeq=93`) 호출 | **404**(대조군 SPoliceM5는 200) → 차단 확인 |
| `Deploy/Police/W/GetDeployDetail?deployReqSeq=` (지역청) | SPoliceM3가 타 관할(강남, `deployReqSeq=70`) 호출 | **404**(대조군 SPoliceM1은 200) → 차단 확인 |
| `GuardCase/Stec/W/GetGuardCaseDetail?caseSeq=` (회귀 재확인) | StecM3가 StecM2 소유 건(`caseSeq=51`) 호출 | **403** "담당하지 않는 경호건입니다" → 2026-09-08과 동일, 회귀 없음. **#12 상태 "검증완료·문서보류" → 완료로 전환** |
| 경호상세(`SecurityCaseDetailPage`, 피전) URL 직접 접근 | SPoliceM5로 접수 상태 건(`/security-cases/101`) 직접 이동 | 액션 "접수취소"만 노출, 배정 이후 액션 없음 → 정상. (loop-screens Phase 1 #3 이월분도 함께 해소 — 애초에 회사 측 "기본정보 등록"은 `GuardCase`가 배정 시점에만 생성돼 접수 상태엔 `caseSeq` 자체가 없어 그 경로로는 도달 불가) |

**부수 발견(별건, 조치 불필요)**: `History/Police/W/GetHistoryDetail`이 이제 종결/취소가
아닌 배정·경호중·경호완료 상태에도 200을 준다(대조군 M1으로 `caseSeq=29`(경호완료)·
`caseSeq=53`(경호중) 둘 다 200 확인) — 예전 "History는 종결/취소만" 문서와 다름. 화면이
이 상태들을 History 경로로 부르지 않아 현재 영향 없음, 참고로만 기록.

## D. 후속 작업 (별도 iteration)

| 항목 | 내용 | 상태 |
|---|---|---|
| 경찰 경호상세(#4) 근무일정 재연결 | `getDeployGuardSchedule` 신설 → `SecurityCaseDetailPage` `WorkerAssignmentPanel` 재연결. 브라우저 검증(SPoliceM5·SPoliceM1 `/security-cases/90`). findings #6 근무일정 파트 종료 | ✅ **완료(2026-09-09)** — 커밋은 이 iteration |
| B-2 부분 반영 | `GuardCase/Stec/W/CancelGuardCase` 배선(#7·#9) + `GetStecUserList` 본부관리자 허용(#11) + "본부" 열 제거(#1). | ✅ **완료(2026-09-09)** |
| 피전 종결 워크플로우 실연동 | 문서함 `docDestructionDetail`→`attachments` 매핑, 파기확인서 다운로드 `?caseSeq=`, 종결 `CloseGuardCase` caseSeq 우회(`resolveCaseSeq`), `downloadYn`→종결 선결조건 게이트 | ✅ **완료(2026-09-09)** — 사용자 실제 종결 성공 |
| ~~`GetDeployDetail.caseSeq` 백엔드 추가되면~~ | `resolveCaseSeq`(GetDeployList 재조회 우회) 제거 | ✅ **완료(2026-09-10)** — 두 EP가 `deploySeq` 키로 바뀌어 `resolveCaseSeq` 제거, 파기확인서 다운로드·종결 실왕복 확인 |
| ~~근무자별 동의서(findings #6 요청 3 / #18)~~ | **✅ 전부 완료(2026-09-11)** — 본사는 caseSeq 61 실데이터로 검증, 코드 변경 없이 정상 동작. 피전은 `docAgreeDetail`을 실제 필드명(`agreePath`/`agreeFileName`/`guardName`)으로 읽어 `roster` 매칭 없이 그대로 렌더(`ConsentDocsCard` 재작성, `baseInfo.defaultWorkers` 의존 제거) — 사용자 결정(업로드된 것만 보여주면 됨, 서약서+동의서 한 파일). 브라우저 검증(`/security-cases/100`, 김가드 항목). | |
| ~~경찰서 경호목록 — 배정 직후 건 경호기간 `1970.01.01` 표시~~ | ✅ **완료(2026-09-11)** — 백엔드가 `Deploy/Police/W/GetDeployList`의 `startDt`/`endDt` 누락을 수정. 사용자가 목록에서 시작/종료일 정상 표시 직접 확인. 프론트 변경 없음(방어 가드도 결국 불필요했음) | |
| ~~근무자 상세 화면 — 근무 이력 실 API 연결~~ | ✅ **완료(2026-09-11)** — 백엔드가 `GetGuardSchedule` 응답 shape를 변경(경호건 단위 그룹핑 `cases[]`, 오타 `schdules`→`schedules` 수정, 필드명 프로브 재확인). **디자인도 함께 변경**(사용자 결정) — 경호건별 카드 리스트(접힌 상태) + 클릭 시 그 경호건의 일자별 근무만 펼치는 구조로 재설계. `getWorkerSchedule` 실 API 전환, `WorkerDetailPage` 카드+아코디언 재작성, 테스트 3건 신규(140/140). 실백엔드 StecM1 `/admin/workers/13`(김가드) 카드 7개 렌더·클릭 펼침/접힘·요약타일 합산 확인, 콘솔 에러 0. | |
| ~~본사 경호목록 — 상태를 `guardCaseStatus` 코드 기반으로 전환~~ | ✅ **완료(2026-09-11)** — `shared/lib/deployStatus.ts::resolveGuardCaseStatus` 신설(코드 우선, 없으면 statusName 폴백), `GuardCaseRow`에 `guardCaseStatus` 추가, `guardCaseRowToSecurityCase` 적용. 브라우저 검증(회귀 없음, 콘솔 에러 0) | |
| ~~대표근무자 `isRepresentative` + 이력조회 사건유형·5개 조치~~ | ✅ **완료(2026-09-14)** — 프로브 재확인(`local/_probe-recheck-isRep-history.sh`, `_probe-recheck-caseSeq48.sh`)으로 3건 다 실값 확인: (1) `GetCaseGuardList.isRepresentative` 실값 → `toBaseInfo` 이름 추정 로직 제거(findings #12 전체 종결). (2) `History/Police/GetHistoryDetail.crimeType` 실값 → `detailRowToSecurityCase`가 매핑. (3) 5개 조치(summary1~5) — 처음 caseSeq 46·51(오염된 테스트 건)로는 매핑 누락으로 의심했으나 caseSeq 48(ST0004, 사용자 확인)로 재검증하니 실값 정상 반환 → `HistoryDetailRow`에 필드 추가 + `baseInfo`로 파싱, 경찰 이력상세 화면의 5개 조치 Field가 실값 표시. findings 이력조회 갭 섹션 전체 종결. | |
| 홈 대시보드 — "이번달 신규 접수" 소스 재검토 + 월별 추이 데이터 확인 | 대화 중 발견(2026-09-17): `DashboardPage.tsx`의 "이번달 신규 접수" 카드는 `GetDashBoardCount`의 `receipt`를 쓰는데, 스웨거 설명상 `GetMonthDashBoardCount`의 그 달 값은 "`GetDashBoardCount`를 그 달 1일~말일로 조회한 값과 같다"고 명시돼 있어 정의상 동일해야 함 — 소스를 바꿔도 숫자는 안 바뀔 것으로 추정되나 **실제 API 응답으로 아직 확인 안 함**. 별개로 `dashboard.ts:139`가 "접수 월별 추이" 차트에 `counts[0].total`(접수+배정+경호중+경호완료 혼합값, 상태별로 날짜축이 다름)을 쓰고 있는데 카드 제목은 "신규 접수"로 라벨링돼 있어 — `receipt`로 바꿔야 라벨과 맞는지, 실제로 `total`과 `receipt`가 달라지는 케이스가 있는지 실데이터로 확인 필요. | 미착수 — 추후 작업 |
