# GuardCase/Stec/W/GetDeployRequestList

- 테스트 날짜: 2026-09-03
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자), `232727`(시스템관리자), `StecM2`(본부관리자)
- 엔드포인트: `GET /api/v1/GuardCase/Stec/W/GetDeployRequestList`
- 파라미터(스웨거): `mgmtNo`(string), `regionSeq`(int), `groupSeq`(int) — 전부 선택. **아무것도 안 넘겨도 200.**

## 요청

헤더: `Authorization: Bearer {accessToken}`

쿼리: 없음

## 응답 (실제) — 운영관리자(`StecM1`) / 시스템관리자(`232727`) 동일

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    {
      "deploySeq": 86,
      "caseSeq": null,
      "mgmtNo": "26-09-동래경찰서",
      "groupName": "동래경찰서",
      "parentGroupName": "부산경찰청",
      "createDt": "2026-09-03",
      "periodFrom": "2026-09-03",
      "periodTo": "2026-09-12",
      "requestedEndDate": null
    },
    {
      "deploySeq": 82,
      "caseSeq": null,
      "mgmtNo": "26-09-동래경찰서",
      "groupName": "동래경찰서",
      "parentGroupName": "부산경찰청",
      "createDt": "2026-09-02",
      "periodFrom": "2026-09-12",
      "periodTo": "2026-09-22",
      "requestedEndDate": null
    },
    {
      "deploySeq": 70,
      "caseSeq": null,
      "mgmtNo": "26-08-강남경찰서",
      "groupName": "강남경찰서",
      "parentGroupName": "서울경찰청",
      "createDt": "2026-08-21",
      "periodFrom": "2026-08-19",
      "periodTo": "2026-08-23",
      "requestedEndDate": null
    }
  ],
  "code": 200
}
```

## 응답 (실제) — 본부관리자(`StecM2`)

**HTTP 403, 본문 없음(빈 응답).** envelope 안 옴. 이 화면은 본부관리자 접근 불가
(matrix 4번, PROGRESS 12번 스코프 재검증에서 재확인). `GetStecUserList`도 동일하게 403.

## 특이사항

- **파라미터 전부 선택** — `groupSeq` 없이도 200. 경찰 쪽 `GetDeployList`(필수 `groupSeq`)와 다르다.
- **스코프 필터 없음** — 운영/시스템관리자는 **전국 모든 지역청·경찰서**의 미배정(=`caseSeq: null`)
  배치요청을 전부 본다(동래·강남 섞여서 반환됨). 화면 상단의 지역청/경찰서 필터는 클라이언트
  사이드.
- **`mgmtNo`에 접미사 없음** — `"26-09-동래경찰서"` 형태. 경찰 `GetDeployList`의 `" 접수"`
  접미사(`"26-08-동래경찰서 접수"`)가 여기엔 붙지 않는다. 이 목록은 배정 전 상태만 담으므로
  경호코드(`ST####`)도 당연히 없다 → 프론트는 `mgmtNo`를 **그대로** `receiptNumber`로 쓴다
  (`splitMgmtNo` 불필요).
- **필드 대응**: `deploySeq`(→ 배정 액션의 `AddGuardCaseDto.deploySeq`, 프론트 `SecurityCase.id`),
  `groupName`(→ 경찰서), `parentGroupName`(→ 지역청), `createDt`(→ 요청일),
  `periodFrom`/`periodTo`(→ 배치기간).
- **대상자명·배치요구서 상세는 이 응답에 없음** — 행 클릭 시 뜨는 배치요구서 전문 다이얼로그
  (`DispatchRequestViewDialog`)를 채울 데이터가 없다. 본사 토큰으로 경찰용
  `Deploy/Police/W/GetDeployDetail` 호출 시 403 확인 → 본사가 배치요구서 원본을 볼 API가
  현재 없음(issues.md #7 — 본사 케이스 보강 필요). 연동 시 다이얼로그는 목록 필드만 표시.
- `requestedEndDate`는 전 행 `null`(연장/단축 신청 흐름용 컬럼, 미배정 단계라 항상 null).
- `caseSeq`는 배정 전이라 전부 `null`. 배정되면 이 목록에서 사라지고 `GetGuardCaseList`로 넘어간다.
