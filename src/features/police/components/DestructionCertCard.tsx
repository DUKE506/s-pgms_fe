import { useQueryClient } from '@tanstack/react-query'
import { downloadDestructionCert } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import { DocCard, DocRow } from './DocumentsCard'
import type { SecurityCase } from '../types/securityCase'

interface DestructionCertCardProps {
  securityCase: SecurityCase
}

// 2026-09-11 DocumentsCard에서 분리(사용자 요청 — 동의서 카드보다 뒤로 순서 변경).
function DestructionCertCard({ securityCase }: DestructionCertCardProps) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)
  const destructionCertFileName = securityCase.attachments?.destructionCertFileName

  if (securityCase.status === '접수') return null

  async function handleDownload() {
    try {
      // 피전 경호상세의 id는 deployReqSeq다(라우트 /security-cases/:id).
      await downloadDestructionCert(securityCase.id)
      // 다운로드하면 서버 DESTROY_DOC_DOWNLOAD_YN이 켜진다 — 재조회해 종결 버튼 활성 갱신.
      queryClient.invalidateQueries({ queryKey: ['security-case', securityCase.id] })
    } catch {
      showToast('파기확인서를 불러오지 못했습니다', 'error')
    }
  }

  return (
    <DocCard title="파기확인서" description="다운로드해야 종결 처리할 수 있습니다">
      {destructionCertFileName ? (
        <DocRow
          title="파기확인서"
          subtitle={destructionCertFileName}
          action={{ label: '다운로드', onClick: handleDownload }}
        />
      ) : (
        <DocRow title="파기확인서" subtitle="경호완료 후 본사에서 업로드 예정" pending />
      )}
    </DocCard>
  )
}

export default DestructionCertCard
