import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { FileText } from 'lucide-react'
import { downloadFileByPath } from '../../../shared/lib/download'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { SecurityCase } from '../types/securityCase'

interface DocRowProps {
  title: string
  subtitle: string
  action?: { label: string; onClick: () => void }
  pending?: boolean
  // 활성 상태 강조색 — 본사 AttachmentsSection과 동일하게: 업로드 파일(경호계획서·
  // 파기확인서·동의서)은 초록, 배치요구서처럼 항상 존재하는 웹폼 기록은 파랑
  // (2026-09-11 사용자 요청 — "활성화 디자인도 본사랑 동일하게").
  accent?: 'green' | 'blue'
}

const ACCENT = {
  green: { box: 'border-green-300 bg-green-50', text: 'text-green-700' },
  blue: { box: 'border-blue-300 bg-blue-50', text: 'text-blue-700' },
}

// action이 있으면 다운로드 버튼, 없으면(pending) "대기중" 라벨. DestructionCertCard·
// ConsentDocsCard도 같은 행 스타일을 쓰도록 export한다(2026-09-11 — 예전엔 동의서만
// 초록색 강조를 따로 써서 나머지 문서 카드와 색이 달랐다, 통일 근거 없어 정리).
export function DocRow({ title, subtitle, action, pending, accent = 'green' }: DocRowProps) {
  const c = ACCENT[accent]
  return (
    <div
      className={
        pending
          ? 'flex items-center justify-between rounded-lg bg-muted/60 p-3.5 opacity-70'
          : `flex items-center justify-between rounded-lg border border-dashed p-3.5 ${c.box}`
      }
    >
      <div className="flex items-center gap-2.5">
        <FileText className={pending ? 'size-4.5 text-muted-foreground' : `size-4.5 ${c.text}`} />
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      {action && (
        <button type="button" onClick={action.onClick} className={`text-xs font-semibold ${c.text}`}>
          {action.label}
        </button>
      )}
      {!action && pending && <span className="text-xs font-semibold text-muted-foreground">대기중</span>}
    </div>
  )
}

// 카드 한 장 = 문서 한 종류. 본사 AttachmentsSection과 같은 레이아웃(제목 + 설명 한 줄 +
// 문서 행)으로 통일한다(2026-09-11 사용자 결정 — 예전엔 "문서함" 카드 하나에 배치요구서·
// 경호계획서·파기확인서를 다 몰아넣고 동의서만 따로 빠져있어 어중간했다). 파기확인서·
// 동의서 카드는 각자 파일(DestructionCertCard·ConsentDocsCard)로 분리(순서 조정 위해).
export function DocCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5.5">
      <div className="mb-1 text-sm font-bold text-foreground">{title}</div>
      <p className="mb-3.5 text-[11px] text-muted-foreground">{description}</p>
      {children}
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
  const showToast = useToastStore((state) => state.show)
  const isPending = securityCase.status === '접수'
  const securityPlanFileName = securityCase.attachments?.securityPlanFileName
  const securityPlanFilePath = securityCase.attachments?.securityPlanFilePath

  async function handleDownloadSecurityPlan() {
    if (!securityPlanFilePath) return
    try {
      await downloadFileByPath(securityPlanFilePath, securityPlanFileName)
    } catch {
      showToast('경호계획서를 불러오지 못했습니다', 'error')
    }
  }

  return (
    <>
      <DocCard title="배치요구서" description="접수 시 작성한 내용입니다">
        <DocRow
          title="배치요구서"
          subtitle="Web Form"
          accent="blue"
          action={
            readOnly
              ? undefined
              : { label: '수정', onClick: () => navigate(`/security-cases/${securityCase.id}/edit`) }
          }
        />
      </DocCard>

      {!isPending && (
        <DocCard title="경호계획서" description="단순 첨부파일로 관리됩니다 (사전미팅 결과물)">
          {securityPlanFileName ? (
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
          )}
        </DocCard>
      )}
    </>
  )
}

export default DocumentsCard
