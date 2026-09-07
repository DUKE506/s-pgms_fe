# User/Stec/W/UpdateUser

- 테스트 날짜: 2026-09-07
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자) 토큰. 대상 = `StecM1`(userSeq 54, 본인
  정보수정) / `StecM4`(userSeq 118, `loop-backend-temp-test`, `useYn:false` — 폐기용
  계정에만 비밀번호 초기화)
- 엔드포인트: `PATCH /api/v1/User/Stec/W/UpdateUser`
- 파라미터: 없음(전부 body)

## 요청 — 정보수정 (matrix 11번 `updateManagerAccountInfo`)

헤더: `Authorization: Bearer {accessToken}`, `Content-Type: application/json`

```json
{ "userSeq": 54, "name": "HS1운영", "phone": "010-7777-8888" }
```

## 요청 — 비밀번호 초기화 (matrix 11번 `resetManagerAccountPassword`)

```json
{ "userSeq": 118, "loginPw": "StecM4", "pwChangedYn": true }
```

- 초기화 = 비밀번호를 아이디와 동일하게(`loginPw = loginId`) + `pwChangedYn:true`로 두어
  다음 로그인에서 강제 변경(428) 유도. 게스트 발급·최초 로그인 흐름과 같은 규칙.

## 응답 (실제)

HTTP 200

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

- 반환은 `data:true`뿐 — 갱신된 레코드를 안 준다. 프론트는 `['manager-accounts']`
  쿼리를 invalidate해 `GetStecUserList`로 재조회한다.

## DTO (`StecUpdateUserDto`)

`userSeq`만 required. `name` / `phone` / `loginPw` / `pwChangedYn` / `useYn` 전부
optional·nullable — **넘긴 필드만 부분 갱신**한다.

## 특이사항

- **`null` 필드는 "변경 안 함"으로 무시된다** — 실측: `{userSeq:54, name:"HS1운영",
  phone:null}`로는 기존 `phone`이 안 지워졌다(그대로 유지). 값을 비우려면 빈 문자열
  `""`을 보내야 한다(`{...,"phone":""}` → 재조회 시 `phone:null`로 확인). 프론트
  `updateManagerAccountInfo`는 빈 연락처를 `""`로 전송한다(`exclusions.md`).
- 정보수정 왕복 실측: `StecM1.phone` 없음 → `"010-7777-8888"` 설정 →
  `GetStecUserList`에서 확인 → `""`로 재전송 → `phone:null`로 원복 확인.
- 비밀번호 초기화 실측: `StecM4`(userSeq 118) → 200 + `GetStecUserList`에서
  `pwChangedYn:false → true` 전환 확인. `StecM4`는 `loop-backend-temp-test` 폐기용
  계정이라 초기화 상태로 남겨둠(비밀번호 = 아이디 = 관례값).
- **본부관리자 계정의 "소속 본부"는 이 DTO로 설정할 수 없다** — `groupSeq`/본부 FK
  필드 자체가 없음(issues.md #1).
- 계정 정지/재활성화(`useYn`)도 이 EP로 가능하나(스키마상), 대응 UI가 아직 없어 이번
  연동 범위 밖(roadmap 백로그).
