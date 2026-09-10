// 저장 경로가 곧 다운로드 URL인 문서(경호계획서·개인정보동의서)용 다운로드 헬퍼.
//
// 파기확인서는 전용 API(GetDestroyDocDownload)를 거친다 — 피전이 받아갔다는 수령
// 기록(DESTROY_DOC_DOWNLOAD_YN)이 종결 선결조건이라서다. 경호계획서·동의서는 그런
// 기록이 필요 없어 별도 API 없이 백엔드가 /files/<docPath>로 정적 서빙한다
// (스웨거 GetDestroyDocDownload 설명, 2026-09-10 실측 — application/pdf, 인증 불필요).
//
// 정적 응답엔 Content-Disposition이 없어 <a href>로 열면 브라우저가 인라인 표시한다.
// 원래 파일명으로 "저장"시키려면 blob으로 받아 a.download에 파일명을 지정해야 한다
// (features/*/api/securityCaseDetail.ts의 파기확인서 다운로드와 같은 패턴).
export async function downloadFileByPath(
  docPath: string,
  fileName?: string | null,
): Promise<void> {
  const res = await fetch(`/files/${docPath.replace(/^\/+/, '')}`)
  if (!res.ok) {
    throw new Error('파일을 불러오지 못했습니다')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || docPath.split('/').pop() || 'download'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
