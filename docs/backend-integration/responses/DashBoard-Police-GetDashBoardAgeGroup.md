# DashBoard/Police/W/GetDashBoardAgeGroup

- 테스트 날짜: 2026-09-16
- 사용한 테스트 계정/데이터: `SPoliceM1`(본청)
- 엔드포인트: `GET /api/v1/DashBoard/Police/W/GetDashBoardAgeGroup`
- 파라미터: 없음
- 프로브: `.claude/loop-backend/local/_probe-18.sh`

## 응답 (실제)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    { "ageGroup": 10, "count": 2 },
    { "ageGroup": 20, "count": 3 },
    { "ageGroup": 30, "count": 5 },
    { "ageGroup": 40, "count": 0 },
    { "ageGroup": 50, "count": 0 },
    { "ageGroup": 60, "count": 0 }
  ],
  "code": 200
}
```

## 특이사항

- 설명대로 6구간(10/20/30/40/50/60) 고정, 건이 없는 구간도 `count:0`으로 빠짐없이 나옴, 나이순
  정렬. 현재 화면 더미(`AGE_GROUPS`)는 5구간(10대이하~50대이상)이라 6구간으로 UI 확장 필요
  (계획서에서 이미 식별한 항목).
