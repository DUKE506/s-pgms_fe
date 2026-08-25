import { useState } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
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

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <p className="text-xs text-muted-foreground">{securityCase.policeStation}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3.5">
          <h1 className="text-xl font-bold text-foreground">{managementNumber}</h1>
          <StatusBadge status={securityCase.status} className="shrink-0" />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {(securityCase.status === '접수' || securityCase.status === '배정') && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="rounded-lg bg-destructive px-4.5 py-2.5 text-sm font-semibold text-white hover:bg-destructive/90"
            >
              경호 취소
            </button>
          )}

          {securityCase.status === '경호중' && (
            <>
              {securityCase.pendingPeriodRequest ? (
                <span className="rounded-lg border border-border bg-muted px-4.5 py-2.5 text-sm font-semibold text-muted-foreground">
                  {securityCase.pendingPeriodRequest.type} 요청 중 · 승인 대기
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPeriodRequestOpen(true)}
                  className="rounded-lg bg-primary px-4.5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/80"
                >
                  연장/단축
                </button>
              )}
              <span className="cursor-not-allowed rounded-lg border border-border px-4.5 py-2.5 text-sm font-semibold text-muted-foreground/40">
                종결
              </span>
            </>
          )}

          {securityCase.status === '경호완료' && (
            <button
              type="button"
              disabled={!canClose}
              onClick={() => setCloseOpen(true)}
              className={cn(
                'rounded-lg px-4.5 py-2.5 text-sm font-semibold',
                canClose
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : 'cursor-not-allowed border border-border text-muted-foreground/40',
              )}
            >
              종결
            </button>
          )}
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
