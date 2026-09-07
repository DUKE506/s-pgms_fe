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
그룹 경계(그룹 C 이력은 한 섹션). **그룹 B는 두 섹션으로 쪼갬(2026-09-04 결정)** —
쌓인 요청분이 너무 커지지 않게: **B-1 = #6~#9**(근무자·배치요청·경호목록·경호상세),
**B-2 = #10~#12**(연장/단축·관리자계정·본부관리자 스코프 재검증). B-1 종료(#9 완료) 시
일괄 요청, 응답 안 기다리고 B-2 진행.
상세 절차는 `docs/backend-integration-process.md` 원칙 4, `LOOP_INSTRUCTIONS.md` 1·7단계.

| # | 그룹 | 역할 | 화면 | 상태 | 커밋 | 비고 |
|---|---|---|---|---|---|---|
| 1 | 전제 | 공통 | 로그인 | 완료 | `008383a` | 경찰/본사 실제로는 같은 엔드포인트 — 유일하게 역할보다 먼저 |
| 2 | A | [경찰서] 피전 | 경찰서 경호목록 | 완료 | `2679751` | 스코프는 서버가 403으로 강제(analysis.md 4-6 해소). 3번 직후 재검증 완료(새 접수 반영·mgmtNo 조합형태 확인). **7번 배정 직후 부분 재검증(2026-09-03)**: 배정 건이 `statusName:"배정"`(프론트 라벨과 일치)·`mgmtNo:"…동래경찰서 ST0002"`(경호코드 조합)로 반환됨 확인. 경호중/경호완료/종결/취소는 **9번 이후 재검증** |
| 3 | A | [경찰서] 피전 | 접수/배치요구서 작성 | 완료 | `5074920` (+배치장소 4필드 보정: 이번 커밋) | `POST AddDeployRequest`. 폼: 요구자 3필드 분리 + 생년월일 입력(+ `DateField` yearGrid). **2026-09-03**: 배치장소를 백엔드 수정에 맞춰 `guardHomeLoc`/`guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2` 4필드 전송(공유 `toDeployRequestDto`, D-2 제거, issues #5 해결 — 쓰기 테스트 deploySeq 87 왕복) |
| 4 | A | [경찰서] 피전 | 경호 상세 | 부분완료(△) | `19786c4` (+B-1 반영 커밋) | 접수 상태 실측 검증(2026-09-03). **2026-09-07 B-1 반영**: 백엔드가 `GetDeployDetail` shape 변경(`startDt`/`endDt` → `startDate`/`endDate`+`startTime`/`endTime`, `summary1~5`, `guardUserList`) → 배정+경호계획 등록 건의 조치 5개·배치시간·배치장소가 통합 카드에 채워짐(issues #13 해소, 브라우저 검증 deployReqSeq 81). 배정 이후 취소/연장/단축/종결 액션은 여전히 미검증 → 9번 이후 재검증. **완료 표시 보류** |
| 5 | A | [경찰서] 피전 | 배치요구서 수정 | 완료 | (이번 커밋) | 블로커 해소 — 백엔드가 `GET GetDeployDetailUpdate` 응답 구현(배치요구서 원본 필드 전부 반환, issues #7 해결). prefill = `getDeployRequestForEdit`(`getSecurityCase`에서 분리, 쿼리키 분리) / 저장 = `PUT UpdateDeployRequest`(공유 `toDeployRequestDto`). 읽기/쓰기 필드명 비대칭 매핑. **저장 후 재진입 stale 캐시 버그 수정**(`removeQueries` — 아래 로그). 브라우저 SPA 플로우 검증. `mgmtNo` 없어 breadcrumb 축소·레거시 crimeType 영문 → exclusions. **피전 경호관리 섹션 종료** |
| 6 | B | [본사] 운영/시스템관리자 | 근무자 목록/등록 | 완료 | `b5f5738` | `GetGuardList`/`AddGuardInfo`/`PatchGuardInfo`/`DeleteGuardInfo` 4종 실측(생성→수정→삭제 원상복구). 수정/삭제 mock에 없던 기능 → 행별 `⋮` 메뉴 UI 신규. 부서 열 제거(GetGuardList 응답에 `DEPT_NM` 누락 — DB엔 있음, issues #8 신규, 섹션 #12에서 일괄 요청). 조인용 `listCaseJoinWorkers` 분리(#9·#13 회귀 차단) |
| 7 | B | [본사] 운영/시스템관리자 | 배치요청 목록(+본부 배정) | 완료 | (이번 커밋) | `GetDeployRequestList`/`GetStecUserList`(담당자 필터)/`AddGuardCase` 3종. deploySeq 81 실배정 → **GuardCase 최초 생성 검증**(caseSeq 46, `ST0002`). 담당자 목록 본부(#1)·배정건수 필드 없어 표시 축소. "취소" API 없어 메뉴 비활성화(**issues #9 신규**). 조인용 `listCaseAssignees` 분리(#8 회귀 차단). **함께 수정**: `client.ts` refresh single-flight(동시 401 → 1회용 RefreshToken 회전 → 강제 로그아웃되던 문제) |
| 8 | B | [본사] 운영/시스템관리자 | 경호목록 | 완료 | `59bcd5b` | `GetGuardCaseList` 실 API 전환. 응답 이중 래핑 `{meta,data:[...]}`, `pageSize` 상한 100 → `meta.totalPages`까지 클라이언트 순회. `caseSeq`→id, `mgmtNo` 완성형 `splitMgmtNo`, `statusName` 라벨 그대로, `userName`→`assigneeName`(담당자 id 없음 — managers 조인 제거). 7번 배정 건(caseSeq 46~48) 렌더 확인. **실백엔드 계정으로 이 화면 진입 시 나던 RefreshToken 폭풍 해소**(mock 호출 0). 회귀 차단: `listManagerAssignedCases`(#11)·`listMockSecurityCases`(연장/단축=#10) 분리, 죽은 `listCaseAssignees` + `handlers/managers.ts` 제거. 지역청·담당자 소속 본부 열 축소(exclusions) |
| 9 | B | [본사] 운영/시스템관리자 | 경호 상세 | 부분완료(△) | `6aeac40`·`f738723`·`0040d59`·`f4ab7df`·`92a7802` (+이번 커밋) | **조회 5종 조립** + 경호계획 수정(`PatchCaseInfo`) + 스케줄(`AutoAddSchedule`/`PatchScheduleGroup`/`DeleteScheduleGroup` — 그룹1 보호) + **사전미팅 저장/삭제**(`SaveCaseMeeting`) + **파일 업로드 3종**(`PatchGuardPlanDoc`/`PatchConsentDoc`/`PatchDestroyDoc`, multipart) + 파기확인서 다운로드 연동·브라우저 검증. **블록**: 경호계획 등록(`AddGuardCaseInfo`) — 배치기간 조회 경로 없음(blockers, issues #10) → 등록 버튼 비활성 + 안내. 경호취소 — 본사 API 없음(issues #9) → 버튼 비활성. 손실 매핑: 조치 5섹션↔`summary1~5`, 사전미팅 근무자별 시간(issues #11). 대표근무자·그룹 메모 조회 갭(issues #12). 테스트 더블 `guardCaseDetail.ts`. 기본정보 조회 카드 피전/본사 통일(`CaseBaseInfoCard`, `f738723`). **→ 섹션 B-1(#6~#9) 종료, 백엔드 일괄 요청**(`docs/backend-integration-requests/2026-09-04-본사-경호관리-B1.md`). **2026-09-07 B-1 응답 반영**: 신규 `GuardCase/Stec/W/GetDeployDetail` 연동 — `getSecurityCase`가 `GetCaseDoc.deploySeq`로 호출해 배치요구서 원본 병합(`mergeDeployRequest`) → "배치요구서 원본보기" 다이얼로그 전체 필드, 경호계획 미등록 건 배치기간 채움 → **경호계획 "등록" 버튼 활성화**(blockers/issues #10 종료), 첨부 "등록일". 브라우저 검증(caseSeq 48·46). 경호취소(issues #9)·화면7 다이얼로그·조치 구조화(#11)는 여전히 미해결. **4·2번 재검증**: caseSeq 46 데이터 보유 |
| 10 | B | [본사] 운영/시스템관리자 | 연장/단축 요청 목록 | 부분완료(△) | (이번 커밋) | `GetExtendRequestList`/`GetShortenRequestList`(조회)·`ConfirmCasePeriod`(승인) 실 API 전환, `SecurityCaseTabs` 연장/단축 배지 실카운트 배선. 거부는 EP 없어 UI 차단(issues #2, B-2 종료 시 요청). **테스트 데이터로만 검증** — 실백엔드에 경호중 건이 없어 배정 건에 연장/단축 요청을 만들어 승인 왕복 실측(원복 완료). **연장/단축 신청은 업무상 경호중 상태만 대상**이고, 피전이 경호상세에서 직접 신청하는 부분(matrix #4 `requestPeriodChange`, △)이 개발·검증돼야 실제 요청 데이터가 생긴다 → **피전 요청 영역 개발 이후 재검증**(4번 "배정 이후 재검증"과 함께). 완료 표시 보류 |
| 11 | B | [본사] 운영/시스템관리자 | 관리자 계정 관리 | 완료 | (이번 커밋) | `GetStecUserList`(목록)·`UpdateUser`(정보수정·비번초기화) 실 API 전환. `loginId→id`·`userSeq` 신규. 빈 연락처는 `""` 전송(`null`은 백엔드가 무시 — 실측). 배정건수·담당경호는 `GetGuardCaseList`(실 API) 담당자명 매칭 — mock `listManagerAssignedCases`/`listMockSecurityCases` 제거, `handlers/companyAccounts.ts` 삭제. **본부관리자는 `GetStecUserList` 403** → "운영·시스템관리자만 이용" 안내(B, 사용자 확인). 접근 자체(route/메뉴 제외 vs 백엔드가 본인 행만)는 **#12에서 결정**. "본부" 열 "-"(issues #1). 실백엔드 검증: StecM1 목록·정보수정 왕복·비번초기화(StecM4)·담당경호(HS2본부→caseSeq 51·29), StecM2 403 안내. 응답 샘플 `User-Stec-UpdateUser.md` |
| 12 | B | [본사] 본부관리자 | 스코프 재검증(경호목록/상세/연장단축/관리자계정/근무자) | 대기 | | 새 API 연동 아님 — 6~11 화면을 본부관리자로 재확인("본인 배정 건만"). 이력 스코프는 그룹 C 후 꼬리 확인. **여기까지 = 메인 워크플로우 검증 완료**, **섹션 B-2 종료 → 백엔드 일괄 요청** |
| 13 | C | [본사] 운영/시스템관리자 | 이력 조회 | 대기 | | 4·9의 종결·취소가 실제 터미널 데이터를 만들어야 의미 있음 |
| 14 | C | [경찰서] 피전 | 이력 조회 | 대기 | | 접수취소 + (그룹 B 이후) 종결 데이터 확인 |
| 15 | C | [본청]/[지역청] | 이력 조회 + 진행중 건 상세(조회전용) | 대기 | | 4·9 데이터 필요. 진행중 건은 경호 상세 화면을 조회 전용 재사용. + 본부관리자 이력 스코프 꼬리 확인. **이력 섹션 종료 → 백엔드 일괄 요청** |
| 16 | D | [경찰서] 피전 | 게스트 계정 관리 | 대기 | | 아이디 미리보기 이슈(issues.md #3) |
| 17 | D | [경찰서] 게스트 | 경호목록 + 상세(조회전용) | 대기 | | 16·2 완료 후 |
| — | 보류 | [본사]/[본청]/[지역청] | 대시보드 | 보류 | | Phase 4 자체가 보류 중 |

## 최근 iteration 로그

(진행하면서 아래에 짧게 기록 — 날짜, 무엇을 했는지, 막힌 점)

- 2026-09-07: 11번([본사] 운영/시스템관리자 · 관리자 계정 관리) — **완료**. 섹션 B-2 두 번째.
  - **연동**: `api/managerAccounts.ts` 3함수를 실 EP로 교체. `listManagerAccounts` →
    `GET User/Stec/W/GetStecUserList`(managers.ts의 `listManagers`가 이미 쓰는 EP,
    `StecUserRow` 타입 공유는 안 하고 각자 정의). `ManagerAccount`에 `userSeq` 추가
    (`id`는 `loginId` 유지 — 아이디 열 표시 + `authStore.user.id`와 본인매칭).
    `updateManagerAccountInfo(userSeq,{name,phone})` / `resetManagerAccountPassword(userSeq,loginId)`
    → `PATCH User/Stec/W/UpdateUser`. 반환은 `{data:true}`뿐이라 `['manager-accounts']`
    invalidate로 재조회.
  - **배정건수 열 + 담당경호 다이얼로그**: mock `listManagerAssignedCases` 제거, 실
    `listSecurityCases`(`GetGuardCaseList`, 8번)로 통일(쿼리키 `['security-cases-all']`
    본사 경호목록 화면과 공유). `GetGuardCaseList` 행에 담당자 id가 없어(`userSeq`/
    `managerName` 필드는 스키마에 있으나 백엔드가 null) **담당자명 매칭**
    (`SecurityCase.assigneeName === ManagerAccount.name`). 진행중 건만 반환 →
    종결/취소 제외 자동. `requests.ts`의 `listMockSecurityCases`도 제거(마지막 사용처였음).
  - **본부관리자 403(B)**: 실서버 `GetStecUserList`는 본부관리자 토큰에 403(운영/시스템
    전용). `listManagerAccounts`가 `ManagerListForbiddenError`를 던지고 화면이 빨간
    일반 에러 대신 "이 화면은 운영·시스템관리자만 이용할 수 있습니다" 안내(`retry:false`).
    **사용자 결정(2026-09-07): 이번엔 문구만.** 본부관리자를 route/메뉴에서 뺄지(A) vs
    백엔드가 본인 행만 반환하게 할지(C)는 **#12에서 논의**. Phase 3.6은 "본부관리자도
    이 화면에서 자가수정" 전제였는데 실서버가 목록을 통째로 막아 충돌.
  - **UpdateUser 실측 특이사항**: `null` 필드는 "변경 안 함"으로 무시된다 — 연락처를
    비우려면 `""`(빈 문자열)을 보내야 함(`updateManagerAccountInfo` 반영). StecM1로
    없음→설정→`""`로 원복 왕복 확인.
  - **인프라**: `handlers/companyAccounts.ts`(`/company-accounts` mock 3종) 삭제 —
    더는 안 쓰임. 테스트 전용 더블 `handlers/guardCase.ts`에 `PATCH UpdateUser` 추가
    (정보수정·비번초기화 분기, `companyAccounts` 인메모리 갱신 → 재조회 반영) +
    `GetStecUserList` 더블이 본부관리자 토큰에 403 반환하도록 실서버와 일치.
    `userSeqOf` 더블 헬퍼가 sysadmin/opadmin을 0으로 겹치던 것 → 고정값(901/902).
    `ManagerAccountListPage.test.tsx` 재작성(더블 기반, 본부관리자 테이블 테스트
    3건 → "접근 제한 안내" 1건). 테스트 125→122.
  - **검증**: `npm run test` 122/122 · lint(기존 warning 2) · build 통과. 실백엔드
    `run-s-pgms`: StecM1(운영) → 목록 5행(본부 열 "-", 배정건수 HS2본부=2)·본인
    정보수정 왕복(설정→반영→`""` 원복, `GetStecUserList`로 `null` 확인)·비번초기화
    StecM4(`pwChangedYn false→true`)·담당경호(HS2본부 → `26-09-동래경찰서 ST0007` 경호중
    + `26-08-강남경찰서 ST0001` 경호완료). StecM2(본부관리자, 사용자 직접 로그인) →
    "이 화면은 운영·시스템관리자만 이용할 수 있습니다" 확인. 콘솔 에러 0.
  - 응답 샘플: `User-Stec-UpdateUser.md` 신규, `User-Stec-GetStecUserList.md` 보강.
    exclusions: 본부 열 "-" / 배정건수·담당경호 이름 매칭(동명이인) / phone 대표번호
    의미·`null` 미삭제. issues #1: 관리자 계정 관리 재확인 + B-2 일괄 요청 항목 2개
    (본부 FK 컬럼 / `GetGuardCaseList`에 담당자 `userSeq`).
  - **부수**: 공유 개발 백엔드에서 StecM2 비밀번호가 세션 중 `StecM2`→`StecM1`로 바뀜
    (내 쓰기는 StecM1·StecM4만 대상 — 다른 사용자 소행 추정). `test-accounts.local.md` 갱신.
  - **다음**: B-2 #12(본부관리자 스코프 재검증) — 새 API 연동 아님. #11의 본부관리자
    접근(A/C) 결정도 여기서.

- 2026-09-07: 10번([본사] 운영/시스템관리자 · 연장/단축 요청 목록) — **부분완료(△)**.
  섹션 B-2 첫 화면. 사용자 결정: **승인만 연결, 거부는 UI 차단**(대응 EP 없음, issues #2).
  - **연동**: `listPeriodRequests(type)` → `GET GetExtend/ShortenRequestList` 분기
    (항목이 `GetDeployRequestList`와 유사, `caseSeq` 채워짐 + `requestedEndDate`;
    연장/단축 구분 필드 없어 EP로 구분). `id←caseSeq`. `approvePeriodRequest` →
    `POST ConfirmCasePeriod {caseSeq}`(반환 void). `rejectPeriodRequest`는 throw로 두고
    `PeriodRequestListPage` ⋮ "거부" `disabled`. `SecurityCaseTabs` 연장/단축 배지를
    실카운트로 배선(쿼리키 `['period-requests', type]` 목록 화면과 공유 → 승인 시 동시 갱신,
    기존 "항상 0" 주석 제거). `listMockSecurityCases`는 이제 `listManagerAssignedCases`(#11)만 사용.
  - **테스트 더블**: `guardCase.ts`에 `GetExtend/ShortenRequestList` + `ConfirmCasePeriod`
    (본부관리자 "본인 배정 건만" 스코프 재현). `PeriodRequestListPage.test.tsx` 거부 테스트를
    "메뉴 비활성 단언"으로 교체, 승인 API 직접호출 스코프 테스트는 `approvePeriodRequest('7')`로 정정.
  - **△ 이유 — 테스트 데이터로만 검증**: **연장/단축 신청은 업무상 경호중 상태만 대상**
    (경찰 경호상세가 경호중에서만 신청 버튼을 연다). 실백엔드에 경호중 건이 하나도 없어
    (모든 경호시작일이 미래) 배정 건(deploySeq 81·82·86·89)에 연장/단축 요청을 주입해
    본사 승인 왕복만 실측(승인 후 `endDate` 이동 확인 → 원복, `extendCount`만 0→1 잔류).
    피전이 경호상세에서 직접 신청하는 부분(#4 `requestPeriodChange`, 코드만 교체·△)이
    개발·검증돼야 실제 요청 데이터가 생긴다 → **#4 "배정 이후 재검증"과 함께 재확인**. 완료 표시 보류.
  - **부수 실측**: `PATCH ExtendDeployPeriod`/`ShortenDeployPeriod`가 배정 상태도 기술적으로
    받아줌(하드 검증 없음) — 단축은 새 종료일이 현재보다 앞이어야 400 아님. 정상 흐름은 경호중.
  - 검증: `npm run test` 125/125(기존과 동일 수, 테스트 1건 성격 변경) · lint(기존 warning 2) ·
    build 통과. 실백엔드 `run-s-pgms`(StecM1): 연장/단축 목록 렌더·탭 배지 실카운트·⋮ 거부
    비활성·승인 다이얼로그→토스트→행 제거, 콘솔 에러 0. 데스크톱 스크린샷.
  - 응답 샘플: `GuardCase-Stec-GetExtend-GetShortenRequestList.md`, `-ConfirmCasePeriod.md`,
    `Deploy-Police-Extend-ShortenDeployPeriod.md`. exclusions: 요청일=`createDt` 대체 / 거부 UI 차단.
  - 인프라: 실백엔드 curl은 `.claude/loop-backend/_probe-*.sh`(gitignore)로 실행 —
    `.claude/settings.local.json`에 probe/curl allow 규칙 추가(사용자 직접, 분류기가 모델 편집 차단).
  - **다음**: 커밋 후 사용자 승인 → B-2 #11(관리자 계정 관리) 착수.

- 2026-09-07: **섹션 B-1 백엔드 응답 반영**(다음 화면 착수 전 단계, #10 착수 아님).
  백엔드가 대화 중 스웨거·응답을 반복 수정 — EP 2개 신설(커밋 `a9b3cec`) + 경찰용
  `Deploy/Police/W/GetDeployDetail` 응답 shape 변경. 실측 후 프론트 반영·브라우저 검증.
  - **issues #13 → 🟢 (해결·연동)**: 백엔드가 경찰용 `Deploy/Police/W/GetDeployDetail`을
    본사 `GetGuardCaseDetail`과 같은 구조로 변경 — `startDt`/`endDt` 제거 →
    `startDate`/`endDate` + **`startTime`/`endTime`(근무시간 명시)**, `summary1~5`/
    `summary1~5Date`(조치 5개), `guardUserList` 추가. `features/police/api/securityCaseDetail.ts`
    `toSecurityCase`가 `startDate != null`이면 `baseInfo` 조립. 공유 헬퍼
    `@/shared/lib/caseMeasures`(parse/join/format/hhmm) 신설 — 본사 쪽 로컬 헬퍼도
    이걸로 교체. 브라우저(SPoliceM5, deployReqSeq 81): 배치시간 "매일 09:00 ~ 18:00" /
    안전조치 "맞춤형 순찰, CCTV" / 잠정조치 "1호" 렌더. `suspectUserName` 마스킹("홍**")
    — 실명 비노출 정책, 프론트는 `nameInitial`로 취급(대응 불필요).
  - **issues #7·#10 → 🟢 (해결·연동, 화면9)**: 신규 `GuardCase/Stec/W/GetDeployDetail`
    (본사용 배치요구서 원본). `features/company/api/securityCaseDetail.ts` `getSecurityCase`가
    `GetCaseDoc.deploySeq`로 이 EP 호출(`fetchDeployRequestDetail`) → `mergeDeployRequest`로
    `GetGuardCaseDetail`이 안 주는 원본 필드(성별/생년/직업/거주지·사건개요·참고사항·
    요구자 3필드·`documentDt`) 병합, 경호계획 미등록 건은 `periodFrom`/`periodTo`로
    `startDate`/`endDate` 채움. 브라우저(StecM1, caseSeq 48 배정+미등록): "배치요구서
    원본보기" 다이얼로그 전체 필드 표시, `BaseInfoForm` 배치기간 2026-09-12~22 채워짐,
    `periodMissing` 경고 사라짐·"등록" 버튼 활성. caseSeq 46(등록됨): 첨부 "등록일 ·
    2026-09-02" 채워짐. `blockers.md` "경호계획 등록…배치기간" 종료.
    배치장소 4필드는 deploySeq 88·89(정상 데이터) 반환, 82는 옛 D-2 데이터라 null(EP
    갭 아님). **화면7 `RequestListPage` 배치요구서 다이얼로그는 목록 필드만 유지 — 후속.**
  - **issues #1 부분**: `GetPoliceInfo`(지방청→경찰서 트리)로 화면8 지역청 필터 옵션
    가능하나 행↔지방청 매칭·본부 열은 미해소 → **화면8 지역청 필터 복원은 후속(선택)**.
  - 미해결 5건(#3 케이스취소·#4 deptName·#5 조치구조화·#6 대표근무자/memo·#8 사전미팅
    시간) → 🟡 유지, B-2 종료 시 재요청.
  - 인프라: 공유 헬퍼 `@/shared/lib/caseMeasures` + 단위 테스트(`caseMeasures.test.ts`,
    8건). `mocks/handlers/deploy.ts` 더블 `toDeployDetail` shape 갱신(startDate/endDate/
    startTime/endTime + summary null + guardUserList). 회사 detail 테스트 경로는
    `d.mock` 조기 반환이라 신규 EP 더블 불필요.
  - 검증: `npm run test` 125/125(117→125) · lint(기존 warning 2) · build 통과. 실백엔드
    `run-s-pgms` 3화면 검증(피전 상세 81 / 본사 상세 48·46), 콘솔 에러 0. 응답 샘플
    갱신: `Deploy-Police-GetDeployDetail.md`(09-07 새 shape 섹션).
  - **다음**: 커밋 후 사용자 승인 → B-2 #10(연장/단축 요청 목록) 착수.

- 2026-09-04: 9번 마무리 — **사전미팅 + 파일 업로드 3종 연동, 섹션 B-1 종료**.
  (앞선 9번 "조회+계획+스케줄" 커밋들 `6aeac40`·`f738723`·`0040d59`·`f4ab7df`에 이어)
  - **사전미팅** `PUT SaveCaseMeeting` — `GetCaseMeeting` 응답 실측(저장 후):
    `{meetingSeq, meetingDate, meetingStartDt, meetingEndDt, guardInfo:[{guardSeq,guardName}]}`
    또는 null. 쓰기 DTO `{caseSeq, hasMeeting, meetingStart, meetingEnd, guardSeqs[]}`.
    `hasMeeting:false` = 삭제. **근무자별 시간 없음** → 폼의 개별 시간을 min시작~max종료로
    합쳐 저장(issues #11 사전미팅 항목). `PreMeetingDialog`/`ScheduleSection` UI 재활성.
    브라우저 왕복 검증(추가→persist→수정 prefill→삭제→persist).
  - **파일 업로드 3종** — 전부 `multipart/form-data`, 서버가 파일 시그니처 검사
    ("File signature is not allowed" 400). `PatchGuardPlanDoc {caseSeq,file}` →
    `GetCaseDoc.caseInfoDto`. `PatchConsentDoc {caseSeq,guardSeq,file}` →
    `guardAgreementDtos[]`(경호풀 근무자별 1행). `PatchDestroyDoc {caseSeq,file}` →
    `guardDeployDocDto`, **경호중·경호완료에서만**(그 외 409) → UI 상태 가드.
    `downloadDestructionCert`(`GetDestroyDocDownload`, blob+Content-Disposition).
    `AttachmentsSection` 재작성(파일명 문자열 → File, disabled 해제, 다운로드 버튼).
    실측: 실PDF로 3종 업로드→`GetCaseDoc` 필드 채워짐 확인, caseSeq 46 UI 파일 주입
    (`driver.mjs`에 `upload` 커맨드 추가) 성공, caseSeq 29(경호완료) 파기확인서
    업로드+다운로드 검증.
  - **섹션 B-1(#6~#9) 종료** — 백엔드 일괄 요청서 작성:
    `docs/backend-integration-requests/2026-09-04-본사-경호관리-B1.md` (요청 9건 —
    issues #1부분·#7·#8·#9·#10·#11·#12·#13). issues #8~#13 → 🟡. 응답 안 기다리고 B-2로.
  - 검증: `npm run test` 117/117 · lint · build. exclusions: 사전미팅 근무자별 시간
    유실 / 파일 시그니처 검사 / 파기확인서 상태 제약 / `destoryDocDownloadYn`은 파일
    존재가 아니라 피전 다운로드 여부로 추정.

- 2026-09-04: **그룹 B 섹션을 둘로 쪼갬**(사용자 결정). 원래 그룹 B(#6~#12) 전체가 한
  섹션이었는데, #12까지 가서 issues를 묶으면 요청 범위가 너무 커진다는 판단.
  → **B-1 = #6~#9**(근무자·배치요청·경호목록·경호상세), **B-2 = #10~#12**(연장/단축·
  관리자계정·본부관리자 스코프 재검증). #9(사전미팅·파일업로드 3종 포함)까지 하고
  **B-1 종료 → issues/exclusions 일괄 요청**, 응답 안 기다리고 B-2 진행. 반영: 이 표
  큰 틀 문단·#12행, `TASK.md`, `LOOP_INSTRUCTIONS.md` 7단계, `process.md` 원칙 4,
  `screen-api-matrix.md`, `roadmap.md` Phase 5.
  - B-1 일괄 요청 후보(#9 진행하며 확정): issues #1(담당자 소속 본부 — #8 소관분),
    #7(본사용 배치요구서 원본 조회), #8(GetGuardList deptName), #9(본사 배치요청/경호
    취소 API), #10(경호계획 등록 배치기간), #11(조치 summary 구조화), #12(대표근무자·
    그룹메모 조회 갭), #13(GetDeployDetail 조치·근무시간). #2(연장/단축 거부 API)·#1
    관리자계정 facet은 B-2 소관.

- 2026-09-04: 9번([본사] 운영/시스템관리자 · 경호 상세) — **부분완료(△)**. 그룹 B의
  가장 무거운 화면. 사용자 결정으로 이번 범위 = **조회 + 경호계획 + 스케줄**, 사전미팅·
  파일 업로드는 후속.
  - **스웨거 갱신 발견**: 상세가 조회 5종으로 쪼개짐(매트릭스 최초엔 `GetGuardCaseDetail`
    1종). `company/api/securityCaseDetail.ts::getSecurityCase`가 `GetGuardCaseDetail`
    (경호계획+헤더) + `GetCaseGuardList`(경호원 배정, `isAssigned`) + `GetCaseSchedule`
    (일자별 근무조) + `GetCaseMeeting`(항상 null) + `GetCaseDoc`(첨부 메타) 5개 GET을
    조립. 경호계획 등록 판정 = `GetGuardCaseDetail.startDate != null`.
  - 연동·검증 완료: 조회 5종 / **경호계획 수정** `PATCH PatchCaseInfo`(브라우저 왕복 —
    caseSeq 46 요약카드 반영 확인) / **스케줄 자동생성** `POST AutoAddSchedule` /
    **근무조 저장** `PUT PatchScheduleGroup`(curl 실측). `getCaseGuards` 신규
    (`GetCaseGuardList`), `listCaseJoinWorkers`(mock)는 이력 상세 #13용으로만 잔존.
  - **미검증(△) — 경호계획 등록** `PUT AddGuardCaseInfo`: `startDt`/`endDt`(required)를
    채울 배치기간을 배정·미등록 상태에서 본사 조회로 못 얻는다(`GetGuardCaseDetail`은
    null, 본사 토큰으로 `Deploy/Police/W/GetDeployDetail*` 403). 코드는 폼값 기준으로
    완성해 두고 미검증 이월. `blockers.md`, **issues #10 신규**. DTO 스펙 자체는 caseSeq
    46에 curl로 기간 직접 넣어 실측(등록→스케줄 생성 성공). **재호출 시 409**(스케줄
    있으면 "경호계획 수정 이용").
  - **경호취소**: 본사(Stec) 토큰으로 호출 가능한 케이스 취소 API가 없다 — 유일한
    `Deploy/Police/W/CancelGuardCase`는 본사 토큰에 **403**(실측). 배치요청 취소(issues
    #9)와 같은 뿌리 → issues #9에 배정 이후 취소도 포함. `SecurityCaseDetailPage`의
    경호취소 버튼 2곳(데스크톱/모바일) `disabled` + title. `cancelAssignedCase`는 throw.
  - **후속 iteration**(같은 화면): 사전미팅 저장(`SaveCaseMeeting` — DTO가 근무자별
    시간 못 받음 + GetCaseMeeting 항상 null이라 응답 미실측, issues #11) / 파일 업로드
    3종(`PatchGuardPlanDoc`/`PatchConsentDoc`/`PatchDestroyDoc` — `multipart/form-data`
    재구현). `securityCaseDetail.ts`의 `setPreMeeting`/`setSecurityPlanFile`/
    `setDestructionCertFile`/`setWorkerConsentFile`는 throw로 두고, `ScheduleSection`
    사전미팅 "추가" + `AttachmentsSection` 업로드 3종 버튼 `disabled`.
  - **조치 섹션 ↔ `summary1~5`**(사용자 결정): 폼(섹션당 다중선택 배열 + {시작,종료})
    그대로 두고 손실 매핑 — 선택 항목 `", "` 조인 → `summaryN`, 기간 `"시작 ~ 종료"`
    문자열 → `summaryNDate`. 읽을 때 역파싱. caseSeq 46에서 왕복 정확 확인. **issues
    #11 신규**(구조화 요청). exclusions 기록.
  - **조회 갭**(issues #12 신규): 대표근무자(`isRepresentative`) 여부가 조회에 없어
    이름으로 추정(`guardUserList`는 대표만·이름만) / 근무조 메모(`memo`)는 저장되나
    `GetCaseSchedule`에 없음. 둘 다 화면4 배치장소 `GetDeployDetail` null과 같은 패턴.
  - **PatchScheduleGroup 규칙 실측**: `order` 1+ & 일자 내 유일(중복 409), 근무자
    중복시각 배정 409, 경호풀 밖 근무자 400. `groupSeq` 있으면 수정/없으면 추가.
    `DeleteScheduleGroup?groupSeq=&caseSeq=` 존재(200)하나 프론트 삭제 UI 없음.
  - **함께: 기본정보 카드 통일**(사용자 요청) — 피전 `BaseInfoReadCard` + 본사
    `BaseInfoSummaryCard`를 `shared/components/CaseBaseInfoCard.tsx` 하나로 합침(삭제 2개).
    `variant`(police/company/history)로만 갈림: company=수정 버튼+"(본부관리자 작성)",
    history=배치장소 숨김. 필드 7개(경호대상자·사건유형·경호시작·경호종료·배치시간·피전·
    수사관), 경호시작/종료 한 줄, 빈 값 전부 `-`(조치도 "해당 없음" 안 씀), 배치장소 4칸,
    조치 5개는 `MeasureField`로 항목/기간 세로 스택(`justify-between`). 4곳 적용(피전
    상세·본사 상세·본사 이력 상세). 피전 이력 상세는 자체 레이아웃이라 미적용(그대로).
    → **발견(issues #13 신규)**: 통일 후 같은 건을 나란히 보니 피전 상세에서 조치 5개·
    배치시간이 `-`. `GetDeployDetail`이 경호계획의 `summary1~5`·근무시간을 응답에 안 실음
    (실측). 회귀 아님(기존도 그랬음) — 화면4 배정 이후 재검증 + issues #13로 이월,
    exclusions 기록.
  - 인프라: 테스트 전용 더블 `mocks/handlers/guardCaseDetail.ts`(9개 — `GetGuardCaseDetail`
    에 mock 레코드 전체 실어보내는 `d.mock` 패턴 = 경찰 화면4와 동일). `index.ts`
    `testOnlyHandlers`에 등록. `SecurityCaseDetailPage.test.tsx` 경호취소 테스트
    2건 → 1건(비활성 단언)으로 축약. `listCaseJoinWorkers` 주석 정리.
  - 검증: `npm run test` 117/117(118→117, 경호취소 플로우 테스트 1건 제거) · lint
    (기존 warning 2) · build 통과. 실백엔드 `run-s-pgms` — `StecM1` → caseSeq 46 상세
    5-GET 렌더(경호계획 요약·스케줄 2조/1조·첨부 읽기전용), 조치 왕복
    (`"맞춤형 순찰, CCTV (2026.09.10 ~ 2026.09.20)"`), 경호취소 버튼 `disabled`
    (caseSeq 47에서 `[true,true]` 확인), caseSeq 47 미등록 → "기본정보가 등록되지
    않았습니다", **경호계획 수정 → 저장 → 요약 반영**, 콘솔 에러 0. caseSeq 46은
    이 검증으로 경호계획+스케줄(09-10 2조 / 09-11·12 1조) 보유 — 4·2번 재검증 데이터.
    응답 샘플: `GuardCase-Stec-GetGuardCaseDetail.md`, `-GetCaseGuardList.md`,
    `-GetCaseSchedule.md`, `-GetCaseMeeting-GetCaseDoc.md`, `-CaseInfo-Schedule-writes.md`.

- 2026-09-04: 8번([본사] 운영/시스템관리자 · 경호목록) — **연동 완료**. 그룹 B 세 번째
  화면, 7번에서 배정한 건이 처음 목록에 뜨는 지점.
  - `company/api/requests.ts::listSecurityCases` → `GET GuardCase/Stec/W/GetGuardCaseList`.
    응답이 envelope `{message,data,code}`의 `data`를 다시 `{meta:{pageNumber,pageSize,
    totalCount,totalPages}, data:[...]}`로 감싼 **이중 래핑**. `pageSize` 상한이 100
    (200/500 → HTTP 400 `"페이지 크기는 1~100"`)이라 화면에 페이지네이션 UI가 없어도
    `meta.totalPages`까지 클라이언트에서 순회해 이어붙임(`fetchGuardCasePage` 헬퍼 +
    `GUARD_CASE_MAX_PAGES=50` 방어). 매핑: `id←String(caseSeq)`(경찰서 목록은
    `deploySeq`였지만 본사 상세 #9가 `caseSeq` 기준), `mgmtNo`는 경호코드 붙은 완성형
    `"26-09-동래경찰서 ST0004"` → `splitMgmtNo`로 접수번호/경호코드 분리,
    `statusName`은 프론트 라벨과 그대로 일치(매핑 불필요), `userName→assigneeName`.
  - 진행중 건(배정/경호중/경호완료)만 반환 — 종결/취소는 이력 화면 소관(HIST-001) →
    프론트 `ACTIVE_SECURITY_CASE_STATUSES` 필터와 일치.
  - **담당자 id가 응답에 없다** → `SecurityCase.assigneeName?`(표시 전용) 필드 신규,
    `SecurityCaseListPage`에서 managers 조인(`listCaseAssignees`) 제거하고 담당자 열/
    필터를 이름 문자열 기준으로. **지역청·담당자 소속 본부 없음** → 지역청 필터 무력화,
    본부 열 "-" 고정(issues #1). 배정 직후 건은 `startDate/endDate` null → `formatDate`
    빈 값 가드("-").
  - **회귀 차단**: `listSecurityCases`를 실 API로 바꾸면 `pendingPeriodRequest`·
    `assigneeId` 조인에 의존하던 화면이 깨짐 → `ManagerAccountListPage` 담당경호
    다이얼로그는 `listManagerAssignedCases`(mock, 쿼리키 `['manager-assigned-cases']`,
    #11에서 정식 처리), `listPeriodRequests`는 내부 호출을 `listMockSecurityCases`로
    분리(#10). `SecurityCaseTabs`의 연장/단축 배지는 `GetGuardCaseList`에
    `pendingPeriodRequest`가 없어 #10 전까지 항상 0(주석). 죽은 코드 제거:
    `listCaseAssignees` 함수 + `mocks/handlers/managers.ts`(`GET /api/managers`).
  - **처음 사용자가 보고한 증상 해소**: 실백엔드 계정으로 `/admin/security-cases`
    진입 시 화면이 안 뜨고 `RefreshToken`이 반복 호출되던 문제 = 이 화면이 mock
    `/api/security-cases`·`/api/managers`를 부르는데 실 JWT를 mock 파서가 못 읽어 401
    → `apiFetch` refresh → React Query `retry:3`로 증폭된 것. 이 화면의 mock 호출을
    전부 제거해 해소(실측: `GetGuardCaseList` 1회, `/api/security-cases`·
    `RefreshToken` 0회, 콘솔 에러 0). 남은 미연동 본사 화면(`/admin/managers`,
    `/admin/period-requests/*`)의 같은 폭풍은 #10·#11에서 해소 — 전역 QueryClient
    retry 가드는 사용자와 별도 논의(exclusions에 기록).
  - 인프라: 테스트 전용 더블 `mocks/handlers/guardCase.ts`에 `GET GetGuardCaseList`
    추가(진행중 필터 + `pageSize` 1~100 검증 400 + 본부관리자 "본인 건만" 스코프
    재현). `SecurityCaseListPage.test.tsx` 1건 갱신(본부 열이 "-"라 `서울본부` 단언
    제거, 담당자명·상태만 확인).
  - 검증: `npm run test` 118/118 · lint(기존 warning 2개, error 0) · build 통과.
    실백엔드 `run-s-pgms` — `StecM1`(운영관리자) → 4건 렌더(동래 3 배정 + 강남 1
    경호완료), `GetGuardCaseList` 1회, 콘솔 에러 0, refresh 폭풍 없음. `StecM2`
    (본부관리자) → HTTP 200(403 아님), 4건 + 탭 배지 `경호목록 4 / 연장요청 0 /
    단축요청 0`. 데스크톱·모바일 회귀 없음. 응답 샘플:
    `GuardCase-Stec-GetGuardCaseList.md`.

- 2026-09-03: **피전 경호관리 섹션 백엔드 요청분(#5·#6·#7) 반영** — 5번(배치요구서
  수정) 연동 완료 + 3·4번 보정. 7번 커밋 직후 사용자가 "백엔드가 수정했다"고 알려줘,
  8번 착수 전에 화면 경계에서 반영(`LOOP_INSTRUCTIONS` 1단계).
  - **확인**: 사용자가 백엔드 수정분을 반영한 새 스웨거를 `docs/api-swagger.json`에
    갱신(이번 커밋에 포함). HEAD 대비 diff = `GetDeployDetailUpdate`/`GetDeployGuardSchedule`
    경로 신설 + `Add/UpdateDeployRequestDto`의 `deploymentPlace` 단일 → `guardHomeLoc`/
    `guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2` 4필드. 9/3 블로커(#5·#7)는 그때 스펙
    기준으로는 정확했고, 백엔드가 실제로 수정해서 해소됨.
  - **issues #5 해결**: `Add/UpdateDeployRequestDto`가 배치장소 4필드
    (`guardHomeLoc`/`guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2`). `securityCases.ts`에
    공유 `toDeployRequestDto` 뽑아 `createSecurityCase`(D-2 제거)·`updateSecurityCase`
    둘 다 4필드 전송. 쓰기 테스트 deploySeq 87로 왕복 확인 후 삭제. `GetDeployDetail`
    (상세용)은 여전히 null 반환 → exclusions, 화면4 배치장소 표시는 빈 값 유지.
  - **issues #7 해결 → 5번 연동**: `GET Deploy/Police/W/GetDeployDetailUpdate?deployReqSeq=`
    가 배치요구서 원본 필드 전부 반환(성별·생년월일·직업·사건개요·참고사항·배치장소
    4필드 + 요구자/수사관, 접수·배정 모두 200). `securityCaseDetail.ts`에
    `getDeployRequestForEdit` 신규(`getSecurityCase`에서 분리 — 상세는 `GetDeployDetail`,
    수정은 `GetDeployDetailUpdate`, 쿼리키 `['deploy-request-edit', id]`로 분리).
    `updateSecurityCase` → `PUT Deploy/Police/W/UpdateDeployRequest`(mock → 실 API,
    반환형 `Promise<SecurityCase>`→`void`). `toSeq`를 `securityCaseDetail.ts`에서 export.
    읽기/쓰기 필드명 비대칭(`suspectBirth`↔`suspectBirthDate`, `etcLoc1/2`↔`guardEtcLoc1/2`,
    `deployStatus`↔없음) 매핑. `SecurityCaseEditPage`: breadcrumb에서 `mgmtNo` 없을 때
    "경호관리"만 표시.
  - **issues #6 부분 해결**: `GET Deploy/Police/W/GetDeployGuardSchedule?deployReqSeq=`
    존재·200(현재 `data: []` — 스케줄은 화면 9에서 생성). 코드 연결은 화면 9 이후
    데이터로. 근무자별 동의서 조회(요청 3)는 전용 GET 아직 없음 — 화면 9 이후 재확인.
  - **버그 수정(사용자 테스트로 발견)**: 배치요구서 저장 후 상세 → "수정" 재진입 시
    수정 전 내용이 보임(새로고침하면 정상). 원인 2개: (1) `handleSubmit`이 저장 후
    `['deploy-request-edit', id]` 캐시를 안 건드림 → stale 캐시가 즉시 서빙됨. (2)
    `SecurityCaseForm`이 첫 렌더의 `initialForm`을 `useState`로 고정 → 백그라운드
    refetch가 끝나도 폼이 안 바뀜. → `SecurityCaseEditPage.handleSubmit`에서 저장 후
    `queryClient.removeQueries(['deploy-request-edit', id])`(아예 제거해 재진입 시 로딩→
    새 조회) + `invalidateQueries(['security-case', id])`·`(['police-security-cases'])`.
    회귀 테스트 추가(같은 QueryClient 공유, 저장→언마운트→재마운트→새 값 확인 —
    `removeQueries` 없으면 실패 확인). 브라우저에서 상세→수정→저장→상세→수정 SPA
    플로우로 새 값 표시 확인.
  - 인프라: `mocks/handlers/deploy.ts`에 `dtoToCreateInput`(4필드 배치장소) 공유 헬퍼,
    `toDeployDetailUpdate` 매퍼, `GET GetDeployDetailUpdate` + `PUT UpdateDeployRequest`
    더블 추가. 기존 `AddDeployRequest` 더블도 `dto.deploymentPlace` → 4필드로 교체.
  - exclusions: 배치장소 D-2 항목 해소 표시 / `GetDeployDetail` 배치장소 null 유지 /
    화면5 `mgmtNo` 없음·레거시 `crimeType` 영문값 신규.
  - 검증: `npm run test` 117/117 · lint · build 통과. 실백엔드 `run-s-pgms` —
    `SPoliceM5`(동래) 로그인 → `/security-cases/71/edit` prefill 정상(성별 남·생년월일·
    직업·사건개요·참고사항 채워짐, 이전엔 빈 값) → 사건유형·배치장소 채워 저장 →
    `GetDeployDetailUpdate` 재조회로 `crimeType`(stalking→스토킹)·`guardHomeLoc`/
    `guardWorkLoc` 갱신 확인 → curl로 71 원복. 콘솔 에러 없음. 응답 샘플:
    `Deploy-Police-GetDeployDetailUpdate.md`, `Deploy-Police-UpdateDeployRequest.md`.

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
