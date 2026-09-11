import type { SecurityCase } from '../types/securityCase'
import { downloadFileByPath } from '../../../shared/lib/download'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import { DocCard, DocRow } from './DocumentsCard'

interface ConsentDocsCardProps {
  securityCase: SecurityCase
}

// 목업(s5)의 보안서약 및 개인정보동의서 카드. 피전은 근무자 마스터 접근 권한이 없어
// (findings #6) "등록된 근무자 전체" 명단을 알 수 없다 — 그래서 근무자 로스터를 돌며
// 미등록/등록 상태를 다 보여주는 대신, GetDeployDetail.docAgreeDetail(업로드된 것만,
// 서약서+동의서 한 파일로 합쳐서 옴)을 그대로 렌더한다(2026-09-11 결정). 다른 문서
// 카드와 같은 DocCard/DocRow를 써서 레이아웃·색을 통일한다.
function ConsentDocsCard({ securityCase }: ConsentDocsCardProps) {
  const showToast = useToastStore((state) => state.show)
  const docs = securityCase.attachments?.consentDocs ?? []
  if (docs.length === 0) return null

  async function handleDownload(path: string, fileName: string) {
    try {
      await downloadFileByPath(path, fileName)
    } catch {
      showToast('동의서를 불러오지 못했습니다', 'error')
    }
  }

  return (
    <DocCard title="보안서약 및 개인정보동의서" description="업로드가 완료된 근무자만 표시됩니다.">
      <div className="flex flex-col gap-2.5">
        {docs.map((doc, i) => (
          <DocRow
            key={i}
            title={`보안서약 및 개인정보동의서 · ${doc.name}`}
            subtitle={doc.fileName}
            action={{ label: '다운로드', onClick: () => handleDownload(doc.filePath, doc.fileName) }}
          />
        ))}
      </div>
    </DocCard>
  )
}

export default ConsentDocsCard
