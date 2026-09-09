# GuardCase/Stec/W/GetCaseMeeting · GetCaseDoc

- 테스트 날짜: 2026-09-04
- 사용한 테스트 계정/데이터: `StecM1`(운영관리자). caseSeq 29/46/47/48.
- 엔드포인트:
  - `GET /api/v1/GuardCase/Stec/W/GetCaseMeeting?caseSeq=` — "경호건 사전미팅"
  - `GET /api/v1/GuardCase/Stec/W/GetCaseDoc?caseSeq=` — "경호건 문서 조회"

## GetCaseMeeting — 응답 (실제)

모든 caseSeq(29 포함)에서 **`data: null`** (HTTP 200). 사전미팅이 저장된 케이스가
아직 없어 응답 스키마를 실측 못 함.

```json
{ "message": "요청이 정상 처리되었습니다.", "data": null, "code": 200 }
```

쓰기 DTO(`SaveCaseMeetingDto`) 기준 예상 필드:
`{ hasMeeting, meetingStart, meetingEnd, guardSeqs[] }`.
→ **프론트 `PreMeeting`은 `{ date, assignments: [{workerId, startTime, endTime}] }`**
(근무자별 개별 시간). 백엔드는 미팅 전체 1구간 + 근무자 seq 목록만 → 근무자별 시간
개념이 없음. 매핑 손실(issues 참고). SaveCaseMeeting 실호출 후 재확인 필요.

## GetCaseDoc — 응답 (실제)

### caseSeq 29 (경호완료, 문서는 미업로드)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "caseInfoDto": null,
    "guardAgreementDtos": [
      { "guardSeq": 13, "guardName": "김가드", "docSeq": null,
        "filePath": null, "fileName": null, "fileExt": null }
    ],
    "deploySeq": 69,
    "guardDeployDocDto": null
  },
  "code": 200
}
```

### caseSeq 46/47/48 (배정, 경호계획 미등록)

```json
{
  "data": { "caseInfoDto": null, "guardAgreementDtos": [], "deploySeq": 81,
            "guardDeployDocDto": null },
  "code": 200
}
```

## 특이사항 (GetCaseDoc)

- 첨부 3종의 메타데이터를 한 번에 준다. 필드↔문서 대응 (추정, 실 업로드로 확인 필요):
  - `caseInfoDto` → **경호계획서** 파일(`PatchGuardPlanDoc`)
  - `guardAgreementDtos[]` → **근무자별 개인정보동의서**(`PatchConsentDoc`, guardSeq 필수).
    항목: `{guardSeq, guardName, docSeq, filePath, fileName, fileExt}` — 파일 없으면 나머지 null.
    caseSeq 29는 경호계획에 김가드(13)가 있어 그 1행이 파일 null로 나옴 →
    **경호계획에 등록된 근무자만큼 행이 생기고 fileName으로 업로드 여부 판정**.
  - `guardDeployDocDto` → **파기확인서**(`PatchDestroyDoc`)로 추정.
    `GetGuardCaseDetail.destoryDocDownloadYn` + `GetDestroyDocDownload` 엔드포인트와 연계.
- `caseInfoDto`가 `null`/비-null → 경호계획서 업로드 여부. 단 경호계획 등록 자체 판정에도
  쓸 수 있을지(caseSeq 29도 null이라) 불명 → 등록 판정은 `GetGuardCaseDetail.startDate`로.
- `deploySeq` = 이 경호건의 원본 배치요구서 seq(29→69, 46→81, 47→86, 48→82).
  배치요구서 원본보기(`DispatchRequestViewDialog`)에 필요할 수 있음 — 단 본사 토큰으로
  `Deploy/Police/W/GetDeployDetail*` 호출은 403(issues #7 보강 참고).
```
