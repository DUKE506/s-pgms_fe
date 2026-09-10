# Deploy/Police/W/GetDestroyDocDownload — 파기확인서 다운로드

- 테스트 날짜: 2026-09-09 · **2026-09-10 (파라미터 변경 회신반영)**
- 데이터: 동래경찰서 — 2026-09-09 caseSeq 51 / deployReqSeq 90
- 엔드포인트: `GET /api/v1/Deploy/Police/W/GetDestroyDocDownload?deploySeq=`

## 파라미터 — 2026-09-10 개정

```
deploySeq: integer (int32)   ← 배치요구서 PK (구 caseSeq 자리)
```

- **파라미터가 `caseSeq` → `deploySeq` 로 바뀌었다.** 스웨거 설명: *"경찰 화면은 경호건
  PK 를 들고 있지 않아 배치요구서 PK(deploySeq)로 받는다 — 종결(CloseGuardCase)과 같은
  키다."* → 프론트는 라우트 id(= `deployReqSeq`)를 그대로 `deploySeq`로 보낸다.
  `resolveCaseSeq` 우회 제거(findings #16 🟢).
- 응답: 파기확인서 파일 바이너리 + `Content-Disposition`. Authorization 헤더 필요 →
  `<a href>`로 못 받고 blob으로 받아 클라이언트에서 저장 트리거.
- 파기확인서가 없거나 디스크 파일이 없으면 404.
- 본청·지방청·게스트는 상세는 봐도 문서에는 접근 불가. 타 경찰서 → 403.

## 중요 — 다운로드 = 최종 종결 선결조건

스웨거 설명(END-005 / BR-024): **"받아가면 `DESTROY_DOC_DOWNLOAD_YN`이 켜지고, 이것이
최종 종결(CloseGuardCase)의 선결조건이다 — 받지 않고 종결하면 409."**

`GetDeployDetail` 응답의 `downloadYn`이 그 플래그. → 프론트:
- `SecurityCase.destructionCertDownloaded` = `d.downloadYn`
- `SecurityCaseDetailPage`의 `canClose` = `경호완료 && 파기확인서 존재 && destructionCertDownloaded`
- `DocumentsCard`가 다운로드 성공 후 `['security-case', id]` 쿼리 무효화 → 종결 버튼 즉시 활성

## 프로브 (2026-09-10, `local/_probe-4.sh`)

| 요청 | 결과 |
|---|---|
| M5, `?deploySeq=92` (파기확인서 없는 배정→경호중 건) | 404 — 파라미터명은 정상 인식, cert 없어 404 |
| M3(부산청), `?deploySeq=90` (동래 건) | **403** — 스코프 정상 |

## 실측 (사용자 실왕복)

- **2026-09-09**: `/security-cases/90`(SPoliceM5, 경호완료) — 진입 시 `downloadYn: false` →
  종결 비활성. "다운로드" 클릭 → 콘솔 에러 0, 쿼리 재조회 → `downloadYn: true` → 종결 활성.
- **2026-09-10**: 파라미터 변경 후 `?deploySeq=` 로 다운로드 → 종결까지 사용자가 실백엔드에서
  실제 확인.
