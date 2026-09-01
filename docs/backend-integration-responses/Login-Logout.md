# Login/W/Logout

- 테스트 날짜: 2026-09-01
- 사용한 테스트 계정/데이터: `SPoliceM5` (RefreshToken 테스트로 재발급받은 새 accessToken)
- 엔드포인트: `POST /api/v1/Login/W/Logout`

## 요청

헤더만 있음: `Authorization: Bearer {accessToken}` (바디 없음)

## 응답 (실제)

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

## 특이사항

- **로그아웃한 토큰은 서버에서 즉시 무효화됨(실제 세션 종료)** — 로그아웃 직후 같은 accessToken으로 `GetMyProfile` 호출 시 401:
  ```json
  { "success": false, "errorCode": "session_expired", "message": "Session has been terminated." }
  ```
- **이 401 응답의 envelope이 다른 모든 응답과 완전히 다름** — 정상/비즈니스 에러는 `{ message, data, code }`인데, 인증 미들웨어 레벨의 401은 `{ success, errorCode, message }` (필드명부터 다름, `code` 없이 `errorCode` 문자열). `apiFetch`의 401 처리(리프레시 트리거)는 body를 파싱하지 않고 HTTP status만 보고 분기해야 안전함 — 이번 발견의 실질적 영향은 여기까지, 바디 파싱 로직에서 이 shape을 참조하지 않도록 주의.
- mock은 로컬 상태만 지우고 서버 호출이 없었는데, 실제로는 서버 측 세션 종료가 있으므로 로그아웃 시 이 API를 호출하지 않으면 서버 세션이 access token 만료 시각까지 계속 유효하게 남음 — 로그아웃 연동은 사소하지 않은 신규 기능으로 취급.
