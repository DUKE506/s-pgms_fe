# Login/W/RefreshToken

- 테스트 날짜: 2026-09-01
- 사용한 테스트 계정/데이터: `SPoliceM5` 로그인으로 받은 accessToken+refreshToken 쌍
- 엔드포인트: `POST /api/v1/Login/W/RefreshToken`

## 요청

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....(만료 전 access token)",
  "refreshToken": "aksUWmp7GFN4k13tLJ1RMihVI5/1fMrYuaKII+2rbamdZkUAWOw6ZOmkDDfb7Bu25mXKIwK3QVU0zGuzOhcvNA=="
}
```

## 응답 (실제)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....(새 access token)",
    "refreshToken": "zw6ax1h3YV+IKZD4OJY3PmBfnWvF1kAAXSuNw4RMONoXEbxDGV7rhUmI+Xvb/fy3smkHxwnRrGAhxTjs6vOd5Q=="
  },
  "code": 200
}
```

## 특이사항

- `Login` 응답과 동일한 envelope/필드명(`accessToken`/`refreshToken`) — mock의 `/api/auth/refresh`와 구조가 거의 그대로 대응됨.
- 요청 바디에 **만료 전 accessToken도 함께 보내야 함**(refreshToken 하나만이 아님, 스웨거 스키마와 일치) — 우리 mock은 refreshToken만 보냈는데 실제는 둘 다 필요.
- 새로 발급된 토큰 쌍으로 응답 — 재발급 후 이전 토큰이 즉시 무효화되는지는 이번 테스트로는 미확인(추후 확인 필요, 사소한 항목으로 분류해 진행).
