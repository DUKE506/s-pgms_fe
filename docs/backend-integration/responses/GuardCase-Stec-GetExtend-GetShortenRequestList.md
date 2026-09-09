# GuardCase/Stec/W/GetExtendRequestList · GetShortenRequestList

- 테스트 날짜: 2026-09-07
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자). 데이터: 경찰(`SPoliceM5`)로 deploySeq 82(caseSeq 48, 동래·배정·경호계획 등록됨)에 연장/단축 신청을 만들어 확인 후 `ConfirmCasePeriod`로 원복.
- 엔드포인트:
  - `GET /api/v1/GuardCase/Stec/W/GetExtendRequestList`
  - `GET /api/v1/GuardCase/Stec/W/GetShortenRequestList`
  - 파라미터(선택): `mgmtNo`(string) / `regionSeq`(int) / `groupSeq`(int) — 없이 호출하면 운영/시스템관리자는 전국 반환

## 요청

```
GET /api/v1/GuardCase/Stec/W/GetExtendRequestList
Authorization: Bearer {운영관리자 accessToken}
```

## 응답 (실제)

신청이 없을 때: `{ "message": "...", "data": [], "code": 200 }` — `data`는 **평면 배열**
(`GetGuardCaseList`의 `{meta,data}` 이중 래핑 아님).

경찰이 연장 신청한 뒤 `GetExtendRequestList`:

```json
{
  "message": "요청에 성공하였습니다.",
  "data": [
    {
      "deploySeq": 82,
      "caseSeq": 48,
      "mgmtNo": "26-09-동래경찰서",
      "groupName": "동래경찰서",
      "parentGroupName": "부산경찰청",
      "createDt": "2026-09-02",
      "periodFrom": "2026-09-12",
      "periodTo": "2026-09-22",
      "requestedEndDate": "2026-09-30"
    }
  ],
  "code": 200
}
```

단축 신청 뒤 `GetShortenRequestList` — **항목 구조 동일**. (아래는 직전에 연장이 확정돼
`periodTo`가 이미 09-30이 된 상태에서 09-22로 단축 신청한 예)

```json
{
  "data": [
    {
      "deploySeq": 82,
      "caseSeq": 48,
      "mgmtNo": "26-09-동래경찰서",
      "groupName": "동래경찰서",
      "parentGroupName": "부산경찰청",
      "createDt": "2026-09-02",
      "periodFrom": "2026-09-12",
      "periodTo": "2026-09-30",
      "requestedEndDate": "2026-09-22"
    }
  ],
  "code": 200
}
```

## 특이사항

- **항목 구조가 `GetDeployRequestList`(matrix #7, `listPendingRequests`)와 사실상 동일** —
  `deploySeq`/`caseSeq`/`mgmtNo`/`groupName`/`parentGroupName`/`createDt`/`periodFrom`/
  `periodTo`/`requestedEndDate`. 다른 점은 `caseSeq`가 채워져 있다는 것(배정된 건이므로).
- **연장/단축 구분 필드가 항목에 없다** — 엔드포인트 자체가 구분(Extend vs Shorten).
  프론트 `listPeriodRequests(type)`가 어느 EP를 불렀는지로 `pendingPeriodRequest.type`을 채운다.
- `mgmtNo`는 **접미사(경호코드) 없는 접수번호만** — `"26-09-동래경찰서"`. (`GetGuardCaseList`는
  `"… ST0004"`까지 붙은 완성형이지만 이 목록은 아님. `GetDeployRequestList`와 동일.)
- `periodFrom`/`periodTo` = **현재 확정된 배치기간**, `requestedEndDate` = 신청한 새 종료일.
  시작일은 안 바뀐다(연장/단축 모두 종료일만).
- **"언제 신청했는지" 타임스탬프가 없다** — `createDt`는 배치요구서 최초 생성일(2026-09-02)이지
  연장/단축 신청 시각이 아니다. 화면의 "요청일" 컬럼은 `createDt`로 대체하거나 생략 →
  `exclusions.md` 기록 대상.
- 스코프: `StecM1`(운영관리자) 파라미터 없이 200·전국. 본부관리자(`StecM2`) 스코프는 #12에서 확인.
