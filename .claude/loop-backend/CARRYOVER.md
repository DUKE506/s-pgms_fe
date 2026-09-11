# CARRYOVER — 이월·재검증 레지스터

한 iteration에서 끝내지 못하고 **조건이 충족돼야 다시 볼 수 있는** 것들. `PROGRESS.md`
비고에도 남기되, 흩어지지 않게 여기 한곳에 모은다. 조건이 충족되면 회신반영/재검증
iteration으로 소진한다(`LOOP_INSTRUCTIONS.md` 0단계).

## A. 백엔드 회신 대기

전달한 요청서의 응답 대기. 완료 통보가 오면 **다음 화면 착수 전** 회신반영 iteration.
B-2·C·D 통합 전달본: `requests/2026-09-08-미회신-B2-C-D.xlsx`(시트 3개).

| 요청서 | 대상 | 회신 시 반영할 것 |
|---|---|---|
| `requests/2026-09-08-본사-경호관리-B2.md` | 섹션 B-2 (#10~#12) | **부분 반영(2026-09-09~10)**: `CancelGuardCase` 배선(#7·#9), `GetStecUserList` 본부관리자 200(#11), **"본부" 열 제거**(findings #1 본부 파트 🟢), **`GetCaseSchedule.memo` 반영**(2026-09-10, 근무조 특이사항 — findings #12 memo 파트 🟢). **2026-09-11 운영팀 결정으로 2건 요청 자체가 불필요해짐**: 사전미팅 근무자별 시간(UI를 미팅 단위로 재설계, findings SaveCaseMeeting 항목 🟢) / 연장·단축 거부 EP(본사에서 거부 기능 자체를 제거, 항목1). 나머지(`userSeq` 조인·`isRepresentative`·`GetGuardList.deptName`)는 여전히 **운영팀 문의 대기** — 미회신. **추가 요청(2026-09-10)**: `GetDeployList`·`GetDeployDetail`에 숫자 `status`(findings #19). **2026-09-11 확인**: 요청 대상(피전 `Deploy/Police/W/GetDeployList`·`GetDeployDetail`·`GetDeployDetailUpdate`)엔 아직 없음(라이브 프로브 3곳 다 없음) — **여전히 미회신**, `resolveDeployStatus` 임시 처리 유지 필요. 대신 **본사** `GuardCase/Stec/W/GetGuardCaseList`(화면8)엔 별도로 `guardCaseStatus`(0:배정/1:경호중/2:경호완료/3:종결/4:경호취소) 신규 확인됨 — 요청한 적 없는 엔드포인트에 붙음. 사용자 결정: 본사 경호목록 상태를 `statusName` 대신 이 코드로 전환(D절 신규 행) |
| ~~`GetDeployDetail`에 `caseSeq` 추가 요청 + `docGuardDetail` 필드명~~ | `Deploy/Police/W/GetDeployDetail` | **✅ 전부 해결** — caseSeq 파트(2026-09-10): 백엔드가 `CloseGuardCase`·`GetDestroyDocDownload` 두 EP를 `deploySeq` 키로 바꿔 `resolveCaseSeq` 우회 제거(findings #16 🟢). `docGuardDetail` 파트(2026-09-10, findings #18): 본사 업로드 실측 → `{docSeq, docType:0, docPath, fileName, fileExt}`, 다운로드 `/files/{docPath}` 연결 |
| ~~`requests/2026-09-08-이력-C.md`~~ | 섹션 C (#13~#15) | **✅ 회신 반영 완료(2026-09-09)** — `History/Stec/W/GetHistoryDetail` 신설(#13), `GetHistoryList` 역할 캐스케이드(#15). 상세 스코프 차단 적용·종결 시 배치장소 NULL 확정. 남은 것: 종결 건 데이터 대기(B절) + URL 직접 접근 스코프 일괄 테스트(아래 C절) |
| `requests/2026-09-08-게스트-D.md` | 섹션 D (#16~#17) | `useYn` = **종결**(백엔드 소프트삭제 전용, 경찰서 삭제 대비 — 프론트 무관, `useYn=false` 숨김 유지). `GetDeployDetail` 게스트 스코프 서버 보장 확인 → 아래 C절로 이관 |
| ~~사건유형 `crimeType` enum (2026-09-09 전달)~~ | `GetDeployDetail`·`GetDeployDetailUpdate`·`GetGuardCaseDetail`·`GuardCase/Stec/W/GetDeployDetail` | **✅ 종료(2026-09-11)** — 사용자 확인 + 라이브 프로브 추가 샘플(`stalking`/`threat`)로 enum 코드 일관 반환 재확인. `crimeCodeToCaseType`의 레거시 한글 폴백은 **유지**(방어적 코드라 제거 실익 없음, 사용자 판단) — 추가 작업 없음 |
| **[신규] 이력조회 종결 건 응답 필드 유지 요청** (2026-09-11) | `History/*/GetHistoryDetail` | 사건유형·5개 조치 항목(#14 경찰서 이력 갭)이 **종결 건에서도 응답에서 빠지지 않게** 해달라는 선제 요청 — 사용자가 백엔드에 전달 예정. findings.md 등록 필요, 전달 확인되면 이 표에 회신 대기로 정식 이관 |

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
| 14 | [경찰서] 이력 조회 | 종결코드·`totalGuardMinutes` ✅ 소진. **사건유형·5개 조치 갭**은 종결 건에서도 남음 → findings 승격 검토 | 갭은 별도 요청 |
| ~~15~~ | [본청]/[지역청] 이력 | ✅ 소진(2026-09-09) — 종결 건 `status:3`→'종결' 매핑·목록·상세 확인 | |
| 17 | [경찰서] 게스트 경호상세 | 조회권 **없는** 활성 건 상세 직접 호출 시 403/404 차단되는지 | 동래에 게스트 미부여 진행중 건이 생기면 (→ C절 일괄) |
| ~~신규~~ | [경찰서] 취소 | **✅ 전부 소진(2026-09-11)** — 경호취소(2026-09-10)에 이어 접수취소(배치요구서 hard delete)도 사용자 확인 | |

## C. URL 직접 접근 스코프 일괄 테스트 (사용자 결정, 2026-09-09)

목록을 안 거치고 주소창으로 상세 EP를 직접 호출했을 때 서버가 스코프를 강제하는지 —
여러 화면에 흩어진 미검증 항목을 **한 번에 몰아서** 프로브한다. 지금은 목록에 걸러진
id만 링크되어 실사용 문제는 없고, 직접 URL 입력 방어선만 필요. **여전히 대기**(2026-09-11
재확인) — 아직 프로브 안 함.

| EP | 확인할 것 |
|---|---|
| `History/Police/W/GetHistoryDetail?caseSeq=` | 본청/지역청 토큰이 **타 관할** `caseSeq` 넣으면 404/403인지 (현재 동래 건뿐이라 미검) |
| `History/Stec/W/GetHistoryDetail?caseSeq=` | 본부관리자가 **남 배정** `caseSeq` — StecM3(0건)→404는 확인, 실제 타 본부 배정 건으로 재확인 |
| `Deploy/Police/W/GetDeployDetail?deployReqSeq=` (게스트 토큰) | 조회권 **없는** 건 직접 호출 시 `GUEST_CASE_ACCESS` 강제되는지 (D 요청서 2번, 데이터 대기) |
| `Deploy/Police/W/GetDeployDetail?deployReqSeq=` (본청/지역청) | 타 관할 `deployReqSeq` 차단 여부 |
| 경호상세(`SecurityCaseDetailPage`) URL 직접 접근 상태 가드 | 접수 상태에서도 URL을 직접 알면 기본정보 등록이 가능한 우회 경로가 있는지 (loop-screens Phase 1 #3 이월, **2026-09-11 이 항목에 병합**) |

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
