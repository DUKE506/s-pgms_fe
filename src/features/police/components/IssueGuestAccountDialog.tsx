import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import {
  issueGuestAccount,
  previewNextGuestAccount,
  updateGuestAccount,
  type GuestAccount,
} from '../api/guests'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { SecurityCase } from '../types/securityCase'

type DialogTarget = { mode: 'issue' } | { mode: 'edit'; guest: GuestAccount }
export type IssueGuestDialogState = DialogTarget | null

interface IssueGuestAccountDialogProps {
  state: IssueGuestDialogState
  cases: SecurityCase[]
  onOpenChange: (open: boolean) => void
}

// 관리번호 선택 후보 = 소속 경찰서에서 경호코드가 발급된(배정 이후) 건 중
// 종결/취소되지 않은 건만 — 이미 끝난 협조 건에 새로 게스트를 할당할 이유가
// 없다(2026-08-27, 사용자 결정). 과거에(이 제약 이전에) 종결/취소 건이 이미
// 할당된 게스트 계정(예: GangnamGuest4)은 그 배정을 유지하되, 이 목록에서
// 다시 선택하거나 해제할 수는 없다.
function assignableCases(cases: SecurityCase[]): SecurityCase[] {
  return cases.filter(
    (c) => Boolean(c.securityCode) && c.status !== '종결' && c.status !== '취소',
  )
}

// Dialog가 열릴 때마다 target(발급/수정 대상)에 맞는 초깃값으로 다시 시작해야
// 해서, 이 폼을 target != null일 때만 마운트되는 별도 컴포넌트로 분리했다 —
// 그래야 useState 초기값이 매 오픈마다 새로 계산된다(부모에서 useEffect로
// setState를 미러링하는 대신, CancelPendingCaseDialog 등 기존 다이얼로그들과
// 같은 "DialogContent 안에서 target && (...)로 감싸기" 패턴).
function GuestCaseSelectionForm({
  target,
  cases,
  onOpenChange,
}: {
  target: DialogTarget
  cases: SecurityCase[]
  onOpenChange: (open: boolean) => void
}) {
  const isEdit = target.mode === 'edit'
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    target.mode === 'edit' ? target.guest.caseIds : [],
  )
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)

  // 발급 모드에서만 자동생성 아이디를 미리 조회 — 실제 생성(POST)과 같은 로직을
  // 서버에서 계산하므로 미리보기와 실제 발급 결과가 어긋나지 않는다.
  const previewQuery = useQuery({
    queryKey: ['guests', 'next-id'],
    queryFn: previewNextGuestAccount,
    enabled: !isEdit,
  })

  const mutation = useMutation({
    mutationFn: () =>
      target.mode === 'edit'
        ? updateGuestAccount(target.guest.id, selectedIds)
        : issueGuestAccount(selectedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] })
      showToast(isEdit ? '게스트 계정이 수정되었습니다' : '게스트 계정이 발급되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => {
      showToast(isEdit ? '게스트 계정 수정에 실패했습니다' : '게스트 계정 발급에 실패했습니다', 'error')
    },
  })

  function toggle(caseId: string) {
    setSelectedIds((prev) =>
      prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId],
    )
  }

  const candidates = assignableCases(cases)

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? '게스트 계정 수정' : '게스트 계정 발급'}</DialogTitle>
      </DialogHeader>

      <div className="rounded-lg bg-muted/60 p-3.5">
        <p className="mb-1 text-[11px] font-medium text-muted-foreground">
          {isEdit ? '아이디' : '자동생성 아이디'}
        </p>
        <p className="text-sm font-bold text-foreground">
          {target.mode === 'edit'
            ? target.guest.name
            : (previewQuery.data?.name ?? '불러오는 중...')}
        </p>
        {/* 게스트 계정은 아이디=초기 비밀번호로 발급하고 최초 로그인 시 변경하는
            흐름을 실제로 가져갈 예정이라(2026-08-27 결정, 강제 변경 화면 자체는
            아직 로드맵에 없어 이번 범위 밖) 발급 시점에 안내만 노출한다. */}
        {!isEdit && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            초기비밀번호는 아이디와 동일합니다
          </p>
        )}
      </div>

      <div>
        <p className="mb-2.5 text-sm font-semibold text-foreground">관리번호 선택</p>
        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
          {candidates.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              선택 가능한 경호건이 없습니다
            </p>
          )}
          {candidates.map((c) => {
            const selected = selectedIds.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                aria-pressed={selected}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                  selected ? 'border-blue-200 bg-blue-50' : 'border-border hover:bg-muted',
                )}
              >
                {selected ? (
                  <CheckCircle2 className="size-5 shrink-0 text-blue-600" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                )}
                <span className="text-foreground">
                  {formatManagementNumber(c.receiptNumber, c.securityCode)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2.5 pt-1.5 xl:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onOpenChange(false)}
          className="flex-1 px-6 xl:flex-none"
        >
          취소
        </Button>
        <Button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="flex-1 px-6 xl:flex-none"
        >
          {isEdit ? '저장' : '발급하기'}
        </Button>
      </div>
    </>
  )
}

function IssueGuestAccountDialog({ state, cases, onOpenChange }: IssueGuestAccountDialogProps) {
  return (
    <Dialog open={state != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        {state && <GuestCaseSelectionForm target={state} cases={cases} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  )
}

export default IssueGuestAccountDialog
