# Deploy/Police/W/CloseGuardCase — 최종 종결

- 테스트 날짜: 2026-09-09 (사용자가 실백엔드에서 실제 종결 수행)
- 데이터: 동래경찰서 caseSeq 51 / deployReqSeq 90 (경호완료 → 종결)
- 엔드포인트: `POST /api/v1/Deploy/Police/W/CloseGuardCase`

## DTO (`CloseGuardCaseDto`)

```
required: caseSeq, endReason
  caseSeq:   integer (int32)          ← 경호건 시퀀스 (deployReqSeq 아님!)
  endReason: string (minLength 1, maxLength 500)
```

- `endReason` = 종결 코드. 서버가 값을 검증하지 않고 화면이 보낸 문자열을 `END_REASON`에
  그대로 저장(범죄유형 코드와 같은 방식). `CANCEL_REASON`과는 다른 칸.
- **경호완료 상태에서만** 종결 가능(그 외 409). 피전은 자기 경찰서 건만.
- **선결조건**: 파기확인서를 다운로드(`GetDestroyDocDownload`)해서 `DESTROY_DOC_DOWNLOAD_YN`이
  켜져 있어야 함 — 안 받고 종결하면 **409**(END-006).
- 종결 시 파기(END-007): 배치요구서·문서 3종·담당 경찰관/수사관·게스트 조회권 삭제(실물
  파일까지), 경호건의 직장·주거지·기타 위치 2개 NULL. 근무·조·사전미팅은 남음. 종결 전
  `TOTAL_GUARD_WORK_MINUTES` 집계(휴무 제외 실근무 + 근무 밖 사전미팅). 되돌릴 수 없음.

## ⚠️ caseSeq 우회 (findings #16)

`GetDeployDetail`(피전 경호상세 조회) 응답엔 `deployReqSeq`만 있고 **`caseSeq`가 없다**.
기존 `closeCase`가 `caseSeq` 자리에 라우트 id(=deployReqSeq)를 넣어 보내 400 "잘못된
요청입니다"가 났다. → `resolveCaseSeq(deployReqSeq)` 신설: `GetDeployList`(피전 경호목록,
행에 `{deploySeq, caseSeq}` 둘 다 옴)를 다시 불러 매핑. `closeCase`·`downloadDestructionCert`
공용. 백엔드가 `GetDeployDetail`에 `caseSeq` 추가하면 제거.

## 실측 (사용자 실제 종결 후 이력에서 확인)

`caseSeq=51`, `endReason="경호기간 만료"`로 종결 → `History/Stec/W/GetHistoryList` 반영:

```json
{ "caseSeq": 51, "status": 3, "statusName": "종결", "mgmtNo": "26-09-동래경찰서 ST0007",
  "startDt": "2026-09-07", "endDt": "2026-09-08", "totalMin": 2160, "remark": "경호기간 만료" }
```

`History/Stec/W/GetHistoryDetail?caseSeq=51`:
- `totalGuardWorkMinutes: 2160` (= 36시간), `endDt: "2026-09-09T08:01:10"`, `remark: "경호기간 만료"`
- `guardWorkLoc: null, guardHomeLoc: null` — **배치장소 파기 확인**(END-007, 스웨거 회신대로)
- `guards`: 김가드 2일 1080분, 이가드 2일 1080분

→ 이력 3화면(#13·#14·#15) 종결 건 렌더 정상(총경호시간 36시간, 종결코드 "경호기간 만료",
근무자 배정 이력). 종결 데이터 대기(CARRYOVER B) 소진.
