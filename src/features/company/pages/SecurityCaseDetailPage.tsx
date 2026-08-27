import { useState } from 'react'
import { useParams } from 'react-router'
import { FileText, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import StatusBadge from '@/shared/components/StatusBadge'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { getSecurityCase } from '../api/securityCaseDetail'
import { listWorkers } from '../api/workers'
import BaseInfoForm from '../components/BaseInfoForm'
import BaseInfoSummaryCard from '../components/BaseInfoSummaryCard'
import ScheduleSection from '../components/ScheduleSection'
import ScheduleInitDialog from '../components/ScheduleInitDialog'
import ScheduleGroupDialog from '../components/ScheduleGroupDialog'
import AttachmentsSection from '../components/AttachmentsSection'
import CancelAssignedCaseDialog from '../components/CancelAssignedCaseDialog'
import type { ScheduleGroup } from '../../police/types/securityCase'

interface GroupDialogState {
  date: string
  group: ScheduleGroup | null
}

function SecurityCaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const caseQuery = useQuery({
    queryKey: ['security-case', id],
    queryFn: () => getSecurityCase(id!),
    enabled: Boolean(id),
  })
  const workersQuery = useQuery({ queryKey: ['workers'], queryFn: listWorkers })

  const [editingBaseInfo, setEditingBaseInfo] = useState(false)
  const [scheduleInitOpen, setScheduleInitOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [groupDialog, setGroupDialog] = useState<GroupDialogState | null>(null)
  // ScheduleGroupDialog는 상시 마운트된 채 open만 토글되므로, 그 내부 useState(특이사항/
  // 근무자 목록)가 대상 그룹이 바뀔 때 새로 초기화되도록 key로 강제 리마운트시킨다. 닫힐 때는
  // (openGroupDialog 호출 없이 onOpenChange(false)만 오므로) key를 그대로 둬서 Radix의
  // 닫힘 애니메이션이 끊기지 않게 한다.
  const [groupDialogKey, setGroupDialogKey] = useState('none-new')

  function openGroupDialog(next: GroupDialogState) {
    setGroupDialog(next)
    setGroupDialogKey(`${next.date}-${next.group?.id ?? 'new'}`)
  }

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
  const managementNumber = formatManagementNumber(
    securityCase.receiptNumber,
    securityCase.securityCode,
  )

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <p className="text-xs text-muted-foreground">
        경호관리 / {managementNumber}
        {editingBaseInfo && ' / 기본정보 등록'}
      </p>

      {/* BaseInfoForm(폼)은 목업상 760px로 좁게 디자인돼 있어 자체적으로
          mx-auto max-w-3xl을 갖고 있음 — 여기선 폭을 제한하지 않아야
          요약/스케줄/첨부 뷰가 XL에서 전체 폭을 쓴다 */}
      <div className="flex flex-col gap-5">
        {!editingBaseInfo && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <h1 className="text-xl font-bold text-foreground">{managementNumber}</h1>
              <StatusBadge status={securityCase.status} />
            </div>
            {securityCase.status === '배정' && (
              <Button type="button" variant="destructive" onClick={() => setCancelOpen(true)}>
                경호취소
              </Button>
            )}
          </div>
        )}

        {editingBaseInfo ? (
          <BaseInfoForm
            securityCase={securityCase}
            workers={workers}
            onCancel={() => setEditingBaseInfo(false)}
            onRegistered={() => setEditingBaseInfo(false)}
          />
        ) : !securityCase.baseInfo ? (
          <div className="flex flex-col items-center gap-3.5 rounded-xl border border-border bg-card px-6 py-16 text-center">
            <FileText className="size-9 text-muted-foreground/40" />
            <div className="text-[15px] font-bold text-foreground">
              기본정보가 등록되지 않았습니다
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              배치요구서를 확인한 후 기본정보를 등록하면 경호계획서·근무 스케줄·파기확인서
              섹션이 나타납니다.
            </p>
            <Button type="button" onClick={() => setEditingBaseInfo(true)} className="mt-1.5">
              <Plus className="size-3.5" />
              기본정보 등록
            </Button>
          </div>
        ) : (
          <>
            <BaseInfoSummaryCard
              securityCase={securityCase}
              workers={workers}
              onEdit={() => setEditingBaseInfo(true)}
            />

            {!securityCase.workSchedule ? (
              <div className="flex flex-col items-center gap-3.5 rounded-xl border border-border bg-card px-6 py-16 text-center">
                <FileText className="size-9 text-muted-foreground/40" />
                <div className="text-[15px] font-bold text-foreground">
                  등록된 근무 스케줄이 없습니다
                </div>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  배치기간과 근무시간을 입력하면 기본정보에 지정된 기본 근무자가 해당 기간에
                  자동으로 배정됩니다.
                </p>
                <Button type="button" onClick={() => setScheduleInitOpen(true)} className="mt-1.5">
                  <Plus className="size-3.5" />
                  스케줄 정보 입력
                </Button>
              </div>
            ) : (
              <>
                <ScheduleSection
                  securityCase={securityCase}
                  workers={workers}
                  onAddGroup={(date) => openGroupDialog({ date, group: null })}
                  onEditGroup={(date, group) => openGroupDialog({ date, group })}
                />
                <AttachmentsSection securityCase={securityCase} workers={workers} />
              </>
            )}
          </>
        )}
      </div>

      <ScheduleInitDialog
        securityCase={securityCase}
        open={scheduleInitOpen}
        onOpenChange={setScheduleInitOpen}
      />
      <CancelAssignedCaseDialog
        securityCase={securityCase}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
      <ScheduleGroupDialog
        key={groupDialogKey}
        securityCase={securityCase}
        workers={workers}
        date={groupDialog?.date ?? null}
        group={groupDialog?.group ?? null}
        onOpenChange={(open) => !open && setGroupDialog(null)}
      />
    </main>
  )
}

export default SecurityCaseDetailPage
