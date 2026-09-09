# CARRYOVER — 이월·재검증 레지스터

한 iteration에서 끝내지 못하고 **조건이 충족돼야 다시 볼 수 있는** 것들. `PROGRESS.md`
비고에도 남기되, 흩어지지 않게 여기 한곳에 모은다. 조건이 충족되면 회신반영/재검증
iteration으로 소진한다(`LOOP_INSTRUCTIONS.md` 0단계).

## A. 백엔드 회신 대기

전달한 요청서의 응답 대기. 완료 통보가 오면 **다음 화면 착수 전** 회신반영 iteration.
B-2·C·D 통합 전달본: `requests/2026-09-08-미회신-B2-C-D.xlsx`(시트 3개).

| 요청서 | 대상 | 회신 시 반영할 것 |
|---|---|---|
| `requests/2026-09-08-본사-경호관리-B2.md` | 섹션 B-2 (#10~#12) | **일부만 회신(2026-09-09 스웨거)**: `GuardCase/Stec/W/CancelGuardCase` 신설·`GetStecUserList` 본부관리자 허용 → 별도 iteration에서 반영 예정. **"본부" 열 = 제외 확정**(`USER_INFO.groupSeq/groupName`은 경찰 전용 공유 컬럼, 본사 미사용 — 사용자 확인). 나머지(`userSeq` 조인·`isRepresentative`·`GetCaseSchedule.memo`·사전미팅 근무자별·`GetGuardList.deptName`·연장/단축 거부 EP)는 **운영팀 문의 대기** — 대부분 미반영 |
| ~~`requests/2026-09-08-이력-C.md`~~ | 섹션 C (#13~#15) | **✅ 회신 반영 완료(2026-09-09)** — `History/Stec/W/GetHistoryDetail` 신설(#13), `GetHistoryList` 역할 캐스케이드(#15). 상세 스코프 차단 적용·종결 시 배치장소 NULL 확정. 남은 것: 종결 건 데이터 대기(B절) + URL 직접 접근 스코프 일괄 테스트(아래 C절) |
| `requests/2026-09-08-게스트-D.md` | 섹션 D (#16~#17) | `useYn` = **종결**(백엔드 소프트삭제 전용, 경찰서 삭제 대비 — 프론트 무관, `useYn=false` 숨김 유지). `GetDeployDetail` 게스트 스코프 서버 보장 확인 → 아래 C절로 이관 |
| 사건유형 `crimeType` enum (2026-09-09 전달) | `GetDeployDetail`·`GetDeployDetailUpdate`·`GetGuardCaseDetail`·`GuardCase/Stec/W/GetDeployDetail` | 4개 GET 응답을 enum으로 반환하는지 재검증, Add/Update enum 저장 확인, 레거시 행(한글·영문 혼재) 정규화 여부 → `crimeCodeToCaseType`의 레거시 한글 폴백 제거 판단 |

## B. 데이터·상태 대기 재검증

터미널 상태(종결·취소)나 배정 이후 상태의 실데이터가 있어야 검증 가능. 사용자가 오늘
날짜 경호건을 생성→배정→종결시키는 방식으로 데이터를 만들 수 있음.

| # | 화면 | 확인할 것 | 소진 조건 |
|---|---|---|---|
| 2 | [경찰서] 경호목록 | 경호중/경호완료/종결/취소 `statusName`이 프론트 라벨과 일치하는지 | 각 상태 건이 실서버에 생기면 |
| 4 | [경찰서] 경호 상세 | 배정 이후 4종 액션(접수취소 아님 — 경호취소·연장·단축·종결) 실동작 | #9로 배정건 생성 + 상태 전이 |
| 9 | [본사] 경호 상세 | 경호취소(본사 API 없음 — findings #9), 배정 이후 액션 | findings #9 회신 |
| 10 | [본사] 연장/단축 요청 목록 | 경호중 건에서 피전이 실제로 신청한 요청으로 승인 왕복 | matrix #4 `requestPeriodChange`(피전 요청 영역) 개발·검증 후 |
| 13 | [본사] 이력 조회 | 종결 건 status 코드 매핑, `totalGuardMinutes` 실값 | 정상 종결 건 생성 |
| 14 | [경찰서] 이력 조회 | 종결 건 종결코드·`totalGuardMinutes`, 사건유형·5개 조치 갭 | 정상 종결 건 생성 |
| 15 | [본청]/[지역청] 이력 | ~~캐스케이드 전환~~ 완료(2026-09-09). 종결 건 status·`totalGuardMinutes` 실값만 남음 | 정상 종결 건 생성 |
| 17 | [경찰서] 게스트 경호상세 | 조회권 **없는** 활성 건 상세 직접 호출 시 403/404 차단되는지 | 동래에 게스트 미부여 진행중 건이 생기면 |

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
| 경찰 경호상세(#4) 근무일정 재연결 | `Deploy/Police/W/GetDeployGuardSchedule?deployReqSeq=` 이제 동작(findings #6). 응답 = 일자별 `{dates, guardSchedule:[{guardSeq,name,phone,deptName,isWork}]}` 평면 배열, 시각은 `GetDeployDetail`의 `startTime`/`endTime`. `SecurityCaseDetailPage`의 `workers: never[] = []` 제거 → `WorkerAssignmentPanel`·`ConsentDocsCard` 재연결. 3역할(경찰서/본청/지역청) 진행중 건 상세에서 근무일정 보이게 | 프로브 완료, 사용자가 커밋 후 착수하기로(2026-09-09) |
