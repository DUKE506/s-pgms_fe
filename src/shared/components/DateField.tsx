import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateFieldProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  // yyyy-MM-dd, inclusive — 배치기간처럼 시작일/종료일 쌍을 이루는 필드에서
  // 서로를 넘어가지 못하게 상대편 값을 넘겨준다(2026-08-28).
  minDate?: string
  maxDate?: string
  'aria-invalid'?: boolean
  'aria-label'?: string
}

// react-day-picker는 로컬 타임존 기준 Date를 주고받는다. yyyy-MM-dd 문자열 ↔ Date
// 변환을 UTC(toISOString)로 하면 KST처럼 UTC+ 타임존에서 로컬 자정 Date가 전날로
// 밀리는 버그가 난다(과거 WorkerAssignmentPanel/PeriodRequestDialog에서 실제로
// 겪은 문제) — 그래서 여기선 양방향 다 로컬 getter/생성자만 쓴다.
function parseDateOnly(value: string): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

function formatDateOnly(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(date: Date): string {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

// type="date" 네이티브 입력을 대체하는 캘린더 기반 날짜 선택 컴포넌트. Input과
// 동일한 시각 스타일(테두리/높이/포커스링/모바일 16px 규칙)을 그대로 가져가되
// placeholder 커스텀이 가능하다(네이티브 date input은 이게 불가능했음, 2026-08-28).
function DateField({
  id,
  value,
  onChange,
  placeholder = '날짜 선택',
  disabled,
  className,
  minDate,
  maxDate,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
}: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const selected = parseDateOnly(value)
  const minDateObj = parseDateOnly(minDate ?? '')
  const maxDateObj = parseDateOnly(maxDate ?? '')
  const calendarDisabled: Array<{ before: Date } | { after: Date }> = [
    ...(minDateObj ? [{ before: minDateObj }] : []),
    ...(maxDateObj ? [{ after: maxDateObj }] : []),
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          className={cn(
            'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-field dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
            selected ? 'text-foreground' : 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          {selected ? formatDisplay(selected) : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          disabled={calendarDisabled.length > 0 ? calendarDisabled : undefined}
          onSelect={(date) => {
            if (!date) return
            onChange(formatDateOnly(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export default DateField
