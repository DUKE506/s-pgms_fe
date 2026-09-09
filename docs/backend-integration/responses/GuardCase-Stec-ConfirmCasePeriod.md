# GuardCase/Stec/W/ConfirmCasePeriod

- 테스트 날짜: 2026-09-07
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자). caseSeq 48(deploySeq 82, 동래).
- 엔드포인트: `POST /api/v1/GuardCase/Stec/W/ConfirmCasePeriod`

## 요청

```json
{ "caseSeq": 48 }
```

`caseSeq` 하나만. 연장/단축 여부·새 종료일은 서버가 배치요구서(`DEPLOY_STATUS` 2:연장 /
3:단축 + `REQUESTED_END_DATE`)에서 읽어 처리 → **거부(reject) 경로 없음**(issues #2).

## 응답 (실제)

```json
{ "message": "요청에 성공하였습니다.", "data": true, "code": 200 }
```

## 확인된 동작

- **업무 규칙상 연장/단축은 경호중 상태만 대상**(경찰 화면이 경호중에서만 신청 버튼을 연다).
  백엔드는 배정 상태 요청도 하드 검증 없이 받아주지만 정상 흐름은 아니다. 현재 실백엔드에
  경호중 건이 없어 이번 검증은 배정 건으로 진행 — 진짜 경호중 왕복은 matrix #4 재검증과 함께.
- 신청 직후 배치요구서 `DEPLOY_STATUS`가 2/3으로 바뀌고, `GetExtend/ShortenRequestList`에 뜬다.
- `ConfirmCasePeriod` 후:
  - `GetGuardCaseDetail.endDate`가 `requestedEndDate`로 이동 (연장: 뒤로, 단축: 앞으로).
  - `startDate`/`startTime`/`endTime`은 불변.
  - 배치요구서 상태가 1(배정)로 복귀 → 목록에서 사라짐.
  - **`extendCount`는 연장 확정 시에만 +1** (단축 확정으로는 안 줄어듦). 왕복 검증:
    연장확정→단축확정 후 `extendCount:1` 유지, `endDate`는 원래 09-22로 복귀.
  - 스케줄은 서버가 새 기간에 맞춰 자동 조정(연장=일자 추가 / 단축=이후 일자 제거).
- **재확정 시 409** (스케줄/터미널 상태 관련) — 앞선 화면9 `AddGuardCaseInfo` 재호출 409와 같은 계열.

## 검증 부작용 (원복 완료)

deploySeq 82(caseSeq 48)에 연장→확정→단축→확정 왕복. `endDate`는 09-22로 원위치,
`extendCount`만 0→1로 남음(테스트 데이터라 허용). deploySeq 81(caseSeq 46)은 미변경.
