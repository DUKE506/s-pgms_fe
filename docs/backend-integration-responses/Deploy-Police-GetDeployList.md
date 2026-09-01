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
  대상자), `startDt`/`endDt`(→ 경호시작/종료), `extendCount`/`remainDays`(현재 화면
  미사용).
- 응답 항목에 `jurisdiction`/`policeStation` 없음 — 화면 상단 "관할 / 이름" 표기는
  `GetMyProfile`의 `groupName`으로 대체.
