# DashBoard/Police/W/GetDashBoardAvgAge

- 테스트 날짜: 2026-09-16
- 사용한 테스트 계정/데이터: `SPoliceM1`(본청)
- 엔드포인트: `GET /api/v1/DashBoard/Police/W/GetDashBoardAvgAge`
- 파라미터: 없음
- 프로브: `.claude/loop-backend/local/_probe-18.sh`

## 응답 (실제)

```json
{ "message": "요청이 정상 처리되었습니다.", "data": { "avgGuardAge": 23.9 }, "code": 200 }
```

## 특이사항

- 필드명 `avgGuardAge`, 설명과 일치. 단일 숫자값, 소수 첫째 자리.
