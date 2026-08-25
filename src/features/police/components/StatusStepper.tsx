import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SecurityCaseStatus } from '../types/securityCase'

const STEPS: SecurityCaseStatus[] = ['접수', '배정', '경호중', '경호완료', '종결']

interface StatusStepperProps {
  status: SecurityCaseStatus
}

// 목업(s5) 상단 5단계 진행 스테퍼 — 취소 상태는 이 화면에 노출되지 않으므로
// (경호목록에서 제외) 다루지 않는다.
function StatusStepper({ status }: StatusStepperProps) {
  const currentIndex = STEPS.indexOf(status)

  return (
    <div className="flex items-center rounded-xl border border-border bg-card px-5 py-5.5 sm:px-7">
      {STEPS.map((step, index) => (
        <div key={step} className="flex flex-1 items-center last:flex-initial">
          <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 sm:w-24">
            <div
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-xs font-bold sm:size-7',
                index < currentIndex && 'bg-primary text-primary-foreground',
                index === currentIndex &&
                  'size-7 bg-primary text-primary-foreground ring-4 ring-primary/15 sm:size-8',
                index > currentIndex && 'bg-muted text-muted-foreground',
              )}
            >
              {index < currentIndex ? <Check className="size-3.5" /> : index === currentIndex ? '●' : index + 1}
            </div>
            <span
              className={cn(
                'text-[11px] font-medium text-muted-foreground',
                index === currentIndex && 'font-bold text-foreground',
              )}
            >
              {step}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div className={cn('h-0.5 flex-1', index < currentIndex ? 'bg-primary' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  )
}

export default StatusStepper
