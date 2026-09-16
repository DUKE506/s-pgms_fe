# DashBoard/Police/W/GetDashBoardSummaryCount

- 테스트 날짜: 2026-09-16
- 사용한 테스트 계정/데이터: `SPoliceM1`(본청)
- 엔드포인트: `GET /api/v1/DashBoard/Police/W/GetDashBoardSummaryCount`
- 파라미터: 없음
- 프로브: `.claude/loop-backend/local/_probe-18.sh`

## 응답 (실제)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": { "customized": 3, "accommodation": 0, "watch": 2, "cctv": 0 },
  "code": 200
}
```

## 특이사항

- 필드명 `customized`(맞춤형순찰)/`accommodation`(임시숙소)/`watch`(스마트워치)/`cctv`
  스웨거 설명 그대로. 화면 `SAFETY_MEASURES` 더미의 표시 순서(맞춤형순찰→스마트워치→
  임시숙소→CCTV)와 API 키 순서가 다르지만, 키 이름으로 매핑하므로 문제 없음.
