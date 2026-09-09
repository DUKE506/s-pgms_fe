# GuardCase/Stec/W/CancelGuardCase  (2026-09-09 신설)

- 테스트 날짜: 2026-09-09
- 계정: `StecM1`(운영), `StecM3`(본부관리자·배정 0건)
- 엔드포인트: `POST /api/v1/GuardCase/Stec/W/CancelGuardCase`
- 프로브: `.claude/loop-backend/local/_probe-B2.sh` (옵션 C — 상태 안 바꾸는 케이스만)
- 배경: findings #9 — 본사 토큰용 케이스 취소 EP가 없었음. 스웨거 개정으로 신설.

## DTO (`StecCancelCaseDto`)

```
required: deployReqSeq
  deployReqSeq: integer (int32)
  reason:       string (≤500, nullable)
```

- 키가 `caseSeq`가 아니라 **`deployReqSeq`** — 접수 단계엔 경호건(caseSeq)이 없어서.
  배치요청 목록·경호관리 리스트가 모두 `deploySeq`를 내려주므로 그것만 보내면 됨.
- 경찰용(`Deploy/Police/W/CancelGuardCase`)과 같은 동작 — 서버가 배정 여부로 분기:
  - **배정 전** = 접수취소(REQ-008): 배치요구서 행 hard delete, `reason` 안 받음.
    시스템·운영관리자만(본부관리자 403).
  - **배정 후** = 경호취소(WORK-011): 상태 '취소', `reason` → `CANCEL_REASON`(이때만 필수).
    근무·조·사전미팅 편성기록 보존.
- 취소 가능 상태 = 배정·경호중·경호완료 (경찰용은 배정뿐). 종결·경호취소면 409.
- 소속 판정 = 담당 본부. 본부관리자는 자기 배정 건만(아니면 403).

## 실측 (상태 안 바꾸는 확인만)

| 호출 | 결과 |
|---|---|
| `StecM1`, `deployReqSeq=999999` (없는 값) | `HTTP 400` `{message:"잘못된 요청입니다.", data:false, code:400}` |
| `StecM3`(본부 0건), `deployReqSeq=90` (남 배정 경호건 = caseSeq 51) | `HTTP 403` `{message:"담당하지 않는 경호건입니다.", data:false}` |
| `StecM3`, `deployReqSeq=91` (접수 건) | `HTTP 403` `{message:"담당하지 않는 배치요구서입니다.", data:false}` |
| `StecM1`, `deployReqSeq` 누락 | `HTTP 400` `{message:"잘못된 요청입니다."}` |

- 성공 응답은 `{message:"...", data:true, code:200}` 형태로 추정(다른 Stec write와 동일).
- **실제 취소 왕복**(접수취소 hard delete / 경호취소 상태전환)은 되돌릴 수 없어 미테스트 —
  버려도 되는 데이터로 사용자 확인 예정(CARRYOVER B).

## 연동

- `features/company/api/requests.ts::cancelPendingRequest(caseId)` → `{deployReqSeq: Number(caseId)}`
  (caseId = GetDeployRequestList 행의 id = deploySeq). `RequestListPage` ⋮"취소" disabled 제거.
- `features/company/api/securityCaseDetail.ts::cancelAssignedCase(deployReqSeq, reason)` →
  `{deployReqSeq, reason}`. `SecurityCase.deploySeq`(GetCaseDoc) 사용. `SecurityCaseDetailPage`
  (company) "경호취소" 버튼 disabled 제거(배정 상태).
