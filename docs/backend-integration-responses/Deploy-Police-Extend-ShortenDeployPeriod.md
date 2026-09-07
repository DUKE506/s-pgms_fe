# Deploy/Police/W/ExtendDeployPeriod · ShortenDeployPeriod

- 테스트 날짜: 2026-09-07
- 사용한 테스트 계정/데이터: `SPoliceM5`(동래경찰서). deploySeq 82(caseSeq 48, 배정·경호계획 등록됨).
- 엔드포인트:
  - `PATCH /api/v1/Deploy/Police/W/ExtendDeployPeriod`
  - `PATCH /api/v1/Deploy/Police/W/ShortenDeployPeriod`

## 요청

```json
{ "deployReqSeq": 82, "afterEndDate": "2026-09-30" }
```

`afterEndDate` = `format: date` (`"YYYY-MM-DD"`). 둘 다 required.

## 응답 (실제)

```json
{ "message": "요청에 성공하였습니다.", "data": true, "code": 200 }
```

## 특이사항

- **업무 규칙: 연장/단축은 경호중 상태만 대상.** 경찰 쪽 `requestPeriodChange`
  (`features/police/api/securityCaseDetail.ts`)가 경호중에서만 버튼을 여는 게 맞는 동작이다.
- 백엔드는 **배정 상태 요청도 기술적으로 받아준다**(하드 검증 없음, 실측 200) — 정상 흐름은
  아니다. 현재 실백엔드에 경호중 건이 하나도 없어(모든 경호시작일이 미래) matrix #10
  검증은 **부득이 배정 건으로** 진행했다. 진짜 경호중 흐름 실측은 경호중 데이터가 생긴 뒤
  (matrix #4 "배정 이후 재검증"과 함께).
- 호출 후 배치요구서 상태만 2(연장)/3(단축)으로 바뀌고 배치기간은 아직 안 바뀐다 —
  실제 반영은 본사 `ConfirmCasePeriod` 시점(`GuardCase-Stec-ConfirmCasePeriod.md`).
- `GetDeployList`(경찰 목록) 항목의 `extendCount`가 연장 확정 후 증가(단축은 불변).
- 단축은 새 종료일이 현재 종료일보다 앞이어야 함 — 아니면 400
  ("단축은 기존 종료일보다 앞이어야 합니다. 늘리려면 연장을 이용해주세요.").
- **재신청 시 409** (`ConfirmCasePeriod` 설명: 이미 확장된 요청 재요청 시 409).
