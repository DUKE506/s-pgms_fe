# Deploy/Police/W/GetDeployDetail

- 테스트 날짜: 2026-09-02 (최초) / **2026-09-07 재실측 — 응답 shape 변경**
- 사용한 테스트 계정/데이터: `SPoliceM5`(경찰, 동래경찰서 · 피전, `groupSeq=32`),
  `deployReqSeq` 81(배정+경호계획 등록)·82·86(배정+미등록)·71(접수)
- 엔드포인트: `GET /api/v1/Deploy/Police/W/GetDeployDetail`
- 파라미터: `deployReqSeq`(int, 필수) — 목록(`GetDeployList`)의 `deploySeq`와 동일 값

## 2026-09-07 변경 — 조치 5개 + 근무시간 명시 필드 추가 (issues #13 해소)

백엔드가 응답을 본사 `GetGuardCaseDetail`과 같은 구조로 맞췄다:

- **`startDt`/`endDt` 제거** → **`startDate`/`endDate`(근무일자) + `startTime`/`endTime`
  (근무시간 **명시 필드**)** 로 대체. 경호계획 미등록이면 4개 다 `null`(경호기간은
  `periodFrom`/`periodTo`로 계속 옴).
- **`summary1`~`summary5` / `summary1Date`~`summary5Date` 추가** — 조치 5개. 본사와
  같은 손실 매핑 포맷(항목 `", "` 조인 / 기간 `"시작 ~ 종료"`). 미등록이면 전부 `null`.
- **`guardUserList: [{ guardName }]` 추가** — 대표근무자(이름만, `guardSeq` 없음).

### 응답 (실제) — 배정 + 경호계획 등록됨 (deployReqSeq 81 = caseSeq 46)

```json
{
  "deployReqSeq": 81,
  "mgmtNo": "26-09-동래경찰서 ST0002",
  "statusName": "배정",
  "suspectUserName": "홍**",
  "startDate": "2026-09-10",
  "endDate": "2026-09-20",
  "startTime": "09:00:00",
  "endTime": "18:00:00",
  "periodFrom": "2026-09-10",
  "periodTo": "2026-09-20",
  "requestedEndDate": null,
  "clientName": "홍길동",
  "clientDept": "여성청소년과 여성청소년계",
  "clientPosition": "경사",
  "suspectAddress": "부산 동래구 온천천로 123",
  "guardHomeLoc": "부산 동래구 낙민동 100 (수정됨)",
  "guardWorkLoc": "부산 동래구 온천동 200",
  "guardEtcLoc1": "이동경로 A",
  "guardEtcLoc2": null,
  "investigator": "이형사 / 경위 / 01033334444",
  "responsibleOfficer": "김경사 / 경사 / 01011112222",
  "crimeType": "스토킹",
  "extendCount": 0,
  "downloadYn": false,
  "summary1": "맞춤형 순찰, CCTV",
  "summary1Date": "2026-09-10 ~ 2026-09-20",
  "summary2": null, "summary2Date": null,
  "summary3": "1호",
  "summary3Date": "2026-09-10 ~ 2026-09-20",
  "summary4": null, "summary4Date": null,
  "summary5": null, "summary5Date": null,
  "guardUserList": [{ "guardName": "김가드" }],
  "docGuardDetail": { "docSeq": 30, "docType": 0, "docPath": "...", "fileName": "consent2.pdf", "fileExt": ".pdf" },
  "docDestructionDetail": null,
  "docAgreeDetail": [
    { "agreePath": "...", "agreeFileName": "consent2.pdf", "agreeFileExt": ".pdf", "guardName": "김가드" }
  ]
}
```

### 응답 (실제) — 배정 + 경호계획 미등록 (82·86) / 접수 (71)

`startDate`/`endDate`/`startTime`/`endTime` = `null`, `summary1~5`/`summary1~5Date` = `null`,
`guardUserList` = `[]`. 나머지(요구자·수사관·`periodFrom`/`periodTo`·`suspectAddress` 등)는
동일하게 옴. `suspectUserName`은 **마스킹**("홍**" / "이**") — 실명 비노출이 의도된 정책
(프론트는 이 값을 `nameInitial`로 취급, 별도 처리 없음).

### 프론트 반영 (2026-09-07)

`features/police/api/securityCaseDetail.ts` — `startDate != null`이면 `summary1~5` +
`startTime`/`endTime`으로 `baseInfo`를 조립(공유 헬퍼 `@/shared/lib/caseMeasures`).
통합 기본정보 카드(`CaseBaseInfoCard`)의 조치 5개·배치시간이 채워짐. 브라우저 검증:
deployReqSeq 81에서 "배치시간 매일 09:00 ~ 18:00 / 안전조치 맞춤형 순찰, CCTV / 잠정조치
1호" 렌더 확인. **issues #13 해소.**

---

## (이하 2026-09-02 최초 실측 — 접수 상태, 구 shape)

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
