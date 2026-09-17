# `PATCH /api/v1/User/Stec/W/ResetPassword` 실측

2026-09-17, SPoliceM5(동래경찰서, 피전)가 자기 소속 게스트 SPoliceGuest3
(userSeq 126, 초기화 전 `pwChangedYn:false`)를 대상으로 실제 호출.

## 요청

```json
PATCH /api/v1/User/Stec/W/ResetPassword
{ "userSeq": 126 }
```

## 응답

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

## 부작용 확인(재조회)

호출 직후 `GetPoliceUserList`로 같은 게스트를 다시 조회하니 `pwChangedYn`이
`false → true`로 실제 반영됨 — 다음 로그인이 428로 막혀 `ChangePassword`를
거쳐야 하는 상태가 된다(스웨거 설명과 일치). 비밀번호 자체는 로그인 아이디와
동일하게 바뀌었을 것으로 추정(직접 로그인 재현은 안 함).

**주의**: 이 API는 mutating이다 — 프로브 시 테스트/더미 계정으로만 호출했다
(사용자 확인 후 진행, `guides/PROBE.md` "부작용 있는 호출" 절차).

프로브 스크립트: `local/_probe-accounts.sh`(gitignore).
