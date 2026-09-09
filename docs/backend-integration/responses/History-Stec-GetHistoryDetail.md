# History/Stec/W/GetHistoryDetail  (2026-09-09 신설)

- 테스트 날짜: 2026-09-09
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자), `StecM2`(본부관리자·동래 담당),
  `StecM3`(본부관리자·배정 0건) / caseSeq 46(취소)·51(경호중)·29(경호완료)
- 엔드포인트: `GET /api/v1/History/Stec/W/GetHistoryDetail?caseSeq=`
- 프로브: `.claude/loop-backend/local/_probe-C-reply.sh`

## 응답 (실제) — `caseSeq=46`(취소), `StecM1`

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "caseSeq": 46,
    "mgmtNo": "26-09-동래경찰서 ST0002",
    "statusName": "경호취소",
    "groupName": "동래경찰서",
    "parentGroupName": "부산경찰청",
    "suspectUserName": "홍**",
    "startDate": "2026-09-10T09:00:00",
    "endDate": "2026-09-30T18:00:00",
    "totalGuardWorkMinutes": null,
    "investigator": null,
    "responsibleOfficer": null,
    "guardWorkLoc": "부산 동래구 온천동 200",
    "guardHomeLoc": "부산 동래구 낙민동 100 (수정됨)",
    "endDt": "2026-09-07T05:08:03",
    "remark": "ㅍ",
    "guards": [
      { "guardSeq": 13, "guardName": "김가드", "workDays": 13, "totalMinutes": 6720 },
      { "guardSeq": 15, "guardName": "박가드", "workDays": 1, "totalMinutes": 540 },
      { "guardSeq": 14, "guardName": "이가드", "workDays": 1, "totalMinutes": 540 },
      { "guardSeq": 16, "guardName": "최가드", "workDays": 1, "totalMinutes": 490 }
    ]
  },
  "code": 200
}
```

## 관찰

- **경찰용(`History/Police/W/GetHistoryDetail`)과 동일 shape + `groupName`·`parentGroupName`
  2필드 추가**. 매퍼는 경찰 쪽 `detailRowToSecurityCase`를 공유하고, 두 필드는 optional로
  두어 경찰용은 빈 문자열로 떨어진다(`police/api/history.ts`).
- `data`는 객체 하나(이중 래핑 아님) — `unwrapEnvelope`만.
- **상태를 가리지 않는다**: `caseSeq=51`(경호중)·`29`(경호완료)도 200. 진행중 건은
  `totalGuardWorkMinutes`·`endDt`·`remark` = null, `guards`는 지금까지 편성된 만큼만.
  (스웨거 설명대로. 단 화면은 종결·취소 건만 이 EP로 온다 — 진행중은 `/security-cases/:id`)
- **스코프(HIST-003)**: `StecM3`(배정 0건 본부관리자) → `caseSeq=46` = **HTTP 404**
  ("존재하지 않는 경호건입니다" — 범위 밖 = 없는 건과 동일). `StecM2`(동래 담당) →
  자기 배정건(46·29) 200. 없는 caseSeq → 404.
- `guardWorkLoc`/`guardHomeLoc`(배치장소 2필드)는 경찰용과 동일하게 응답에 들어오나
  화면 미표시(2026-08-27 결정, 피해자 개인정보). 스웨거 회신: 종결 시 서버가 이 값을
  NULL로 비운다(`CloseGuardCase` 설명) → 종결 건에선 어차피 빈 값.

## 진행중 건 예시 — `caseSeq=51`(경호중), `StecM1`

```json
{
  "caseSeq": 51, "mgmtNo": "26-09-동래경찰서 ST0007", "statusName": "경호중",
  "groupName": "동래경찰서", "parentGroupName": "부산경찰청",
  "suspectUserName": "이**",
  "startDate": "2026-09-07T09:00:00", "endDate": "2026-09-14T18:00:00",
  "totalGuardWorkMinutes": null, "endDt": null, "remark": null,
  "investigator": "수사관 정보", "responsibleOfficer": "피전 정보",
  "guardWorkLoc": "직장지 주소", "guardHomeLoc": "주거지 주소",
  "guards": [
    { "guardSeq": 13, "guardName": "김가드", "workDays": 8, "totalMinutes": 4320 },
    { "guardSeq": 14, "guardName": "이가드", "workDays": 8, "totalMinutes": 4320 }
  ]
}
```

## 이월 (데이터 대기)

- **종결 건(status=3) 실서버 0개** — `totalGuardWorkMinutes` 실값·종결코드(`remark`)
  매핑 미검. 정상 종결 건 생성 후 재확인(CARRYOVER B).
