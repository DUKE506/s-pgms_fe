# DashBoard/Police/W/GetDashBoardCount

- 테스트 날짜: 2026-09-16
- 사용한 테스트 계정/데이터: `SPoliceM1`(본청)·`SPoliceM3`(부산경찰청/지역청)·`SPoliceM5`(동래경찰서)
- 엔드포인트: `GET /api/v1/DashBoard/Police/W/GetDashBoardCount`
- 파라미터: 없음(fromDate/toDate/groupSeq 전부 미전달 — #18 결정: 기간 파라미터 제외하고 연결)
- 프로브: `.claude/loop-backend/local/_probe-18.sh`

## 응답 (실제) — 3계정 전부 동일

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "receipt": 1,
    "assignment": 6,
    "inprogress": 1,
    "complete": 2,
    "total": 10
  },
  "code": 200
}
```

`groupSeq=32`(동래) 명시 지정해도 동일한 값(M1 계정으로 확인).

## 특이사항

- 필드명: `receipt`(접수)·`assignment`(배정)·`inprogress`(경호중)·`complete`(경호완료)·`total`.
- **3계정이 전부 같은 값** — 스코프 버그가 아니라 **현재 실백엔드 데이터가 전부 동래경찰서
  (groupSeq 32)에 몰려있어서** 생기는 우연의 일치. `GetDashBoardGroupCount`(아래 파일)에서
  서울경찰청·강남경찰서 등 다른 조직은 전부 `totalCount:0`으로 나오는 걸로 스코프 자체는
  정상 확인됨. groupSeq 파라미터를 아예 안 보내도 200(소속 이하 전체로 동작).
