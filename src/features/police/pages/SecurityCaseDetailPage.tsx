import { useState } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import StatusBadge from '@/shared/components/StatusBadge'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { getSecurityCase } from '../api/securityCaseDetail'
import { listWorkers } from '../api/workers'
import StatusStepper from '../components/StatusStepper'
import BaseInfoReadCard from '../components/BaseInfoReadCard'
import DocumentsCard from '../components/DocumentsCard'
import ConsentDocsCard from '../components/ConsentDocsCard'
import WorkerAssignmentPanel from '../components/WorkerAssignmentPanel'
import PeriodRequestDialog from '../components/PeriodRequestDialog'
import CancelPendingCaseDialog from '../components/CancelPendingCaseDialog'
import CancelAssignedCaseDialog from '../components/CancelAssignedCaseDialog'
import CloseCaseDialog from '../components/CloseCaseDialog'
import type { SecurityCase } from '../types/securityCase'

// 파괴적 액션 톤은 위계에 따라 셋으로 나눈다: 종결(워크플로우 전체의 최종
// 지점, 되돌릴 수 없음)만 solid red로 가장 무겁게, 접수취소/경호취소(중간에
// 이탈하는 액션)는 공용 Button의 destructive variant(빨간 테두리+옅은 배경)로
// 한 단계 낮게, 대기 중이거나 아직 불가능한 상태는 bg-secondary(테마의
// --secondary, --border와 같은 톤)로 표시한다 — bg-muted는 이 테마에서
// --background와 같은 색이라 배경이 사실상 안 보였음(2026-08-25 발견/수정).
// 종결만 solid로 남기기로 한 건 2026-08-27 사용자 결정.
//
// 원래 이 셋은 공용 Button을 안 쓰는 raw <button>(px-4.5 py-2.5 text-sm,
// 고정 높이 없음)이라 앱 표준 버튼(h-9)보다 6px 더 크게(42px) 렌더링되던
// 버그가 있었음 — 공용 Button으로 교체해 통일(2026-08-27).
const INERT_BADGE_BASE =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary px-4.5 text-button font-semibold text-muted-foreground'

interface ActionButtonsProps {
  securityCase: SecurityCase
  fullWidth?: boolean
  onCancel: () => void
  onPeriodRequest: () => void
  onClose: () => void
}

function ActionButtons({ securityCase, fullWidth, onCancel, onPeriodRequest, onClose }: ActionButtonsProps) {
  const canClose = securityCase.status === '경호완료' && Boolean(securityCase.attachments?.destructionCertFileName)
  const widthClass = fullWidth && 'w-full'

  return (
    <>
      {(securityCase.status === '접수' || securityCase.status === '배정') && (
        <Button type="button" variant="destructive" onClick={onCancel} className={cn(widthClass)}>
          {securityCase.status === '접수' ? '접수취소' : '경호취소'}
        </Button>
      )}

      {securityCase.status === '경호중' && (
        <>
          {securityCase.pendingPeriodRequest ? (
            <span className={cn(INERT_BADGE_BASE, widthClass)}>
              <span className="text-trim">
                {securityCase.pendingPeriodRequest.type} 요청 중 · 승인 대기
              </span>
            </span>
          ) : (
            <Button type="button" onClick={onPeriodRequest} className={cn(widthClass)}>
              연장/단축
            </Button>
          )}
          <span className={cn(INERT_BADGE_BASE, widthClass, 'cursor-not-allowed opacity-60')}>
            <span className="text-trim">종결</span>
          </span>
        </>
      )}

      {securityCase.status === '경호완료' && (
        <Button
          type="button"
          variant={canClose ? 'default' : 'secondary'}
          disabled={!canClose}
          onClick={onClose}
          className={cn(canClose && 'bg-destructive text-white hover:bg-destructive/90', widthClass)}
        >
          종결
        </Button>
      )}
    </>
  )
}

function SecurityCaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const caseQuery = useQuery({
    queryKey: ['security-case', id],
    queryFn: () => getSecurityCase(id!),
    enabled: Boolean(id),
  })
  const workersQuery = useQuery({ queryKey: ['workers'], queryFn: listWorkers })

  const [cancelOpen, setCancelOpen] = useState(false)
  const [periodRequestOpen, setPeriodRequestOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)

  if (caseQuery.isLoading || workersQuery.isLoading) {
    return (
      <main className="p-4 sm:p-8">
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    )
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <main className="p-4 sm:p-8">
        <p className="py-8 text-center text-sm text-destructive">경호건을 불러오지 못했습니다</p>
      </main>
    )
  }

  const securityCase = caseQuery.data
  const workers = workersQuery.data ?? []
  const managementNumber = formatManagementNumber(securityCase.receiptNumber, securityCase.securityCode)
  const canRequestPeriod = securityCase.status === '경호중' && !securityCase.pendingPeriodRequest
  const canClose = securityCase.status === '경호완료' && Boolean(securityCase.attachments?.destructionCertFileName)

  const actionProps = {
    securityCase,
    onCancel: () => setCancelOpen(true),
    onPeriodRequest: () => setPeriodRequestOpen(true),
    onClose: () => setCloseOpen(true),
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <p className="text-xs text-muted-foreground">{securityCase.policeStation}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3.5">
          <h1 className="text-xl font-bold text-foreground">{managementNumber}</h1>
          <StatusBadge status={securityCase.status} className="shrink-0" />
        </div>

        {/* 목업(s5)은 이 액션 버튼들을 모바일에서 헤더가 아니라 스크롤 맨 아래
            전체폭 버튼으로 배치한다(s5m) — 데스크톱만 헤더에 유지 */}
        <div className="hidden flex-wrap items-center gap-2.5 xl:flex">
          <ActionButtons {...actionProps} />
        </div>
      </div>

      <StatusStepper status={securityCase.status} />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="flex flex-1 flex-col gap-5">
          <BaseInfoReadCard securityCase={securityCase} />
          <DocumentsCard securityCase={securityCase} />
          {securityCase.baseInfo && <ConsentDocsCard securityCase={securityCase} workers={workers} />}
        </div>

        <WorkerAssignmentPanel securityCase={securityCase} workers={workers} />
      </div>

      <div className="flex flex-col gap-2.5 xl:hidden">
        <ActionButtons {...actionProps} fullWidth />
      </div>

      <CancelPendingCaseDialog
        securityCase={securityCase}
        open={cancelOpen && securityCase.status === '접수'}
        onOpenChange={setCancelOpen}
      />
      <CancelAssignedCaseDialog
        securityCase={securityCase}
        open={cancelOpen && securityCase.status === '배정'}
        onOpenChange={setCancelOpen}
      />
      <PeriodRequestDialog
        securityCase={securityCase}
        open={periodRequestOpen && canRequestPeriod}
        onOpenChange={setPeriodRequestOpen}
      />
      <CloseCaseDialog securityCase={securityCase} open={closeOpen && canClose} onOpenChange={setCloseOpen} />
    </main>
  )
}

export default SecurityCaseDetailPage
