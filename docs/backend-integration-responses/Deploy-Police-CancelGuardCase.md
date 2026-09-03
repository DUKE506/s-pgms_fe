# Deploy/Police/W/CancelGuardCase

- 테스트 날짜: 2026-09-02
- 사용한 테스트 계정/데이터: `SPoliceM5`(경찰, 동래경찰서). 이번 검증용으로
  `AddDeployRequest`로 임시 접수건(`deployReqSeq=84`, 대상자 "취소테스트")을 만들고
  그 건에만 접수취소를 실행 → 삭제 확인. #3에서 만든 81·82는 손대지 않음.
- 엔드포인트: `POST /api/v1/Deploy/Police/W/CancelGuardCase`
- 스웨거 DTO(`PoliceCancelCaseDto`): `deployReqSeq`(int, 필수), `reason`(string≤500, nullable)
- 매트릭스상 접수취소·경호취소가 **같은 엔드포인트**. 이번엔 접수 상태(접수취소)만 검증,
  배정 이후(경호취소)는 12번 이후 재검증.

## 요청

헤더: `Authorization: Bearer {accessToken}`, `Content-Type: application/json`

```json
{ "deployReqSeq": 84, "reason": "test cleanup" }
```

## 응답 (실제) — 정상 (접수취소)

HTTP 200

```json
{ "message": "요청이 정상 처리되었습니다.", "data": true, "code": 200 }
```

- 직후 `GetDeployList`에서 해당 `deploySeq`가 사라짐(하드 삭제),
  `GetDeployDetail?deployReqSeq=84` → HTTP 404 "존재하지 않는 배치요구서입니다."
- `project-overview.md`대로 접수 단계 취소 = DB 삭제. 상태값 전이가 아니라 삭제이므로
  응답에 갱신된 케이스 객체는 없음(`data: true`만).

## 응답 (실제) — 존재하지 않거나 이미 취소된 건

HTTP 400

```json
{ "message": "잘못된 요청입니다.", "data": false, "code": 400 }
```

## 특이사항

- **성공 응답이 `{data: true}`뿐** — 현재 mock `cancelPendingCase`는 `void`, 화면은
  성공 후 목록으로 이동하므로 반환 객체 불필요. `cancelAssignedCase`(경호취소)는 현재
  mock이 갱신된 `SecurityCase`를 반환하는데, 실제로는 이 엔드포인트도 `{data:true}`만
  줄 가능성이 큼 → 12번 재검증 때 확인하고, 필요하면 호출부에서 재조회로 전환.
- **Windows Git Bash 주의** — `curl` 인라인 본문(`-d`/`--data-binary '...'`)에 한글이
  들어가면 cp949로 깨져 서버가 HTTP 500을 반환한다(#3에서도 동일). `reason`에 한글을
  넣어 검증할 때는 UTF-8 파일 바디(`--data-binary @file`)를 써야 한다. 프론트(브라우저
  `fetch`)는 UTF-8이라 무관.
