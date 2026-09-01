# Login/W/Login

- 테스트 날짜: 2026-09-01
- 사용한 테스트 계정/데이터: `SPoliceM5`(경찰, 동래경찰서) / `StecM1`(본사, 운영관리자)
- 엔드포인트: `POST /api/v1/Login/W/Login`

## 요청

```json
{ "loginId": "SPoliceM5", "loginPw": "SPoliceM5" }
```

## 응답 (실제) — 성공 (경찰)

```json
{
  "message": "로그인에 성공하였습니다.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
    "refreshToken": "aksUWmp7GFN4k13tLJ1RMihVI5/1fMrYuaKII+2rbamdZkUAWOw6ZOmkDDfb7Bu25mXKIwK3QVU0zGuzOhcvNA=="
  },
  "code": 106
}
```

## 응답 (실제) — 성공 (본사)

```json
{
  "message": "로그인에 성공하였습니다.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
    "refreshToken": "aHWWprbyTuC2AIik8gJ74snJlFVmxC+7ISu1arwfOUbLZ/zXwGQjBrgQMKK6uofumA6N27O+F8VGmacqVLYXng=="
  },
  "code": 102
}
```

## 응답 (실제) — 실패 (존재하지 않는 계정)

HTTP 400

```json
{ "message": "아이디 또는 비밀번호가 올바르지 않습니다.", "data": null, "code": 400 }
```

## 응답 (실제) — 최초 로그인(비밀번호 변경 필요) 계정

HTTP 428 Precondition Required

```json
{ "message": "비밀번호 변경이 필요합니다.", "data": null, "code": 428 }
```

토큰이 전혀 발급되지 않는다 — 세션 없이 200으로 신호만 주는 mock 방식과 달리, **HTTP 상태코드
428 자체가 신호**다. 상세 검증 경위는 `Login-ChangePassword.md` 참고.

## accessToken 페이로드 (디코딩)

```json
{
  "userSeq": "111",
  "loginId": "SPoliceM5",
  "uuid": "602a60a038474f3f993587b461aca45e",
  "nbf": 1788242002,
  "exp": 1788243802,
  "iss": "https://pgms.s-tec.co.kr",
  "aud": "https://pgms.s-tec.co.kr"
}
```

## 특이사항

- **경찰/본사 공용 엔드포인트 확인** — id 형식만으로 서버가 내부적으로 구분하는 것으로 보임(응답 구조는 완전히 동일).
- **응답에 role/조직 정보가 전혀 없음** — accessToken 페이로드에도 `userSeq`/`loginId`/`uuid`뿐, 역할(`codeSeq` 등)은 없음. 로그인 성공 직후 `GetMyProfile`을 반드시 호출해야 역할을 알 수 있는 구조로 확정.
- **응답 envelope**: 성공/실패 공통으로 `{ message, data, code }` 형태. `code`는 성공 시에도 102/106처럼 매번 다른 값이 나옴(HTTP 상태코드와 무관) — 의미 불명, 프론트에서는 안 쓰는 걸로 보임(추후 확인 필요, 일단 무시하고 `data` 유무/HTTP status로만 성패 판단).
- `mustChangePassword` 같은 응답 바디 필드는 없음 — 대신 HTTP 428로 신호(위 참고).
- 아이디/비밀번호 오류 시 HTTP 400 + `data: null`. (401이 아님 — 401은 인증된 토큰 자체가 무효할 때만 쓰는 것으로 보임, `Login-Logout.md` 참고)
