# 백엔드 보고 — 본사 경호관리 B-1 화면별 프론트 우회 처리 (2026-09-04)

> **상태**: 2026-09-04 정리, 백엔드 전달 예정. 설계 변경/신규 API 요청 본문은
> `2026-09-04-본사-경호관리-B1.md`(요청서), 이 문서는 그와 짝을 이루는 **우회 처리
> (exclusions) 화면별 정리**다. 상세 근거는 `docs/backend-integration-exclusions.md`.
>
> 표기: 🔴 신규 API/큰 변경 필요 · 🟠 응답에 필드 추가하면 해소 · 🟢 정상 동작(FYI, 수정 불필요)

섹션 B-1 = 근무자 목록(#6) / 배치요청 목록(#7) / 경호목록(#8) / 경호 상세(#9).
프론트는 응답을 기다리지 않고 B-2로 진행하며, 완료 통보가 오면 해당 화면 착수 전에 반영·검증한다.

---

## 화면 6 — 근무자 목록/등록 (`Guard/Stec/W/*`)

| | 항목 | 현재 프론트 처리 |
|---|---|---|
| 🟠 | `GET GetGuardList` 응답에 `deptName`(부서) 없음 | 목록/카드에서 "부서" 열 제거. DB `GUARD_USER_INFO.DEPT_NM`은 `NOT NULL`, `AddGuardInfo`/`PatchGuardInfo` 입력은 받는데 조회에만 빠짐. 등록 폼의 부서 입력은 유지(저장은 정상) — issues #8 |

---

## 화면 7 — 배치요청 목록 + 본부 배정 (`GetDeployRequestList` / `GetStecUserList` / `AddGuardCase`)

| | 항목 | 현재 프론트 처리 |
|---|---|---|
| 🔴 | 배치요구서 **원본을 볼 API가 없음** | "배치요구서 원본보기" 다이얼로그가 관리번호·경찰서·지역청·요청일·배치기간만 표시, 대상자 성별/생년월일/직업·사건개요·배치장소 4필드·수사관/요구자는 "-" — issues #7 (요청서 요청 2) |
| 🔴 | 미배정 배치요구서 **"취소" API 없음** | ⋮ 메뉴 "취소" 비활성. `Deploy/Police/W/CancelGuardCase`는 본사 토큰 403 — issues #9 (요청서 요청 3) |
| 🟠 | `GetDeployRequestList` 응답에 `suspectUserName`(대상자명) 없음 | 목록에 "대상자명" 열 없음 |
| 🟠 | `GetStecUserList` 응답에 담당자 소속 **본부** 없음 | 배정 다이얼로그에서 "본부" 배지 생략 — issues #1 |
| 🟠 | `GetStecUserList` 응답에 `assignedCount`(담당 배정 건수) 없음 | 담당자 건수 배지 생략 |

---

## 화면 8 — 경호목록 (`GET GuardCase/Stec/W/GetGuardCaseList`)

| | 항목 | 현재 프론트 처리 |
|---|---|---|
| 🟠 | 응답에 **지역청**(경찰서 상위) 없음 | "지역청" 필터 무력화(드롭다운 1개), 지역청 단위 조회 불가. 경찰서명(`groupName`)만 |
| 🟠 | 응답에 담당자 **`userSeq`(id)** 없음 | 담당자 열/필터를 이름 문자열(`userName`) 기준으로. 동명이인 구분 불가 |
| 🟠 | 응답에 담당자 **소속 본부** 없음 | "본부" 열 "-" 고정 — issues #1 |
| 🟢 | `pageSize` 상한 100 (페이지네이션) | 화면에 페이지 UI 없어 `meta.totalPages`까지 클라이언트 순회(방어 상한 5000건) |
| 🟢 | 배정 직후 `startDate`/`endDate` = null | 경호계획 등록 전이라 정상. `formatDate` 빈 값 → "-" |

---

## 화면 9 — 경호 상세

### 조회 — `GetGuardCaseDetail` / `GetCaseGuardList` / `GetCaseSchedule` / `GetCaseDoc`

| | 항목 | 현재 프론트 처리 |
|---|---|---|
| 🔴 | `GetGuardCaseDetail`에 **배치요구서 원본 필드** 없음 (요구자 3필드·사건개요·참고사항·문서 등록일·성별/생년월일/직업) | "배치요구서 원본보기" 및 첨부 카드 "등록일" 빈 값 — issues #7 |
| 🟠 | `GetCaseGuardList`에 **`isRepresentative`(대표근무자)** 및 등록된 **경호풀 명단** 없음 | 대표 여부를 `guardUserList`(대표만·이름만)와 이름 매칭으로 추정. 경호풀은 `isAssigned`로 대체 추정 — issues #12 |
| 🟠 | `GetCaseSchedule` 그룹 항목에 **`memo`(특이사항)** 없음 | `PatchScheduleGroup`으로 저장은 되나(200) 조회에 안 와서 재조회 시 "특이사항 · 없음" — issues #12 |
| 🟠 | `GetCaseDoc.guardDeployDocDto`에 `filePath` 없음 | 다른 문서엔 있음. 파일명 표시 + `GetDestroyDocDownload`로 받아 영향은 없음 |
| 🟢 | `GetGuardCaseDetail.crimeType` 레거시 영문값 | 옛 데이터(caseSeq 29 등) `"stalking"` 등. 신규 접수분 정상 — 데이터 정규화 건 |
| 🟢 | `destoryDocDownloadYn` 의미 | 파기확인서 업로드해도 `false` 유지 → "파일 존재"가 아니라 "피전 다운로드 여부"로 추정. 종결 흐름 검증 시 확정 |

### 경호계획 등록/수정 — `AddGuardCaseInfo` / `PatchCaseInfo`

| | 항목 | 현재 프론트 처리 |
|---|---|---|
| 🔴 | 경호계획 **등록에 필요한 배치기간**을 본사 조회로 못 얻음 (`GetGuardCaseDetail`은 null, `Deploy/Police/W/GetDeployDetail*` 본사·시스템관리자 토큰 403) | 배정 건에서 "등록" 버튼 비활성 + 안내문. "수정"(`PatchCaseInfo`, 기간 불필요)은 정상 — issues #10, blockers |
| 🟠 | 조치 5섹션(안전/긴급응급/잠정/긴급임시/임시) ↔ `summary1~5`·`summaryNDate` 단일 문자열 2개뿐 | 선택 항목 `", "` 조인 / 기간 `"시작 ~ 종료"` 문자열로 직렬화, 읽을 때 역파싱. 프론트 규칙이라 타 클라이언트와 호환 불가 — issues #11 |

### 스케줄 — `AutoAddSchedule` / `PatchScheduleGroup` / `DeleteScheduleGroup`

| | 항목 | 현재 프론트 처리 |
|---|---|---|
| 🟢 | `PatchScheduleGroup` `order`는 1+ & 일자 내 유일 필수(중복 409), 근무자 중복시각 409, 경호풀 밖 근무자 400 | 정상 동작. 경호풀 밖 근무자 400은 "기본정보에 근무자를 추가해 주세요"로 안내 |
| 🟢 | 그룹1(첫 조) 삭제 불가 | 일자별 최소 1개 유지 — 모달에서 삭제 버튼 숨김(프론트 정책) |

### 사전미팅 — `SaveCaseMeeting` / `GetCaseMeeting`

| | 항목 | 현재 프론트 처리 |
|---|---|---|
| 🟠 | DTO에 **근무자별 개별 시간** 없음 (미팅 전체 1구간 + `guardSeqs[]`) | 폼의 근무자별 시작/종료를 가장 이른 시작 ~ 가장 늦은 종료로 합쳐 저장. 재조회 시 전원 같은 구간 — issues #11 (아니면 폼 단순화, 회신 요망) |

### 첨부 / 경호취소 — `PatchGuardPlanDoc` / `PatchConsentDoc` / `PatchDestroyDoc`

| | 항목 | 현재 프론트 처리 |
|---|---|---|
| 🔴 | **경호취소 API 없음** (본사 토큰 → `Deploy/Police/W/CancelGuardCase` 403) | "경호취소" 버튼 2곳 비활성 — issues #9 |
| 🟢 | 파일 시그니처(매직바이트) 검사 (비허용 시 400) | "PDF 또는 이미지 파일을 올려주세요"로 안내 |
| 🟢 | 파기확인서는 경호중·경호완료에서만 등록(그 외 409) | 상태 아니면 업로드 행 비활성 + 안내 |
