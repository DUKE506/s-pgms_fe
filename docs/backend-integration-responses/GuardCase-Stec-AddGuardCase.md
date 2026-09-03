# GuardCase/Stec/W/AddGuardCase

- 테스트 날짜: 2026-09-03
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자) 토큰, `deploySeq=81`(동래경찰서 접수건,
  3번 검증 때 생성한 버려도 되는 건), `userSeq=104`(`StecM2` 본부관리자)
- 엔드포인트: `POST /api/v1/GuardCase/Stec/W/AddGuardCase`
- DTO(`AddHeadOfficeAssignmentDto`): `{ deploySeq: int(필수), userSeq: int(필수) }`

## 요청

헤더: `Authorization: Bearer {accessToken}`, `Content-Type: application/json`

```json
{ "deploySeq": 81, "userSeq": 104 }
```

## 응답 (실제) — 성공

HTTP 200

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

## 배정 후 상태 변화 (같은 토큰으로 재조회)

- `GET GetDeployRequestList` — deploySeq 81이 **목록에서 사라짐**(배정 완료 = 미배정 큐에서 제거).
- `GET GetGuardCaseList` — 새 행 등장:
  ```json
  {
    "caseSeq": 46,
    "mgmtNo": "26-09-동래경찰서 ST0002",
    "groupName": "동래경찰서",
    "userName": "HS2본부",
    "statusName": "배정",
    "startDate": null,
    "endDate": null
  }
  ```

## 특이사항

- **성공 응답이 `data: true`뿐** — 생성된 `caseSeq`/`mgmtNo`를 안 돌려준다. 프론트는
  배정 성공 시 목록을 재조회(`invalidateQueries(['pending-requests'])`)해 확인한다.
- **여기서 GuardCase(경호건)가 처음 생성됨** — 배정 즉시 `statusName: "배정"`,
  `mgmtNo`에 경호코드 `ST####`가 붙는다(`"26-09-동래경찰서 ST0002"` — 공백 구분).
  `GetGuardCaseList`/`GetGuardCaseDetail` 등 이후 모든 본사 경호관리 화면의 전제.
- `startDate`/`endDate`는 배정 직후 `null` — 경호계획 등록(9번, `AddGuardCaseInfo`) 전까지
  비어 있다(배치요구서의 `periodFrom`/`periodTo`와 별개).
- **취소(되돌리기) API 없음** — `GuardCase/Stec/W/CancelGuardCase`는 스웨거에 없고,
  유일한 취소 엔드포인트 `POST Deploy/Police/W/CancelGuardCase`는 Police 태그라 본사
  토큰으로 호출 불가(본사 토큰 `GetDeployDetail` 403으로 방증). 이번 테스트로 만든
  caseSeq 46(deploySeq 81)은 **되돌리지 않고 남겨둠** — 8·9번(경호목록/경호 상세)
  입력 데이터로 재사용(사용자 승인 2026-09-03).
- `userSeq`는 `GetStecUserList`의 항목 `userSeq`(본부관리자, `codeName === "본부관리자"`).
- 운영관리자(`StecM1`) 토큰으로 배정 성공 — 시스템관리자 전용 아님(matrix 3번 주석과 일치).
