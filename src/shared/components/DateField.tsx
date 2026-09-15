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
  // 캘린더 캡션을 눌러 9칸 연도 그리드로 이동할 수 있게 한다 — 생년월일처럼 오늘에서
  // 수십 년 떨어진 날짜를 고르는 필드에서만 켠다(text variant에서는 무시).
  yearGrid?: boolean
  // 기본은 'text'(숫자만 입력받아 yyyy.MM.dd로 자동 포맷, 2026-09-11 운영팀 요청).
  // 이력 조회 등 기간 필터에서만 'calendar'로 캘린더 팝오버를 쓴다.
  variant?: 'text' | 'calendar'
  'aria-invalid'?: boolean
  'aria-label'?: string
}

// Input/DateField 공통 시각 스타일(테두리·h-9·포커스링·text-field 13px). text/calendar
// 두 variant가 같은 모양이 되도록 한 곳에서 관리한다. 모바일 iOS 자동확대 방지용
// 16px 예외는 뷰포트 user-scalable=no로 대체돼 제거함(2026-09-15).
const FIELD_CLASS =
  'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-field transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40'

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

// ── text variant 헬퍼 ────────────────────────────────────────────────────────
// 화면에는 yyyy.MM.dd로 보여주고 부모에는 기존과 동일하게 yyyy-MM-dd를 올린다
// (서버 전송 로직은 그대로 재사용). 미완성 입력은 빈 문자열로 올려 폼 필수 검증에 걸리게 한다.

function isoToDigits(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? m[1] + m[2] + m[3] : ''
}

function digitsToIso(digits: string): string {
  if (digits.length !== 8) return ''
  const y = Number(digits.slice(0, 4))
  const mo = Number(digits.slice(4, 6))
  const d = Number(digits.slice(6, 8))
  if (mo < 1 || mo > 12) return ''
  // new Date(y, mo, 0) = 해당 월의 마지막 날(윤년 반영). y는 4자리라 2자리 연도
  // 리매핑(0~99 → 1900+) 걱정 없음.
  const lastDay = new Date(y, mo, 0).getDate()
  if (d < 1 || d > lastDay) return ''
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

function formatDigits(digits: string): string {
  const y = digits.slice(0, 4)
  const mo = digits.slice(4, 6)
  const d = digits.slice(6, 8)
  if (digits.length <= 4) return y
  if (digits.length <= 6) return `${y}.${mo}`
  return `${y}.${mo}.${d}`
}

function withinRange(iso: string, minDate?: string, maxDate?: string): boolean {
  if (minDate && iso < minDate) return false
  if (maxDate && iso > maxDate) return false
  return true
}

function DateTextField({
  id,
  value,
  onChange,
  disabled,
  className,
  minDate,
  maxDate,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
}: DateFieldProps) {
  const [digits, setDigits] = useState(() => isoToDigits(value))
  // 렌더 중 상태 조정(React 공식 패턴) — 부모 value가 밖에서 바뀌면(프리필·상대편
  // 값에 의한 클램프) 표시를 맞춘다. 사용자가 타이핑 중인 미완성 상태(digits가
  // 완성 iso와 불일치)는 그대로 둔다. useEffect로 하면 커밋 후 한 번 더 렌더가
  // 도는 cascading render라 렌더 중 setState로 처리한다.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue && digitsToIso(digits) !== value) {
    setPrevValue(value)
    setDigits(isoToDigits(value))
  } else if (value !== prevValue) {
    setPrevValue(value)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value.replace(/\D/g, '').slice(0, 8)
    setDigits(next)
    const iso = digitsToIso(next)
    onChange(iso && withinRange(iso, minDate, maxDate) ? iso : '')
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      aria-invalid={ariaInvalid}
      aria-label={ariaLabel}
      placeholder="YYYY.MM.DD"
      value={formatDigits(digits)}
      onChange={handleChange}
      className={cn(FIELD_CLASS, className)}
    />
  )
}

// ── calendar variant ────────────────────────────────────────────────────────
function DateCalendarField({
  id,
  value,
  onChange,
  placeholder = '날짜 선택',
  disabled,
  className,
  minDate,
  maxDate,
  yearGrid = false,
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
            FIELD_CLASS,
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
          yearGrid={yearGrid}
          startMonth={yearGrid ? minDateObj : undefined}
          endMonth={yearGrid ? maxDateObj : undefined}
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

// 날짜 입력 컴포넌트. 기본은 숫자만 입력받아 yyyy.MM.dd로 자동 포맷하는 텍스트형이고
// (2026-09-11 운영팀 요청), 이력 조회 기간 필터처럼 달력이 필요한 곳만 variant="calendar".
function DateField(props: DateFieldProps) {
  return props.variant === 'calendar' ? (
    <DateCalendarField {...props} />
  ) : (
    <DateTextField {...props} />
  )
}

export default DateField
