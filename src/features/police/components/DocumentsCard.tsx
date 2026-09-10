import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { downloadDestructionCert } from '../api/securityCaseDetail'
import { downloadFileByPath } from '../../../shared/lib/download'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { SecurityCase } from '../types/securityCase'

interface DocRowProps {
  title: string
  subtitle: string
  action?: { label: string; onClick: () => void }
  pending?: boolean
}

// action이 있으면 다운로드 버튼, 없으면(pending) "대기중" 라벨.
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
      {action && (
        <button type="button" onClick={action.onClick} className="text-xs font-semibold text-blue-600">
          {action.label}
        </button>
      )}
      {!action && pending && <span className="text-xs font-semibold text-muted-foreground">대기중</span>}
    </div>
  )
}

interface DocumentsCardProps {
  securityCase: SecurityCase
  // 이력 조회(Phase 3-1)에서 본청/지역청이 진행중 건을 조회 목적으로 이 화면에
  // 들어올 때는 조회 전용이라 배치요구서 수정 링크를 숨긴다 — 그 라우트 자체가
  // 경찰서 전용 가드라 눌러도 리다이렉트만 될 뿐이다(2026-08-27 결정).
  readOnly?: boolean
}

function DocumentsCard({ securityCase, readOnly }: DocumentsCardProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)
  const isPending = securityCase.status === '접수'
  const securityPlanFileName = securityCase.attachments?.securityPlanFileName
  const securityPlanFilePath = securityCase.attachments?.securityPlanFilePath
  const destructionCertFileName = securityCase.attachments?.destructionCertFileName

  async function handleDownloadSecurityPlan() {
    if (!securityPlanFilePath) return
    try {
      await downloadFileByPath(securityPlanFilePath, securityPlanFileName)
    } catch {
      showToast('경호계획서를 불러오지 못했습니다', 'error')
    }
  }

  async function handleDownloadDestructionCert() {
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
    <div className="rounded-xl border border-border bg-card p-5.5">
      <div className="mb-4 text-sm font-bold text-foreground">문서함</div>
      <div className="flex flex-col gap-2.5">
        <DocRow
          title="배치요구서"
          subtitle="Web Form"
          action={
            readOnly
              ? undefined
              : { label: '수정', onClick: () => navigate(`/security-cases/${securityCase.id}/edit`) }
          }
        />

        {!isPending &&
          (securityPlanFileName ? (
            <DocRow
              title={securityPlanFileName}
              subtitle="본사 업로드"
              action={
                securityPlanFilePath
                  ? { label: '다운로드', onClick: handleDownloadSecurityPlan }
                  : undefined
              }
            />
          ) : (
            <DocRow title="경호계획서" subtitle="본사 업로드 예정" pending />
          ))}

        {!isPending &&
          (destructionCertFileName ? (
            <DocRow
              title={destructionCertFileName}
              subtitle="본사 업로드"
              action={{ label: '다운로드', onClick: handleDownloadDestructionCert }}
            />
          ) : (
            <DocRow title="파기확인서" subtitle="경호완료 후 본사에서 업로드 예정" pending />
          ))}
      </div>
    </div>
  )
}

export default DocumentsCard
