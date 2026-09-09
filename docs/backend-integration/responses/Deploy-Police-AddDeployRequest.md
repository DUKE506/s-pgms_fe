# Deploy/Police/W/AddDeployRequest

- 테스트 날짜: 2026-09-02
- 사용한 테스트 계정/데이터: `SPoliceM5`(경찰, 동래경찰서 · 피전, `groupSeq=32`)
- 엔드포인트: `POST /api/v1/Deploy/Police/W/AddDeployRequest`
- 확보 방식: (1) `run-s-pgms` 드라이버로 실제 백엔드 대상 신규접수 화면에서 폼 제출
  (deploySeq 81 생성) → 콘솔 에러 없음, 이어서 `GetDeployList`에 반영 확인. (2) 응답
  envelope·검증 규칙은 curl로 별도 확인(deploySeq 82 생성).

## 요청

헤더: `Authorization: Bearer {accessToken}`, `Content-Type: application/json`

```json
{
  "groupSeq": 32,
  "suspectName": "홍○○",
  "suspectGender": 1,
  "suspectBirthDate": "1992-01-01",
  "suspectJob": "회사원",
  "suspectAddress": "부산 동래구 온천천로 123",
  "crimeType": "스토킹",
  "caseSummary": "…",
  "deploymentPeriodFrom": "2026-09-12",
  "deploymentPeriodTo": "2026-09-22",
  "deploymentPlace": "부산 동래구 온천천로 123",
  "caseMemo": "",
  "documentDt": "2026-09-02",
  "clientDept": "여성청소년과 여성청소년계",
  "clientPosition": "경사",
  "clientName": "홍길동",
  "investigator": "이형사 / 경위 / 010…",
  "responsibleOfficer": "김경사 / 경사 / 010…"
}
```

## 응답 (실제) — 정상

HTTP 200

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

`data`는 그냥 `true` — 생성된 `deployReqSeq`/`mgmtNo`를 돌려주지 않는다. 프론트는
등록 후 경호목록으로 이동하며, 생성된 건은 `GetDeployList`가 조합해 내려주는 항목으로
확인한다(아래).

## 응답 (실제) — 필수값 누락

HTTP 400 (ASP.NET `[ApiController]` 자동 모델 검증 — envelope가 아니라 `ProblemDetails`
형식)

```json
{
  "errors": {
    "suspectName": ["The suspectName field is required."],
    "suspectJob": ["The suspectJob field is required."],
    "suspectAddress": ["The suspectAddress field is required."],
    "deploymentPlace": ["The deploymentPlace field is required."],
    "clientDept": ["The clientDept field is required."],
    "clientPosition": ["The clientPosition field is required."],
    "clientName": ["The clientName field is required."]
  },
  "title": "One or more validation errors occurred.",
  "status": 400
}
```

## GetDeployList 반영 (생성 직후)

```json
{
  "deploySeq": 82,
  "caseSeq": null,
  "mgmtNo": "26-09-동래경찰서 접수",
  "suspectUserName": "홍**",
  "statusName": "접수",
  "startDt": "2026-09-12",
  "endDt": "2026-09-22",
  "extendCount": 0,
  "remainDays": 20
}
```

## 특이사항

- **스웨거의 `required`는 `[groupSeq, suspectName]`뿐이지만, 서버는 실제로 더 많은
  필드를 필수로 강제한다** — `suspectJob`·`suspectAddress`·`deploymentPlace`·
  `clientDept`·`clientPosition`·`clientName`도 없으면 400. 스웨거가 `nullable: true`로
  표시했어도 DB(`DEPLOY_REQUEST`)에서 `NOT NULL`인 컬럼들이라 DB 덤프 쪽이 정답. 우리
  신규접수 폼은 이 필드들을 이미 전부 필수 검증하고 있어 추가 대응 불필요.
- **선택(nullable) 필드**: `suspectGender`(int, 기본 0)·`caseSummary`·`caseMemo`·
  `crimeType`·`investigator`·`responsibleOfficer`. `caseMemo`는 빈 문자열 `""`로 보내도
  200.
- **`groupSeq`**는 모델 검증 필수 목록엔 없지만(int 기본 0), 우리 앱은 로그인 시
  `GetMyProfile`로 받은 값을 세션에서 꺼내 항상 넣는다(GetDeployList와 동일). 권한 밖
  `groupSeq`는 GetDeployList처럼 서버가 막을 것으로 추정(미검증 — 화면3에선 본인
  소속만 씀).
- **`suspectGender` 코드**: `0=남 / 1=여` (DB `SUSPECT_GENDER` 코멘트 "0 : 남자 1 :
  여자"). 프론트는 `shared/lib/subject.ts`의 `genderLabelToCode`로 변환.
- **`deploymentPlace`가 단일 필드** — 우리 폼은 배치장소를 주거지/직장지/기타1/기타2
  4필드로 받는데 API는 1개. **D-2 임시 처리**: 주거지(`location.residence`)만 전송,
  나머지 3개는 제외. 백엔드에 4필드 확장 요청함 —
  `docs/backend-integration/findings.md` #5, `docs/backend-integration/findings.md`,
  `docs/backend-integration/findings.md`.
- **`mgmtNo` 조합 형태 확정**: `"26-09-동래경찰서 접수"`(YY-MM-경찰서명 + 공백 + "접수").
  프론트는 마지막 공백에서 잘라 `formatManagementNumber`로 `"26-09-동래경찰서 · 접수"`로
  재조합(matrix 2번과 동일 규칙). `remainDays`는 오늘~`endDt` 기준으로 채워져 내려옴
  (현재 화면 미사용).
- **테스트 데이터**: 이 연동 검증으로 동래경찰서에 실제 접수건 2건 생성됨(deploySeq
  81·82). 되돌리지 않고 남겨둠 — matrix 10번(본사 배치요청 목록 → 배정) 검증 시 입력
  데이터로 재사용된다. 기존 1건(deploySeq 71)까지 현재 동래 경호목록 3건.
