# GuardCase/Stec/W/GetGuardCaseList

- 테스트 날짜: 2026-09-03
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자), `StecM2`(본부관리자). 데이터는 7번
  iteration에서 실배정한 caseSeq 46/47/48(동래경찰서, 담당 `HS2본부`) + 기존 caseSeq 29(강남,
  경호완료).
- 엔드포인트: `GET /api/v1/GuardCase/Stec/W/GetGuardCaseList`
- 파라미터(스웨거): `pageNumber`(int, 기본 1), `pageSize`(int, 기본 10), `mgmtNo`(string),
  `regionSeq`/`groupSeq`/`stecDeptSeq`/`status`(int) — 전부 선택.

## 요청

헤더: `Authorization: Bearer {accessToken}`

쿼리: `?pageNumber=1&pageSize=100`

## 응답 (실제) — 운영관리자(`StecM1`)

HTTP 200

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "meta": { "pageNumber": 1, "pageSize": 100, "totalCount": 4, "totalPages": 1 },
    "data": [
      { "caseSeq": 48, "mgmtNo": "26-09-동래경찰서 ST0004", "groupName": "동래경찰서",
        "userName": "HS2본부", "statusName": "배정", "startDate": null, "endDate": null },
      { "caseSeq": 47, "mgmtNo": "26-09-동래경찰서 ST0003", "groupName": "동래경찰서",
        "userName": "HS2본부", "statusName": "배정", "startDate": null, "endDate": null },
      { "caseSeq": 46, "mgmtNo": "26-09-동래경찰서 ST0002", "groupName": "동래경찰서",
        "userName": "HS2본부", "statusName": "배정", "startDate": null, "endDate": null },
      { "caseSeq": 29, "mgmtNo": "26-08-강남경찰서 ST0001", "groupName": "강남경찰서",
        "userName": "HS2본부", "statusName": "경호완료",
        "startDate": "2026-08-21T00:52:16", "endDate": "2026-08-23T00:52:16" }
    ]
  },
  "code": 200
}
```

## 응답 (실제) — 본부관리자(`StecM2`)

HTTP 200 — **403 아님.** WORK-009로 "본인 배정 건만" 스코프. 현재 caseSeq 46~48·29가
전부 `StecM2`(`HS2본부`) 담당이라 위와 동일한 4건이 반환됐다(스코프 자체의 필터링 효과는
다른 담당자 건이 생겨야 실측 가능).

## 응답 (실제) — `pageSize` 범위 밖

HTTP 400

```json
{ "message": "페이지 번호는 1 이상, 페이지 크기는 1~100이어야 합니다.", "data": null, "code": 400 }
```

`pageSize=200`/`500`에서 재현. **`pageSize` 상한이 100**이라 전량을 한 번에 못 받는다 —
`meta.totalPages`까지 순회해 이어붙인다(`listSecurityCases`).

## 특이사항 (본사 경호목록 화면 — matrix 8번)

- **응답이 이중 래핑**: envelope `{message,data,code}`의 `data`가 다시 `{meta, data:[...]}`.
  `unwrapEnvelope`로 한 번 벗기고 `.data`로 행 배열을 꺼낸다.
- **진행 중 건만**: `배정`/`경호중`/`경호완료`. 종결·경호취소는 `History/Stec/W/GetHistoryList`
  소관(HIST-001, 스웨거 설명). → 프론트 `ACTIVE_SECURITY_CASE_STATUSES` 필터와 일치.
- **`statusName`이 프론트 라벨과 그대로 일치** — 코드 매핑 불필요(경찰서 경호목록과 동일).
- **`mgmtNo`는 경호코드가 붙은 완성형** `"26-09-동래경찰서 ST0004"` — `splitMgmtNo`로
  마지막 공백에서 잘라 접수번호/경호코드로 나눔.
- **`caseSeq`** → `SecurityCase.id`. 경찰서 경호목록은 `deploySeq`를 id로 썼지만 본사
  경호 상세(#9, `GetGuardCaseDetail`)는 `caseSeq` 기준. **`deploySeq`는 이 응답에 없다.**
- **`userName`** = 배정된 본부관리자 계정의 `userName`(담당자 *이름*). 실서버 테스트 계정
  이름이 `"HS2본부"`처럼 본부명 같은 값이라 헷갈리지만, `GetStecUserList`의 그 계정
  `userName`과 동일한 값이다. **담당자 id는 응답에 없다** → 이름 문자열만 표시, managers
  조인 제거.
- **지역청·담당자 소속 본부 없음** → 지역청 필터 무력화, 본부 열 "-"(exclusions).
- **`startDate`/`endDate`가 배정 상태에선 `null`** — 경호계획 등록(#9) 전. `경호완료` 건은
  ISO datetime. 프론트 `formatDate`가 빈 값이면 "-" 반환.
