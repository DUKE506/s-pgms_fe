# Deploy/Police/W/GetDeployDetailUpdate

- 테스트 날짜: 2026-09-03
- 사용한 테스트 계정/데이터: `SPoliceM5`(동래경찰서 · 피전), deployReqSeq 71(접수) / 82(배정)
- 엔드포인트: `GET /api/v1/Deploy/Police/W/GetDeployDetailUpdate`
- 파라미터: `deployReqSeq`(int)

## 배경

화면5(배치요구서 수정)의 prefill 소스. `GetDeployDetail`은 상세페이지 표시용 "기본정보"
뷰라서 배치요구서 원본 필드(성별·생년월일·직업·사건개요·참고사항)를 안 준다(issues #7).
`GetDeployDetailUpdate`는 배치요구서에 제출된 원본 값을 그대로 돌려준다 — **백엔드가
issues #7 요청대로 신설**(2026-09-03, 스웨거 갱신).

## 응답 (실제) — deployReqSeq=82 (배정 상태)

HTTP 200

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "deployReqSeq": 82,
    "deployStatus": "배정",
    "crimeType": "스토킹",
    "suspectUserName": "홍○○",
    "suspectGender": 1,
    "suspectBirth": "1992-01-01",
    "suspectJob": "회사원",
    "suspectAddress": "부산 동래구 온천천로 123",
    "caseSummary": "연동 응답 샘플 확보용 테스트 접수입니다.",
    "periodFrom": "2026-09-12",
    "periodTo": "2026-09-22",
    "requestedEndDate": null,
    "guardWorkLoc": null,
    "guardHomeLoc": null,
    "etcLoc1": null,
    "etcLoc2": null,
    "caseMemo": "",
    "documentDt": "2026-09-02",
    "clientDept": "여성청소년과 여성청소년계",
    "clientPosition": "경사",
    "clientName": "홍길동",
    "investigator": "이형사 / 경위 / 01033334444",
    "responsibleOfficer": "김경사 / 경사 / 01011112222"
  },
  "code": 200
}
```

접수 상태(71)도 동일 스키마로 200.

## 특이사항

- **`GetDeployDetail`이 안 주던 필드를 전부 준다**: `suspectGender`(0/1), `suspectBirth`,
  `suspectJob`, `caseSummary`, `caseMemo`. → 화면5 prefill 블로커 해소.
- **필드명이 쓰기 DTO와 다르다** (매핑 시 주의):
  | 개념 | 읽기(이 응답) | 쓰기(Update/AddDeployRequestDto) |
  |---|---|---|
  | 생년월일 | `suspectBirth` | `suspectBirthDate` |
  | 기타장소1/2 | `etcLoc1` / `etcLoc2` | `guardEtcLoc1` / `guardEtcLoc2` |
  | 상태 | `deployStatus` | (없음) |
  | 주거지/직장지 | `guardHomeLoc` / `guardWorkLoc` | 동일 |
- **`mgmtNo` 없음** — issues #7이 요청했으나 응답에 안 들어옴. 수정 화면 breadcrumb에서만
  쓰던 값이라 프론트는 빈 값으로 두고 "경호관리"만 표시(경미, exclusions).
- **배치장소 4필드는 저장돼 있으면 채워져 온다** — 별도 쓰기 테스트(deploySeq 87)에서
  `AddDeployRequest`로 `guardHomeLoc` 등 4필드를 보내면 이 응답에 그대로 반영됨을 확인.
  71/82가 null인 건 그 건들이 4필드 이전 방식(단일 `deploymentPlace`)으로 생성됐기 때문.
- `crimeType`이 레거시 데이터에선 영문(`"stalking"`)으로 옴(71) — 우리 폼이 쓰는 한글
  라벨과 안 맞아 사건유형이 미선택으로 표시된다. 폼으로 생성한 건은 한글이라 정상(82).
  레거시 건 재저장 시 사건유형 다시 선택 필요(경미, exclusions).
