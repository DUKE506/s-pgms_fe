import { useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import DateField from '@/shared/components/DateField'
import { cn } from '@/lib/utils'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { CaseType } from '../types/securityCase'

const CASE_TYPES: CaseType[] = ['스토킹', '가정폭력', '교제폭력', '협박', '기타', '사건미접수']

export interface FormState {
  nameInitial: string
  gender: string
  birthYear: string
  age: string
  occupation: string
  residence: string
  caseType: CaseType | null
  caseSummary: string
  startDate: string
  endDate: string
  locResidence: string
  locWorkplace: string
  locEtc1: string
  locEtc2: string
  additionalNotes: string
  victimOfficer: string
  investigator: string
  requester: string
}

export const INITIAL_FORM_STATE: FormState = {
  nameInitial: '',
  gender: '',
  birthYear: '',
  age: '',
  occupation: '',
  residence: '',
  caseType: null,
  caseSummary: '',
  startDate: '',
  endDate: '',
  locResidence: '',
  locWorkplace: '',
  locEtc1: '',
  locEtc2: '',
  additionalNotes: '',
  victimOfficer: '',
  investigator: '',
  requester: '',
}

const REQUIRED_FIELDS: (keyof FormState)[] = [
  'nameInitial',
  'gender',
  'birthYear',
  'age',
  'occupation',
  'residence',
  'caseType',
  'caseSummary',
  'startDate',
  'endDate',
  'locResidence',
  'locWorkplace',
  'victimOfficer',
  'investigator',
  'requester',
]

const today = new Date().toISOString().slice(0, 10)

function RequiredMark() {
  return (
    <span className="text-red-500" aria-hidden="true">
      {' '}
      *
    </span>
  )
}

function FormSection({
  title,
  required,
  children,
}: {
  title: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title}
          {required && <RequiredMark />}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

function Field({
  id,
  label,
  required,
  children,
  className,
}: {
  id: string
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-1 flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <RequiredMark />}
      </Label>
      {children}
    </div>
  )
}

export interface SecurityCaseFormProps {
  initialForm: FormState
  // 경호중 이후(경호중/경호완료)엔 배치기간을 화면단에서 잠근다 — 기간 변경은
  // 경호 상세의 연장/단축 요청으로만 가능(2026-08-25 결정).
  disablePeriod?: boolean
  breadcrumb: string
  title: string
  description: string
  submitLabel: string
  onSubmit: (form: FormState) => Promise<void>
  onCancel: () => void
}

// 신규 접수(SecurityCaseNewPage)와 배치요구서 수정(SecurityCaseEditPage)이
// 공유하는 8섹션 폼. 두 화면은 초기값·제출 동작·배치기간 잠금 여부만 다르다.
function SecurityCaseForm({
  initialForm,
  disablePeriod = false,
  breadcrumb,
  title,
  description,
  submitLabel,
  onSubmit,
  onCancel,
}: SecurityCaseFormProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Set<keyof FormState>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const showToast = useToastStore((state) => state.show)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): Set<keyof FormState> {
    const missing = new Set<keyof FormState>()
    for (const field of REQUIRED_FIELDS) {
      const value = form[field]
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missing.add(field)
      }
    }
    return missing
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const missing = validate()
    setErrors(missing)
    if (missing.size > 0) {
      showToast('필수 항목을 모두 입력해주세요', 'error')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(form)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '처리에 실패했습니다', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const invalid = (field: keyof FormState) => errors.has(field)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 p-4 pb-24 sm:p-8 sm:pb-24 xl:pb-8">
      <div>
        <p className="text-xs text-muted-foreground">{breadcrumb}</p>
        <h1 className="mt-1 text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormSection title="1. 경호대상자 정보">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Field id="subject-name" label="성명 (성만 표기)" required>
              <Input
                id="subject-name"
                placeholder="홍○○"
                value={form.nameInitial}
                onChange={(e) => update('nameInitial', e.target.value)}
                aria-invalid={invalid('nameInitial')}
              />
            </Field>
            <Field id="subject-gender" label="성별" required>
              <Select value={form.gender} onValueChange={(value) => update('gender', value)}>
                <SelectTrigger id="subject-gender" aria-invalid={invalid('gender')}>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="여">여</SelectItem>
                  <SelectItem value="남">남</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field id="subject-birth-year" label="출생년도" required>
              <Input
                id="subject-birth-year"
                placeholder="1988"
                value={form.birthYear}
                onChange={(e) => update('birthYear', e.target.value)}
                aria-invalid={invalid('birthYear')}
              />
            </Field>
            <Field id="subject-age" label="나이(만)" required>
              <Input
                id="subject-age"
                placeholder="38"
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
                aria-invalid={invalid('age')}
              />
            </Field>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Field id="subject-occupation" label="직업" required>
              <Input
                id="subject-occupation"
                placeholder="회사원"
                value={form.occupation}
                onChange={(e) => update('occupation', e.target.value)}
                aria-invalid={invalid('occupation')}
              />
            </Field>
            <Field id="subject-residence" label="거주지" required className="sm:flex-[2]">
              <Input
                id="subject-residence"
                placeholder="서울 강남구 테헤란로 123"
                value={form.residence}
                onChange={(e) => update('residence', e.target.value)}
                aria-invalid={invalid('residence')}
              />
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground">
            개인정보 최소화 원칙에 따라 성명은 성만 입력합니다.
          </p>
        </FormSection>

        <FormSection title="2. 사건유형" required>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CASE_TYPES.map((type) => {
              const selected = form.caseType === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => update('caseType', type)}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                    selected
                      ? 'border-blue-200 bg-blue-50 text-foreground'
                      : invalid('caseType')
                        ? 'border-destructive/50 text-muted-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {selected ? (
                    <CheckCircle2 className="size-5 shrink-0 text-blue-600" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className={selected ? 'font-medium text-foreground' : ''}>{type}</span>
                </button>
              )
            })}
          </div>
        </FormSection>

        <FormSection title="3. 사건개요" required>
          <Textarea
            aria-label="사건개요"
            placeholder="스토킹 피해 신고 이후 지속적인 접근 시도가 확인되어 신변보호 조치가 필요함."
            className="min-h-24"
            value={form.caseSummary}
            onChange={(e) => update('caseSummary', e.target.value)}
            aria-invalid={invalid('caseSummary')}
          />
        </FormSection>

        <FormSection title="4. 배치기간">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Field id="start-date" label="시작일" required>
              <DateField
                id="start-date"
                placeholder="시작일 선택"
                value={form.startDate}
                onChange={(value) => update('startDate', value)}
                maxDate={form.endDate}
                aria-invalid={invalid('startDate')}
                disabled={disablePeriod}
              />
            </Field>
            <Field id="end-date" label="종료일" required>
              <DateField
                id="end-date"
                placeholder="종료일 선택"
                value={form.endDate}
                onChange={(value) => update('endDate', value)}
                minDate={form.startDate}
                aria-invalid={invalid('endDate')}
                disabled={disablePeriod}
              />
            </Field>
          </div>
          {disablePeriod && (
            <p className="text-[11px] text-muted-foreground">
              경호중 이후에는 배치기간을 수정할 수 없습니다. 기간 변경은 경호 상세의 연장/단축
              요청을 이용하세요.
            </p>
          )}
        </FormSection>

        <FormSection title="5. 배치장소">
          <Field id="loc-residence" label="주거지" required>
            <Input
              id="loc-residence"
              placeholder="서울 강남구 테헤란로 123"
              value={form.locResidence}
              onChange={(e) => update('locResidence', e.target.value)}
              aria-invalid={invalid('locResidence')}
            />
          </Field>
          <Field id="loc-workplace" label="직장지" required>
            <Input
              id="loc-workplace"
              placeholder="서울 강남구 역삼로 45 (○○빌딩)"
              value={form.locWorkplace}
              onChange={(e) => update('locWorkplace', e.target.value)}
              aria-invalid={invalid('locWorkplace')}
            />
          </Field>
          <Field id="loc-etc1" label="기타1">
            <Input
              id="loc-etc1"
              placeholder="이동경로, 기타 장소 등"
              value={form.locEtc1}
              onChange={(e) => update('locEtc1', e.target.value)}
            />
          </Field>
          <Field id="loc-etc2" label="기타2">
            <Input
              id="loc-etc2"
              placeholder="이동경로, 기타 장소 등"
              value={form.locEtc2}
              onChange={(e) => update('locEtc2', e.target.value)}
            />
          </Field>
        </FormSection>

        <FormSection title="6. 기타참고사항">
          <Textarea
            aria-label="기타참고사항"
            placeholder="가해자 위험도 등 추가참고사항"
            value={form.additionalNotes}
            onChange={(e) => update('additionalNotes', e.target.value)}
          />
        </FormSection>

        <FormSection title="7. 경찰서 수사관정보">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Field id="victim-officer" label="피해자전담경찰관" required>
              <Input
                id="victim-officer"
                placeholder="홍길동 / 계급 / 010XXXXXXXX"
                value={form.victimOfficer}
                onChange={(e) => update('victimOfficer', e.target.value)}
                aria-invalid={invalid('victimOfficer')}
              />
            </Field>
            <Field id="investigator" label="수사관" required>
              <Input
                id="investigator"
                placeholder="홍길동 / 계급 / 010XXXXXXXX"
                value={form.investigator}
                onChange={(e) => update('investigator', e.target.value)}
                aria-invalid={invalid('investigator')}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="8. 작성 정보">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Field id="written-date" label="배치요구서 작성일">
              <Input id="written-date" value={today} disabled />
            </Field>
            <Field id="requester" label="요구자" required className="sm:flex-[2]">
              <Input
                id="requester"
                placeholder="안양동안경찰서 여청과 여청계 경사 홍길동"
                value={form.requester}
                onChange={(e) => update('requester', e.target.value)}
                aria-invalid={invalid('requester')}
              />
            </Field>
          </div>
        </FormSection>

        <div className="flex gap-2.5 xl:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1 px-6 xl:flex-none"
          >
            취소
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1 px-6 xl:flex-none">
            {submitLabel}
          </Button>
        </div>
      </form>
    </main>
  )
}

export default SecurityCaseForm
