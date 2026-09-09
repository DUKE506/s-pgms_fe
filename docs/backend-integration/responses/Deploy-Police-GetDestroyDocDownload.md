# Deploy/Police/W/GetDestroyDocDownload — 파기확인서 다운로드

- 테스트 날짜: 2026-09-09
- 데이터: 동래경찰서 caseSeq 51 / deployReqSeq 90
- 엔드포인트: `GET /api/v1/Deploy/Police/W/GetDestroyDocDownload?caseSeq=`

## 파라미터

```
caseSeq: integer (int32)   ← deployReqSeq 아님
```

- `GetDeployDetail`에 `caseSeq`가 없어 `resolveCaseSeq`(GetDeployList 재조회)로 변환 —
  `CloseGuardCase`와 같은 우회(findings #16).
- 응답: 파기확인서 파일 바이너리 + `Content-Disposition`. Authorization 헤더 필요 →
  `<a href>`로 못 받고 blob으로 받아 클라이언트에서 저장 트리거.
- 파기확인서가 없거나 디스크 파일이 없으면 404.

## 중요 — 다운로드 = 최종 종결 선결조건

스웨거 설명(END-005 / BR-024): **"받아가면 `DESTROY_DOC_DOWNLOAD_YN`이 켜지고, 이것이
최종 종결(CloseGuardCase)의 선결조건이다 — 받지 않고 종결하면 409."**

`GetDeployDetail` 응답의 `downloadYn`이 그 플래그. → 프론트:
- `SecurityCase.destructionCertDownloaded` = `d.downloadYn`
- `SecurityCaseDetailPage`의 `canClose` = `경호완료 && 파기확인서 존재 && destructionCertDownloaded`
- `DocumentsCard`가 다운로드 성공 후 `['security-case', id]` 쿼리 무효화 → 종결 버튼 즉시 활성

## 실측 (브라우저)

`/security-cases/90`(SPoliceM5, 경호완료):
- 진입 시 `downloadYn: false` → 종결 버튼 비활성
- "다운로드" 클릭 → 콘솔 에러 0 (`?caseSeq=51`로 200), 쿼리 재조회 → `downloadYn: true` →
  종결 버튼 활성
