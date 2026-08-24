import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '10', '20', '30', '40', '50']

interface HourMinuteSelectProps {
  value: string // "HH:MM"
  onChange: (value: string) => void
  ariaLabel: string
  disabled?: boolean
}

// "09:00" 같은 시:분 문자열을 시/분 두 개의 select로 나눠 입력받는다 — 자유
// 텍스트 입력 대신 사용해 오탈자(예: "9시30" 같은 값)를 방지한다.
function HourMinuteSelect({ value, onChange, ariaLabel, disabled }: HourMinuteSelectProps) {
  const [hour, minute] = value.split(':')

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={HOURS.includes(hour) ? hour : '09'}
        onValueChange={(next) => onChange(`${next}:${MINUTES.includes(minute) ? minute : '00'}`)}
        disabled={disabled}
      >
        <SelectTrigger aria-label={`${ariaLabel} 시`} className="w-[92px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}시
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={MINUTES.includes(minute) ? minute : '00'}
        onValueChange={(next) => onChange(`${HOURS.includes(hour) ? hour : '09'}:${next}`)}
        disabled={disabled}
      >
        <SelectTrigger aria-label={`${ariaLabel} 분`} className="w-[92px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}분
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default HourMinuteSelect
