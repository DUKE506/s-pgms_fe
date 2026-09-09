# GuardCase/Stec/W/GetDeployDetail

- 테스트 날짜: 2026-09-04
- 사용한 테스트 계정/데이터: `StecM1`(본사, 운영관리자). deployReqSeq 70·71(접수),
  81·82·86·88·89(배정). 없는 seq(87)는 HTTP 404 `"존재하지 않는 배치요구서입니다"`.
- 엔드포인트: `GET /api/v1/GuardCase/Stec/W/GetDeployDetail?deployReqSeq={n}`

2026-09-04 스웨거에 신설된 **본사용 배치요구서 원본 상세** 조회 API (섹션 B-1 요청서
요청 2 = issues #7, 요청 1 = issues #10 대응). 경찰용 `Deploy/Police/W/GetDeployDetail`과
경로·이름이 겹치므로 프론트에서 구분 필요.

## 요청

```
GET /api/v1/GuardCase/Stec/W/GetDeployDetail?deployReqSeq=81
Authorization: Bearer {StecM1 accessToken}
```

## 응답 (실제) — 배정 상태 (deployReqSeq 81 = caseSeq 46)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "deployReqSeq": 81,
    "deployStatus": "배정",
    "crimeType": "스토킹",
    "suspectUserName": "홍○○",
    "suspectGender": 1,
    "suspectBirth": "2026-09-01",
    "suspectJob": "회사원",
    "suspectAddress": "부산 동래구 온천천로 123",
    "caseSummary": "지속적인 접근 시도가 확인되어 신변보호가 필요함.",
    "periodFrom": "2026-09-10",
    "periodTo": "2026-09-20",
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

## 응답 (실제) — 접수 상태 (deployReqSeq 71, 미배정·caseSeq 없음)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "deployReqSeq": 71,
    "deployStatus": "접수",
    "crimeType": "stalking",
    "suspectUserName": "피의자이름",
    "suspectGender": 0,
    "suspectBirth": "2026-08-19",
    "suspectJob": "피의자 직업",
    "suspectAddress": "피의자 거주지",
    "caseSummary": "스토킹건",
    "periodFrom": "2026-08-19",
    "periodTo": "2026-08-23",
    "requestedEndDate": null,
    "guardWorkLoc": null,
    "guardHomeLoc": null,
    "etcLoc1": null,
    "etcLoc2": null,
    "caseMemo": "기타 참고사항",
    "documentDt": "2026-08-19",
    "clientDept": "여성청소년계",
    "clientPosition": "경사",
    "clientName": "홍길동",
    "investigator": "담당수사관 이름",
    "responsibleOfficer": "담당피전 이름"
  },
  "code": 200
}
```

## 응답 (실제) — 배치장소 4필드 확인 (deployReqSeq 88·89, 배정)

```json
{
  "deployReqSeq": 89,
  "deployStatus": "배정",
  "guardHomeLoc": "주거지 주소1",
  "guardWorkLoc": "직장지 주소1",
  "etcLoc1": "기타1",
  "etcLoc2": "기타2",
  "periodFrom": "2026-09-05",
  "periodTo": "2026-09-12"
}
```

## 특이사항

- **접수·배정 상태 모두 200** — `deployStatus`가 "접수"/"배정" 한글 문자열. 스웨거 설명대로
  배정 전 건도 열린다. 배정 뒤에는 경호건 상태, 연장/단축 신청이 있으면 그쪽이 우선.
  없는 seq는 HTTP 404.
- **`periodFrom`/`periodTo`가 항상 온다** (접수·배정·경호계획 미등록 무관). → **issues #10
  해소**: 경호계획 등록 폼의 배치기간을 이걸로 채울 수 있다. `AddGuardCaseInfo`의
  `startDt`/`endDt`를 폼값 대신 이 값 + 배치시간으로 조합 가능.
- **배치요구서 원본 필드 전부 확보** (→ **issues #7 해소**):
  요구자 3필드(`clientDept`/`clientPosition`/`clientName`), `caseSummary`(사건개요),
  `caseMemo`(참고사항), `suspectGender`(0=남/1=여), `suspectBirth`(생년월일),
  `suspectJob`, `suspectAddress`(거주지), `investigator`/`responsibleOfficer`(자유텍스트),
  `documentDt`(문서 등록일 — 첨부 카드 "등록일" 빈 값 해소),
  **배치장소 4필드**(`guardHomeLoc`/`guardWorkLoc`/`etcLoc1`/`etcLoc2`).
- **배치장소 null이던 이유** — deployReqSeq 81·82는 2026-09-02(배치장소 4필드 쓰기 수정
  전, D-2 임시처리 시절)에 생성돼 배치요구서 원본에 배치장소가 저장 안 된 데이터다.
  4필드 쓰기 수정(2026-09-03, issues #5) 이후 생성된 88·89는 정상 반환 — **엔드포인트
  갭이 아니라 옛 테스트 데이터 문제.**
- **필드명 비대칭** (읽기 vs 쓰기 `UpdateDeployRequestDto`): `suspectBirth`↔`suspectBirthDate`,
  `etcLoc1`/`etcLoc2`↔`guardEtcLoc1`/`guardEtcLoc2`. `guardWorkLoc`/`guardHomeLoc`는 동일.
- **`mgmtNo` 없음** — 헤더/breadcrumb는 목록에서 받은 값 사용.
- 레거시 `crimeType` 영문값("stalking", deployReqSeq 70·71 등 옛 데이터), 신규 접수분은
  한글("스토킹")이 섞임. **이 응답의 `crimeType`은 프론트가 안 읽는다** — 사건유형은
  `GetGuardCaseDetail` 매퍼(`toHeader`)가 `crimeCodeToCaseType`으로 채운다(2026-09-09).
- deployReqSeq 81의 `suspectUserName`이 "홍○○"인 것은 마스킹이 아니라 그 레코드에
  원래 그렇게 입력된 테스트 데이터(86은 "이동희" 실명 그대로 반환).
