# Login/W/ChangePassword

- 테스트 날짜: 2026-09-01
- 사용한 테스트 계정/데이터: 검증 목적으로 임시 생성한 본부관리자 계정 `StecM4`(`User/Stec/W/AddStecUser`,
  codeSeq=3, initial password=`StecM4`) — 검증 완료 후 `UpdateUser`의 `useYn=false`로 비활성화 처리함
  (완전 삭제 API가 없어 계정 자체는 비활성 상태로 남음, 사용자 승인 하에 진행)
- 엔드포인트: `POST /api/v1/Login/W/ChangePassword`

## 요청

```json
{ "loginId": "StecM4", "loginPw": "StecM4" }
```

(주: 여기서 `loginPw`는 **새 비밀번호**다 — 테스트 편의상 기존 초기 비밀번호와 같은 값을 새 비밀번호로
지정했을 뿐, 우연히 같은 값이라 변경 여부 확인은 `pwChangedYn`/재로그인 성공 여부로 별도 검증함, 아래 참고)

## 응답 (실제) — 성공

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

## 응답 (실제) — pwChangedYn=false(이미 변경된) 계정으로 호출 시

```json
{ "message": "잘못된 요청입니다.", "data": false, "code": 400 }
```

## 특이사항 (전체 흐름 실제 검증 완료)

1. **`Authorization` 헤더가 필요 없다** — `mustChangePassword` 상태의 계정은 `Login`이 애초에
   토큰을 발급하지 않으므로(아래 4번), 이 API는 인증 헤더 없이 `loginId`만으로 대상 계정을 찾는다.
2. **`oldPassword` 필드가 정말로 없다** — 스웨거 스키마 그대로, 현재 비밀번호를 증명할 방법이
   요청 바디에 전혀 없다. 서버가 실제로 확인하는 건 "그 `loginId` 계정이 지금 `pwChangedYn=true`
   상태인가"뿐으로 보인다(테스트 계정으로 확인 — 이미 `pwChangedYn=false`인 계정(`SPoliceM5`)에
   호출하면 위 400을 받고, `true`인 계정은 어떤 값을 보내든 새 비밀번호로 그대로 반영된다).
   **보안 관찰**: 초기 비밀번호=아이디라 어차피 추측 가능하지만, 이 API는 그마저도 필요 없이
   `loginId`만 알면 새 비밀번호를 임의로 설정할 수 있다 — 설계상 특이점으로 기록(백엔드팀 확인
   필요 여부는 사용자 판단, 일단 이슈로만 남김).
3. 성공 시 `USER_INFO.pwChangedYn`이 `true → false`로 바뀌는 것을 `GetStecUserList`로 실측 확인.
   이후 그 계정으로 `Login` 호출 시 (변경 전엔 428이던 것이) 정상 200 + 토큰 발급으로 바뀜.
4. **`Login`에 대한 새로운 발견(연쇄) — `mustChangePassword` 상태 로그인 시도 시**:

   ```
   HTTP 428 Precondition Required
   { "message": "비밀번호 변경이 필요합니다.", "data": null, "code": 428 }
   ```

   토큰이 전혀 발급되지 않는다 — mock처럼 "세션 없이 `{mustChangePassword:true,id}` JSON을 200으로
   반환"하는 방식이 아니라, **HTTP 상태코드(428) 자체로 신호를 준다.** `Login-Login.md`에도 반영함.
