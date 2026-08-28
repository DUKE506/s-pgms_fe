import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { requestPeriodChange } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { SecurityCase } from '../types/securityCase'

function toDateOnly(iso: string) {
  return iso.slice(0, 10)
}

// UTC 기준으로 계산해야 한다 — 로컬 타임존(KST=UTC+9)에서 로컬 자정을 만들고
// toISOString()으로 변환하면 전날로 밀려서(예: "2026-01-05" 로컬 자정 →
// "2026-01-04T15:00:00Z") 날짜가 실제로 전진하지 않아 무한루프가 될 수 있다
// (mocks/data/securityCases.ts의 nextDate와 동일한 패턴).
function addDays(dateOnly: string, days: number): string {
  const d = new Date(`${dateOnly}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return toDateOnly(d.toISOString())
}

function formatDate(dateOnly: string) {
  const d = new Date(`${dateOnly}T00:00:00`)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function formatShort(dateOnly: string) {
  const d = new Date(`${dateOnly}T00:00:00`)
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  let cursor = startDate
  while (cursor <= endDate) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

interface PeriodRequestDialogProps {
  securityCase: SecurityCase
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 목업 s5-ext/s5-ext-short(데스크톱)·s5m-ext/s5m-ext-short(모바일)를 하나의
// Dialog로 통합 구현 — 연장은 7일 단위 고정, 단축은 배치기간 내 날짜 선택.
// 제출해도 즉시 반영되지 않고 본사 승인을 기다리는 요청만 생성한다(2026-08-25
// 결정, 승인 화면은 후속 항목).
function PeriodRequestDialog({ securityCase, open, onOpenChange }: PeriodRequestDialogProps) {
  const [tab, setTab] = useState<'연장' | '단축'>('연장')
  const extendedEndDate = addDays(securityCase.endDate, 7)
  const shortenChoices = dateRange(securityCase.startDate, securityCase.endDate)
  const [shortenDate, setShortenDate] = useState(() => {
    const dayBefore = addDays(securityCase.endDate, -1)
    return dayBefore >= securityCase.startDate ? dayBefore : securityCase.endDate
  })

  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const mutation = useMutation({
    mutationFn: (requestedEndDate: string) =>
      requestPeriodChange(securityCase.id, tab, requestedEndDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-case', securityCase.id] })
      showToast('요청이 접수되어 본사 승인을 기다립니다', 'success')
      onOpenChange(false)
    },
    onError: () => showToast(`${tab} 요청에 실패했습니다`, 'error'),
  })

  function handleSubmit() {
    mutation.mutate(tab === '연장' ? extendedEndDate : shortenDate)
  }

  const canSubmitShorten = tab === '단축' && shortenDate < securityCase.endDate

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>경호기간 연장/단축</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {formatManagementNumber(securityCase.receiptNumber, securityCase.securityCode)}
          </p>
        </DialogHeader>

        <div className="flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setTab('연장')}
            className={cn(
              'flex-1 rounded-md py-2 text-sm font-semibold',
              tab === '연장' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            연장
          </button>
          <button
            type="button"
            onClick={() => setTab('단축')}
            className={cn(
              'flex-1 rounded-md py-2 text-sm font-semibold',
              tab === '단축' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            단축
          </button>
        </div>

        {tab === '연장' ? (
          <>
            <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3.5 text-sm">
              <span className="text-muted-foreground">현재 경호기간</span>
              <span className="font-semibold text-foreground">
                {formatDate(securityCase.startDate)} ~ {formatDate(securityCase.endDate)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3.5 text-sm">
              <span className="text-muted-foreground">연장 후 경호기간</span>
              <span className="font-semibold text-blue-600">
                {formatDate(securityCase.startDate)} ~ {formatDate(extendedEndDate)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">7일 단위로 연장됩니다.</p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3.5 text-sm">
              <span className="text-muted-foreground">배치기간</span>
              <span className="font-semibold text-foreground">
                {formatDate(securityCase.startDate)} ~ {formatDate(securityCase.endDate)}
              </span>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                새 종료일 선택 (배치기간 내에서만 선택 가능)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {shortenChoices.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setShortenDate(d)}
                    className={cn(
                      'rounded-lg border px-2.5 py-2 text-[11px] font-medium',
                      shortenDate === d
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : d === securityCase.endDate
                          ? 'border-border text-foreground'
                          : 'border-border text-muted-foreground',
                    )}
                  >
                    {formatShort(d)}
                    {d === securityCase.endDate && '(현재)'}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                단축은 현재 배치기간({formatDate(securityCase.startDate)}~{formatDate(securityCase.endDate)}) 내의
                날짜만 선택할 수 있습니다.
              </p>
            </div>
          </>
        )}

        <div className="mt-1.5 flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="px-5">
            취소
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending || (tab === '단축' && !canSubmitShorten)}
            onClick={handleSubmit}
            className="px-5"
          >
            {tab} 요청
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PeriodRequestDialog
