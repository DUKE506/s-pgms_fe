# Deploy/Police/W/CloseGuardCase — 최종 종결

- 테스트 날짜: 2026-09-09 (최초 종결) · **2026-09-10 (키 변경 회신반영 + 재확인)**
- 데이터: 동래경찰서 — 2026-09-09 caseSeq 51 / deployReqSeq 90, 2026-09-10 배정→경호중 건(deploySeq 92)
- 엔드포인트: `POST /api/v1/Deploy/Police/W/CloseGuardCase`

## DTO (`CloseGuardCaseDto`) — 2026-09-10 개정

```
swagger required: endReason        (deploySeq 는 required 배열에 없으나
                                    서버는 실제로 필수 검증한다 — 아래 프로브)
  deploySeq: integer (int32, 1~2147483647)   ← 배치요구서 PK (구 caseSeq 자리)
  endReason: string (minLength 1, maxLength 500)
```

- **키가 `caseSeq` → `deploySeq` 로 바뀌었다.** 스웨거 설명: *"경찰 화면은 경호건 PK 를
  들고 있지 않아 배치요구서 PK(deploySeq)로 받는다 — 종결(CloseGuardCase)과 같은 키다."*
  → 파기확인서 다운로드(`GetDestroyDocDownload`)와 키 통일. 프론트는 라우트 id
  (= `deployReqSeq`)를 그대로 `deploySeq`로 보낸다. `resolveCaseSeq` 우회 제거(findings #16 🟢).
- `endReason` = 종결 코드. 서버가 값을 검증하지 않고 화면이 보낸 문자열을 `END_REASON`에
  그대로 저장(범죄유형 코드와 같은 방식). `CANCEL_REASON`과는 다른 칸.
- **경호완료 상태에서만** 종결 가능(그 외 409). 피전은 자기 경찰서 건만(아니면 403).
- **선결조건**: 파기확인서를 다운로드(`GetDestroyDocDownload`)해서 `DESTROY_DOC_DOWNLOAD_YN`이
  켜져 있어야 함 — 안 받고 종결하면 **409**(END-006).
- 종결 시 파기(END-007): 배치요구서·문서 3종·담당 경찰관/수사관·게스트 조회권 삭제(실물
  파일까지), 경호건의 직장·주거지·기타 위치 2개 NULL. 근무·조·사전미팅은 남음. 종결 전
  `TOTAL_GUARD_WORK_MINUTES` 집계(휴무 제외 실근무 + 근무 밖 사전미팅). 되돌릴 수 없음.

## 프로브 (2026-09-10, `local/_probe-4.sh` — 상태 안 바꾸는 것만)

| 요청 | 결과 |
|---|---|
| `{deploySeq:999999, endReason:"probe"}` | `400 "잘못된 요청입니다."` — 엔드포인트 살아있음, deploySeq 키 인식 |
| `{deploySeq:92, endReason:"probe"}` (배정→경호중 실재 건) | `409 "배정 상태의 경호건은 종결할 수 없습니다. 경호완료 후에 종결해주세요."` — deploySeq로 실제 건을 찾아 상태검증, **무변경**(92 상태 그대로) |
| `{caseSeq:92, endReason:"probe"}` (구 키만) | `400` 검증오류 `{ "deploySeq": ["배치요구서를 선택해주세요."] }` — **구 키 완전 무시, deploySeq 사실상 필수** |
| `{endReason:"probe"}` (deploySeq 누락) | 위와 동일 검증오류 |
| M3(부산청)이 `{deploySeq:92}` | `403` — 소속 경찰서만 |

## 실측 (사용자 실왕복)

- **2026-09-09**: `caseSeq=51`, `endReason="경호기간 만료"`로 종결 → 이력 3화면 반영 확인
  (`totalMin: 2160` = 36시간, `remark: "경호기간 만료"`, `guardWorkLoc/guardHomeLoc: null`
  = 배치장소 파기 확인). 종결 데이터 대기(CARRYOVER B) 소진.
- **2026-09-10**: 키 변경 후 프론트에서 파기확인서 다운로드 → 종결까지 사용자가 실백엔드에서
  실제 확인. `resolveCaseSeq` 없이 `{deploySeq, endReason}` 직접 전송으로 정상 동작.
