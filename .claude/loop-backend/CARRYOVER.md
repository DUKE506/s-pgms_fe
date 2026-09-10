# CARRYOVER — 이월·재검증 레지스터

한 iteration에서 끝내지 못하고 **조건이 충족돼야 다시 볼 수 있는** 것들. `PROGRESS.md`
비고에도 남기되, 흩어지지 않게 여기 한곳에 모은다. 조건이 충족되면 회신반영/재검증
iteration으로 소진한다(`LOOP_INSTRUCTIONS.md` 0단계).

## A. 백엔드 회신 대기

전달한 요청서의 응답 대기. 완료 통보가 오면 **다음 화면 착수 전** 회신반영 iteration.
B-2·C·D 통합 전달본: `requests/2026-09-08-미회신-B2-C-D.xlsx`(시트 3개).

| 요청서 | 대상 | 회신 시 반영할 것 |
|---|---|---|
| `requests/2026-09-08-본사-경호관리-B2.md` | 섹션 B-2 (#10~#12) | **부분 반영 완료(2026-09-09)**: `GuardCase/Stec/W/CancelGuardCase` 배선(#7·#9), `GetStecUserList` 본부관리자 200 → 안내 제거(#11), **"본부" 열 제거**(findings #1 본부 파트 🟢). 나머지(`userSeq` 조인·`isRepresentative`·`GetCaseSchedule.memo`·사전미팅 근무자별·`GetGuardList.deptName`·연장/단축 거부 EP)는 **운영팀 문의 대기** — 미회신 |
| ~~`GetDeployDetail`에 `caseSeq` 추가 요청~~ + `docGuardDetail` 필드명 | `Deploy/Police/W/GetDeployDetail` | **✅ caseSeq 파트 해결(2026-09-10)** — 백엔드가 `CloseGuardCase`·`GetDestroyDocDownload` 두 EP를 `deploySeq` 키로 바꿔 `resolveCaseSeq` 우회 제거(findings #16 🟢). **잔존**: `docGuardDetail`(경호계획서) 파일명 필드는 실측 데이터가 없어 미확정 — 폴백 3개(`drtFileName`/`docFileName`/`fileName`). 본사 경호계획서 업로드 건으로 재확인 |
| ~~`requests/2026-09-08-이력-C.md`~~ | 섹션 C (#13~#15) | **✅ 회신 반영 완료(2026-09-09)** — `History/Stec/W/GetHistoryDetail` 신설(#13), `GetHistoryList` 역할 캐스케이드(#15). 상세 스코프 차단 적용·종결 시 배치장소 NULL 확정. 남은 것: 종결 건 데이터 대기(B절) + URL 직접 접근 스코프 일괄 테스트(아래 C절) |
| `requests/2026-09-08-게스트-D.md` | 섹션 D (#16~#17) | `useYn` = **종결**(백엔드 소프트삭제 전용, 경찰서 삭제 대비 — 프론트 무관, `useYn=false` 숨김 유지). `GetDeployDetail` 게스트 스코프 서버 보장 확인 → 아래 C절로 이관 |
| 사건유형 `crimeType` enum (2026-09-09 전달) | `GetDeployDetail`·`GetDeployDetailUpdate`·`GetGuardCaseDetail`·`GuardCase/Stec/W/GetDeployDetail` | 4개 GET 응답을 enum으로 반환하는지 재검증, Add/Update enum 저장 확인, 레거시 행(한글·영문 혼재) 정규화 여부 → `crimeCodeToCaseType`의 레거시 한글 폴백 제거 판단 |

## B. 데이터·상태 대기 재검증

터미널 상태(종결·취소)나 배정 이후 상태의 실데이터가 있어야 검증 가능. 사용자가 오늘
날짜 경호건을 생성→배정→종결시키는 방식으로 데이터를 만들 수 있음.

| # | 화면 | 확인할 것 | 소진 조건 |
|---|---|---|---|
| ~~2~~ | [경찰서] 경호목록 | ✅ 소진(2026-09-09) — 경호중/경호완료/종결/취소 `statusName` 프론트 라벨 일치 확인 | |
| 4 | [경찰서] 경호 상세 | 배정 이후 액션 중 **종결은 소진**(2026-09-09 사용자 실제 종결). **경호취소·연장·단축**만 남음 | 경호중 건 + 상태 전이 |
| 9 | [본사] 경호 상세 | 경호취소 = 배선 완료, **실왕복 미검**(되돌릴 수 없어 미테스트). 배정 이후 다른 액션 | 버려도 되는 경호건으로 취소 왕복 |
| 10 | [본사] 연장/단축 요청 목록 | 경호중 건에서 피전이 실제로 신청한 요청으로 승인 왕복 | matrix #4 `requestPeriodChange`(피전 요청 영역) 개발·검증 후 |
| ~~13~~ | [본사] 이력 조회 | ✅ 소진(2026-09-09) — 종결 건(caseSeq 51) status 3·`totalGuardMinutes` 36시간·종결코드 "경호기간 만료" 렌더 확인 | |
| 14 | [경찰서] 이력 조회 | 종결코드·`totalGuardMinutes` ✅ 소진. **사건유형·5개 조치 갭**은 종결 건에서도 남음 → findings 승격 검토 | 갭은 별도 요청 |
| ~~15~~ | [본청]/[지역청] 이력 | ✅ 소진(2026-09-09) — 종결 건 `status:3`→'종결' 매핑·목록·상세 확인 | |
| 17 | [경찰서] 게스트 경호상세 | 조회권 **없는** 활성 건 상세 직접 호출 시 403/404 차단되는지 | 동래에 게스트 미부여 진행중 건이 생기면 (→ C절 일괄) |
| 신규 | [경찰서] 취소(접수취소/경호취소) | 실 취소 왕복 — 접수취소(배치요구서 hard delete) / 경호취소(상태 '취소' 전환) | 버려도 되는 배치요구서·경호건 |

## C. URL 직접 접근 스코프 일괄 테스트 (사용자 결정, 2026-09-09)

목록을 안 거치고 주소창으로 상세 EP를 직접 호출했을 때 서버가 스코프를 강제하는지 —
여러 화면에 흩어진 미검증 항목을 **한 번에 몰아서** 프로브한다. 지금은 목록에 걸러진
id만 링크되어 실사용 문제는 없고, 직접 URL 입력 방어선만 필요.

| EP | 확인할 것 |
|---|---|
| `History/Police/W/GetHistoryDetail?caseSeq=` | 본청/지역청 토큰이 **타 관할** `caseSeq` 넣으면 404/403인지 (현재 동래 건뿐이라 미검) |
| `History/Stec/W/GetHistoryDetail?caseSeq=` | 본부관리자가 **남 배정** `caseSeq` — StecM3(0건)→404는 확인, 실제 타 본부 배정 건으로 재확인 |
| `Deploy/Police/W/GetDeployDetail?deployReqSeq=` (게스트 토큰) | 조회권 **없는** 건 직접 호출 시 `GUEST_CASE_ACCESS` 강제되는지 (D 요청서 2번, 데이터 대기) |
| `Deploy/Police/W/GetDeployDetail?deployReqSeq=` (본청/지역청) | 타 관할 `deployReqSeq` 차단 여부 |

## D. 후속 작업 (별도 iteration)

| 항목 | 내용 | 상태 |
|---|---|---|
| 경찰 경호상세(#4) 근무일정 재연결 | `getDeployGuardSchedule` 신설 → `SecurityCaseDetailPage` `WorkerAssignmentPanel` 재연결. 브라우저 검증(SPoliceM5·SPoliceM1 `/security-cases/90`). findings #6 근무일정 파트 종료 | ✅ **완료(2026-09-09)** — 커밋은 이 iteration |
| B-2 부분 반영 | `GuardCase/Stec/W/CancelGuardCase` 배선(#7·#9) + `GetStecUserList` 본부관리자 허용(#11) + "본부" 열 제거(#1). | ✅ **완료(2026-09-09)** |
| 피전 종결 워크플로우 실연동 | 문서함 `docDestructionDetail`→`attachments` 매핑, 파기확인서 다운로드 `?caseSeq=`, 종결 `CloseGuardCase` caseSeq 우회(`resolveCaseSeq`), `downloadYn`→종결 선결조건 게이트 | ✅ **완료(2026-09-09)** — 사용자 실제 종결 성공 |
| ~~`GetDeployDetail.caseSeq` 백엔드 추가되면~~ | `resolveCaseSeq`(GetDeployList 재조회 우회) 제거 | ✅ **완료(2026-09-10)** — 두 EP가 `deploySeq` 키로 바뀌어 `resolveCaseSeq` 제거, 파기확인서 다운로드·종결 실왕복 확인 |
| 근무자별 동의서(findings #6 요청 3) | `ConsentDocsCard`용 근무자별 보안서약·개인정보동의서 조회 전용 GET 없음. `baseInfo.defaultWorkers` 빈 배열이라 현재 표시 영향 없음 — EP/데이터 생기면 | 대기 |
