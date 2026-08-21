import { useState } from 'react'
import { CheckCircle2, Circle, Search } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { assignManager } from '../api/requests'
import type { Manager } from '../api/managers'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { SecurityCase } from '../../police/types/securityCase'

interface AssignManagerDialogProps {
  targetCase: SecurityCase | null
  managers: Manager[]
  onOpenChange: (open: boolean) => void
}

function AssignManagerDialog({ targetCase, managers, onOpenChange }: AssignManagerDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const mutation = useMutation({
    mutationFn: (managerId: string) => assignManager(targetCase!.id, managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] })
      showToast('담당자가 배정되었습니다', 'success')
      handleOpenChange(false)
    },
    onError: () => {
      showToast('담당자 배정에 실패했습니다', 'error')
    },
  })

  function handleOpenChange(open: boolean) {
    if (!open) {
      setSearch('')
      setSelectedManagerId(null)
    }
    onOpenChange(open)
  }

  const filteredManagers = managers.filter((m) => m.name.includes(search.trim()))

  return (
    <Dialog open={targetCase != null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        {targetCase && (
          <>
            <DialogHeader>
              <DialogTitle>담당자 배정</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {targetCase.receiptNumber} · {targetCase.policeStation}
              </p>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="담당자 이름 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                aria-label="담당자 이름 검색"
              />
            </div>

            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
              {filteredManagers.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다
                </p>
              )}
              {filteredManagers.map((manager) => {
                const selected = selectedManagerId === manager.id
                return (
                  <button
                    key={manager.id}
                    type="button"
                    onClick={() => setSelectedManagerId(manager.id)}
                    aria-pressed={selected}
                    className={cn(
                      'flex items-center justify-between gap-2.5 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors',
                      selected
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      {selected ? (
                        <CheckCircle2 className="size-5 shrink-0 text-blue-600" />
                      ) : (
                        <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                      )}
                      <span className={cn('font-medium text-foreground', !selected && 'font-normal')}>
                        {manager.name} 본부관리자{manager.branch ? ` · ${manager.branch}` : ''}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      배정 {manager.assignedCount}건
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2.5 pt-1.5 xl:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleOpenChange(false)}
                className="flex-1 px-6 xl:flex-none"
              >
                취소
              </Button>
              <Button
                type="button"
                disabled={!selectedManagerId || mutation.isPending}
                onClick={() => selectedManagerId && mutation.mutate(selectedManagerId)}
                className="flex-1 px-6 xl:flex-none"
              >
                배정하기
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AssignManagerDialog
