import { useState } from 'react'
import { FileText } from 'lucide-react'
import DispatchRequestViewDialog from '../../company/components/DispatchRequestViewDialog'
import type { SecurityCase } from '../types/securityCase'

interface DocRowProps {
  title: string
  subtitle: string
  action?: { label: string; onClick: () => void }
  pending?: boolean
}

// 실제 파일 저장 없이 파일명만 보관하는 mock 특성상(2026-08-22 결정) 다운로드는
// 눌러도 받을 파일이 없어 비활성 라벨로만 표시한다.
function DocRow({ title, subtitle, action, pending }: DocRowProps) {
  return (
    <div
      className={
        pending
          ? 'flex items-center justify-between rounded-lg bg-muted/60 p-3.5 opacity-70'
          : 'flex items-center justify-between rounded-lg bg-muted/60 p-3.5'
      }
    >
      <div className="flex items-center gap-2.5">
        <FileText className={pending ? 'size-4.5 text-muted-foreground' : 'size-4.5 text-blue-600'} />
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      {action ? (
        <button type="button" onClick={action.onClick} className="text-xs font-semibold text-blue-600">
          {action.label}
        </button>
      ) : (
        <span className="text-xs font-semibold text-muted-foreground">대기중</span>
      )}
    </div>
  )
}

interface DocumentsCardProps {
  securityCase: SecurityCase
}

function DocumentsCard({ securityCase }: DocumentsCardProps) {
  const [dispatchViewOpen, setDispatchViewOpen] = useState(false)
  const isPending = securityCase.status === '접수'
  const securityPlanFileName = securityCase.attachments?.securityPlanFileName
  const destructionCertFileName = securityCase.attachments?.destructionCertFileName

  return (
    <div className="rounded-xl border border-border bg-card p-5.5">
      <div className="mb-4 text-sm font-bold text-foreground">문서함</div>
      <div className="flex flex-col gap-2.5">
        <DocRow
          title="배치요구서"
          subtitle="Web Form"
          action={{ label: '보기', onClick: () => setDispatchViewOpen(true) }}
        />

        {!isPending &&
          (securityPlanFileName ? (
            <DocRow title={securityPlanFileName} subtitle="본사 업로드" action={{ label: '다운로드', onClick: () => {} }} />
          ) : (
            <DocRow title="경호계획서" subtitle="본사 업로드 예정" pending />
          ))}

        {!isPending &&
          (destructionCertFileName ? (
            <DocRow
              title={destructionCertFileName}
              subtitle="본사 업로드"
              action={{ label: '다운로드', onClick: () => {} }}
            />
          ) : (
            <DocRow title="파기확인서" subtitle="경호완료 후 본사에서 업로드 예정" pending />
          ))}
      </div>

      <DispatchRequestViewDialog
        securityCase={securityCase}
        open={dispatchViewOpen}
        onOpenChange={setDispatchViewOpen}
      />
    </div>
  )
}

export default DocumentsCard
