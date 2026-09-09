# GuardCase/Stec/W/GetCaseMeeting · SaveCaseMeeting

- 테스트 날짜: 2026-09-04
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자). caseSeq 46(동래 ST0002, 경호계획 등록됨).
- 엔드포인트:
  - `GET /api/v1/GuardCase/Stec/W/GetCaseMeeting?caseSeq=` — 경호건 사전미팅 조회
  - `PUT /api/v1/GuardCase/Stec/W/SaveCaseMeeting` — 사전미팅 저장/수정/삭제

## GetCaseMeeting

미팅 없으면 `data: null`. 있으면:

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "meetingSeq": 9,
    "meetingDate": "2026-09-10",
    "meetingStartDt": "2026-09-10T09:00:00",
    "meetingEndDt": "2026-09-10T11:00:00",
    "guardInfo": [
      { "guardSeq": 13, "guardName": "김가드" },
      { "guardSeq": 14, "guardName": "이가드" }
    ]
  },
  "code": 200
}
```

- 읽기 필드명: `meetingDate`(date) / `meetingStartDt`·`meetingEndDt`(datetime) /
  `guardInfo[]`(`{guardSeq, guardName}`). **근무자별 개별 시간이 없다** — 미팅 전체가
  한 구간이고 참석 근무자는 목록만.

## SaveCaseMeeting (PUT)

요청 DTO: `{ caseSeq, hasMeeting(bool), meetingStart(datetime), meetingEnd(datetime),
guardSeqs: int[] }`. 성공 `{message, data:true, code:200}`.

- **저장/수정**: `hasMeeting:true` + 시각 + `guardSeqs`. 재호출 시 `meetingSeq` 유지(9)
  하며 값만 갱신(실측: 근무자 2명·09:00~11:00 → 1명·10:00~12:00로 수정됨).
- **삭제**: `hasMeeting:false` (`meetingStart`/`meetingEnd`=null, `guardSeqs`=[]) →
  이후 `GetCaseMeeting`이 `data:null`.

## 프론트 매핑

- **읽기** `GetCaseMeeting` → `WorkSchedule.preMeeting`:
  `null` → `null`, else `{ date: meetingDate, assignments: guardInfo.map(g =>
  ({ workerId: String(g.guardSeq), startTime: hhmm(meetingStartDt),
  endTime: hhmm(meetingEndDt) })) }` — 전원 같은 시각.
- **쓰기** `setPreMeeting(id, preMeeting)` → `SaveCaseMeeting`:
  `null` → `{caseSeq, hasMeeting:false, meetingStart:null, meetingEnd:null, guardSeqs:[]}`.
  아니면 `{caseSeq, hasMeeting:true, meetingStart: `${date}T${min(시작)}:00`,
  meetingEnd: `${date}T${max(종료)}:00`, guardSeqs: assignments.map(a => Number(workerId))}`.
- **손실**: `PreMeetingDialog`는 근무자별 시작/종료를 따로 받는데 백엔드엔 미팅 전체
  1구간뿐 → 저장 시 가장 이른 시작 ~ 가장 늦은 종료로 합침. 재조회 시 전원이 같은
  구간으로 보임(issues #11, `exclusions.md`). 사용자 결정(2026-09-04): 조치 섹션과
  동일하게 폼은 그대로 두고 손실 매핑.
