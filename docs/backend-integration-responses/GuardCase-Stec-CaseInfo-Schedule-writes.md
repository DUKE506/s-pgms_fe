# GuardCase/Stec/W — 경호계획/스케줄 쓰기 4종 (+DeleteScheduleGroup)

- 테스트 날짜: 2026-09-04
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자). caseSeq 46(동래 ST0002, 배정) —
  이 테스트로 경호계획 + 스케줄이 실제로 등록됨(화면4·2 재검증용 데이터).
- 엔드포인트:
  - `PUT  /api/v1/GuardCase/Stec/W/AddGuardCaseInfo` — 경호계획 등록
  - `PATCH /api/v1/GuardCase/Stec/W/PatchCaseInfo` — 경호계획 부분수정
  - `POST /api/v1/GuardCase/Stec/W/AutoAddSchedule` — 스케줄 자동생성
  - `PUT  /api/v1/GuardCase/Stec/W/PatchScheduleGroup` — 근무조 저장(추가/수정)
  - `DELETE /api/v1/GuardCase/Stec/W/DeleteScheduleGroup?groupSeq=&caseSeq=` — 근무조 삭제

성공 응답은 전부 `{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }`.

## AddGuardCaseInfo (PUT)

요청 바디:

```json
{
  "caseSeq": 46,
  "suspectUserName": "홍**",
  "guardHomeLoc": "...", "guardWorkLoc": "...", "guardEtcLoc1": "...", "guardEtcLoc2": "",
  "summary1": "맞춤형 순찰, CCTV", "summary1Date": "2026-09-10 ~ 2026-09-20",
  "summary2": "", "summary2Date": "",
  "summary3": "1호", "summary3Date": "2026-09-10 ~ 2026-09-20",
  "summary4": "", "summary4Date": "",
  "summary5": "", "summary5Date": "",
  "startDt": "2026-09-10T09:00:00",
  "endDt": "2026-09-20T18:00:00",
  "guards": [ { "guardSeq": 13, "isRepresentative": true }, { "guardSeq": 14, "isRepresentative": false } ]
}
```

- 등록 후 `GetGuardCaseDetail`: `startDate`/`endDate`(date-only) + `startTime`/`endTime`
  (`startDt`/`endDt`의 시각부) 채워짐. `guardHomeLoc` 등·`summary1~5`/`summary1~5Date`는
  **보낸 그대로 왕복**(`"맞춤형 순찰, CCTV"` / `"2026-09-10 ~ 2026-09-20"` 정확히 복원).
  `guardEtcLoc2: ""` → 재조회 시 `null`로 정규화.
- `guardUserList`엔 **`isRepresentative: true`인 근무자만** (이름). `GetCaseGuardList`엔
  guardSeq 13·14 **둘 다 `isAssigned: true`**.
- **⚠️ 스케줄 생성 후 재호출** → HTTP **409**:
  `{ "message": "이미 스케줄이 만들어진 경호건입니다. 내용은 경호계획 수정, 기간은 연장·단축을 이용해주세요.", "data": false, "code": 409 }`
  → 등록은 `AddGuardCaseInfo`, 이후 수정은 `PatchCaseInfo`.
- **⚠️ 배치기간 소스 문제**: 배정·경호계획 미등록 상태에서 `startDt`/`endDt`(required)를
  채울 배치기간을 본사 조회로 얻을 수 없다 → `blockers.md`, issues #10. 위 테스트는
  기간을 직접 넣어 등록(캐치-22 우회).

## PatchCaseInfo (PATCH)

`AddGuardCaseInfo`와 동일 바디에서 **`startDt`/`endDt` 제외**(기간 잠금 — 연장·단축으로만
변경). `guards`도 함께 받는다. 성공 200. 브라우저 왕복 검증(경호계획 수정 → 요약카드 반영).

## AutoAddSchedule (POST)

```json
{ "caseSeq": 46, "startDate": "2026-09-10", "endDate": "2026-09-12",
  "startTime": "09:00:00", "endTime": "18:00:00" }
```

- `startTime`/`endTime` = `date-span` `"HH:MM:SS"`.
- **전달한 `startDate`~`endDate` 범위**대로 일자별 그룹 1 생성(경호계획 기간이 아니라
  이 파라미터 기준 — 프론트는 `securityCase.startDate/endDate`를 넘김).
- 각 일자 그룹 1에 **대표(`isRepresentative`) 근무자만** `startTime`~`endTime`로 배정
  (matrix 최초 "대표만 자동 반영" 우려 — 실측으로 확인, mock도 그렇게 재구현).

## PatchScheduleGroup (PUT)

```json
{ "groupSeq": 297, "caseSeq": 46, "workDate": "2026-09-10", "order": 1, "memo": "메모",
  "guards": [ { "guardSeq": 13, "workStart": "2026-09-10T10:00:00", "workEnd": "2026-09-10T14:00:00", "isWork": true } ] }
```

- `groupSeq` **있으면 수정**(기존 그룹 교체), **없으면 추가**.
- `order`: **1 이상**(0/생략 → 400 `"조 순번은 1 이상이어야 합니다."`), **같은 일자 내
  유일**(기존 순번 재사용 → 409). 기존 그룹이 order 1·2면 새 그룹은 order 3으로.
- 같은 일자에 **같은 근무자를 겹치는 시각**으로 넣으면 409
  (`"같은 날짜에 이미 있는 조 순번이거나, 같은 시각에 이미 잡혀 있는 경호원이 있습니다."`).
- **경호풀(배정 근무자) 밖 guardSeq** → 400 `"경호풀에 없는 경호원이 포함되어 있습니다."`.
- `memo` 저장은 되나 `GetCaseSchedule` 응답에 그룹 메모가 없어 재조회 시 표시 불가
  (issues #12).
- `GetCaseSchedule` 재조회 시 `scheduleDaySeq`가 매번 바뀜(행 재생성 방식).

## DeleteScheduleGroup (DELETE)

`?groupSeq=<n>&caseSeq=<n>` 쿼리, 바디 없음. 성공 200. 프론트엔 삭제 UI가 없음(후속).
