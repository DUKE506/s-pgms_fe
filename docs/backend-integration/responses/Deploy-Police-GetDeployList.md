# Deploy/Police/W/GetDeployList

- 테스트 날짜: 2026-09-01
- 사용한 테스트 계정/데이터: `SPoliceM5`(경찰, 동래경찰서 · 피전, `groupSeq=32`)
- 엔드포인트: `GET /api/v1/Deploy/Police/W/GetDeployList`
- 파라미터: `groupSeq`(int, **필수**), `keyword`(string, 선택)

## 요청

헤더: `Authorization: Bearer {accessToken}`

쿼리: `?groupSeq=32` (+ 선택 `&keyword=26-08`)

## 응답 (실제) — 정상 (동래경찰서, `groupSeq=32`)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    {
      "deploySeq": 71,
      "caseSeq": null,
      "mgmtNo": "26-08-동래경찰서 접수",
      "suspectUserName": "피****",
      "statusName": "접수",
      "startDt": "2026-08-19",
      "endDt": "2026-08-23",
      "extendCount": 0,
      "remainDays": 0
    }
  ],
  "code": 200
}
```

## 응답 (실제) — `groupSeq` 누락

HTTP 400

```json
{ "message": "조회할 경찰서를 선택해주세요.", "data": null, "code": 400 }
```

## 응답 (실제) — 권한 없는 `groupSeq` (동래 토큰으로 22/24/1/30/31/33/40 요청)

HTTP 403

```json
{ "message": "조회 권한이 없는 경찰서입니다.", "data": null, "code": 403 }
```

## 응답 (실제) — `keyword` 필터

- `keyword=26-08` → `mgmtNo`에 매칭돼 1건 반환
- `keyword=피` (대상자 마스킹명) → `data: []` (0건)
- `keyword=zzz` → `data: []` (0건)

`keyword`는 **관리번호(`mgmtNo`)에만** 매칭된다(대상자명으로는 안 걸림). 현재 화면의
클라이언트 사이드 검색("관리번호 검색")과 동일한 동작.

## 특이사항

- **`groupSeq`가 필수** — 토큰의 소속 경찰서로 자동 추론하지 않고, 명시적으로 받아야
  200. 없으면 400. `GetMyProfile.data.groupSeq`(로그인 시점에 이미 받는 값)를 그대로
  넘기면 된다. 서버가 토큰 소속과 대조해 권한 밖 `groupSeq`는 403으로 막으므로(위
  참고) 스코프는 서버가 강제한다 — `analysis.md` 4-6 / `issues.md` 스코프 우려는
  **서버 강제 확인으로 해소**.
- **페이지네이션 없음** — `data`가 그냥 배열. `status` 파라미터도 없음.
- **`statusName`이 한글 문자열** — 정수 코드가 아니라 표시용 문자열이 그대로 내려옴
  (여기선 "접수"). 배정 이후 상태(배정/경호중/경호완료/종결/취소) 문자열이 화면의
  `SecurityCaseStatus` 라벨과 정확히 일치하는지는 **아직 배정된 데이터가 없어 미확인**
  — matrix "16번 이후 재확인" 시점에 검증.
- **`mgmtNo`가 서버에서 이미 조합된 완성 문자열** — 접수 단계에선 경호코드 자리에
  "접수"라는 단어를 붙여 `"26-08-동래경찰서 접수"` 형태. 프론트 `formatManagementNumber`
  (접수번호 · 경호코드)와 조합 방식이 다르므로, 프론트에서 재조합하지 말고 `mgmtNo`를
  그대로 표시한다. 배정 후 형태(`· ST###` 여부 등)는 미확인.
- **필드 대응**: `deploySeq`(→ 상세 이동용 id, `GetDeployDetail`의 `deployReqSeq`),
  `caseSeq`(경호건 seq, 배정 후 채워짐 — GuardCase 계열 API용), `suspectUserName`(→
  대상자), `startDt`/`endDt`(→ 경호시작/종료), `extendCount`(미사용).
  **`remainDays`는 2026-09-11부터 사용** — 서버가 "오늘~endDt" 기준으로 계산해
  음수 없이 0으로 클램프해 내려준다(상태 무관 모든 행에 포함, 실측: 이미 끝난
  경호완료 건도 0). 경호중 상태이면서 `remainDays ≤ 2`인 행을 화면에서 빨간 배경
  하이라이트 + 관리번호 옆 빨간 테두리 "D-{n}" 배지로 표시(`SecurityCaseListPage.tsx::
  isUrgent`, 사용자 피드백으로 배지 위치를 경호종료일 옆→관리번호 옆으로 이동). 접수/배정/
  경호완료는 하이라이트 대상에서 제외(사용자 결정 — 아직 시작 전이거나 이미 끝난
  배치라 "임박" 자체가 의미 없음).
- 응답 항목에 `jurisdiction`/`policeStation` 없음 — 화면 상단 "관할 / 이름" 표기는
  `GetMyProfile`의 `groupName`으로 대체.

## #17 관찰 — 게스트 토큰 (2026-09-08)

- 테스트 계정: `SPoliceGuest3`(동래, `codeName:"게스트"`, `codeSeq 7`, `groupSeq 32`).
- **`GetDeployList`는 게스트 토큰에서 `?groupSeq=` 파라미터를 무시하고 `GUEST_CASE_ACCESS`
  스코프만 적용한다** — `groupSeq`를 32(본인)·22(본청)·999(무효)·1로 바꿔 호출해도
  전부 동일하게 **조회권이 부여된 건만**(deploySeq 90 / caseSeq 51, 1건) 반환. 403 아님.
  → 프론트 `listSecurityCases`가 세션 `groupSeq`를 붙여 보내도 무해(서버가 무시).
- `GetDeployDetail?deployReqSeq=90`(조회권 있는 건) → **200**, 피전과 동일 shape
  (`startDate/endDate/startTime/endTime`, `summary1~5`, `guardHomeLoc`/`guardWorkLoc`,
  `guardUserList`, `crimeType` 등).
- 게스트 토큰 403 확인: `Deploy/Police/W/CancelGuardCase`, `GuardCase/Stec/W/GetGuardCaseList`,
  `User/Police/W/GetGuestUserList`(피전 전용).
- **미확인(이월)**: 동래에 게스트가 조회권 없는 *진행중* 건이 없어서(활성 1건뿐, 그건
  게스트가 봄) "조회권 없는 건 상세 → 403/404" 양성 테스트를 못 함. `GetDeployList`의
  groupSeq 무시 동작으로 보아 `GetDeployDetail`도 스코프를 걸 것으로 추정되나 미검증
  → 동래에 활성 건 추가되면 재검증(그룹 D 요청서 논의 항목).
