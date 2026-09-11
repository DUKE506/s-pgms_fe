# 진행 상태

상태값: `대기` / `구현중` / `승인대기` / `부분완료(△)` / `완료`

`부분완료(△)` = 엔드포인트 교체는 끝났으나 실백엔드 데이터가 없어 일부 경로만 실측
검증된 상태. 남은 경로는 비고에 적은 후속 번호에서 재검증해야 하며, 그전까지 `완료`로
올리지 않는다.

각 화면의 상세 API 목록은 `docs/backend-integration/matrix.md` 참고. 이 표는
**그 문서의 "권장 진행 순서"와 동일한 순서**로 정렬돼 있다.

**큰 틀(2026-09-03 재정렬)**: 경호건 생명주기(**메인 워크플로우**)를 앞으로 당기고, 그
검증까지 끝난 뒤 이력 → 게스트로 간다. 이전(2026-09-01)엔 계정권한 단위로 화면군을
통째로 끝내는 순서였는데, 배정 이후 상태를 만들어내는 화면(본사 배정·경호계획)이 뒤에
있어 앞쪽 피전 화면이 계속 "배정 후 미검증 → 재검증 이월"로 밀렸다. 그룹 안에서는
조회 API를 먼저 연결해 생성/수정 결과를 확인할 수 있게 한다. "다음 대상"은 항상 이
표에서 상태가 `대기`인 것 중 번호가 가장 빠른 행이다.

**개발은 화면 단위 / 백엔드 요청은 섹션 단위**(2026-09-03): 연동 작업은 지금까지처럼
표 한 행 = 1 iteration으로 진행한다. 다만 `docs/backend-integration/findings.md`의
요청·제외 항목을 **섹션이 끝나는 시점에 한 번에 묶어** 백엔드로 요청하고(화면마다 찔끔찔끔 아님), 응답을
기다리지 않고 다음 섹션을 계속한다. 백엔드가 요청분을 완료하면 지금 화면은 마무리하고
**다음 화면 착수 전에** 변경분 확인·수정·반영·검증을 끼워 넣는다. 섹션 경계 = 아래
그룹 경계(그룹 C 이력은 한 섹션). **그룹 B는 두 섹션으로 쪼갬(2026-09-04 결정)** —
쌓인 요청분이 너무 커지지 않게: **B-1 = #6~#9**(근무자·배치요청·경호목록·경호상세),
**B-2 = #10~#12**(연장/단축·관리자계정·본부관리자 스코프 재검증). B-1 종료(#9 완료) 시
일괄 요청, 응답 안 기다리고 B-2 진행.
상세 절차는 `TASK.md`("개발은 화면 단위 / 백엔드 요청은 섹션 단위"), `LOOP_INSTRUCTIONS.md`,
`guides/SECTION_BOUNDARY.md`.

| # | 그룹 | 역할 | 화면 | 상태 | 커밋 | 비고 |
|---|---|---|---|---|---|---|
| 1 | 전제 | 공통 | 로그인 | 완료 | `008383a` | 경찰/본사 실제로는 같은 엔드포인트 — 유일하게 역할보다 먼저 |
| 2 | A | [경찰서] 피전 | 경찰서 경호목록 | 완료 | `2679751` | 스코프는 서버가 403으로 강제(analysis.md 4-6 해소). 3번 직후 재검증 완료(새 접수 반영·mgmtNo 조합형태 확인). **7번 배정 직후 부분 재검증(2026-09-03)**: 배정 건이 `statusName:"배정"`(프론트 라벨과 일치)·`mgmtNo:"…동래경찰서 ST0002"`(경호코드 조합)로 반환됨 확인. 경호중/경호완료/종결/취소는 **9번 이후 재검증** |
| 3 | A | [경찰서] 피전 | 접수/배치요구서 작성 | 완료 | `5074920` (+배치장소 4필드 보정) (+사건유형 enum: 이번 커밋) | `POST AddDeployRequest`. 폼: 요구자 3필드 분리 + 생년월일 입력(+ `DateField` yearGrid). **2026-09-03**: 배치장소를 백엔드 수정에 맞춰 `guardHomeLoc`/`guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2` 4필드 전송(공유 `toDeployRequestDto`, D-2 제거, issues #5 해결 — 쓰기 테스트 deploySeq 87 왕복). **2026-09-09**: 사건유형을 enum 코드로 전송(`caseTypeToCrimeCode`, 공유 `toDeployRequestDto` — Add·Update 공통, findings "crimeType 라벨 전송" 해소) |
| 4 | A | [경찰서] 피전 | 경호 상세 | 부분완료(△) | `19786c4`·`56805cc`·`7650f17`·`1a2d565` | 접수 상태 실측 검증(2026-09-03). **2026-09-07 B-1 반영**: 백엔드가 `GetDeployDetail` shape 변경(`startDt`/`endDt` → `startDate`/`endDate`+`startTime`/`endTime`, `summary1~5`, `guardUserList`) → 배정+경호계획 등록 건의 조치 5개·배치시간·배치장소가 통합 카드에 채워짐(issues #13 해소, 브라우저 검증 deployReqSeq 81). 배정 이후 취소/연장/단축/종결 액션은 여전히 미검증 → 9번 이후 재검증. **2026-09-09 근무일정 재연결(findings #6)**: `GetDeployGuardSchedule` 이제 실데이터 반환 → `getDeployGuardSchedule` 신설, `SecurityCaseDetailPage`의 `workers: never[] = []` 제거, `WorkerAssignmentPanel` 재연결(근무자 이름·시각·연락처 인라인). 브라우저 검증(SPoliceM5·SPoliceM1 `/security-cases/90`). **완료 표시 보류**(배정 이후 액션 미검증 유지). **2026-09-09 문서함·종결 실연동**: `GetDeployDetail`의 `docDestructionDetail`→`attachments.destructionCertFileName` 매핑 누락 수정(파기확인서 "대기중" 고정 버그). 파기확인서 다운로드 `?caseSeq=`(resolveCaseSeq 우회)·`downloadYn`→종결 선결조건 게이트·종결 `CloseGuardCase`도 caseSeq 우회. 브라우저: 다운로드→종결 활성→사용자 실제 종결 완료(caseSeq 51). 경호취소/연장/단축은 여전히 미검. **2026-09-10 종결·다운로드 키 `deploySeq`로 되돌림(findings #16 🟢)**: 백엔드가 `CloseGuardCase`·`GetDestroyDocDownload` 두 EP를 `caseSeq`→`deploySeq`(배치요구서 PK = 라우트 id)로 수정 → `resolveCaseSeq`(GetDeployList 재조회 우회) **함수 통째 제거**, `closeCase`는 `{deploySeq,endReason}`·`downloadDestructionCert`는 `?deploySeq=` 직접. 더블 `CloseGuardCase` 핸들러도 `deploySeq`. 프로브(`_probe-4.sh`, 무변경): `{deploySeq:92}`→409·`{caseSeq:92}` 구 키→400 검증오류·M3→403. 사용자가 파기확인서 다운로드→종결 실왕복 확인. **2026-09-10 문서함 다운로드 연결(findings #18)**: 경호계획서·동의서는 전용 API 없이 `/files/{docPath}`(정적, 인증불필요)로 받는다. `DocumentsCard`·`ConsentDocsCard`의 다운로드 `onClick: () => {}` → `downloadFileByPath`(신규 `shared/lib/download.ts`), `docGuardDetail.docPath`(`{docSeq,docType:0,docPath,fileName,fileExt}` 실측)·`docAgreeDetail[]` 매핑, `vite.config.ts` 프록시에 `/files` 추가. 브라우저(SPoliceM5 `/security-cases/93`): 경호계획서 다운로드 버튼 연결·`/files/…` 200·콘솔 에러 0. CARRYOVER A `docGuardDetail` 해소. **2026-09-10 배정 이후 액션 사용자 재검증**: 경호취소·연장·단축 확인(CARRYOVER B #4 소진, 접수취소 hard delete만 남음) |
| 5 | A | [경찰서] 피전 | 배치요구서 수정 | 완료 | (이번 커밋) | 블로커 해소 — 백엔드가 `GET GetDeployDetailUpdate` 응답 구현(배치요구서 원본 필드 전부 반환, issues #7 해결). prefill = `getDeployRequestForEdit`(`getSecurityCase`에서 분리, 쿼리키 분리) / 저장 = `PUT UpdateDeployRequest`(공유 `toDeployRequestDto`). 읽기/쓰기 필드명 비대칭 매핑. **저장 후 재진입 stale 캐시 버그 수정**(`removeQueries` — 아래 로그). 브라우저 SPA 플로우 검증. `mgmtNo` 없어 breadcrumb 축소. **피전 경호관리 섹션 종료**. **2026-09-09**: 사건유형 읽기/쓰기 enum 전환(`GetDeployDetailUpdate` 매퍼 + 공유 `toDeployRequestDto`) — 레거시 영문 crimeType exclusion 해소, prefill·저장 왕복 브라우저 검증(deploySeq 90) |
| 6 | B | [본사] 운영/시스템관리자 | 근무자 목록/등록 | 완료 | `b5f5738` | `GetGuardList`/`AddGuardInfo`/`PatchGuardInfo`/`DeleteGuardInfo` 4종 실측(생성→수정→삭제 원상복구). 수정/삭제 mock에 없던 기능 → 행별 `⋮` 메뉴 UI 신규. 부서 열 제거(GetGuardList 응답에 `DEPT_NM` 누락 — DB엔 있음, issues #8 신규, 섹션 #12에서 일괄 요청). 조인용 `listCaseJoinWorkers` 분리(#9·#13 회귀 차단) |
| 7 | B | [본사] 운영/시스템관리자 | 배치요청 목록(+본부 배정) | 완료 | (이번 커밋) | `GetDeployRequestList`/`GetStecUserList`(담당자 필터)/`AddGuardCase` 3종. deploySeq 81 실배정 → **GuardCase 최초 생성 검증**(caseSeq 46, `ST0002`). 담당자 목록 본부(#1)·배정건수 필드 없어 표시 축소. "취소" API 없어 메뉴 비활성화(**issues #9 신규**). 조인용 `listCaseAssignees` 분리(#8 회귀 차단). **함께 수정**: `client.ts` refresh single-flight(동시 401 → 1회용 RefreshToken 회전 → 강제 로그아웃되던 문제). **2026-09-09 B-2 회신**: `GuardCase/Stec/W/CancelGuardCase` 신설 → `cancelPendingRequest` 배선, ⋮"취소" 활성. 접수취소 실왕복은 되돌릴 수 없어 이월(CARRYOVER B) |
| 8 | B | [본사] 운영/시스템관리자 | 경호목록 | 완료 | `59bcd5b` | `GetGuardCaseList` 실 API 전환. 응답 이중 래핑 `{meta,data:[...]}`, `pageSize` 상한 100 → `meta.totalPages`까지 클라이언트 순회. `caseSeq`→id, `mgmtNo` 완성형 `splitMgmtNo`, `statusName` 라벨 그대로, `userName`→`assigneeName`(담당자 id 없음 — managers 조인 제거). 7번 배정 건(caseSeq 46~48) 렌더 확인. **실백엔드 계정으로 이 화면 진입 시 나던 RefreshToken 폭풍 해소**(mock 호출 0). 회귀 차단: `listManagerAssignedCases`(#11)·`listMockSecurityCases`(연장/단축=#10) 분리, 죽은 `listCaseAssignees` + `handlers/managers.ts` 제거. 지역청·담당자 소속 본부 열 축소(exclusions) |
| 9 | B | [본사] 운영/시스템관리자 | 경호 상세 | 부분완료(△) | `6aeac40`·`f738723`·`0040d59`·`f4ab7df`·`92a7802` (+이번 커밋) | **조회 5종 조립** + 경호계획 수정(`PatchCaseInfo`) + 스케줄(`AutoAddSchedule`/`PatchScheduleGroup`/`DeleteScheduleGroup` — 그룹1 보호) + **사전미팅 저장/삭제**(`SaveCaseMeeting`) + **파일 업로드 3종**(`PatchGuardPlanDoc`/`PatchConsentDoc`/`PatchDestroyDoc`, multipart) + 파기확인서 다운로드 연동·브라우저 검증. **블록**: 경호계획 등록(`AddGuardCaseInfo`) — 배치기간 조회 경로 없음(blockers, issues #10) → 등록 버튼 비활성 + 안내. 경호취소 — 본사 API 없음(issues #9) → 버튼 비활성. 손실 매핑: 조치 5섹션↔`summary1~5`, 사전미팅 근무자별 시간(issues #11). 대표근무자·그룹 메모 조회 갭(issues #12). 테스트 더블 `guardCaseDetail.ts`. 기본정보 조회 카드 피전/본사 통일(`CaseBaseInfoCard`, `f738723`). **→ 섹션 B-1(#6~#9) 종료, 백엔드 일괄 요청**(`docs/backend-integration/requests/2026-09-04-본사-경호관리-B1.md`). **2026-09-07 B-1 응답 반영**: 신규 `GuardCase/Stec/W/GetDeployDetail` 연동 — `getSecurityCase`가 `GetCaseDoc.deploySeq`로 호출해 배치요구서 원본 병합(`mergeDeployRequest`) → "배치요구서 원본보기" 다이얼로그 전체 필드, 경호계획 미등록 건 배치기간 채움 → **경호계획 "등록" 버튼 활성화**(blockers/issues #10 종료), 첨부 "등록일". 브라우저 검증(caseSeq 48·46). 화면7 다이얼로그·조치 구조화(#11)는 여전히 미해결. **4·2번 재검증**: caseSeq 46 데이터 보유. **2026-09-09 B-2 회신**: `GuardCase/Stec/W/CancelGuardCase` 배선 → `cancelAssignedCase` 실 API, "경호취소" 버튼 활성(배정 상태). `SecurityCase.deploySeq`(GetCaseDoc) 추가 — 키가 caseSeq 아닌 deployReqSeq. issues #9 🟢. 실왕복 미검(CARRYOVER B). **2026-09-10**: 본사 경호취소 실왕복 사용자 확인(CARRYOVER B #9 소진). **2026-09-10 경호계획서 다운로드**(findings #18): `AttachmentsSection`에 다운로드 버튼이 아예 없던 것 → `caseInfoDto.filePath`/`guardAgreementDtos[].filePath` → `/files/{path}` 배선, 브라우저 검증(StecM1 `/admin/security-cases/53`) |
| 10 | B | [본사] 운영/시스템관리자 | 연장/단축 요청 목록 | 부분완료(△) | (이번 커밋) | `GetExtendRequestList`/`GetShortenRequestList`(조회)·`ConfirmCasePeriod`(승인) 실 API 전환, `SecurityCaseTabs` 연장/단축 배지 실카운트 배선. 거부는 EP 없어 UI 차단(issues #2, B-2 종료 시 요청). **테스트 데이터로만 검증** — 실백엔드에 경호중 건이 없어 배정 건에 연장/단축 요청을 만들어 승인 왕복 실측(원복 완료). **연장/단축 신청은 업무상 경호중 상태만 대상**이고, 피전이 경호상세에서 직접 신청하는 부분(matrix #4 `requestPeriodChange`, △)이 개발·검증돼야 실제 요청 데이터가 생긴다 → **피전 요청 영역 개발 이후 재검증**(4번 "배정 이후 재검증"과 함께). 완료 표시 보류. **2026-09-10**: 피전이 실제 신청한 연장/단축 요청으로 승인 왕복 사용자 재검증(CARRYOVER B #10 소진) — 완료 표시는 피전 요청영역(matrix #4 `requestPeriodChange`) 정식 개발 후 |
| 11 | B | [본사] 운영/시스템관리자 | 관리자 계정 관리 | 완료 | (이번 커밋) | `GetStecUserList`(목록)·`UpdateUser`(정보수정·비번초기화) 실 API 전환. `loginId→id`·`userSeq` 신규. 빈 연락처는 `""` 전송(`null`은 백엔드가 무시 — 실측). 배정건수·담당경호는 `GetGuardCaseList`(실 API) 담당자명 매칭 — mock `listManagerAssignedCases`/`listMockSecurityCases` 제거, `handlers/companyAccounts.ts` 삭제. **본부관리자는 `GetStecUserList` 403** → "운영·시스템관리자만 이용" 안내(B, 사용자 확인). 접근 자체(route/메뉴 제외 vs 백엔드가 본인 행만)는 **#12에서 결정**. "본부" 열 "-"(issues #1). 실백엔드 검증: StecM1 목록·정보수정 왕복·비번초기화(StecM4)·담당경호(HS2본부→caseSeq 51·29), StecM2 403 안내. 응답 샘플 `User-Stec-UpdateUser.md`. **2026-09-09 B-2 회신**: `GetStecUserList` 본부관리자 **200** 실측 → 403 안내 제거(목록 노출, 수정은 `canEdit`=운영·시스템만). **"본부" 열 제거**(groupSeq/groupName 경찰 전용 공유 컬럼, findings #1 본부 파트 🟢) |
| 12 | B | [본사] 본부관리자 | 스코프 재검증(경호목록/상세/연장단축/관리자계정/근무자) | 검증완료·문서보류 | `a570869` (더블만) | **API 레벨 스코프 검증 완료(2026-09-08, StecM2·StecM3)**. 완료 표시·issues 전달상태 갱신·지역청 필터 프론트 후속은 **B-2 백엔드 회신 후** 재검증과 함께 처리. B-2 요청서 전달(`docs/backend-integration/requests/2026-09-08-본사-경호관리-B2.md`/`.xlsx`). 아래 로그 참고 |
| 13 | C | [본사] 운영/시스템관리자 | 이력 조회 | 부분완료(△) | `536cd5e` (+2026-09-08 목록) | 목록 `GET History/Stec/W/GetHistoryList` 실 API 전환(`company/api/history.ts` 신규 분리 — 경찰 이력 #14·#15는 mock 유지). 이중 래핑·행 축소 매핑, `statusName`("경호취소"→'취소'), `totalMin`→`totalGuardMinutes`. **본부관리자 스코프(HIST-003) 실제 적용 확인**(StecM3 배정 0건→이력 0건, StecM2 동래 담당→5건). 실서버에 취소 건 5개 존재 → 브라우저 검증(StecM1 5건/StecM2 5건, 콘솔 에러 0). **상세 보류** — `History/Stec/W/GetHistoryDetail` 404, Police EP 본사 토큰 403(issues #14 신규, blockers) → `/admin/history/:id` "준비 중" 안내. **종결 건 재검증 보류** — 사용자가 오늘 날짜 경호건 생성→종결 후 status 코드 매핑·`totalMin` 실값 재확인. 안 되면 △ 유지. 응답 샘플 `History-Stec-GetHistoryList.md`. **2026-09-09 회신 반영**: 백엔드가 `History/Stec/W/GetHistoryDetail` 신설 → `getCompanyHistoryDetail` 실 API 배선, "준비 중" placeholder·`CompanyHistoryDetailUnavailableError` 제거, `HistoryDetailPage`(company) 실제 상세 렌더(경찰 이력상세 레이아웃, 매퍼 `detailRowToSecurityCase` 공유). 응답 = 경찰용 + `groupName`·`parentGroupName`. 스코프: StecM3(배정 0건)→404. 브라우저 검증(StecM1, `/admin/history/46`). blockers/issues #14 종료. 응답 샘플 `History-Stec-GetHistoryDetail.md`. **2026-09-09 종결 검증**: 사용자가 만든 종결 건(caseSeq 51, totalMin 2160=36시간, remark "경호기간 만료")으로 목록·상세 실백엔드 확인 — 총경호시간·종결코드·근무자 배정 이력 정상. 종결 데이터 대기 소진. (URL 스코프 일괄테스트만 남아 △ 유지) |
| 14 | C | [경찰서] 피전 | 이력 조회 | 부분완료(△) | `536cd5e` (+2026-09-08) | 목록 `GET History/Police/W/GetHistoryList` + 상세 `GetHistoryDetail` 실 API 전환(`listPoliceStationHistory`/`getPoliceStationHistoryDetail` 신규 — 본청·지역청 #15는 mock, `role === '경찰서'` 분기). `groupSeq`(세션) 필수·끝난 건만(HIST-001). 상세 `guards[]`(이름 인라인)→신규 `historyGuards` 필드. `caseType`·5개 조치·배치장소 응답에 없음→축소(exclusions). 브라우저 검증(SPoliceM5 동래: 목록 취소 5건, 상세 대상자 마스킹·근무자 4명 투입실적·취소일/사유), 콘솔 에러 0. **종결 건 재검증 보류**(#13과 동일 — 사용자 종결 데이터 생성 후 종결코드·`totalGuardMinutes` 실값). 응답 샘플 `History-Police-GetHistoryList.md`·`-GetHistoryDetail.md`. **2026-09-09 회신 반영**: 목록 매퍼에 `deploySeq`·`status`(int) 필드 추가, `SecurityCase.id`를 종결·취소면 `caseSeq`/그 외면 `deploySeq`로 분리(#15 라우팅용). `getPoliceStationHistoryDetail`을 3역할 공통으로 통합(role 분기 제거), `detailRowToSecurityCase` export해 본사(#13)와 공유. 경찰서 경로 groupSeq 유지 → **회귀 0**. **2026-09-09 종결 검증**: 종결 건(caseSeq 51) 목록 36시간·종결 배지, 상세 종결 정보 "경호기간 만료"·근무자 배정 이력 정상. ⚠️ 사건유형·5개 조치는 종결 건에서도 갭(`GetHistoryDetail` 응답에 없음 — exclusions 유지, findings 승격 검토). 종결 데이터 대기 소진 |
| 15 | C | [본청]/[지역청] | 이력 조회 + 진행중 건 상세(조회전용) | 부분완료(△) | `d236ec6`·`536cd5e` | **프로브 결과 전환 불가 → 본청/지역청 이력은 mock 유지.** `GetHistoryList`·`Deploy/Police/GetDeployList` 둘 다 `groupSeq` 경찰서(leaf) 단위 — 부모 노드(본청 22·지방청 24) → 0건, 캐스케이드 없음. `GetHistoryList`는 종결·취소만(status/includeActive/all/isEnd 무시), 진행중은 `GetDeployList?groupSeq=<leaf>`(본청/지역청 토큰도 200). 관할 전체 = `Login/W/GetGroupTree`(3역할 공통 200, 역할 서브트리)로 leaf 뽑아 팬아웃 가능하나 **임시방편이라 미채택(사용자 결정)**. 진행중 상세 `GetDeployDetail?deployReqSeq=`는 본청/지역청 토큰에 200(deployReqSeq 90) — 목록 전환 시 코드 변경 최소. `GetHistoryDetail`도 본청/지역청 200(스코프 미검, `guardWorkLoc`/`guardHomeLoc` 포함 — #14 exclusions와 배치, 논의항목). **그룹 C 섹션 종료 → 백엔드 일괄 요청서 전달**(`docs/backend-integration/requests/2026-09-08-이력-C.md`, issues #14·#15). 종결 건 재검증(#13·#14 공통)·본부관리자 이력 스코프 꼬리는 회신·데이터 후. **2026-09-09 회신 반영 → 실 API 전환 완료**: 스웨거 개정으로 `GetHistoryList`가 `groupSeq` **없이** 부르면 역할 캐스케이드(본청=전국·지역청=관할 이하·전 구간). `listSecurityCaseHistory`/`getSecurityCaseHistoryDetail` mock → 실 API. 접수·진행중 행은 `deploySeq`로 경호상세(`/security-cases/:id`), 종결·취소는 `caseSeq`로 이력상세(`/history/:id`). mock `/security-cases/history*` 제거. 브라우저 검증(SPoliceM1 전국 9건·진행중→`/security-cases/90`·취소→`/history/46` / SPoliceM3 관할 7건). ⚠️ Police `GetHistoryDetail`은 스웨거와 달리 진행중도 200이나 화면 미도달(제외). **2026-09-09 종결 검증**: 지역청(SPoliceM3) 종결 건 `status:3`→'종결' 매핑·목록·상세 정상. △ 유지 이유 = URL 직접접근 스코프 일괄 테스트(CARRYOVER C)만 (종결 데이터 대기는 소진) |
| 16 | D | [경찰서] 피전 | 게스트 계정 관리 | 완료 | `1a6b4e7` | `User/Police/W/` 6종 실 API 전환(`GetGuestUserList` `groupSeq` 필수·평면 배열 / `GetGuestCaseList` 발급 후보 / `GetGuestCaseDetail` 수정 후보 `isAccess` / `AddGuestUser` `{name:"게스트"(고정),caseSeqs}` 응답 `{data:true}` / `UpdateGuestCaseInfo` / `DeleteGuestUser`). **아이디 미리보기 제거**(issues #3 → 🟢, 프론트 UX 변경 — 발급 후 목록 재조회, `previewNextGuestAccount`/`previewNextGuestId` 삭제). 발급 후보 조회를 `listGuestScopeSecurityCases`(mock `/security-cases`) 대신 전용 EP 2개로 분리. `handlers/guests.ts`(`guestTestHandlers`)를 실 6종 shape로 재작성 + `testOnlyHandlers`로 이동(브라우저는 실백엔드 프록시). `mocks/data/guests.ts`에 `userSeq` 필드 추가(로그인 계정 소스는 존치 — #17용). 중지 계정(`useYn`)은 화면 설계에 없어 숨김(exclusions, #17 종료 시 전달). 실백엔드 `SPoliceM5`(동래) 발급→조회권 수정(회수)→삭제 왕복 브라우저+curl 실측, `SPoliceM3` 403. 응답 샘플 `User-Police-Guest.md` |
| 17 | D | [경찰서] 게스트 | 경호목록 + 상세(조회전용) | 완료 | `56e04e3` (테스트) + 문서 | **코드 신규 없음** — 피전 경호목록(`SecurityCaseListPage`)/상세(`SecurityCaseDetailPage`)를 role로만 갈라 재사용(이미 구현: `isReadOnlyViewer` 본청/지역청/게스트, 신규접수 버튼 `role !== '게스트'`). 프로브로 게스트 토큰 스코프 검증: `GetDeployList`가 게스트 토큰이면 **`?groupSeq=` 무시하고 `GUEST_CASE_ACCESS` 스코프만 적용**(groupSeq 32/22/999 다 동일 = 조회권 건만). `GetDeployDetail?deployReqSeq=` 조회권 건 200(피전과 동일 shape). 게스트 토큰 403: `CancelGuardCase`·`GuardCase/Stec/GetGuardCaseList`·`User/Police/GetGuestUserList`. 메뉴는 이미 `경호목록` 단일(`PoliceAppShell`). 브라우저(`SPoliceGuest3` 동래): 목록 1건→행클릭→상세(`/security-cases/90`) 기본정보/배치장소/조치5/문서함 렌더·액션버튼 0개, 콘솔 에러 0. `SecurityCaseDetailPage.test.tsx`에 게스트 읽기전용 테스트 1건 추가(122). **미검증(이월)**: 조회권 없는 활성 건 상세 차단 — 동래 활성 1건뿐. **그룹 D 섹션 종료 → 요청서 `requests/2026-09-08-게스트-D.md`**(useYn 중지 / 게스트 상세 스코프 확인 2개 논의). 응답 샘플 `Deploy-Police-GetDeployList.md` "#17 관찰" |
| — | 보류 | [본사]/[본청]/[지역청] | 대시보드 | 보류 | | Phase 4 자체가 보류 중 |

## 최근 iteration 로그

(진행하면서 아래에 짧게 기록 — 날짜, 무엇을 했는지, 막힌 점)

- 2026-09-11: **CARRYOVER 대기 항목 5건 정리** (사용자가 백엔드 회신·자체 테스트
  결과를 가져옴). loop-backend iteration 아님 — 화면 단위 수정 패스.
  - **a. 1970 표시** — 라이브 재확인(`GetDeployList`, ST0011~14) 여전히
    `startDt`/`endDt` null → 1970 재현됨. 사용자 확인: 백엔드 개발자가 누락을
    인지, 재작업 예정 — **백엔드 대기로 전환**, 프론트 작업 없음.
  - **b. 본사 동의서** — caseSeq 61 실데이터(사용자 업로드)로 확인, 기존 코드
    (`GetCaseDoc.guardAgreementDtos`)가 이미 맞게 짜여 있어 **코드 변경 없이 완료**.
  - **c. 피전 동의서 재작업** — `Deploy/Police/W/GetDeployDetail.docAgreeDetail`의
    실제 필드명(`agreePath`/`agreeFileName`/`agreeFileExt`/`guardName`, `guardSeq`
    없음)으로 `DeployAgreeDetail` 타입 신설. 기존엔 `baseInfo.defaultWorkers`
    로스터를 돌며 각자 파일을 찾는 구조라 로스터가 항상 비어(findings #6) 카드
    자체가 안 떴는데, **로스터 매칭을 버리고 `docAgreeDetail`(업로드된 것만)을
    그대로 렌더**하는 걸로 재설계(사용자 결정 — 서약서+동의서 한 파일). `toConsentDocs`
    신규, `CaseAttachments.consentDocs` 필드 추가, `ConsentDocsCard` 재작성(`workers`
    prop 제거, roster 의존 완전 제거). (구) `consentMap` 삭제.
  - **d. crimeType** — 사용자 확인 + 라이브 프로브 추가 샘플로 재확인, 레거시 한글
    폴백은 방어 코드라 유지 — **추가 작업 없음, 종료**.
  - **e. 본사 경호목록 상태 소스 전환** — `GuardCase/Stec/W/GetGuardCaseList`에
    신규 확인된 `guardCaseStatus`(0:배정/1:경호중/2:경호완료/3:종결/4:경호취소,
    `GetHistoryList`와 같은 코드 체계)를 상태 소스로. `shared/lib/deployStatus.ts::
    resolveGuardCaseStatus(code, statusName)` 신설(코드 우선, 없으면 statusName
    폴백 — findings #19가 요청한 피전 쪽 엔드포인트엔 여전히 없어서 그쪽은
    `resolveDeployStatus` 그대로 유지). `GuardCaseRow`에 필드 추가,
    `guardCaseRowToSecurityCase` 적용. 테스트 더블(`guardCase.ts`)에도 매핑 추가.
  - 검증: `npm run test` 137/137 · lint · `tsc -b` 통과. 실백엔드 `run-s-pgms`:
    본사 경호목록 렌더 회귀 없음(현재 연장/단축 대기 건이 없어 시각적 차이는 없음,
    콘솔 에러 0) · 피전 동의서 카드(`/security-cases/100`, 김가드 항목 다운로드
    버튼과 함께 렌더, 콘솔 에러 0).
  - **문서**: findings.md #19에 라이브 재확인 결과 추가, docAgreeDetail 잔존 항목
    해소 기록. CARRYOVER A(crimeType 종료·B-2 status 재확인)·B(접수취소 소진)·
    D(동의서 전부 완료·guardCaseStatus 전환 완료) 갱신.
  - **(후속) 문서함 표시 문구 정리** — 사용자 피드백: 동의서 카드 행이 의미 없는
    테스트 파일명("26년 명절(추석) 선물 리스트_0.pdf")을 그대로 보여주고 있어
    혼란스러움. `ConsentDocsCard` 행 제목을 "보안서약 및 개인정보동의서 · {이름}"
    (라벨+누구인지)으로, 부제는 "업로드 완료"로 — 파일명 텍스트 노출 제거(다운로드
    시 파일명으로는 여전히 씀). `DocumentsCard`의 파기확인서 행도 같은 패턴으로
    통일 — 제목은 "파기확인서" 고정, 부제가 대기문구 ↔ 파일명으로 전환(기존엔
    제목 자체가 파일명으로 바뀌었음). 경호계획서 행은 미변경(요청 범위 아님).
    브라우저 검증(`/security-cases/100` 동의서, `/security-cases/92` 파기확인서
    업로드 완료 상태), 콘솔 에러 0.
  - **(후속) 문서함 카드 4개로 분리** — 사용자 지적: 동의서만 별도 카드로 빼져있고
    나머지(배치요구서·경호계획서·파기확인서)는 "문서함" 카드 하나에 몰려있어
    어중간함. 본사 `AttachmentsSection`은 이미 문서 종류마다 카드가 분리돼
    있음(제목+설명 한 줄+문서 행) — 같은 패턴으로 통일. `DocumentsCard`가 카드
    하나 대신 `DocCard` 3장을 반환하는 프래그먼트로 재작성(내용/동작은 그대로,
    레이아웃만 분리). 브라우저 검증(`/security-cases/100` 4장 분리 렌더,
    `/security-cases/101` 접수 상태는 배치요구서 카드만), 콘솔 에러 0.
  - **(후속) 순서·문구·색상 정리** — 사용자 피드백 3건. ① 동의서·파기확인서 카드
    순서 교체(배치요구서→경호계획서→**동의서→파기확인서**) — `DestructionCertCard`
    신규 분리(원래 `DocumentsCard` 안에 있던 파기확인서 블록을 페이지에서 독립
    렌더할 수 있게 꺼냄, `DocRow`/`DocCard`는 `DocumentsCard.tsx`에서 export해
    공유). ② 동의서 행의 "업로드 완료" 문구 제거 — 피전이 업로드한 것처럼 보이는
    오해 소지 + 업로드된 것만 보여서 불필요 → 파일명으로 교체. ③ 동의서 행이
    본사 스타일(초록 강조)을 그대로 물려받아 경호계획서·파기확인서(파란/중립)와
    색이 다르던 것 — 이유 없어서 `ConsentDocsCard`도 `DocRow`를 재사용하도록
    변경해 자동 통일. 브라우저 검증(`/security-cases/100`), 콘솔 에러 0.
  - **(후속) 활성화 색상까지 본사와 동일하게** — `DocRow`에 `accent` prop 추가
    (`green`/`blue`, 본사 `AttachmentsSection`과 동일 배색 — 업로드 파일=초록,
    배치요구서 같은 상시 웹폼 기록=파랑). 배치요구서 행만 `accent="blue"`,
    나머지(경호계획서·파기확인서·동의서)는 기본값 초록. 대기중(pending) 상태는
    미변경. 브라우저 검증(`/security-cases/100`), 콘솔 에러 0.
  - **다음**: 커밋 대기.

- 2026-09-11: **추가 수정 3건** (사용자 재검증 중 나온 것). loop-backend iteration
  아님 — 화면 단위 수정 패스.
  - **① 배치요청 목록 행 클릭 → 배치요구서 원본 연결**(matrix #7 신규 행) — 지금까지
    `DispatchRequestViewDialog`가 목록 필드만 표시해 대상자·사건개요 등 대부분
    "-"였음. 화면9가 이미 쓰던 `GuardCase/Stec/W/GetDeployDetail`을 화면7도
    재사용(`getDeployRequestDetail`, `requests.ts` 신규). 응답에 있던
    `crimeType`·`suspectUserName`·`investigator`·`responsibleOfficer` 4필드를
    `DeployRequestDetailData`에 추가(화면9는 안 읽어 인터페이스에 없었음) +
    `fetchDeployRequestDetail` export. 테스트 더블 신규(`guardCase.ts`).
  - **② 경호계획서 정보 등록 — 11.임시조치 "4호" 누락 수정** — `TEMPORARY_MEASURES`
    배열에 1·2·3·5호·신청예정만 있고 4호가 빠져있던 단순 버그(`BaseInfoForm.tsx`).
    조치 5개(7~11번, `summary1~5`) ↔ 서버 전달 방식은 `shared/lib/caseMeasures.ts`
    (항목은 `, ` 조인, 기간은 "시작일 ~ 종료일" 문자열 — 손실 매핑, findings #11
    구조화 요청 잔존) — 사용자 요청으로 코드 위치 확인.
  - **③ 수정/삭제 버튼 아이콘화** — 경호정보 카드(`CaseBaseInfoCard`, 피전·본사·
    이력상세 공유) "수정" 버튼에 `SquarePen` 아이콘 추가(텍스트 유지). 근무
    스케줄(`ScheduleSection`)의 사전미팅 "수정"/"삭제"·그룹 카드 "수정"은 텍스트
    링크 → 아이콘 전용 `Button variant="ghost"/"destructive" size="icon-sm"`로
    전환(패딩·아이콘색·배경색·radius·hover 전부 기존 "더보기" 버튼과 동일 패턴 재사용).
  - **④ (후속) 수정 아이콘 버튼 색상 통일** — 사용자 요청으로 ③의 "수정" 계열 버튼
    (경호정보 카드 pill 포함) 색을 파랑/기본색 → `text-muted-foreground`(hover 시
    `text-foreground`)로 통일 — `DetailHeader` 뒤로가기 버튼과 동일 톤. 삭제
    (destructive, 빨강)는 그대로 유지.
  - 검증: `npm run test` 137/137(그룹 수정 버튼 셀렉터를 텍스트→라벨 기반으로 수정) ·
    lint · build · `tsc -b` 통과. 실백엔드 `run-s-pgms`: 배치요청 원본보기 실데이터
    렌더(대상자 "이동희" 등), 임시조치 4호 노출, 아이콘 버튼 3곳 렌더·색상 확인, 콘솔
    에러 0. **2026-09-11 사용자가 직접 재검증**: 모바일 반응형, 배치요청 "배정"·
    연장/단축 "승인" 실동작, 경호계획서 정보 수정 저장 왕복(임시조치 4호 포함),
    경호계획서 정보 미등록 상태의 사전미팅 안내문구 — 전부 확인 완료.
  - **문서**: matrix.md 배치요청 목록에 신규 행 추가.
  - 커밋 `192717e`.

- 2026-09-11: **운영팀 미팅 후 수정사항 4건 처리** (사용자가 운영팀 미팅에서 받아온 결정
  사항 반영). loop-backend iteration 아님 — 화면 단위 수정 패스.
  - **① 본사 취소·거부·경호취소 버튼 제거** — 배치요청 ⋮ "취소"(`cancelPendingRequest`),
    연장/단축요청 ⋮ "거부"(`rejectPeriodRequest`, 어차피 EP 없어 disabled였음),
    경호상세 배정상태 "경호취소"(`cancelAssignedCase`) 전부 제거. 승인·배정은 그대로.
    관련 다이얼로그(`CancelPendingCaseDialog`·`CancelAssignedCaseDialog`, company)
    삭제, `PeriodRequestActionDialog`는 승인 전용으로 축소. **findings #2(연장/단축
    거부 EP 없음) 해소** — 더는 백엔드에 요청 안 함(운영팀 결정으로 기능 자체 제외).
  - **② "기본정보" 명칭 변경** — 본사 배정상태 등록 액션(버튼·breadcrumb·안내문·토스트)
    "기본정보 등록" → "경호계획서 정보 등록". 상세 카드 제목(공유 `CaseBaseInfoCard`,
    피전·본사·이력상세 공통) "기본정보" → "경호정보".
  - **③ 사전미팅 UI를 API 형태(미팅 단위)에 맞춰 재설계** — 기존엔 근무자별 시간 입력
    UI였는데 저장 시 이미 뭉쳐 보내고 있었음(`SaveCaseMeeting`이 미팅 전체 1구간만
    받음). `PreMeeting` 타입을 `{date,startTime,endTime,workerIds[]}`로,
    `PreMeetingDialog`는 상단 미팅 시간 1개 + 근무자 체크리스트(참석 여부만)로.
    **findings SaveCaseMeeting 항목(근무자별 시간 유실) 해소** — DTO 확장 요청 불필요.
  - **④ 공용 `DateField` 텍스트 입력화** — 기본을 캘린더 팝오버에서 숫자 입력(자동
    `yyyy.MM.dd` 포맷, 완성 시 `yyyy-MM-dd`로 `onChange`)으로 전환(`variant` prop,
    기본 `'text'`). 이력 조회 기간 필터 2곳(피전·본사)만 `variant="calendar"`로 유지.
    신규접수·수정 폼(생년월일·배치기간)·본사 경호계획 폼(배치기간)·사전미팅 날짜 적용.
  - **⑤ (후속) 사전미팅 참석 근무자 후보 필터링** — 사용자 지적: ③의 체크리스트가
    회사 전체 근무자를 보여주고 있었는데, 경호계획서 정보(`baseInfo.defaultWorkers`,
    경호풀)에 등록된 근무자만 나와야 함. `PreMeetingDialog`에서
    `defaultWorkers`의 `workerId` 집합으로 `workers` prop을 필터링한
    `eligibleWorkers`를 만들어 체크리스트에 사용(별도 API 불필요 — 그룹 근무자
    배정·동의서 업로드 대상자 선정과 같은 소스). 브라우저 검증(ST0009, 전체
    5명 중 경호풀 등록된 2명만 노출 확인).
  - 검증: `npm run test` **137/137**(취소·거부 테스트 3건 삭제) · lint · build · `tsc -b`
    통과. 실백엔드 `run-s-pgms`: StecM1으로 배치요청/연장/단축 화면(⋮ 메뉴 확인, 연장·
    단축은 대기 건 없어 빈 목록만 확인) · 경호상세(ST0014, 경호취소 버튼 없음·"경호계획서
    정보 등록" 문구) · 경호정보 카드 라벨(본사 ST0009·피전 ST0009 둘 다) · 사전미팅
    실왕복(2명 체크→저장→카드에 날짜+시간 1줄+뱃지 표시 확인→삭제로 원복) 전부 확인,
    콘솔 에러 0. 피전 신규접수 생년월일·배치기간 텍스트 입력(`1990.01.01`·`2026.06.01`
    ~`2026.06.30`) 정상 포맷, 나이 자동계산 정상. 이력 필터는 캘린더 아이콘 그대로 유지
    확인(SPoliceM5).
  - **문서**: findings.md #2 🟢, SaveCaseMeeting 섹션 🟢, matrix.md 3곳(취소·경호취소·
    거부 요약) UI 제거 표기, CARRYOVER A절 B-2 행에 2건 요청 철회 반영.
  - 커밋 `e1edefa`.

- 2026-09-10: **수정사항 7건 처리** (사용자 재검증 중 나온 UI/연동 이슈 모음, 커밋 4개).
  loop-backend iteration 아님 — 화면 단위 버그픽스 패스.
  - **① 본사 경호목록 "본부" 열 제거**(`409ad4a`) — 본사 계정은 `USER_INFO` group 컬럼
    미사용(findings #1). 데스크톱 테이블 헤더·셀.
  - **② 근무조 특이사항 연결**(`409ad4a`) — `GetCaseSchedule` 응답이 `groups[].memo`를
    주기 시작(findings #12 memo 파트 🟢). `toWorkSchedule`이 `note: ''`로 하드코딩하던 것을
    `note: g.memo ?? ''`로. `PatchScheduleGroup.memo`→`GetCaseSchedule.memo` 왕복 프로브 +
    브라우저(StecM1 `/admin/security-cases/53`) 확인. 테스트용 memo 원복.
  - **③ 단축 요청 다이얼로그 "(현재)" 라벨 제거**(`409ad4a`) — 마지막 배치일자 버튼의
    "(현재)"가 오늘로 오인 소지.
  - **④ 연장/단축 신청 대기 건이 피전 경호목록에서 사라짐**(`3e33042`) — `GetDeployList`
    `statusName`이 신청 걸린 경호중 건을 "연장"/"단축"으로 준다 → `VISIBLE_STATUSES` 필터에
    걸려 행이 빠짐. `shared/lib/deployStatus.ts::resolveDeployStatus`로 "연장"/"단축"→경호중
    정규화, 피전 목록/상세/수정 매퍼 3곳 적용. 상세는 `requestedEndDate` 있으면
    `pendingPeriodRequest`도 조립. 테스트 더블도 pending 시 "연장"/"단축" 반환. 테스트 1건
    추가(139→140). 브라우저: 단축 걸린 ST0015(deploySeq 96)가 경호중으로 표시됨.
    **findings #19 신규(🔴)**: `GetDeployList`·`GetDeployDetail`에 숫자 `status`(0~4,
    `GetHistoryList`엔 이미 있음) 추가 요청 — **사용자가 백엔드에 요청함, 회신 대기**.
  - **⑤ 종결 후 페이지 전환**(`4e892e2`) — 피전 종결 완료 시 `CloseCaseDialog`가 상세에
    머무르던 것 → `navigate('/security-cases')`(종결 건은 목록에서 빠짐). 종결 테스트에
    "경호목록 도착" 어서션 추가.
  - **⑥ breadcrumb 통일**(`4e892e2`) — 피전 배치요구서 수정 화면 "경호관리 / …" →
    "경호목록 / …"(피전 메뉴/신규화면과 일치). 본사 경호상세 관리번호 없을 때 "경호관리 / "
    꼬리 가드. 이력상세 "{소속} / 이력 조회" → "이력 조회 / {관리번호}"(메뉴/항목 순서 통일).
  - **⑦ 공용 상세 헤더 뒤로가기 버튼**(`4e892e2`·`26487ff`) — `shared/components/DetailHeader`
    신설: 왼쪽 화살표 버튼(`navigate(-1)`, 히스토리 없으면 `fallbackTo`) + 경로 텍스트(클릭
    이동 없음). 경호상세·이력상세(피전/본사)·배치요구서 접수/수정 화면 5곳 적용. 아이콘
    ArrowLeft·`p-2`·`rounded-lg`·hover 배경(`26487ff`, 사용자 디자인 요청).
  - 검증: `npm run test` 140/140 · lint(기존 warning 2) · build · `tsc -b` 통과. 브라우저
    `run-s-pgms` 각 화면 확인, 콘솔 에러 0.
  - **미해결**: ④ 숫자 `status` 백엔드 회신 대기(findings #19). **추가 작업 기록**: 경찰서
    경호목록에서 배정 직후 건(배치기간 null)의 경호기간이 `1970.01.01`로 표시됨 —
    `formatDate` 빈 값 가드 없음(본사 목록엔 있음). CARRYOVER D절.

- 2026-09-10: **문서함 다운로드 연결 — 경호계획서·개인정보동의서** (#4·#9 걸침). 재검증 중
  발견한 프론트 갭 수정(백엔드 요청 아님). 유형 = 연동(계획서·프로브 축약).
  - **배경**: 파기확인서만 전용 API(`GetDestroyDocDownload` — 수령 기록이 종결 선결조건).
    경호계획서·동의서는 스웨거 설명대로 "PATH가 곧 다운로드 URL" — 백엔드가 정적 파일을
    `{API}/files/{경로}`로 서빙(2026-09-10 실측: `application/pdf`, **인증 불필요**,
    `Content-Disposition` 없음). 그런데 프론트는 (a) 피전 `DocumentsCard`·`ConsentDocsCard`의
    다운로드 `onClick: () => {}` (빈 함수), (b) 본사 `AttachmentsSection`엔 다운로드 버튼
    자체가 없음(올리기만 됨), (c) `docPath`/`filePath`를 `attachments`에 매핑조차 안 함.
  - **응답 필드 실측**: 피전 `GetDeployDetail.docGuardDetail = {docSeq, docType:0,
    docPath:"guardcase/53/202609/….pdf", fileName, fileExt}` (deployReqSeq 93) /
    `docAgreeDetail: []`(동의서, 실데이터 없음). 본사 `GetCaseDoc.caseInfoDto.filePath` /
    `guardAgreementDtos[].filePath`(전부 null). `/files/{docPath}` → 200, `application/pdf`.
  - **G2 결정 0개** — 프로브(`/files/` 경로 200 확인)만, 계획대로 구현.
  - **구현**: `vite.config.ts` 프록시에 `/files` 추가. `shared/lib/download.ts::
    downloadFileByPath(docPath, fileName?)` 신설(blob 받아 `a.download` — 파기확인서 다운로드와
    같은 패턴). `CaseAttachments`에 `securityPlanFilePath`/`workerConsentFilePaths` 추가.
    피전 매퍼(`docPathOf`/`consentMap` 헬퍼로 `docGuardDetail.docPath`·`docAgreeDetail[]`),
    본사 매퍼(`caseInfoDto.filePath`·`guardAgreementDtos[].filePath`). 피전 `DocumentsCard`·
    `ConsentDocsCard`, 본사 `AttachmentsSection` 다운로드 배선(경로 없으면 버튼 숨김/비활성).
    테스트 더블 변경 없음(mock `GetDeployDetail` doc 매핑은 `d.mock` 오버라이드로 vitest에서
    안 탐, 브라우저는 실백엔드 프록시).
  - 검증: `npm run test` **139/139** · lint(기존 warning 2) · build · `tsc -b` 통과. 실백엔드
    `run-s-pgms`: 피전 `/security-cases/93` — 경호계획서 다운로드 버튼 연결·페이지에서
    `/files/…` fetch → 200 `application/pdf` 1.33MB·클릭 시 콘솔 에러 0(스크린샷
    `doc-dl-01-police-93`). 본사 `/admin/security-cases/53` — 경호계획서 다운로드 버튼 표시
    (이전엔 없었음)·동의서 행은 파일 없어 버튼 없음·콘솔 에러 0.
  - **문서**: findings #18 신규(🟢)·#17 `docGuardDetail` 필드명 해소, CARRYOVER A절
    `docGuardDetail` 해소·D절 동의서 갱신·**B절 #4·#9·#10 소진 표시**(사용자 재검증분),
    matrix #4·본사 문서함, 응답샘플은 findings #18에 통합.
  - **이월**: 동의서(`docAgreeDetail`) 실서버 업로드 파일 없어 응답 shape 미확정 — 본사
    `guardAgreementDtos` 미러링 방어 매핑, 데이터 생기면 재검증(CARRYOVER D). 피전
    `ConsentDocsCard`는 `defaultWorkers` 비어 아직 렌더 안 됨(findings #6).
  - **함께 소진(사용자 재검증)**: CARRYOVER B — #4 경호취소·연장·단축, #9 본사 경호취소
    실왕복, #10 피전이 실제 신청한 연장/단축 승인 왕복. 남은 재검증: 접수취소 hard delete,
    URL 직접접근 스코프(C절), 동의서 shape.
  - **다음**: 커밋 후 — 본사쪽 즉시 착수 가능분(경호목록 지역청 필터 / 화면7 배치요구서
    원본보기 / #12 문서 처리) 또는 운영팀 회신 대기.

- 2026-09-10: **#4 회신반영 — 종결·파기확인서 다운로드 키를 `deploySeq`로 되돌림**. 새 화면
  아님. 유형 = 회신반영(스웨거 개정분 반영).
  - **배경**: 그동안 `CloseGuardCase`·`GetDestroyDocDownload` 두 EP가 `caseSeq`(경호건 PK)를
    요구했는데 피전 경호상세는 라우트 id로 `deployReqSeq`(배치요구서 PK)만 갖고 있어,
    `resolveCaseSeq`로 `GetDeployList`를 한 번 더 불러 `deploySeq→caseSeq`를 매핑하는 우회를
    쓰고 있었다(요청 1자리에 조회 2번). 백엔드가 두 EP를 **`deploySeq` 키로 통일**(스웨거
    개정: `CloseGuardCaseDto.caseSeq`→`deploySeq`, 다운로드 쿼리 `caseSeq`→`deploySeq`).
  - **프로브**(`local/_probe-4.sh`, 상태 안 바꿈): `{deploySeq:999999}`→400(엔드포인트
    살아있음) / `{deploySeq:92}`(배정→경호중 실재 건)→409 "경호완료 후에 종결"(deploySeq로
    실제 건 찾아 상태검증, **무변경**) / `{caseSeq:92}` 구 키만→400 검증오류
    `{ "deploySeq": ["배치요구서를 선택해주세요."] }`(구 키 완전 무시, deploySeq 사실상 필수 —
    스웨거 required엔 endReason만 있으나 서버가 실제 검증) / `?deploySeq=` 파라미터 인식 /
    M3(부산청)→403.
  - **G2 결정 0개** — 계획대로 구현.
  - **구현**: `police/api/securityCaseDetail.ts` — `resolveCaseSeq` **함수 통째 제거**,
    `closeCase`는 `body: { deploySeq: Number(String(id).replace(/\D/g,'')), endReason }`,
    `downloadDestructionCert`는 `?deploySeq=<id 숫자부>`(파일명 폴백 변수도 교체), "⚠️ 임시
    우회" 주석 3곳 정리. 테스트 더블 `mocks/handlers/deploy.ts`의 `CloseGuardCase` 핸들러도
    요청 body `caseSeq`(경호코드 숫자부 매칭)→`deploySeq`(`findBySeq` 헬퍼). 본사쪽
    `company/api/…GetDestroyDocDownload?caseSeq=`는 스웨거 변경 대상 아님 → 그대로.
  - 검증: `npm run test` **139/139** · lint(기존 warning 2) · build · `tsc -b` 통과. 실백엔드
    `run-s-pgms`: SPoliceM5 `/security-cases/92` 정상 렌더·문서함 카드·콘솔 에러 0(스크린샷
    `close-key-01-detail-92`). **성공 왕복**(파기확인서 다운로드→종결)은 사용자가 실백엔드에서
    직접 확인.
  - **문서**: findings #16 🟡→🟢, CARRYOVER A절 caseSeq 파트 해결(`docGuardDetail` 필드명
    미확정은 잔존)·D절 해당 행 완료, 응답샘플 `Deploy-Police-CloseGuardCase.md`·
    `-GetDestroyDocDownload.md` 개정, 스웨거(`docs/api-swagger.json`)는 사용자 수정분 포함.
  - **이월**: (a) `docGuardDetail`(경호계획서) 파일명 필드 미확정 — 본사 경호계획서 업로드
    건으로 재확인(CARRYOVER A). (b) #4 배정 이후 나머지 액션(경호취소·연장·단축)은 그대로
    미검(CARRYOVER B).
  - **다음**: 커밋 후 — 본사쪽 남은 작업(회신 대기 / 즉시 착수 가능분) 논의로 복귀.

- 2026-09-09: **B-2 부분 반영 + 피전 종결 워크플로우 실연동 + 이력 종결 검증** — 세 갈래가
  한 세션에 섞였다(스웨거 B-2 회신은 일부뿐이고, 종결 건 데이터를 사용자가 만드는 과정에서
  버그 여러 개가 드러남).
  - **① B-2 부분 반영** (`_probe-B2.sh`, 옵션 C — 상태 안 바꿈):
    - **취소** `POST GuardCase/Stec/W/CancelGuardCase {deployReqSeq, reason?}` 배선 —
      `requests.ts::cancelPendingRequest`(#7 배치요청 ⋮"취소") + `securityCaseDetail.ts`
      (company)`::cancelAssignedCase`(#9 경호상세 "경호취소"). `disabled` 제거. `SecurityCase`에
      `deploySeq` 필드 추가(company `getSecurityCase`가 `GetCaseDoc.deploySeq`로 채움 — 키가
      caseSeq 아니라 deployReqSeq라서). 스코프: 본부관리자 남 배정건 403 "담당하지 않는
      경호건입니다", 접수건 403 "담당하지 않는 배치요구서입니다"(실측). 실 취소 왕복은
      되돌릴 수 없어 미검(CARRYOVER B).
    - `GetStecUserList` 본부관리자 **200** 실측 → `managerAccounts.ts` 403 안전망만 남기고
      `ManagerAccountListPage` 목록 노출(수정은 여전히 `canEdit` = 운영·시스템만).
    - **"본부" 열 제거** — `USER_INFO.groupSeq/groupName`은 경찰 전용 공유 컬럼(사용자 확인).
      `ManagerAccount.branch`·`Manager.branch` 삭제, 헤더·셀·모바일 + 배정 다이얼로그 2개.
      findings #1 본부 파트 🟢.
  - **② 피전 종결 워크플로우 실연동** (사용자가 종결 건 만드는 중 발견):
    - **문서함 매핑 누락** — `GetDeployDetail` 응답이 `docDestructionDetail:{drtFileName,drtFileExt}`
      /`docGuardDetail`/`docAgreeDetail`/`downloadYn`를 주는데 `toSecurityCase`가 안 읽어
      `attachments`가 항상 undefined → 파기확인서 "대기중" 고정 + 종결 버튼 비활성. →
      `attachments` 조립 추가(`docFileNameOf` 헬퍼).
    - **파기확인서 다운로드 파라미터 틀림** — `?deployReqSeq=`로 보내던 것, 스웨거상
      `GetDestroyDocDownload`는 `?caseSeq=`. `GetDeployDetail`에 caseSeq가 없어 →
      `resolveCaseSeq(deployReqSeq)` 신설(`GetDeployList`에서 `deploySeq→caseSeq` 매핑).
    - **종결 caseSeq 틀림** — `CloseGuardCaseDto`는 `caseSeq`(int) 요구인데 `closeCase`가
      `deployReqSeq`를 그대로 넘겨 400 "잘못된 요청입니다". → `closeCase`도 `resolveCaseSeq`로
      실제 caseSeq 전송.
    - **다운로드 = 종결 선결조건** — 스웨거: 파기확인서 받아가면 `DESTROY_DOC_DOWNLOAD_YN`이
      켜지고 이게 종결 선결조건(안 받고 종결 → 409). `GetDeployDetail.downloadYn` →
      `SecurityCase.destructionCertDownloaded` 매핑, `canClose`에 포함. `DocumentsCard`는
      다운로드 성공 후 `['security-case',id]` 무효화 → 종결 버튼 즉시 활성.
    - 브라우저 검증(SPoliceM5 `/security-cases/90`): 다운로드 전 종결 비활성 → "다운로드"
      클릭(콘솔 에러 0, `caseSeq=51`로 200) → 재조회 → 종결 활성. 사용자가 실제 종결 완료
      (caseSeq 51, endReason "경호기간 만료").
  - **③ 이력 종결 검증** (CARRYOVER B 소진): 사용자가 만든 종결 건(caseSeq 51,
    `status:3 / totalMin:2160 / remark:"경호기간 만료"`, 배치장소 NULL·`endDt` 있음)으로
    실백엔드 브라우저 확인 — **#13·#14·#15 이력 3화면 전부 종결 건 정상 렌더**(목록 36시간·
    종결 배지 / 상세 종결 정보 "경호기간 만료"·근무자 배정 이력 김가드·이가드 각 2일 18시간).
    콘솔 에러 0. #14·#15 상세의 **사건유형·5개 조치는 종결 건에서도 갭**(`GetHistoryDetail`
    응답에 없음 — exclusions 유지, findings 승격 검토).
  - 검증: `npm run test` **139/139**(B-2 테스트 3건 재작성) · lint(기존 warning 2) · build ·
    `tsc -b` 통과.
  - **이월**:
    - `GetDeployDetail` 응답에 **`caseSeq` 추가 요청**(백엔드) — 지금 `CloseGuardCase`·
      `GetDestroyDocDownload` 둘 다 caseSeq 요구인데 상세 응답엔 없어 `GetDeployList` 재조회
      우회 중. 추가되면 `resolveCaseSeq` 제거.
    - `docGuardDetail`(경호계획서) 실측 데이터 없음(null) → 필드명 미확정, 폴백 3개
      (`drtFileName`/`docFileName`/`fileName`). 본사 경호계획서 업로드 건으로 재확인.
    - B-2 나머지(userSeq 조인·`isRepresentative`·`GetCaseSchedule.memo`·사전미팅 근무자별·
      `GetGuardList.deptName`·연장/단축 거부 EP) — 운영팀 문의 대기, 미회신.
    - 실 취소 왕복(접수취소 hard delete / 경호취소 상태전환) — 되돌릴 수 없어 미검, 테스트
      데이터로 사용자 확인 후.
  - **다음**: 커밋 후 — 연동 대상 화면 소진 + B-2 부분·종결·이력 검증 완료. 남은 것은
    운영팀 문의 회신, URL 직접 접근 스코프 일괄 테스트(CARRYOVER C), 배정 이후 나머지 액션
    (#4 경호취소/연장/단축) 재검증. 사용자와 다음 방향 논의.

- 2026-09-09: **경찰 경호상세(#4) 근무일정 재연결** (후속 작업, findings #6) — 새 화면
  아님. 사용자가 C 회신 반영 검증 중 "경호중 건 근무일정이 안 뜬다"고 지적 → 원인은
  2026-09-02 백엔드가 "근무 스케줄 조회 API 누락"이라 해서 `SecurityCaseDetailPage`가
  `workers: never[] = []`로 패널을 비워둔 것. 그 EP(`GetDeployGuardSchedule`)가 이제 동작.
  - **프로브**: `GET Deploy/Police/W/GetDeployGuardSchedule?deployReqSeq=90`(경호중) → 200 +
    실데이터. 평면 배열 `[{dates, guardSchedule:[{guardSeq,name,phone,deptName,isWork}]}]`.
    근무자 이름·연락처 **인라인**(피전은 근무자 마스터 접근 불가라 이게 필수). 근무 시각은
    응답에 없음 → 경호계획 근무시간 공통 적용. 접수·배정(미생성) → `[]`. 본청 토큰도 200.
  - **구현**: `police/api/securityCaseDetail.ts::getDeployGuardSchedule(id, workHours?)` 신설
    — 응답 → `WorkSchedule`(일자별 그룹1, `isOff = !isWork`) + `workers: Worker[]`
    (id=`String(guardSeq)`, 인라인 name·phone). `SecurityCaseDetailPage`에서 `useQuery`로
    조회(`enabled = status !== '접수'`), `securityCase.workSchedule`에 병합, 합성 `workers`를
    `WorkerAssignmentPanel`·`ConsentDocsCard`에 전달. `workers: never[] = []` + 관련 주석 제거.
    테스트 더블 `mocks/handlers/deploy.ts`에 `GetDeployGuardSchedule` 핸들러 추가(seed
    `workSchedule` → 실 응답 shape, `workers`에서 이름·연락처).
  - 검증: `npm run test` **139/139**(신규 1 — 근무일정 패널 렌더) · lint(기존 warning 2) ·
    build · `tsc -b` 통과. 실백엔드 `run-s-pgms`: SPoliceM5 `/security-cases/90` → 우측
    "근무자 배정"에 김가드·이가드 09:00~18:00·연락처. SPoliceM1(조회전용) 동일. 접수
    건(91)은 "아직 근무 일정이 등록되지 않았습니다" 유지. 콘솔 에러 0. 스크린샷
    `SCH-01`·`SCH-02`.
  - **미해결**: 근무자별 동의서(`ConsentDocsCard`, findings #6 요청 3) 전용 GET 여전히 없음
    — `baseInfo.defaultWorkers` 빈 배열이라 표시 영향 없음. 배정 이후 액션(#4 △ 유지 사유)
    은 그대로.
  - **부수(사용자 요청)**: `WorkerAssignmentPanel` 하단 안내문구에서 "경호기간 내에서만
    조회…/근무자 배정 변경은 본사 화면에서만 관리…"(비-경호완료 문구) 제거 — 당연한 내용
    이라 불필요(사용자 판단). 경호완료 상태의 "파기확인서 업로드 후 종결" 안내는 유지.
  - **다음**: 커밋 후 → **B-2 부분 반영**(`CancelGuardCase` + `GetStecUserList` 본부관리자 +
    "본부" 열 제외 확정).

- 2026-09-09: **C(이력) 회신 반영 iteration** (#13·#14·#15 걸침) — 새 화면 아님, 스웨거
  개정분(2026-09-09) 반영. 유형 = 회신반영.
  - **프로브**(`_probe-C-reply.sh`·`_probe-C-reply-b.sh`): ① `History/Stec/W/GetHistoryDetail`
    신규 EP — 경찰용 shape + `groupName`·`parentGroupName`, 상태 안 가림, 본부관리자 스코프
    (StecM3→404). ② `History/Police/W/GetHistoryList` 캐스케이드 동작 — `groupSeq` 없이
    부르면 본청=전국 전 구간 9건·지역청=관할 7건·피전=자기 경찰서 끝난 건 5건. 행에
    `deploySeq`·`status`(int) 추가, 접수행 `caseSeq:null`. pageSize 상한 100. ③ Police
    `GetHistoryDetail` — 스웨거는 "종결/취소만"인데 실제 진행중도 200(불일치, 화면 미도달 →
    제외).
  - **G2 결정 0개** — 계획대로 구현.
  - **#13**: `getCompanyHistoryDetail` 실 API(`History/Stec/W/GetHistoryDetail`),
    `CompanyHistoryDetailUnavailableError`·"준비 중" placeholder 제거, `HistoryDetailPage`
    (company) 실제 상세 렌더. 매퍼는 `police/api/history.ts::detailRowToSecurityCase` export해
    공유(+groupName/parentGroupName optional).
  - **#15**: `police/api/history.ts` mock `listSecurityCaseHistory`/`getSecurityCaseHistoryDetail`
    → 실 API. 목록은 `GetHistoryList` groupSeq 없이(서버 role 스코프), 매퍼에 `deploySeq`·
    `status` 반영. **`SecurityCase.id` = 종결·취소면 `caseSeq`(→`/history/:id`), 접수·진행중이면
    `deploySeq`(→`/security-cases/:id`)**. `HistoryDetailPage`(police) 3역할 공통 통합
    (role 분기·`workersQuery` 제거). mock `/security-cases/history*` 2개 제거.
  - **#14 회귀 차단**: 경찰서 경로는 세션 groupSeq 계속 붙임(`listPoliceStationHistory`).
  - **테스트 더블**: `mocks/handlers/history.ts` 3역할 스코프 + `deploySeq`/`status`,
    `mocks/handlers/guardCase.ts`에 `History/Stec/W/GetHistoryDetail` 추가.
  - 검증: `npm run test` **138/138**(company 이력상세 1→3) · lint(기존 warning 2) · build ·
    `tsc -b` 통과. 실백엔드 `run-s-pgms`: #13 상세(StecM1 `/admin/history/46` — 근무자 배정
    이력·취소 정보), #15 본청(SPoliceM1 전국 9건·진행중→`/security-cases/90`·취소→`/history/46`),
    지역청(SPoliceM3 관할 7건), #14 회귀(SPoliceM5 취소 5건·상세). 콘솔 에러 0.
  - **문서**: 응답샘플 `History-Stec-GetHistoryDetail.md` 신규 + `History-Police-GetHistoryList.md`
    ·`-GetHistoryDetail.md` "회신 반영" 섹션. matrix·roadmap·findings(#14·#15 🟢)·CARRYOVER·
    요청서 `2026-09-08-이력-C.md` 회신 마킹. 스웨거(`docs/api-swagger.json`)는 백엔드 회신분
    포함.
  - **이월**: (a) 종결 건(status=3) 데이터 없음 → `totalGuardMinutes`·종결코드 매핑 미검
    (CARRYOVER B #13·#14·#15). (b) URL 직접 접근 스코프 일괄 테스트(이력 상세 타관할 차단
    등) — 사용자 결정대로 추후 묶어서. (c) **후속 작업**: `Deploy/Police/W/GetDeployGuardSchedule`
    이제 동작(findings #6) → 경찰 경호상세(#4) 근무일정 패널 재연결. 프로브 완료
    (`_probe-C-reply` 이후 별도), 응답에 근무자 `name`·`phone` 인라인. 별도 iteration.
  - **다음**: 커밋 후 → GetDeployGuardSchedule 후속(#4 근무일정).

- 2026-09-09: **사건유형(`crimeType`) enum 전환** — 새 화면 아님, 백엔드 요청 동반 수정.
  배치요구서 등록 시 사건유형이 한글 라벨('스토킹')로 전송되던 것을, `DEPLOY_REQUEST.CRIME_TYPE`
  (범죄유형 코드 컬럼) + 스웨거 대시보드 파라미터에 명시된 enum(`stalking/domestic/dating/
  threat/etc/none`)으로 통일. 등록 체크버튼↔enum을 매칭하므로 조회도 enum으로.
  - **변환 헬퍼 신규** `src/shared/lib/crimeType.ts` — `caseTypeToCrimeCode`(쓰기, 라벨→코드) /
    `crimeCodeToCaseType`(읽기, 코드·레거시 한글·null 모두 라벨로). `subject.ts`의 성별
    변환과 같은 패턴. 단위 테스트 `crimeType.test.ts` 14건.
  - **쓰기 전환**: `police/api/securityCases.ts` 공유 `toDeployRequestDto`(Add·Update
    공통) 1곳 — `crimeType: caseTypeToCrimeCode(input.caseType)`. 폼(`SecurityCaseForm`)·
    `CaseType` 유니온·화면 렌더는 무변경(변환은 API 경계에서만).
  - **읽기 전환 3곳**: `police/api/securityCaseDetail.ts`(`GetDeployDetail`·
    `GetDeployDetailUpdate` 매퍼), `company/api/securityCaseDetail.ts`(`GetGuardCaseDetail`
    매퍼) — `(d.crimeType as CaseType) || '사건미접수'` → `crimeCodeToCaseType(d.crimeType)`.
    본사용 `GuardCase/Stec/W/GetDeployDetail`은 원래 crimeType을 안 읽음(주석만 보강).
  - **테스트 더블**: `mocks/handlers/deploy.ts`(Add 파싱 + `GetDeployDetail`/
    `GetDeployDetailUpdate` 응답 3곳), `guardCaseDetail.ts`(`GetGuardCaseDetail` 응답)를
    enum shape로. `.mock` 스프레드 경로라 기존 테스트 어서션은 영향 없음.
  - 검증: `npm run test` 136/136(신규 14) · lint(기존 warning 2) · build 통과. 실백엔드
    `run-s-pgms`: (`SPoliceM5`) 배치요구서 수정에서 사건유형 협박으로 변경 →
    `UpdateDeployRequest` → 재진입 시 협박 유지 → **스토킹으로 원복 완료**(deploySeq 90).
    경찰 경호상세·수정 prefill·본사 경호상세 사건유형 정상 렌더, 콘솔 에러 0. 스크린샷
    `crime-02`~`crime-08`.
  - **관찰(블로커 아님)**: 저장 직후 경찰 경호상세(`GetDeployDetail`)는 이전 캐시로 옛
    값을 잠깐 보여줌(수정 prefill `GetDeployDetailUpdate`는 최신) — React Query 무효화
    범위 문제(화면5 `removeQueries` 패턴과 같은 성격), 새로고침 시 정상. 이번 변경과 무관.
  - **이월**: 백엔드 회신(4개 GET 응답 enum 반환 + Add/Update enum 저장 + 레거시 행
    정규화) 오면 → 읽기 응답이 실제 enum인지 재검증, 레거시 한글 폴백 제거 여부 판단.
  - **다음**: 커밋 후 — 회신 대기 3건(B-2·C·D)은 여전히 대기. 재검증 대기(CARRYOVER B절) 유지.

- 2026-09-08: 17번([경찰서] 게스트 · 경호목록 + 상세 조회전용) — **완료**. 그룹 D
  마지막 = 섹션 경계. **코드 변경 없음(테스트 1건 + 문서만)** — 게스트는 피전 경호목록/
  상세 화면·API(`listSecurityCases`/`getSecurityCase`)를 role 분기만으로 재사용하고,
  분기(`isReadOnlyViewer` = 본청/지역청/게스트, "신규접수" 버튼 `role !== '게스트'`)는
  이미 구현돼 있었다. 이번 iteration의 본질 = 게스트 토큰으로 실 API가 조회권 스코프대로
  도는지 검증.
  - **프로브**(`_probe-17.sh` + 후속 curl): 게스트 계정 `SPoliceGuest3`(동래, `codeName:
    "게스트"`, `codeSeq 7`, `groupSeq 32`, `userName:"게스트"` — #16 고정값).
    - `GetDeployList`(게스트 토큰): **`?groupSeq=` 무시**, `GUEST_CASE_ACCESS` 스코프만
      적용. groupSeq 32(본인)·22(본청)·999(무효)·1 전부 동일 결과 = 조회권 부여된 1건
      (deploySeq 90 / caseSeq 51 경호중). 403 아님. → 프론트가 세션 groupSeq를 붙여도 무해.
    - `GetDeployDetail?deployReqSeq=90`(조회권 O) → 200, 피전과 동일 shape
      (`startDate/endDate/startTime/endTime`·`summary1~5`·`guardHomeLoc/WorkLoc`·`guardUserList`).
    - 게스트 토큰 403: `Deploy/Police/W/CancelGuardCase`, `GuardCase/Stec/W/GetGuardCaseList`,
      `User/Police/W/GetGuestUserList`(피전 전용).
  - **브라우저**(`run-s-pgms`, `SPoliceGuest3`): 로그인 → `/security-cases` 착지, 사이드
    메뉴 `경호목록` 단일(`PoliceAppShell.NAV_BY_ROLE.게스트` 이미 그렇게 돼 있음 — 사용자
    우려와 달리 수정 불필요). 목록 1건 렌더, 행 클릭 → `/security-cases/90` 상세: 기본정보
    (대상자 이**·스토킹·배치시간)·배치장소 4필드·조치 5개·문서함(읽기전용 placeholder)·
    "근무 일정 없음". **액션 버튼 0개**. 콘솔 에러 0. 스크린샷 `17-01`~`17-03`.
  - **테스트**: `SecurityCaseDetailPage.test.tsx`에 `loginAsGuest` + "게스트도 조회 전용…"
    1건 추가(본청 읽기전용 테스트와 같은 분기). 121 → 122.
  - **미검증(이월)**: 게스트가 조회권 없는 *진행중* 건 상세를 직접 호출 시 403/404인지 —
    동래에 활성 미부여 건이 없어(활성 1건, 게스트가 봄) 양성 테스트 불가. `GetDeployList`
    groupSeq 무시 동작으로 보아 `GetDeployDetail`도 막을 것으로 추정하나 미검증. 동래에
    활성 건 추가되면 재검증.
  - 검증: `npm run test` 122/122(`--testTimeout=30000`) · lint(기존 warning 2) · build 통과.
  - **그룹 D 섹션 종료 → 백엔드 일괄 요청서**: `docs/backend-integration/requests/
    2026-09-08-게스트-D.md`(하드 요청 없음, 논의 2건 — ① `useYn` 게스트 계정 중지가
    업무 요건인지 ② `GetDeployDetail` 게스트 스코프 서버 보장 확인). issues #3은 프론트
    UX로 해소돼 제외. 응답 안 기다리고 종료.
  - **문서**: matrix `## 2. [경찰서] 게스트` 표(✅) · roadmap 그룹 D 완료 체크 + 종료 ·
    exclusions(게스트 상세 스코프 미검증 1건) · 응답 샘플 `Deploy-Police-GetDeployList.md`
    "#17 관찰" 섹션 · `test-accounts.local.md`에 `SPoliceGuest3` 추가. 프로브 `_probe-17.sh`.
  - **다음**: 커밋 후 — **연동 대상 화면은 전부 소진**. 남은 것은 (a) B-2 회신 반영(#12
    완료 처리·issues #1/#2·지역청 필터), (b) 그룹 C 회신 반영(#14·#15 상세), (c) 그룹 D
    회신 반영, (d) 재검증 대기(#4·#9 배정 이후 액션 / #10 피전 요청 / #13·#14·#17 종결·
    미부여 데이터). 사용자와 다음 방향 논의.

- 2026-09-08: 16번([경찰서] 피전 · 게스트 계정 관리) — **완료**. 그룹 D 첫 화면.
  - **프로브**(`_probe-16.sh` 읽기 / `_probe-16b.sh` 쓰기 왕복):
    - `GetGuestUserList` — `groupSeq`(세션) **필수**(없으면 400 "경찰서를 선택해주세요").
      `data` **평면 배열**(경호목록·이력의 `{meta,data}` 이중 래핑 아님, 페이징 없음).
      행 `{userSeq, loginId(서버자동생성), userName, useYn, createDt, accessList:[{caseSeq,guardCode}]}`.
      지역청 토큰으로 산하 경찰서 groupSeq 넣어도 200.
    - `GetGuestCaseList`(발급 후보, isAccess 없음) `{caseSeq,groupSeq,groupName,
      mgmtNo:"26-09-동래경찰서",guardCode:"ST0007",status,statusName}` — `mgmtNo`에 경호코드
      미포함. 서버가 소속·종결/취소 필터.
    - `GetGuestCaseDetail?userSeq=`(수정 후보) `{userSeq, accessList:[{caseSeq,guardCode,isAccess}]}`
      — 관리번호 라벨 없음 → 발급 후보와 caseSeq로 머지. 타 경찰서/없는 userSeq → 403.
    - `AddGuestUser` `{name(필수), caseSeqs:int[]}` → `{data:true}`(**발급된 아이디 미반환**).
      `UpdateGuestCaseInfo` `{userSeq, accessList[]}` / `DeleteGuestUser` `{userSeq}` → `{data:true}`, 타 경찰서 403.
    - ⚠️ **오진 주의**: curl `-d`로 한글 `name` 전송 시 인코딩 깨져 `AddGuestUser` 500.
      `--data-binary @file`(UTF-8)면 정상. 프론트 fetch는 무관.
  - **결정(사용자)**: ① 아이디 미리보기 제거 — 발급 후 목록 재조회(issues #3 → 🟢, 신규
    EP 요청 안 함). ② `AddGuestUser.name`은 화면에 입력칸 안 만들고 **고정값 `"게스트"`**
    전송(A안 — 목록은 loginId만 씀). ③ 테스트 게스트 생성·삭제 무방.
  - **연동**: `features/police/api/guests.ts` 전면 재작성 —
    `listGuestAccounts`(`GetGuestUserList`, `useYn=false` 숨김), `listGuestCaseCandidates`
    (신규, `GetGuestCaseList`), `getGuestCaseAccess`(신규, `GetGuestCaseDetail`),
    `issueGuestAccount(caseSeqs:number[])`, `updateGuestAccountAccess(userSeq,accessList)`,
    `deleteGuestAccount(userSeq)`. `GuestAccount` = `{id,userSeq,name,accessCodes,issuedAt}`.
    `previewNextGuestAccount` + `securityCases.ts::listGuestScopeSecurityCases`(mock
    `/security-cases` 재사용) 제거. `IssueGuestAccountDialog`는 `cases` prop 대신 후보를
    직접 쿼리(발급=candidates만, 수정=candidates+access 머지). `GuestListPage`에서
    `casesQuery`/`codeById` 삭제, `visibleCases`는 `accessCodes` 사용, 빈 값 라벨 `경호건 없음`.
    `DeleteGuestAccountDialog`는 `userSeq`로 삭제.
  - **테스트 더블**: `handlers/guests.ts` → `guestTestHandlers`로 이름 변경, 실 6종 경로·
    envelope로 재작성, `mocks/handlers/index.ts`에서 `handlers` → `testOnlyHandlers` 이동
    (브라우저는 실백엔드로 프록시). 문자열 caseId ↔ 정수 caseSeq는 `caseSeqOf`(history 더블
    규칙 재사용). `mocks/data/guests.ts`에 `GuestRecord.userSeq` 추가(seed 9001~, 로그인
    계정 소스 `guestLoginAccounts`는 존치 — #17). `previewNextGuestId` 삭제.
    `GuestListPage.test.tsx` 어서션 갱신(`-` → `경호건 없음`, 발급 후보 로드 대기).
  - 검증: `npm run test` 121/121(`--testTimeout=30000`) · lint(기존 warning 2) · build 통과.
    실백엔드 `run-s-pgms` `SPoliceM5`(동래): 목록 0건 → 발급(loginId `SPoliceGuestN`,
    `userName:"게스트"`, ST0007) → 조회권 수정(ST0007 회수 → "경호건 없음") → 삭제 →
    "게스트 계정이 없습니다", 콘솔 에러 0. 스크린샷 `16-01`~`16-06`. 동래 게스트 목록은
    원래 0개였고 테스트 후 0개로 복구(curl 정리 포함).
  - 문서: issues #3 → 🟢, exclusions(`useYn` 숨김 / `name` 고정값 / GetGuestCaseDetail
    라벨 머지 3건), matrix 게스트 계정 관리 표·#16행·전체요약, roadmap 그룹 D 체크박스 +
    설계이슈 #3, 응답 샘플 `User-Police-Guest.md` 신규. 프로브 `_probe-16.sh`·`_probe-16b.sh`.
  - **다음**: 커밋 후 사용자 승인 → #17([경찰서] 게스트 · 경호목록 + 상세 조회전용) —
    그룹 D 마지막 = 섹션 경계 → 종료 시 issues/exclusions 일괄 요청(`useYn` 전달사항 포함).

- 2026-09-08: 15번([본청]/[지역청] · 이력 조회 + 진행중 건 상세) — **부분완료(△)**.
  그룹 C 마지막 화면 = 섹션 경계. **이번 iteration은 코드 변경 없음(문서만)** — 프로브에서
  실 API 전환이 불가함을 확인, 사용자 결정으로 백엔드 요청만 하고 mock 유지.
  - **프로브**(`_probe-15.sh`·`_probe-15b.sh`): 역할 확인 — `SPoliceM1`=본청관리자(codeSeq 4,
    groupSeq 22), `SPoliceM3`=지방청관리자(codeSeq 5, groupSeq 24), `SPoliceM5`=피전(6, 32).
    - `GetHistoryList`: `groupSeq` **경찰서(leaf)일 때만** 데이터. 파라미터 없음·부모 노드
      (22·24) → 0건. `groupSeq=32`(동래) → 취소 5건. **캐스케이드 없음.** `status`/
      `includeActive`/`all`/`isEnd` 전부 무시 → 항상 종결·취소만.
    - `Deploy/Police/W/GetDeployList?groupSeq=32`: 본청·지역청 토큰도 **200**(caseSeq 51
      경호중 반환). 역시 leaf 단위, 부모 groupSeq·무파라미터 → 빈 배열/400. = 진행중 목록.
    - `Login/W/GetGroupTree`: 3역할 공통 200, **토큰 역할의 서브트리** 반환(본청=전국,
      지방청=자기+산하 경찰서, 경찰서=자기만). `{groupSeq,level,levelName,parentGroupSeq,
      children}`. leaf(level 3 "경찰서") groupSeq를 여기서 뽑을 수 있음. → 응답 샘플
      `Login-GetGroupTree.md` 신규.
    - `GetHistoryDetail?caseSeq=46`: 본청·지역청 토큰 **200**(스코프 미검, 타 관할 차단 없음).
      응답에 `guardWorkLoc`/`guardHomeLoc` 포함 — #14가 "배치장소 없음"으로 exclusions
      처리한 것과 배치. issues #14·#15 논의 항목으로.
    - `GetDeployDetail?deployReqSeq=90`: 본청·지역청 토큰 **200**(1차에서 deployReqSeq=81로
      404 났던 건 81이 없는 값이라서 — deploySeq=90이 정답, id는 `deploySeq`). 진행중 건
      상세(`/security-cases/:id`) 재사용은 EP 자체는 열려 있음.
    - `GuardCase/Stec/*`·`GetPoliceInfo`(Stec)·`Group/Stec/GetGroupTree` → 전부 403(본사 태그).
  - **결정(사용자, AskUserQuestion 2026-09-08)**: ① 클라 팬아웃(`GetGroupTree`+leaf별 호출)은
    임시방편이라 **안 함** — 백엔드에 부모 groupSeq 캐스케이드/통합 EP 요청, 회신까지 #15는
    부분완료(△), 본청/지역청 이력은 mock 유지. ② 진행중 건은 이력 목록에 **계속 표시**
    (현행 mock과 동일 — 이 역할은 대시보드가 없어 이력 화면이 전체 현황 겸함).
  - **문서 갱신**: issues.md #15 신규. `requests/2026-09-08-이력-C.md` 신규(그룹 C 섹션
    종료 일괄 요청 — #14 본사 상세 EP + #15 캐스케이드/진행중 + 상세 스코프·배치장소 논의).
    blockers.md #15 항목. matrix(1번 이력 조회 · 5번 본청/지역청 섹션), roadmap(그룹 C
    체크박스 + 설계이슈 #15), 응답 샘플 `Login-GetGroupTree.md` + `History-Police-GetHistoryList.md`
    "#15 관찰" 섹션.
  - 코드·테스트 무변경 → `npm run test`/`lint`/`build` 회귀 없음(문서 커밋). 실백엔드
    프로브만 실행.
  - **이월**: 종결 건 재검증(#13·#14와 공통, 사용자 종결 데이터 생성 후) · 본부관리자 이력
    스코프 꼬리(#12) — 백엔드 회신 + 데이터 후 #15 재개 시 함께.
  - 커밋 `d236ec6`(문서만). **다음**: 사용자 승인 → **그룹 D #16**([경찰서] 게스트 계정 관리).

- 2026-09-08: 14번([경찰서] 피전 · 이력 조회) — **부분완료(△)**. 그룹 C 두 번째 화면.
  - **1단계 프로브**(`_probe-14.sh`): `GetHistoryList`는 `groupSeq`(로그인 경찰서 조직번호,
    `GetMyProfile`로 세션 저장) 필수 — 없으면 전 역할 0건, 넣으면 그 노드만 반환(역할 스코프
    서버 미검, `GetDeployList`와 동형). 끝난 건만(HIST-001). `GetHistoryDetail`은 3역할 모두
    200(스코프 미검), 응답에 `guards[]`(근무자별 이름·일수·분) 인라인. 실서버에 동래 취소
    5건 존재(caseSeq 46~50), 종결 0건.
  - **연동**: `police/api/history.ts`에 `listPoliceStationHistory`/`getPoliceStationHistoryDetail`
    신규(기존 mock 함수 `listSecurityCaseHistory`/`getSecurityCaseHistoryDetail`는 본청·지역청
    #15용으로 존치). 목록: 이중 래핑 unwrap + 페이지 순회, 세션 `groupSeq` 파라미터. 상세:
    이중 래핑 아님, `suspectUserName`(마스킹)→`nameInitial`, `responsibleOfficer`→"경찰관 정보",
    `endDt`→취소일/종결일, `remark`→취소사유/종결사유, `guards[]`→신규 `SecurityCase.historyGuards`
    필드. `HistoryListPage`·`HistoryDetailPage`(police)는 `role === '경찰서'`일 때 새 함수 호출,
    행/표 렌더는 `totalGuardMinutes`·`historyGuards` 있으면 우선(없으면 mock 계산 폴백).
    상세의 `workersQuery`는 경찰서일 때 `enabled:false`(guards[]에 이름 있어 조인 불필요).
  - **테스트 더블**: `mocks/handlers/history.ts` 신규(`GetHistoryList`·`GetHistoryDetail`,
    seed 종결/취소 → 실응답 shape, `groupSeq` 필수는 `GetDeployList` 더블처럼 재현 안 하고
    토큰으로 소속 판별). `index.ts` `testOnlyHandlers`에 등록.
  - **손실 매핑(exclusions)**: 상세 응답에 `caseType`·5개 조치·배치장소 없음 → 사건유형은
    `'사건미접수'`, 조치는 "-"(배치장소는 이 화면이 원래 미표시). 종결 건에서 실제 갭 —
    종결 데이터 생기면 재확인, 남으면 issues(#13 경찰 상세 조치와 같은 성격). `status`/
    `searchKey` 클라 필터 유지. 접수단계 취소는 hard-delete라 이력에 없음(설계).
  - 검증: `npm run test` 121/121(`--testTimeout=30000`, 기본 15s로는 머신 부하로
    `SecurityCaseNew/EditPage` 폼 테스트가 간헐 타임아웃 — 격리 실행 시 전부 통과, 회귀 아님) ·
    lint(기존 warning 2) · build 통과. 실백엔드 `run-s-pgms` SPoliceM5(동래): 목록 취소 5건
    (관리번호 splitMgmtNo·취소 배지·기간/시간 "-"), 상세(대상자 "홍**", 근무자 4명 배정이력
    `guards[]` 인라인 이름, 취소일 2026.09.07·사유 "ㅍ"), 콘솔 에러 0.
  - **이월(#15)**: 본청·지역청 `GetHistoryList` `groupSeq` 캐스케이드(관할 전체) 여부 미검증,
    진행중 건 조회 EP 불명확(본청 토큰 `GetGuardCaseList` 403·`GetDeployList` 400), 본청·지역청
    상세 스코프 차단 미확인. 그룹 C 종료(#15) 시 issues 일괄.
  - 응답 샘플: `History-Police-GetHistoryList.md`·`History-Police-GetHistoryDetail.md`.
    프로브 `_probe-14.sh`. `test-accounts.local.md`에 StecM3(#13에서 추가) 유지.
  - **다음**: 커밋 후 사용자 승인 → #15([본청]/[지역청] 이력 조회 + 진행중 건 상세).

- 2026-09-08: 13번([본사] 운영/시스템관리자 · 이력 조회) — **부분완료(△)**. 그룹 C 첫 화면.
  - **1단계 프로브 결과 전제 변경**: 실서버에 **경호취소 건 5개**(caseSeq 46~50, 누가
    취소 테스트 해둠) 이미 존재 → 목록은 지금 실데이터로 검증 가능. 종결 건만 0개.
    상태 전이는 시간 기준 자동(startDate 도래→경호중, endDate 경과→경호완료. caseSeq 51
    경호중/29 경호완료 확인) → 사용자가 오늘 날짜 경호건 만들어 종결시키는 방식 성립.
  - **연동**: `features/company/api/history.ts` 신규(`listCompanyHistory` →
    `GET /v1/History/Stec/W/GetHistoryList`). 경찰 `police/api/history.ts`
    (`listSecurityCaseHistory`)는 경찰서/본청/지역청 이력(#14·#15)이 아직 mock으로 써서
    안 건드림 — 8·10·11의 회귀 차단 패턴. 응답 이중 래핑 `{message,{meta,data:[]},code}`
    → `unwrapEnvelope` + `.data`, `pageSize` 100 순회. 행 축소
    `{caseSeq,mgmtNo,groupName,parentGroupName,startDt,endDt,totalMin,statusName,remark}`
    → id←caseSeq, `splitMgmtNo`, groupName/parentGroupName→경찰서/지역청,
    statusName "경호취소"→'취소'(그 외 '종결'), totalMin→신규 `SecurityCase.totalGuardMinutes`(분),
    remark→취소사유(cancelReason)/종결코드(closureReason 캐스트, exclusions).
    `HistoryListPage`(company)가 `computeCaseHistorySummary(workSchedule)` 대신
    `totalGuardMinutes` 사용.
  - **상세 보류(issues #14 신규, blockers)**: `GET History/Stec/W/GetHistoryDetail` → **404**
    (경로 없음), `GET History/Police/W/GetHistoryDetail` 본사 토큰 → **403**(피전 토큰
    `SPoliceM5`로는 200, `{...,guards:[{guardSeq,guardName,workDays,totalMinutes}]}`).
    → 본사용 상세 EP 부재. `getCompanyHistoryDetail`은 `CompanyHistoryDetailUnavailableError`
    throw, `HistoryDetailPage`(company)는 "이력 상세 조회는 준비 중입니다" 안내로 재작성.
    목록 행 클릭은 유지(안내 화면으로 진입).
  - **#12 꼬리 정리 — HIST-003 스코프 실제 적용 확인**: `StecM3`(pw `StecM4`, 배정 0건)
    → `GetHistoryList` totalCount 0 / `GetGuardCaseList` 0. `StecM2`(동래 담당) → 이력 5건.
    즉 본부관리자 이력 스코프는 서버가 건다(12번 로그의 "StecM2가 남 배정건도 봄" 의심은
    5건이 전부 StecM2 스코프 안이라 그런 것 — 스코프 미적용 아님).
  - **테스트 더블**: `mocks/handlers/guardCase.ts`에 `GET History/Stec/W/GetHistoryList`
    추가(종결/취소 seed → 행 매핑, 본부관리자 `assigneeId` 스코프, 이중 래핑).
    `computeCaseHistorySummary` import로 종결 건 totalMin 산출. `HistoryDetailPage.test.tsx`
    (company) 재작성(더미 렌더 2건 → 안내 문구 1건). 테스트 122→121.
  - 검증: `npm run test` 121/121 · lint(기존 warning 2) · build 통과. 실백엔드
    `run-s-pgms`: StecM1 → 이력 목록 취소 5건(부산경찰청/동래경찰서, 경호기간·총시간 "-",
    "취소" 배지), splitMgmtNo 정상(`26-09-동래경찰서 · ST0002`). StecM2 → 5건(스코프 안).
    행 클릭 → "이력 상세 조회는 준비 중입니다". 콘솔 에러 0. 데스크톱 스크린샷 2장.
    경찰 이력 화면 회귀는 unit test로 커버(브라우저 확인은 mock 계정이 실백엔드 프록시에
    401이라 불가 — #14 소관).
  - 응답 샘플: `History-Stec-GetHistoryList.md`(목록 + Police 상세 참고 + 상태전이 메모).
    exclusions: 행 축소 필드 / status·searchKey 클라 필터 / 종결코드 원문. issues #14 신규.
    프로브 `.claude/loop-backend/local/_probe-13.sh`·`_probe-13b.sh`.
  - **다음**: 커밋 후 사용자 승인 → (사용자의 종결 데이터 생성 시 재검증) → #14([경찰서]
    이력 조회).

- 2026-09-08: 12번([본사] 본부관리자 · 스코프 재검증) — **API 레벨 검증 완료, 완료 처리·문서
  갱신은 B-2 회신 후로 보류**(사용자 결정). 새 연동 아님. 사용자가 2번째 본부관리자
  `StecM3`(userSeq 113) 활성화 → "0건 본부관리자 vs 2건 본부관리자(`StecM2`)" 대비로 실서버
  스코프를 양성 검증.
  - **서버 스코프 전부 실측 확인**(실백엔드, `StecM2` pw는 세션 중 `StecM1`로 바뀜 —
    `test-accounts.local.md` 갱신):
    - `GetGuardCaseList` → `StecM2` 2건 / `StecM3` 0건 / `StecM1`(운영) 2건 (본인 배정 건만)
    - `GetGuardCaseDetail?caseSeq=51·29` → `StecM2`(본인) 200 / `StecM3`(남) 403
    - `ConfirmCasePeriod {caseSeq:51}` → `StecM3` 403 "담당하지 않는 경호건입니다"(스코프 우선
      검사) / `StecM2` 409(대기요청 없음, no-op)
    - `GetExtend/ShortenRequestList` → 둘 다 200·0건(pending 데이터 없어 대비는 없음, 접근·필터
      정상)
    - `GetGuardList`(근무자) → `StecM2`·`StecM3` 둘 다 200 (스코프 없음, 의도대로)
    - `GetStecUserList`(관리자 계정) → 둘 다 403 (#11 안내 문구)
    - `GetDeployRequestList`(배치요청 목록) → 둘 다 403 (+ 라우트 `COMPANY_ADMIN` 차단)
  - **브라우저 회귀**(`run-s-pgms`): `StecM2` 경호목록 2건 / 연장·단축 목록 빈 상태 / 근무자
    목록 5건 정상 / 관리자 계정 관리 안내 문구 / `/admin/requests` → `/admin/dashboard`
    리다이렉트 + "접근 권한이 없습니다" 토스트. `StecM3` 경호목록 "경호건이 없습니다" /
    남의 건 URL(`/admin/security-cases/51`) 직접 → "경호건을 불러오지 못했습니다"(graceful,
    크래시 없음). 콘솔 에러 0(403 응답 노이즈만).
  - **코드 변경**: `mocks/handlers/guardCase.ts` `GetDeployRequestList` 더블이 본부관리자
    토큰에 403 반환하도록 실서버와 일치(`GetStecUserList`·`GetGuardCaseList`·`ConfirmCasePeriod`
    더블은 이미 스코프 재현 중). 테스트 122/122 · lint · build 통과.
  - **관찰(블로커 아님)**: 남의 건 상세 403 → generic "경호건을 불러오지 못했습니다" + React
    Query 기본 retry 3회로 콘솔 403 노이즈·~5초 지연. 엣지케이스(URL 직접 입력만). #11 A/B와
    함께 후속 검토.
  - **섹션 B-2 종료 처리 — 백엔드 요청서 전달**: `docs/backend-integration/requests/
    2026-09-08-본사-경호관리-B2.md`/`.xlsx`(B-1 미회신분 + B-2 신규 통합, 화면×기능 단일 표,
    유형=결정/논의/요청). **재검토로 제외**: 조치 `summary1~5`(섹션당 기간 1개 = `summaryNDate`
    일치, 문제 아님), 경호목록 지역청 필터(`GetGuardCaseList.parentGroupName` 이미 옴 → 프론트
    후속작업).
  - **보류(B-2 회신 후 처리)**: PROGRESS/matrix/roadmap의 #12 완료 표시, issues.md #1·#2
    전달상태 갱신, 지역청 필터 프론트 연동. 회신 오면 반영 → 재검증 → 그때 일괄 문서 갱신.
  - **다음**: 그룹 C(이력) — 13번. 4·9의 종결·취소 터미널 데이터가 실제로 생긴 뒤 의미 있음.

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
  - 인프라: 실백엔드 curl은 `.claude/loop-backend/local/_probe-*.sh`(gitignore)로 실행 —
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
    `docs/backend-integration/requests/2026-09-04-본사-경호관리-B1.md` (요청 9건 —
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
  응답 샘플: `docs/backend-integration/responses/Guard-Stec-GuardInfo.md`.

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
  (`docs/backend-integration/requests/2026-09-03-피전-경호관리.md` — 요청 1 배치장소
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
  콘솔 에러 없음. 응답 샘플: `docs/backend-integration/responses/Deploy-Police-GetDeployDetail.md`,
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
  - 반영 파일: 이 표, `docs/backend-integration/matrix.md` "권장 진행 순서",
    `docs/roadmap.md` Phase 5, `TASK.md` "Loop 단위", `LOOP_INSTRUCTIONS.md` 1·7단계,
    `.claude/loop-backend/TASK.md` 원칙 4(신규).

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
  `docs/backend-integration/responses/Deploy-Police-GetDeployList.md`.

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
