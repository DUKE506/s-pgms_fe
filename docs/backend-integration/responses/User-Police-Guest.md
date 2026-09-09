# User/Police/W/Guest* (게스트 계정 관리 6종)

- 테스트 날짜: 2026-09-08
- 사용한 테스트 계정/데이터: `SPoliceM5`(동래경찰서, groupSeq 32) / 동래 경호중 건 caseSeq 51(경호코드 ST0007).
  `SPoliceM3`(부산경찰청)로 타 경찰서 게스트 스코프 테스트
- 엔드포인트: `GET GetGuestUserList` · `GET GetGuestCaseList` · `GET GetGuestCaseDetail` ·
  `POST AddGuestUser` · `PATCH UpdateGuestCaseInfo` · `POST DeleteGuestUser` (모두 `/api/v1/User/Police/W/`)
- 프로브: `.claude/loop-backend/local/_probe-16.sh`(읽기) · `_probe-16b.sh`(쓰기 왕복)

## GetGuestUserList — `?groupSeq=<int>` **필수**

`groupSeq` 없으면 `400 {"message":"경찰서를 선택해주세요."}`. 피전은 경찰서 선택 UI가
없어 세션 groupSeq(GetMyProfile)를 넘긴다. 지역청 토큰으로 산하 경찰서 groupSeq를 넣어도 200.
`data`는 **평면 배열**(경호목록·이력의 `{meta,data}` 이중 래핑 아님, 페이지네이션 없음).

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    {
      "userSeq": 120,
      "loginId": "SPoliceGuest3",
      "userName": "probe",
      "useYn": true,
      "createDt": "2026-09-08T06:03:39",
      "accessList": [ { "caseSeq": 51, "guardCode": "ST0007" } ]
    }
  ],
  "code": 200
}
```

- `loginId` = 서버 자동 생성(`<경찰서약칭>Guest<N>`). `userName` = AddGuestUser에 보낸 `name`.
- `useYn` — 중지 계정도 함께 옴(false). 우리 설계엔 계정 중지 기능이 없어 프론트에서
  `useYn === false` 행을 숨긴다(exclusions).
- `accessList` = 부여된 조회권만, `{caseSeq, guardCode}`. 없으면 `[]`.

## GetGuestCaseList — 발급 후보 (isAccess 없음)

파라미터 없음. 소속 경찰서의 **경호코드 발급된 · 종결/경호취소 안 된** 건만(서버 필터 →
클라 필터 불필요). `data` 평면 배열.

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    {
      "caseSeq": 51,
      "groupSeq": 32,
      "groupName": "동래경찰서",
      "mgmtNo": "26-09-동래경찰서",
      "guardCode": "ST0007",
      "status": 1,
      "statusName": "경호중"
    }
  ],
  "code": 200
}
```

- `mgmtNo`에 **경호코드 미포함** — 관리번호 = `mgmtNo` + `guardCode`(`formatManagementNumber`로 재조합).

## GetGuestCaseDetail — `?userSeq=<int>` — 수정 후보 (isAccess 붙음)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "userSeq": 121,
    "accessList": [ { "caseSeq": 51, "guardCode": "ST0007", "isAccess": false } ]
  },
  "code": 200
}
```

- `accessList` = 전체 후보(GetGuestCaseList와 같은 집합) + `isAccess`(현재 부여 여부).
  초기 체크 = `isAccess === true`.
- **관리번호 라벨(mgmtNo) 없음** → 프론트가 GetGuestCaseList 결과와 `caseSeq`로 머지해 라벨을 얻는다.
- 타 경찰서 게스트의 userSeq / 없는 userSeq → `403 {"message":"소속 경찰서의 게스트 계정이 아닙니다."}`.

## AddGuestUser — `POST` `{ name(필수, minLength 1), caseSeqs: int[] }`

```json
// 요청
{ "name": "게스트", "caseSeqs": [51] }
// 응답
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

- `name`은 게스트 표시명(`userName`)이 된다. 화면에 표시명 입력이 없고 아이디는 서버가
  자동 생성하므로 **고정값 `"게스트"`**를 보낸다(2026-09-08 사용자 결정).
- **응답이 발급된 아이디(loginId)·userSeq를 돌려주지 않는다** → 발급 후 GetGuestUserList 재조회.
- `caseSeqs` 빈 배열/`null` 허용(조회권 없이 발급).

## UpdateGuestCaseInfo — `PATCH` `{ userSeq, accessList: [{caseSeq, guardCode, isAccess}] }`

```json
// 요청 — caseSeq 51 회수
{ "userSeq": 121, "accessList": [ { "caseSeq": 51, "guardCode": "ST0007", "isAccess": false } ] }
// 응답
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

- `isAccess === true`인 항목이 수정 후 최종 상태. `false`·누락은 회수. 빈 배열이면 전부 회수.
- 프론트는 후보 전체를 명시적 `true`/`false`로 되돌린다.
- 타 경찰서 게스트 → `403`.

## DeleteGuestUser — `POST` `{ userSeq }`

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

- 복구 불가(계정 + 조회권 함께 삭제). 타 경찰서 게스트 → `403`.

## 특이사항 정리

- ⚠️ curl `-d`로 한글 `name`을 보내면 인코딩이 깨져 `AddGuestUser`가 **500**을 낸다
  (`--data-binary @file` UTF-8이면 정상). 프론트 `fetch`는 영향 없음 — 진단 시 오해 주의.
- 실측: `SPoliceM5`로 발급→조회권 수정→삭제 왕복(브라우저 + curl), `SPoliceM3`로 403 확인.
  동래 게스트 목록은 원래 0개였고 테스트 후 0개로 복구.
