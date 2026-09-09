# Deploy/Police/W/UpdateDeployRequest

- 테스트 날짜: 2026-09-03
- 사용한 테스트 계정/데이터: `SPoliceM5`(동래경찰서 · 피전), deployReqSeq 71(접수) — 값 변경 후 원복
- 엔드포인트: `PUT /api/v1/Deploy/Police/W/UpdateDeployRequest`
- DTO(`UpdateDeployRequestDto`): `AddDeployRequestDto` + `deployReqSeq`, `groupSeq` 없음.
  `required: [deployReqSeq, suspectName]`.

## 요청

헤더: `Authorization: Bearer {accessToken}`, `Content-Type: application/json`

```json
{
  "deployReqSeq": 71,
  "suspectName": "피의자이름",
  "suspectGender": 0,
  "suspectBirthDate": "2026-08-19",
  "suspectJob": "피의자 직업",
  "suspectAddress": "피의자 거주지",
  "crimeType": "stalking",
  "caseSummary": "스토킹건",
  "deploymentPeriodFrom": "2026-08-19",
  "deploymentPeriodTo": "2026-08-23",
  "guardWorkLoc": null,
  "guardHomeLoc": "PUT테스트-주거지",
  "guardEtcLoc1": null,
  "guardEtcLoc2": null,
  "caseMemo": "PUT 왕복 테스트",
  "documentDt": "2026-08-19",
  "clientDept": "여성청소년계",
  "clientPosition": "경사",
  "clientName": "홍길동",
  "investigator": "담당수사관 이름",
  "responsibleOfficer": "담당피전 이름"
}
```

## 응답 (실제) — 성공

HTTP 200

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

직후 `GetDeployDetailUpdate?deployReqSeq=71` → `caseMemo` / `guardHomeLoc`이 보낸 값으로
갱신됨 확인. 브라우저(run-s-pgms)에서도 화면5 저장 → `crimeType`(stalking→스토킹),
`guardHomeLoc`/`guardWorkLoc` 갱신 확인.

## 특이사항

- 성공 응답 `data: true`뿐 — 갱신된 레코드를 안 준다. 호출부는 저장 후 상세로 이동만 한다.
- **배치장소 4필드(`guardHomeLoc` 등)가 정상 저장·왕복**된다(읽기는 `GetDeployDetailUpdate`).
- 쓰기 DTO는 `suspectBirthDate` / `guardEtcLoc1` / `guardEtcLoc2`(읽기 응답의 `suspectBirth` /
  `etcLoc1` / `etcLoc2`와 이름 다름).
- 스웨거 설명상 배정 이후 배치기간은 서버에서 무시, 경호중/종결/취소는 409, 소속 밖 403
  (프론트는 경호중+에서 배치기간 입력을 이미 비활성화).
- 종결/취소 상태 대상 호출은 미검증(그 상태 데이터가 아직 없음).
