# DashBoard/Police/W/GetMonthDashBoardCount

- 테스트 날짜: 2026-09-16
- 사용한 테스트 계정/데이터: `SPoliceM1`(본청)
- 엔드포인트: `GET /api/v1/DashBoard/Police/W/GetMonthDashBoardCount`
- 파라미터: 없음(targetDt 미전달 = 오늘 기준)
- 프로브: `.claude/loop-backend/local/_probe-18.sh`

## 응답 (실제)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    { "date": "2026-09", "counts": [ { "receipt": 1, "assignment": 6, "inprogress": 1, "complete": 2, "total": 10 } ] },
    { "date": "2026-08", "counts": [ { "receipt": 0, "assignment": 1, "inprogress": 0, "complete": 1, "total": 2 } ] },
    { "date": "2026-07", "counts": [ { "receipt": 0, "assignment": 0, "inprogress": 0, "complete": 0, "total": 0 } ] },
    { "date": "2026-06", "counts": [ { "receipt": 0, "assignment": 0, "inprogress": 0, "complete": 0, "total": 0 } ] },
    { "date": "2026-05", "counts": [ { "receipt": 0, "assignment": 0, "inprogress": 0, "complete": 0, "total": 0 } ] },
    { "date": "2026-04", "counts": [ { "receipt": 0, "assignment": 0, "inprogress": 0, "complete": 0, "total": 0 } ] }
  ],
  "code": 200
}
```

## 특이사항

- **`counts`가 객체 하나짜리 배열**이다(`counts: [ {...} ]`) — 스웨거 설명 "counts 에는 그 달
  건수 하나가 들어간다"가 배열 래핑까지 의미하는지 모호했는데, 실측으로 확정. 매핑 시
  `counts[0]`으로 언랩 필요.
- `date`가 `targetDt`(오늘, 2026-09-16)가 속한 달부터 과거 5개월까지 — 설명대로 최신→과거 순.
  차트(`MonthlyTrendChart`)는 과거→최신 순으로 그려야 하므로 프론트에서 reverse 필요.
- 09월 한 달 값이 `GetDashBoardCount`(파라미터 없음, 이번달) 응답과 완전히 동일 — 설명대로
  "한 달 값 = 상태별 건수를 그 달로 조회한 값"이 확인됨.
