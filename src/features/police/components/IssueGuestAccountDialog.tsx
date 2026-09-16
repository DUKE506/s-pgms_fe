import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import LoadingOverlay from '@/shared/components/LoadingOverlay'
import { cn } from '@/lib/utils'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import {
  getGuestCaseAccess,
  issueGuestAccount,
  listGuestCaseCandidates,
  updateGuestAccount,
  type GuestAccount,
  type GuestCaseCandidate,
} from '../api/guests'
import { useToastStore } from '../../../shared/hooks/useToastStore'

type DialogTarget = { mode: 'issue' } | { mode: 'edit'; guest: GuestAccount }
export type IssueGuestDialogState = DialogTarget | null

interface IssueGuestAccountDialogProps {
  state: IssueGuestDialogState
  onOpenChange: (open: boolean) => void
}

function candidateLabel(row: GuestCaseCandidate): string {
  return row.mgmtNo ? formatManagementNumber(row.mgmtNo, row.guardCode) : row.guardCode
}

// Dialog가 열릴 때마다 target(발급/수정 대상)에 맞는 초깃값으로 다시 시작해야
// 해서, 이 폼을 target != null일 때만 마운트되는 별도 컴포넌트로 분리했다 —
// 그래야 useState 초기값과 쿼리가 매 오픈마다 새로 계산된다.
function GuestCaseSelectionForm({
  target,
  onOpenChange,
}: {
  target: DialogTarget
  onOpenChange: (open: boolean) => void
}) {
  const isEdit = target.mode === 'edit'
  const editUserSeq = target.mode === 'edit' ? target.guest.userSeq : null
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)

  // 발급/수정 후보는 같은 집합(소속 경찰서·종결/취소 제외) — 발급용에서 라벨(관리번호)을,
  // 수정용에서 현재 부여 상태(isAccess)를 가져와 caseSeq로 머지한다.
  const candidatesQuery = useQuery({
    queryKey: ['guest-case-candidates'],
    queryFn: listGuestCaseCandidates,
  })
  const accessQuery = useQuery({
    queryKey: ['guest-case-access', editUserSeq],
    queryFn: () => getGuestCaseAccess(editUserSeq!),
    enabled: isEdit,
  })

  const [selectedSeqs, setSelectedSeqs] = useState<Set<number> | null>(null)
  const [memo, setMemo] = useState(target.mode === 'edit' ? (target.guest.memo ?? '') : '')

  const candidates = candidatesQuery.data ?? []
  const accessRows = accessQuery.data ?? []
  // 수정 모드: 후보에 없는데 부여돼 있는 건(엣지)도 회수 대상으로 렌더한다.
  const candidateSeqs = new Set(candidates.map((c) => c.caseSeq))
  const rows: GuestCaseCandidate[] = isEdit
    ? [...candidates, ...accessRows.filter((a) => !candidateSeqs.has(a.caseSeq))]
    : candidates

  const initialSelected = new Set(
    isEdit ? accessRows.filter((a) => a.isAccess).map((a) => a.caseSeq) : [],
  )
  const selected = selectedSeqs ?? initialSelected

  const mutation = useMutation({
    mutationFn: () => {
      if (target.mode === 'edit') {
        const accessList = rows.map((r) => ({
          caseSeq: r.caseSeq,
          guardCode: r.guardCode,
          isAccess: selected.has(r.caseSeq),
        }))
        return updateGuestAccount(target.guest.userSeq, accessList, memo)
      }
      return issueGuestAccount([...selected], memo)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] })
      showToast(isEdit ? '게스트 계정이 수정되었습니다' : '게스트 계정이 발급되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => {
      showToast(isEdit ? '게스트 계정 수정에 실패했습니다' : '게스트 계정 발급에 실패했습니다', 'error')
    },
  })

  function toggle(caseSeq: number) {
    const next = new Set(selected)
    if (next.has(caseSeq)) next.delete(caseSeq)
    else next.add(caseSeq)
    setSelectedSeqs(next)
  }

  const listLoading = candidatesQuery.isLoading || (isEdit && accessQuery.isLoading)

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
          {target.mode === 'edit' ? target.guest.name : '발급 시 자동으로 생성됩니다'}
        </p>
        {/* 게스트 계정은 아이디=초기 비밀번호로 발급하고 최초 로그인 시 변경하는
            흐름(2026-08-27 결정, 강제 변경 화면은 아직 로드맵에 없어 이번 범위 밖) —
            발급 시점에 안내만 노출한다. */}
        {!isEdit && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            초기비밀번호는 아이디와 동일합니다
          </p>
        )}
      </div>

      <div>
        <label htmlFor="guest-memo" className="mb-1.5 block text-sm font-semibold text-foreground">
          비고
        </label>
        <Textarea
          id="guest-memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="사용 부서·협조 목적 등을 적어두면 나중에 알아보기 쉽습니다"
        />
      </div>

      <div>
        <p className="mb-2.5 text-sm font-semibold text-foreground">관리번호 선택</p>
        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
          {listLoading && (
            <p className="py-4 text-center text-sm text-muted-foreground">불러오는 중...</p>
          )}
          {!listLoading && rows.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              선택 가능한 경호건이 없습니다
            </p>
          )}
          {!listLoading &&
            rows.map((c) => {
              const isSelected = selected.has(c.caseSeq)
              return (
                <button
                  key={c.caseSeq}
                  type="button"
                  onClick={() => toggle(c.caseSeq)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                    isSelected ? 'border-blue-200 bg-blue-50' : 'border-border hover:bg-muted',
                  )}
                >
                  {isSelected ? (
                    <CheckCircle2 className="size-5 shrink-0 text-blue-600" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className="text-foreground">{candidateLabel(c)}</span>
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
      <LoadingOverlay show={mutation.isPending} variant={isEdit ? '저장' : '발급'} />
    </>
  )
}

function IssueGuestAccountDialog({ state, onOpenChange }: IssueGuestAccountDialogProps) {
  return (
    <Dialog open={state != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        {state && <GuestCaseSelectionForm target={state} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  )
}

export default IssueGuestAccountDialog
