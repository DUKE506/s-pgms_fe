import { useState } from 'react'
import { CalendarIcon, X } from 'lucide-react'
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

// 시작일/종료일처럼 상대편 값을 minDate·maxDate로 받는 필드에서, 입력이 그
// 범위를 벗어났을 때 보여줄 문구. 필드가 "시작일"인지 "종료일"인지는 모르므로
// 경계값 기준으로만 안내한다.
function rangeErrorMessage(minDate?: string, maxDate?: string): string {
  const minObj = parseDateOnly(minDate ?? '')
  const maxObj = parseDateOnly(maxDate ?? '')
  if (minObj && maxObj) {
    return `${formatDisplay(minObj)} ~ ${formatDisplay(maxObj)} 사이의 날짜를 입력하세요`
  }
  if (minObj) return `${formatDisplay(minObj)} 이후 날짜를 입력하세요`
  if (maxObj) return `${formatDisplay(maxObj)} 이전 날짜를 입력하세요`
  return ''
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
  const [prevValue, setPrevValue] = useState(value)

  // 8자리가 다 채워졌는데 minDate/maxDate 범위를 벗어난 경우 — 실시간으로(타이핑
  // 완료 즉시) 안내 문구를 보여준다. submit까지 기다리면 이 입력이 그냥 빈 값으로
  // 사라진 이유를 사용자가 알 수 없다(2026-09-18 버그 리포트: 종료일이 시작일보다
  // 빠른 날짜를 입력해도 아무 표시 없이 조용히 지워짐).
  const parsedIso = digitsToIso(digits)
  const rangeInvalid = digits.length === 8 && parsedIso !== '' && !withinRange(parsedIso, minDate, maxDate)

  // 렌더 중 상태 조정(React 공식 패턴) — 부모 value가 밖에서 바뀌면(프리필·상대편
  // 값에 의한 클램프) 표시를 맞춘다. 사용자가 타이핑 중인 미완성 상태와, 범위를
  // 벗어나 onChange('')로 되돌아온 직후(rangeInvalid)는 사용자가 고칠 수 있게
  // 입력값을 그대로 둔다. useEffect로 하면 커밋 후 한 번 더 렌더가 도는 cascading
  // render라 렌더 중 setState로 처리한다.
  if (value !== prevValue && !rangeInvalid && parsedIso !== value) {
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
    <div className={cn('flex flex-col gap-1', className)}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        aria-invalid={ariaInvalid || rangeInvalid}
        aria-label={ariaLabel}
        placeholder="YYYY.MM.DD"
        value={formatDigits(digits)}
        onChange={handleChange}
        className={FIELD_CLASS}
      />
      {rangeInvalid && (
        <p role="alert" className="text-[11px] text-destructive">
          {rangeErrorMessage(minDate, maxDate)}
        </p>
      )}
    </div>
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

  // 선택된 날짜가 있으면 필드 오른쪽에 개별 해제(X) 버튼을 보여준다 — 화면 전체를
  // 한번에 되돌리는 "초기화" 버튼 대신, 이 필드 하나만 지울 수 있게 한다(2026-09-18
  // 사용자 결정: 다른 필터들도 각자 독립적으로 "전체"로 되돌릴 수 있는데 기간만
  // 예외라 통일).
  return (
    <div className={cn('relative rounded-lg', className)}>
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
              'w-full',
              selected ? 'pr-7 text-foreground' : 'text-muted-foreground',
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
      {selected && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onChange('')
          }}
          aria-label={`${ariaLabel ?? placeholder} 지우기`}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
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
