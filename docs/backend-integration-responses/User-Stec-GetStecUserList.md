# User/Stec/W/GetStecUserList

- 테스트 날짜: 2026-09-03
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자), `232727`(시스템관리자), `StecM2`(본부관리자)
- 엔드포인트: `GET /api/v1/User/Stec/W/GetStecUserList`
- 파라미터: 없음

## 요청

헤더: `Authorization: Bearer {accessToken}`

## 응답 (실제) — 운영관리자 / 시스템관리자 동일

HTTP 200

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    { "userSeq": 49,  "codeSeq": 1, "codeName": "시스템관리자", "groupSeq": null, "groupName": null, "loginId": "232727", "userName": "시스템관리자", "phone": null, "useYn": true,  "pwChangedYn": false },
    { "userSeq": 54,  "codeSeq": 2, "codeName": "운영관리자",   "groupSeq": null, "groupName": null, "loginId": "StecM1", "userName": "HS1운영",   "phone": null, "useYn": true,  "pwChangedYn": false },
    { "userSeq": 104, "codeSeq": 3, "codeName": "본부관리자",   "groupSeq": null, "groupName": null, "loginId": "StecM2", "userName": "HS2본부",   "phone": null, "useYn": true,  "pwChangedYn": false },
    { "userSeq": 113, "codeSeq": 3, "codeName": "본부관리자",   "groupSeq": null, "groupName": null, "loginId": "StecM3", "userName": "test",     "phone": "01022223333", "useYn": false, "pwChangedYn": false },
    { "userSeq": 118, "codeSeq": 3, "codeName": "본부관리자",   "groupSeq": null, "groupName": null, "loginId": "StecM4", "userName": "loop-backend-temp-test", "phone": null, "useYn": false, "pwChangedYn": false }
  ],
  "code": 200
}
```

## 응답 (실제) — 본부관리자(`StecM2`)

**HTTP 403, 본문 없음.**

## 특이사항 (배치요청 목록 화면 — "담당자 선택 목록"으로 사용)

- 이 화면(matrix 3번 "담당자 선택 목록")의 전용 엔드포인트는 없고, `GetStecUserList`를
  **클라이언트에서 `codeName === "본부관리자" && useYn === true`로 필터**해 담당자 후보로 쓴다.
  → 실서버 현재 후보는 `userSeq: 104`(`HS2본부`) 1명뿐(`StecM3`/`StecM4`는 `useYn: false`).
- **`branch`(소속 본부) 필드가 없다** — `groupSeq`/`groupName`이 전부 `null`. 본부명은
  `userName`("HS2본부")에 자유텍스트로 섞여 있을 뿐. `AssignManagerDialog`의
  "· {소속본부}" 표시는 채울 수 없음 → **issues.md #1**(🔴, 본부 소속 구조화 저장 없음)의
  실측 확인. `Manager.branch`는 `undefined`로 두고 표시에서 생략.
- **`assignedCount`(담당 배정 건수)가 없다** — 응답에 없고, 담당자별 건수를 세는 전용 API도
  없음(`GetGuardCaseList`를 담당자별로 필터해 N번 호출하는 방법뿐). `Manager.assignedCount`는
  `undefined`로 두고 "배정 N건" 배지 생략.
- **필드 대응**: `userSeq`(→ `Manager.id`, 배정 시 `AddGuardCaseDto.userSeq`),
  `userName`(→ `Manager.name`), `codeName`(→ 역할 필터), `useYn`(→ 비활성 계정 제외).
- `codeSeq` 1=시스템관리자 / 2=운영관리자 / 3=본부관리자 (`features/auth/lib/roleMapping.ts`와 일치).
- 이 응답은 matrix 11번(관리자 계정 관리, `listManagerAccounts`)에서도 재사용된다
  (2026-09-07 연동). `phone`/`pwChangedYn`/`useYn`도 포함. 필드 대응: `loginId`(→
  `ManagerAccount.id`, 화면 "아이디" 열 + 본인 매칭) / `userSeq`(→ `UpdateUser` 대상
  식별) / `userName`(→ 이름, 배정건수·담당경호 매칭 키) / `codeSeq`(→ `roleFromCodeSeq`) /
  `phone`(빈 문자열은 `undefined` 취급) / `useYn`.
- **본부관리자 토큰은 403** — 이 화면은 실서버에서 운영/시스템관리자 전용. 본부관리자의
  이 화면 스코프(본인 행만? 403?)는 matrix #12에서 재검증.
- 쓰기(정보수정·비번초기화)는 `User/Stec/W/UpdateUser` — `docs/backend-integration-responses/User-Stec-UpdateUser.md`.
