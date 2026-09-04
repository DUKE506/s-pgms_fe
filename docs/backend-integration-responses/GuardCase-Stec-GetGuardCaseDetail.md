# GuardCase/Stec/W/GetGuardCaseDetail

- 테스트 날짜: 2026-09-04
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자). caseSeq 46/47/48(동래, 배정·경호계획
  미등록), caseSeq 29(강남, 경호완료·경호계획 등록됨).
- 엔드포인트: `GET /api/v1/GuardCase/Stec/W/GetGuardCaseDetail?caseSeq=`
- 스웨거 summary: "경호계획 상세"

## 요청

헤더: `Authorization: Bearer {accessToken}` / 쿼리: `?caseSeq=29`

## 응답 (실제) — 경호계획 미등록 (caseSeq 46, 배정)

HTTP 200

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "caseSeq": 46,
    "mgmtNo": "26-09-동래경찰서 ST0002",
    "statusName": "배정",
    "suspectUserName": "홍**",
    "startDate": null, "endDate": null, "startTime": null, "endTime": null,
    "investigator": "이형사 / 경위 / 01033334444",
    "responsibleOfficer": "김경사 / 경사 / 01011112222",
    "crimeType": "스토킹",
    "extendCount": 0,
    "guardHomeLoc": null, "guardWorkLoc": null, "guardEtcLoc1": null, "guardEtcLoc2": null,
    "summary1": null, "summary1Date": null,
    "summary2": null, "summary2Date": null,
    "summary3": null, "summary3Date": null,
    "summary4": null, "summary4Date": null,
    "summary5": null, "summary5Date": null,
    "destoryDocDownloadYn": false,
    "guardUserList": []
  },
  "code": 200
}
```

## 응답 (실제) — 경호계획 등록됨 (caseSeq 29, 경호완료)

HTTP 200

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "caseSeq": 29,
    "mgmtNo": "26-08-강남경찰서 ST0001",
    "statusName": "경호완료",
    "suspectUserName": "[********",
    "startDate": "2026-08-21", "endDate": "2026-08-23",
    "startTime": "00:52:16", "endTime": "00:52:16",
    "investigator": "담당수사관 이름",
    "responsibleOfficer": "담당피전 이름",
    "crimeType": "stalking",
    "extendCount": 0,
    "guardHomeLoc": "[수정]주거지배치위치",
    "guardWorkLoc": "[수정]직장배치이름",
    "guardEtcLoc1": "[수정]기타배치위치1",
    "guardEtcLoc2": "[수정]기타배치위치2",
    "summary1": "000000", "summary1Date": "string",
    "summary2": "000000", "summary2Date": "string",
    "summary3": "000000", "summary3Date": "string",
    "summary4": "000000", "summary4Date": "string",
    "summary5": "000000", "summary5Date": "string",
    "destoryDocDownloadYn": false,
    "guardUserList": [ { "guardName": "김가드" } ]
  },
  "code": 200
}
```

## 특이사항

- **이 화면의 "경호계획(기본정보) 뷰"에 해당**. 화면4([경찰서] 경호 상세)의
  `GetDeployDetail`과 필드 구성이 유사하나, 여기엔 `summary1~5`/`summary1~5Date`
  (5개 조치 섹션)와 `guardUserList`(기본 근무자)가 추가로 있다.
- **경호계획 등록 여부 판정**: 미등록이면 `startDate`/`endDate`/`guardHomeLoc` 등이 전부
  `null`이고 `guardUserList: []`. 등록되면 채워진다. → 프론트는 `startDate != null`로
  `baseInfo` 존재를 판정(또는 `GetCaseDoc.caseInfoDto != null`, 아래 참고).
- `startDate`/`endDate`가 **경호계획 등록 후엔 date-only**("2026-08-21"),
  `GetGuardCaseList`에선 date-time("...T00:52:16")로 서로 형식이 다르다.
- `startTime`/`endTime` = 배치(근무)시간. `date-span`(HH:MM:SS).
- `investigator`/`responsibleOfficer` = 배치요구서에서 온 담당 경찰관 문자열(수정 불가).
  DTO(`AddGuardCaseInfoDto`)엔 이 필드가 없다 → 표시 전용.
- `guardUserList`는 `{guardName}`만 — guardSeq가 없어 근무자 마스터와 조인 불가.
  근무자 상세(사번/연락처/대표 여부)는 아래 `GetCaseGuardList`에서 `isAssigned`로.
- `summary1~5` = 5개 조치 섹션(안전조치/긴급응급조치/잠정조치/긴급임시조치/임시조치)에
  1:1 대응하는 것으로 보임. 단 프론트는 섹션당 **다중선택 배열 + {시작일,종료일} 기간**,
  백엔드는 **단일 문자열 + 단일 문자열** → 매핑 손실 있음(issues 참고).
- `crimeType`이 caseSeq 29에선 레거시 영문값("stalking") — 화면4에서 이미 exclusions 기록.
- `destoryDocDownloadYn` = 파기확인서 다운로드 여부(오타 필드명 그대로). 종결 가능 판정용.
```
