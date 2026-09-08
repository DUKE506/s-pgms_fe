# History/Stec/W/GetHistoryList

- 테스트 날짜: 2026-09-08
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자), `StecM2`(본부관리자) / 동래경찰서 경호취소 건 caseSeq 46~50
- 엔드포인트: `GET /api/v1/History/Stec/W/GetHistoryList`
- 프로브: `.claude/loop-backend/_probe-13.sh`, `_probe-13b.sh`

## 파라미터 (스웨거)

`pageNumber`(기본 1) · `pageSize`(기본 10) · `status`(int) · `startDate`(date) · `endDate`(date) ·
`groupSeq`(int) · `searchKey`(string) · `endReason`(string)

## 응답 (실제) — 파라미터 없음, `StecM1`

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "meta": { "pageNumber": 1, "pageSize": 10, "totalCount": 5, "totalPages": 1 },
    "data": [
      {
        "caseSeq": 50,
        "mgmtNo": "26-09-동래경찰서 ST0006",
        "groupName": "동래경찰서",
        "parentGroupName": "부산경찰청",
        "startDt": null,
        "endDt": null,
        "totalMin": null,
        "statusName": "경호취소",
        "remark": "취소 테스트"
      },
      {
        "caseSeq": 48,
        "mgmtNo": "26-09-동래경찰서 ST0004",
        "groupName": "동래경찰서",
        "parentGroupName": "부산경찰청",
        "startDt": "2026-09-12",
        "endDt": "2026-09-18",
        "totalMin": null,
        "statusName": "경호취소",
        "remark": "취소 테스트"
      }
    ]
  },
  "code": 200
}
```

## 관찰

- **이중 래핑** `{ message, data: { meta, data: [...] }, code }` — `GetGuardCaseList`(8번)와 동일.
  `unwrapEnvelope` + `.data.data` + `meta.totalPages` 순회 재사용 가능. `pageSize` 상한은 미측정
  (100까지는 `pageSize=100`으로 통과 확인).
- 행 필드가 매우 축소돼 있음: `caseSeq, mgmtNo(완성형), groupName, parentGroupName, startDt, endDt, totalMin, statusName, remark`.
  - `mgmtNo` 완성형 → `splitMgmtNo`로 접수번호/경호코드 분리.
  - `parentGroupName` → 지역청, `groupName` → 경찰서.
  - `startDt` / `endDt`: 배정 후 취소된 건만 값 있음(46·48), 배정 전 취소는 `null`(47·49·50). `T` 없는 `YYYY-MM-DD`.
  - `totalMin`: 취소 건은 전부 `null` → 화면 "총경호시간"은 종결 건만 실값. 현행 `computeCaseHistorySummary(workSchedule)` 계산을 이 필드 직접 사용으로 교체.
  - `statusName`: **`"경호취소"`** (프론트 `SecurityCaseStatus` 타입은 `'취소'`) → 매핑 필요. 종결 건은 미측정(현재 종결 데이터 0건) — `"종결"` 그대로일 것으로 추정.
  - `remark`: 취소면 취소 사유(CANCEL_REASON), 종결이면 종결 코드(END_REASON). 상세에서 사용.
- **`status` 파라미터**: `status=4` → 취소 5건 전부, `status=3/5/6/7` → 0건. 종결 데이터가 없어
  종결 코드값은 미확정. → 목록량이 작아 **클라이언트 필터 유지**로 회피(현행 유지).
- **`searchKey=26-09`** → 5건 중 2건(46·48)만 반환. 5건 모두 `mgmtNo`가 `26-09…`인데 2건만 나옴
  → `searchKey`가 관리번호 부분일치가 아닌 다른 매칭(취소사유 등)으로 동작하는 듯. **클라이언트 검색 유지가 안전.**
- **`startDate=2026-01-01&endDate=2026-12-31`** → `startDt` 값이 있는 46·48만. `startDt` 기준 필터,
  `null`이면 제외. 현행 화면 클라 필터(`c.startDate < dateFrom`)와 동작 동일.
- **본부관리자 스코프(HIST-003)**: `StecM2`(본부관리자) → HTTP 200 + **5건 전부** 반환.
  caseSeq 46은 `StecM1`(운영) 배정 건인데 `StecM2`가 이력에서 봄 → **이력엔 "본인 배정 건만"
  스코프가 실제로 안 걸리는 것으로 보임**(단, 전 건이 동래라 단정 불가). `StecM3`(0건 본부관리자)
  로그인 pw 미상이라 대조 미완 → #12 꼬리 이슈.
- 피전(`SPoliceM5`)으로 `History/Police/W/GetHistoryList`(파라미터 없음) → totalCount 0.
  `groupSeq` 필요 추정(#14 소관).

## 상세 조회 — 본사용 엔드포인트 없음 (결정 B)

| 호출 | 결과 |
|---|---|
| `GET History/Stec/W/GetHistoryDetail?caseSeq=46` (StecM1) | **HTTP 404** (경로 없음) |
| `GET History/Police/W/GetHistoryDetail?caseSeq=46` (StecM1, 본사 토큰) | **HTTP 403** |
| `GET History/Police/W/GetHistoryDetail?caseSeq=46` (SPoliceM5, 피전 토큰) | **HTTP 200** (정상) |

→ 본사(Stec) 이력 상세를 조회할 EP가 없다. `/admin/history/:id` 연동은 **보류**(issues 신규).

### 참고 — `History/Police/W/GetHistoryDetail` 응답 (피전 토큰, caseSeq 46)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "caseSeq": 46,
    "mgmtNo": "26-09-동래경찰서 ST0002",
    "statusName": "경호취소",
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

- 취소 건인데도 `guards` 투입실적·배치장소가 채워져 있음(화면의 "취소 건은 baseInfo/workSchedule
  없음" 가정과 다름). 이건 피전 EP라 #14에서 다룸.

## 참고 — 상태 전이는 시간 기준 자동

`GetGuardCaseList`(2026-09-08 기준):

| caseSeq | statusName | startDate | endDate |
|---|---|---|---|
| 51 | 경호중 | 2026-09-07 09:00 | 2026-09-14 18:00 |
| 29 | 경호완료 | 2026-08-21 | 2026-08-23 |

→ `startDate` 도래 시 배정→경호중, `endDate` 경과 시 경호중→경호완료가 자동 전환됨.
종결(`CloseGuardCase`)만 피전이 수동으로, 경호완료 상태에서만 가능.
