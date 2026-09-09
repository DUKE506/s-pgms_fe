# GuardCase/Stec/W/GetCaseGuardList

- 테스트 날짜: 2026-09-04
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자). caseSeq 46/47/48(배정), caseSeq 29(경호완료).
- 엔드포인트: `GET /api/v1/GuardCase/Stec/W/GetCaseGuardList?caseSeq=`
- 스웨거 summary: "경호건 경호원 목록 (경호풀 선택용)"

## 응답 (실제) — caseSeq 29 (경호완료, 김가드 배정됨)

HTTP 200

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": [
    { "guardSeq": 13, "name": "김가드", "sabun": "1111", "deptName": "안녕하세요~",
      "isAssigned": true,  "phone": "01012345687" },
    { "guardSeq": 14, "name": "이가드", "sabun": "2222", "deptName": "테스트부서",
      "isAssigned": false, "phone": "string" },
    { "guardSeq": 15, "name": "박가드", "sabun": "3333", "deptName": "테스트부서",
      "isAssigned": false, "phone": "string" },
    { "guardSeq": 16, "name": "최가드", "sabun": "123123", "deptName": "테스트부서",
      "isAssigned": false, "phone": "010-000-0000" },
    { "guardSeq": 22, "name": "뱅가드", "sabun": "12345678", "deptName": "HS1",
      "isAssigned": false, "phone": "01012345678" }
  ],
  "code": 200
}
```

caseSeq 46/47/48(배정, 미배정)은 동일 목록에 `isAssigned` 전부 `false`.

## 특이사항

- **근무자 마스터 전량 + 이 경호건에 배정됐는지(`isAssigned`) 플래그**. 화면의
  경호원 배정(경호풀 선택) 드롭다운을 이걸로 채운다.
- **`deptName`이 여기엔 있다** — issues #8(`GetGuardList` 응답에 `deptName` 누락)은
  본사 근무자 목록 화면(6번) 얘기고, 이 경호건 스코프 엔드포인트에는 부서가 나온다.
- 6번 `GetGuardList` 응답(`{guardSeq,sabun,name,phone}`)과 필드 순서·이름이 약간 다름
  (`name` vs `name`, `sabun` 동일). `phone`에 "string" 같은 쓰레기값 섞여 있음(테스트 DB).
- `GetGuardCaseDetail.guardUserList`(이름만)와 중복 정보지만 이쪽이 guardSeq를 준다 →
  기본 근무자/스케줄 근무자 이름·연락처 조인은 이 목록 기준.
```
