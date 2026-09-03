# Deploy/Police/W/GetDeployDetail

- 테스트 날짜: 2026-09-02
- 사용한 테스트 계정/데이터: `SPoliceM5`(경찰, 동래경찰서 · 피전, `groupSeq=32`),
  `deployReqSeq` 81·82(#3 검증 때 생성된 실접수건) + 84(이번에 만들고 접수취소로 삭제한 임시건)
- 엔드포인트: `GET /api/v1/Deploy/Police/W/GetDeployDetail`
- 파라미터: `deployReqSeq`(int, 필수) — 목록(`GetDeployList`)의 `deploySeq`와 동일 값

## 요청

헤더: `Authorization: Bearer {accessToken}`

쿼리: `?deployReqSeq=81`

## 응답 (실제) — 정상 (접수 상태)

```json
{
  "message": "요청이 정상 처리되었습니다.",
  "data": {
    "deployReqSeq": 81,
    "mgmtNo": "26-09-동래경찰서 접수",
    "statusName": "접수",
    "suspectUserName": "홍○○",
    "startDt": null,
    "endDt": null,
    "periodFrom": "2026-09-10",
    "periodTo": "2026-09-20",
    "requestedEndDate": null,
    "clientName": "홍길동",
    "clientDept": "여성청소년과 여성청소년계",
    "clientPosition": "경사",
    "suspectAddress": "부산 동래구 온천천로 123",
    "guardHomeLoc": null,
    "guardWorkLoc": null,
    "guardEtcLoc1": null,
    "guardEtcLoc2": null,
    "investigator": "이형사 / 경위 / 01033334444",
    "responsibleOfficer": "김경사 / 경사 / 01011112222",
    "crimeType": "스토킹",
    "extendCount": 0,
    "downloadYn": null,
    "docGuardDetail": null,
    "docDestructionDetail": null,
    "docAgreeDetail": []
  },
  "code": 200
}
```

## 응답 (실제) — 존재하지 않는 `deployReqSeq`

HTTP 404

```json
{ "message": "존재하지 않는 배치요구서입니다.", "data": null, "code": 404 }
```

## 특이사항

- **접수 단계 응답이 목록(`GetDeployList`)보다 필드가 넓지만, 기본정보/스케줄/첨부는
  아직 없다.** `docGuardDetail`(경호계획서)·`docDestructionDetail`(파기확인서)는 `null`,
  `docAgreeDetail`(개인정보동의서)는 `[]`. 화면 `BaseInfoReadCard`가 접수 상태에서
  배치시간·5개 조치를 비워 그리는 것과 일치.
- **경호기간은 `periodFrom`/`periodTo`에 들어온다.** 상세 응답의 `startDt`/`endDt`는
  접수 단계에서 `null`이고, 목록 응답의 `startDt`/`endDt`(= 경호기간)와는 **의미가
  다르다** — 목록의 `startDt`/`endDt`가 상세의 `periodFrom`/`periodTo`에 대응한다.
  상세의 `startDt`/`endDt`는 실제 경호 개시/종료일로 추정(배정~경호중 이후 채워질 것,
  12번에서 재확인).
- **배치장소 4필드가 응답 스키마에는 존재한다** — `guardHomeLoc`/`guardWorkLoc`/
  `guardEtcLoc1`/`guardEtcLoc2`. 여기선 전부 `null`인데, #3의 `AddDeployRequest`가
  D-2 임시처리로 `deploymentPlace`(단일) 하나만 보냈기 때문. 즉 **읽기 쪽은 이미
  4필드를 지원하고, 쓰기 DTO(`AddDeployRequestDto.deploymentPlace`)만 단일**이다
  (`docs/backend-integration-issues.md` #5 근거 보강). `deploymentPlace`로 보낸 값이
  이 응답 어디에도 안 보이는데(`suspectAddress`는 대상자 주소로 별개), 저장은 됐으나
  상세 조회에는 매핑이 안 된 것으로 보임 — issues #5에 함께 기록.
- **`caseSummary`(사건개요)·`caseMemo`(추가 참고사항)가 응답에 없다.** `AddDeployRequest`
  로는 보냈지만 `GetDeployDetail`은 안 돌려줌. 현재 경찰 상세(`BaseInfoReadCard`)는
  둘 다 표시하지 않으므로 이번 화면엔 영향 없음. 배치요구서 수정(#5)에서 필요 →
  그때 `UpdateDeployRequest`/재조회 스펙으로 확인.
- **`crimeType`이 한글 문자열**("스토킹") — 화면 `CaseType` 유니온과 동일 표기.
  단 `GetDeployList`는 `crimeType`을 안 주므로(목록 매핑은 `'사건미접수'` 고정)
  상세에서만 실제 사건유형을 얻는다.
- **`investigator`/`responsibleOfficer`가 `"이름 / 계급 / 연락처"` 결합 문자열.**
  화면은 `policeContact.investigator`/`.victimOfficer`에 그대로 넣어 표시(파싱 불필요).
- **`policeStation`/`jurisdiction` 없음** — 목록과 동일하게 `GetMyProfile.groupName`으로
  대체(상단 소속 표기).
- **`requestedEndDate`/`extendCount`** — 연장/단축 대기 상태용. 접수 단계엔
  `requestedEndDate: null`. `pendingPeriodRequest`(type 포함)로의 매핑은 배정 이후
  데이터가 있어야 확정 가능 → 12번에서 재확인.
- **`caseSeq` 없음** — 배정 후 상세는 `GetGuardCaseDetail?caseSeq=`로 갈라질 가능성이
  큼. 이번엔 `GetDeployDetail` 경로만 구현, 분기는 12번에서 확정.
- **필드 대응(→ `SecurityCase`)**:
  `deployReqSeq`→`id`(문자열화), `mgmtNo`→`receiptNumber`/`securityCode`(목록과 동일
  `splitMgmtNo`), `statusName`→`status`, `suspectUserName`→`subject.nameInitial`,
  `suspectAddress`→`subject.residence`, `crimeType`→`caseType`,
  `periodFrom`/`periodTo`→`startDate`/`endDate`,
  `clientDept`/`clientPosition`/`clientName`→`requester.*`,
  `investigator`→`policeContact.investigator`,
  `responsibleOfficer`→`policeContact.victimOfficer`,
  `guardHomeLoc`/`guardWorkLoc`/`guardEtcLoc1`/`guardEtcLoc2`→`location.*`(현재 전부 null).
  `subject.gender`/`birthDate`/`occupation`, `caseSummary`, `additionalNotes`는 응답에
  없어 빈 값(수정 화면 #5에서 별도 확인).
```
