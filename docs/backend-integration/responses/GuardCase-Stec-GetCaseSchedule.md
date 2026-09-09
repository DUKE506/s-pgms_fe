# GuardCase/Stec/W/GetCaseSchedule

- 테스트 날짜: 2026-09-04
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자). caseSeq 29(경호완료, 스케줄 있음),
  caseSeq 46/47/48(배정, 스케줄 없음 → `data: []`).
- 엔드포인트: `GET /api/v1/GuardCase/Stec/W/GetCaseSchedule?caseSeq=`
- 스웨거 summary: "경호건 근무 스케줄"

## 응답 (실제) — caseSeq 29

HTTP 200

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    {
      "groupName": "2026-08-20",
      "groups": [
        {
          "groupSeq": 258,
          "order": 1,
          "guards": [
            { "scheduleDaySeq": 1254, "guardSeq": 13, "guardName": "김가드",
              "workStartDt": "2026-08-20T09:00:00", "workEndDt": "2026-08-20T13:00:00",
              "isWork": true, "isInPool": true },
            { "scheduleDaySeq": 1255, "guardSeq": 14, "guardName": "이가드",
              "workStartDt": "2026-08-20T09:00:00", "workEndDt": "2026-08-20T13:00:00",
              "isWork": true, "isInPool": false }
          ]
        }
      ]
    },
    {
      "groupName": "2026-08-21",
      "groups": [
        { "groupSeq": 259, "order": 1, "guards": [
          { "scheduleDaySeq": 1256, "guardSeq": 13, "guardName": "김가드",
            "workStartDt": "2026-08-21T09:00:00", "workEndDt": "2026-08-21T13:00:00",
            "isWork": true, "isInPool": true } ] }
      ]
    },
    {
      "groupName": "2026-08-22",
      "groups": [
        { "groupSeq": 260, "order": 1, "guards": [
          { "scheduleDaySeq": 1258, "guardSeq": 13, "guardName": "김가드",
            "workStartDt": "2026-08-22T09:00:00", "workEndDt": "2026-08-22T13:00:00",
            "isWork": true, "isInPool": true } ] }
      ]
    }
  ],
  "code": 200
}
```

## 특이사항

- 구조: `data[] = { groupName: "YYYY-MM-DD"(=일자), groups[] }`,
  `groups[] = { groupSeq, order, guards[] }`,
  `guards[] = { scheduleDaySeq, guardSeq, guardName, workStartDt, workEndDt, isWork, isInPool }`.
  → 프론트 `WorkSchedule.days[].groups[].assignments[]`와 층위가 정확히 대응.
  - `groupName`(일자) → `ScheduleDay.date`
  - `groupSeq` → `ScheduleGroup.id`, `order` → 그룹 순번(프론트엔 없던 개념, 표시/정렬용)
  - `guardName` → 조인 없이 바로 이름. `workStartDt/EndDt` datetime → `startTime/endTime`(HH:MM 추출)
  - `isWork: false` → 프론트 `isOff: true` (부호 반전)
  - `isInPool` = 그 근무자가 기본 근무자(경호풀)인지 — 프론트엔 대응 없음(표시용으로만 쓸지 검토)
- **그룹 메모(특이사항)가 응답에 없다** — 프론트 `ScheduleGroup.note` 대응 필드 없음.
  쓰기 DTO(`PatchScheduleGroupDto`)엔 `memo`가 있는데 읽기에서 안 옴 → 저장은 되나
  재조회 시 표시 불가(exclusions 후보). 화면4 배치장소 `GetDeployDetail` null과 같은 패턴.
- 스케줄 미생성 시 `data: []`. → `data.length > 0`이면 `workSchedule` 존재로 판정.
- caseSeq 29는 배치기간이 08-21~08-23인데 스케줄은 08-20부터 — 데이터가 08-20에도
  생성돼 있음(테스트 데이터 특성, 무시).
```
