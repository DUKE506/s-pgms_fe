# DashBoard/Police/W/GetDashBoardGenderCount

- 테스트 날짜: 2026-09-16
- 사용한 테스트 계정/데이터: `SPoliceM1`(본청)
- 엔드포인트: `GET /api/v1/DashBoard/Police/W/GetDashBoardGenderCount`
- 파라미터: 없음
- 프로브: `.claude/loop-backend/local/_probe-18.sh`

## 응답 (실제)

```json
{ "message": "요청이 정상 처리되었습니다.", "data": { "maleCount": 8, "feMaleCount": 2 }, "code": 200 }
```

## 특이사항

- **여성 필드명이 `feMaleCount`** — `femaleCount`가 아니라 `feMaleCount`(대문자 M, 오타로
  보이는 캐멀케이스)다. 구현 시 정확히 이 스펠링으로 매핑해야 함.
- `maleCount + feMaleCount = 10 = GetDashBoardCount.total`(설명과 일치).
