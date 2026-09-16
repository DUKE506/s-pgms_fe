# DashBoard/Police/W/GetDashBoardTopOrder

- 테스트 날짜: 2026-09-16
- 사용한 테스트 계정/데이터: `SPoliceM1`(본청)·`SPoliceM3`(부산경찰청/지역청)·`SPoliceM5`(동래경찰서)
- 엔드포인트: `GET /api/v1/DashBoard/Police/W/GetDashBoardTopOrder`
- 파라미터: 없음
- 프로브: `.claude/loop-backend/local/_probe-18.sh`

## 응답 (실제) — `SPoliceM1`(본청 → 지방청별)

```json
{ "data": [ { "groupSeq": 24, "groupName": "부산경찰청", "count": 10 }, { "groupSeq": 23, "groupName": "서울경찰청", "count": 0 } ], "code": 200 }
```

## 응답 (실제) — `SPoliceM3`(지역청 → 관할 경찰서별)

```json
{ "data": [ { "groupSeq": 32, "groupName": "동래경찰서", "count": 10 }, { "groupSeq": 33, "groupName": "서면경찰서", "count": 0 } ], "code": 200 }
```

## 응답 (실제) — `SPoliceM5`(경찰서 → 자기 한 줄)

```json
{ "data": [ { "groupSeq": 32, "groupName": "동래경찰서", "count": 10 } ], "code": 200 }
```

## 특이사항

- 설명대로 **순위 단위가 조회 범위 꼭대기로 자동 결정**됨(본청→지방청, 지역청→경찰서, 경찰서→
  자기 한 줄) — 별도 파라미터로 단위를 지정하지 않아도 됨.
- 조직이 5개 이하라 세 응답 다 "그 외 N개 …" 줄이 안 붙음(설명대로 — 조직이 늘어나면 재확인
  필요하나 지금은 관찰 불가).
- 필드는 `groupSeq`/`groupName`/`count` 3개뿐, 단순.
