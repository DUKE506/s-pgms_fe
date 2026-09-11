# CARRYOVER — 이월·재검증 레지스터

한 iteration에서 끝내지 못하고 **조건이 충족돼야 다시 볼 수 있는** 것들. `PROGRESS.md`
비고에도 남기되, 흩어지지 않게 여기 한곳에 모은다. 조건이 충족되면 회신반영/재검증
iteration으로 소진한다(`LOOP_INSTRUCTIONS.md` 0단계).

## A. 백엔드 회신 대기

전달한 요청서의 응답 대기. 완료 통보가 오면 **다음 화면 착수 전** 회신반영 iteration.
B-2·C·D 통합 전달본: `requests/2026-09-08-미회신-B2-C-D.xlsx`(시트 3개).

| 요청서 | 대상 | 회신 시 반영할 것 |
|---|---|---|
| `requests/2026-09-08-본사-경호관리-B2.md` | 섹션 B-2 (#10~#12) | **부분 반영(2026-09-09~10)**: `CancelGuardCase` 배선(#7·#9), `GetStecUserList` 본부관리자 200(#11), **"본부" 열 제거**(findings #1 본부 파트 🟢), **`GetCaseSchedule.memo` 반영**(2026-09-10, 근무조 특이사항 — findings #12 memo 파트 🟢). **2026-09-11 운영팀 결정으로 2건 요청 자체가 불필요해짐**: 사전미팅 근무자별 시간(UI를 미팅 단위로 재설계, findings SaveCaseMeeting 항목 🟢) / 연장·단축 거부 EP(본사에서 거부 기능 자체를 제거, 항목1). 나머지(`userSeq` 조인·`isRepresentative`·`GetGuardList.deptName`)는 여전히 **운영팀 문의 대기** — 미회신. **추가 요청(2026-09-10)**: `GetDeployList`·`GetDeployDetail`에 숫자 `status`(findings #19) |
| ~~`GetDeployDetail`에 `caseSeq` 추가 요청 + `docGuardDetail` 필드명~~ | `Deploy/Police/W/GetDeployDetail` | **✅ 전부 해결** — caseSeq 파트(2026-09-10): 백엔드가 `CloseGuardCase`·`GetDestroyDocDownload` 두 EP를 `deploySeq` 키로 바꿔 `resolveCaseSeq` 우회 제거(findings #16 🟢). `docGuardDetail` 파트(2026-09-10, findings #18): 본사 업로드 실측 → `{docSeq, docType:0, docPath, fileName, fileExt}`, 다운로드 `/files/{docPath}` 연결 |
| ~~`requests/2026-09-08-이력-C.md`~~ | 섹션 C (#13~#15) | **✅ 회신 반영 완료(2026-09-09)** — `History/Stec/W/GetHistoryDetail` 신설(#13), `GetHistoryList` 역할 캐스케이드(#15). 상세 스코프 차단 적용·종결 시 배치장소 NULL 확정. 남은 것: 종결 건 데이터 대기(B절) + URL 직접 접근 스코프 일괄 테스트(아래 C절) |
| `requests/2026-09-08-게스트-D.md` | 섹션 D (#16~#17) | `useYn` = **종결**(백엔드 소프트삭제 전용, 경찰서 삭제 대비 — 프론트 무관, `useYn=false` 숨김 유지). `GetDeployDetail` 게스트 스코프 서버 보장 확인 → 아래 C절로 이관 |
| 사건유형 `crimeType` enum (2026-09-09 전달) | `GetDeployDetail`·`GetDeployDetailUpdate`·`GetGuardCaseDetail`·`GuardCase/Stec/W/GetDeployDetail` | 4개 GET 응답을 enum으로 반환하는지 재검증, Add/Update enum 저장 확인, 레거시 행(한글·영문 혼재) 정규화 여부 → `crimeCodeToCaseType`의 레거시 한글 폴백 제거 판단 |

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
| 신규 | [경찰서] 취소 | **경호취소(상태 '취소' 전환)는 소진**(2026-09-10 사용자 확인, #4와 함께). **접수취소(배치요구서 hard delete)** 실왕복만 남음 | 버려도 되는 배치요구서 |

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
| 근무자별 동의서(findings #6 요청 3 / #18) | **다운로드는 연결됨(2026-09-10, #18)** — `docAgreeDetail[].docPath` / `guardAgreementDtos[].filePath` → `/files/{path}`. 단 실서버에 업로드된 동의서 파일이 없어(`docAgreeDetail` 항상 `[]`, `guardAgreementDtos[].filePath` 전부 null) **응답 shape 미확정** — 본사 `guardAgreementDtos` 미러링으로 방어 매핑. 피전 `ConsentDocsCard`는 `baseInfo.defaultWorkers` 비어 아직 렌더 안 됨(findings #6). | 동의서 실데이터 생기면 shape·다운로드 재검증 |
| 경찰서 경호목록 — 배정 직후 건 경호기간 `1970.01.01` 표시 | 배치기간이 아직 없는(배정·경호계획 미등록) 건의 경호시작/종료가 목록에 `1970.01.01`로 뜬다. 본사 경호목록의 `formatDate`는 빈 값 가드(`if (!dateLike) return '-'`)가 있는데 경찰서 경호목록에는 없다. 사용자 확인(2026-09-10). | 경찰서 경호목록 `formatDate`에 빈 값 가드 추가(1줄) — 별도 작업 |
| 근무자 상세 화면 — 근무 이력 실 API 연결 | `/admin/workers/:id` 신규 화면(2026-09-10, 운영부서 점검용 급조). 근무 이력이 mock(`/api/workers/:id/schedule` 더블)이다. **실 API 교체**: `getWorkerSchedule`을 `GET Guard/Stec/W/GetGuardSchedule?guardSeq=&fromDate=&toDate=`로. 응답 shape는 프로브 확인(`{guardSeq,name,dates,schdules:[{startDt,endDt,isWork}]}`, `schdules` 오타·같은 날 중복 항목 있음). 디자인 추가 수정 여지 있음(사용자). loop-screens PROGRESS Phase 3.7. | 사용자 점검 후 방향 확정 → 실 연동 iteration |
