import { useState, type ReactNode } from 'react'
import { CheckCircle2, Circle, Plus, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { cn } from '@/lib/utils'
import { registerBaseInfo } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import DispatchRequestViewDialog from './DispatchRequestViewDialog'
import HourMinuteSelect from './HourMinuteSelect'
import type { Worker } from '../api/workers'
import type {
  CaseBaseInfo,
  CaseWorkerAssignment,
  MeasurePeriod,
  SecurityCase,
} from '../../police/types/securityCase'

const EMPTY_PERIOD: MeasurePeriod = { startDate: '', endDate: '' }

const SAFETY_MEASURES = ['맞춤형 순찰', '임시숙소', '스마트워치', 'CCTV']
const EMERGENCY_MEASURES = ['1호', '2호']
const PROVISIONAL_MEASURES = ['1호', '2호', '3호', '3-2호', '4호', '신청예정']
const EMERGENCY_TEMP_MEASURES = ['1호', '2호', '3호']
const TEMPORARY_MEASURES = ['1호', '2호', '3호', '5호', '신청예정']

function splitContact(value: string): { name: string; phone: string } {
  const parts = value.split(' / ').map((p) => p.trim())
  return { name: parts[0] ?? '', phone: parts[2] ?? '' }
}

interface FormState {
  workHours: string
  workers: CaseWorkerAssignment[]
  investigatorName: string
  investigatorPhone: string
  victimOfficerName: string
  victimOfficerPhone: string
  placeResidence: string
  placeWorkplace: string
  placeEtc1: string
  placeEtc2: string
  safetyMeasures: string[]
  emergencyMeasures: string[]
  provisionalMeasures: string[]
  emergencyTempMeasures: string[]
  temporaryMeasures: string[]
  // 체크된 항목이 없어도 입력 UI 상태는 항상 들고 있다가, 제출 시점에 selected가
  // 비어있으면 null로 바꿔 저장한다 (컨트롤드 인풋을 null과 오가게 하지 않기 위함).
  safetyMeasuresPeriod: MeasurePeriod
  emergencyMeasuresPeriod: MeasurePeriod
  provisionalMeasuresPeriod: MeasurePeriod
  emergencyTempMeasuresPeriod: MeasurePeriod
  temporaryMeasuresPeriod: MeasurePeriod
}

function buildInitialState(securityCase: SecurityCase): FormState {
  if (securityCase.baseInfo) {
    const baseInfo = securityCase.baseInfo
    return {
      ...baseInfo,
      workers: [...baseInfo.defaultWorkers],
      safetyMeasuresPeriod: baseInfo.safetyMeasuresPeriod ?? EMPTY_PERIOD,
      emergencyMeasuresPeriod: baseInfo.emergencyMeasuresPeriod ?? EMPTY_PERIOD,
      provisionalMeasuresPeriod: baseInfo.provisionalMeasuresPeriod ?? EMPTY_PERIOD,
      emergencyTempMeasuresPeriod: baseInfo.emergencyTempMeasuresPeriod ?? EMPTY_PERIOD,
      temporaryMeasuresPeriod: baseInfo.temporaryMeasuresPeriod ?? EMPTY_PERIOD,
    }
  }
  const investigator = splitContact(securityCase.policeContact.investigator)
  const victimOfficer = splitContact(securityCase.policeContact.victimOfficer)
  return {
    workHours: '09:00 ~ 18:00',
    workers: [],
    investigatorName: investigator.name,
    investigatorPhone: investigator.phone,
    victimOfficerName: victimOfficer.name,
    victimOfficerPhone: victimOfficer.phone,
    placeResidence: securityCase.location.residence,
    placeWorkplace: securityCase.location.workplace,
    placeEtc1: securityCase.location.etc1,
    placeEtc2: securityCase.location.etc2,
    safetyMeasures: [],
    emergencyMeasures: [],
    provisionalMeasures: [],
    emergencyTempMeasures: [],
    temporaryMeasures: [],
    safetyMeasuresPeriod: EMPTY_PERIOD,
    emergencyMeasuresPeriod: EMPTY_PERIOD,
    provisionalMeasuresPeriod: EMPTY_PERIOD,
    emergencyTempMeasuresPeriod: EMPTY_PERIOD,
    temporaryMeasuresPeriod: EMPTY_PERIOD,
  }
}

function FormSection({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        {action ? (
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            {action}
          </div>
        ) : (
          <CardTitle>{title}</CardTitle>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

function MeasureChips({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            aria-pressed={isSelected}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors',
              isSelected
                ? 'border-blue-200 bg-blue-50 text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            <span>{option}</span>
            {isSelected ? (
              <CheckCircle2 className="size-4 shrink-0 text-blue-600" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground/40" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// 7~11번 조치 섹션 공통 — 체크된 항목이 하나라도 있을 때만 나타나는 기간 입력
// (섹션당 기간 1개, nullable — 2026-08-24 결정)
function MeasurePeriodFields({
  period,
  onChange,
}: {
  period: MeasurePeriod
  onChange: (period: MeasurePeriod) => void
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label>적용 시작일</Label>
        <Input
          type="date"
          value={period.startDate}
          onChange={(e) => onChange({ ...period, startDate: e.target.value })}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label>적용 종료일</Label>
        <Input
          type="date"
          value={period.endDate}
          onChange={(e) => onChange({ ...period, endDate: e.target.value })}
        />
      </div>
    </div>
  )
}

interface BaseInfoFormProps {
  securityCase: SecurityCase
  workers: Worker[]
  onCancel: () => void
  onRegistered: () => void
}

function BaseInfoForm({ securityCase, workers, onCancel, onRegistered }: BaseInfoFormProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialState(securityCase))
  const [dispatchViewOpen, setDispatchViewOpen] = useState(false)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleMeasure(key: keyof FormState, value: string) {
    setForm((prev) => {
      const current = prev[key] as string[]
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  function addWorkerRow() {
    const picked = new Set(form.workers.map((w) => w.workerId))
    const next = workers.find((w) => !picked.has(w.id))
    if (!next) {
      showToast('추가할 수 있는 근무자가 없습니다', 'error')
      return
    }
    update('workers', [...form.workers, { workerId: next.id, isDefault: false }])
  }

  function removeWorkerRow(index: number) {
    update('workers', form.workers.filter((_, i) => i !== index))
  }

  function updateWorkerRow(index: number, patch: Partial<CaseWorkerAssignment>) {
    update(
      'workers',
      form.workers.map((w, i) => (i === index ? { ...w, ...patch } : w)),
    )
  }

  const mutation = useMutation({
    mutationFn: () => {
      const input: CaseBaseInfo = {
        workHours: form.workHours,
        defaultWorkers: form.workers,
        investigatorName: form.investigatorName,
        investigatorPhone: form.investigatorPhone,
        victimOfficerName: form.victimOfficerName,
        victimOfficerPhone: form.victimOfficerPhone,
        placeResidence: form.placeResidence,
        placeWorkplace: form.placeWorkplace,
        placeEtc1: form.placeEtc1,
        placeEtc2: form.placeEtc2,
        safetyMeasures: form.safetyMeasures,
        emergencyMeasures: form.emergencyMeasures,
        provisionalMeasures: form.provisionalMeasures,
        emergencyTempMeasures: form.emergencyTempMeasures,
        temporaryMeasures: form.temporaryMeasures,
        safetyMeasuresPeriod: form.safetyMeasures.length > 0 ? form.safetyMeasuresPeriod : null,
        emergencyMeasuresPeriod:
          form.emergencyMeasures.length > 0 ? form.emergencyMeasuresPeriod : null,
        provisionalMeasuresPeriod:
          form.provisionalMeasures.length > 0 ? form.provisionalMeasuresPeriod : null,
        emergencyTempMeasuresPeriod:
          form.emergencyTempMeasures.length > 0 ? form.emergencyTempMeasuresPeriod : null,
        temporaryMeasuresPeriod:
          form.temporaryMeasures.length > 0 ? form.temporaryMeasuresPeriod : null,
      }
      return registerBaseInfo(securityCase.id, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-case', securityCase.id] })
      showToast('기본정보가 등록되었습니다', 'success')
      onRegistered()
    },
    onError: () => {
      showToast('기본정보 등록에 실패했습니다', 'error')
    },
  })

  const [workHoursStart, workHoursEnd] = form.workHours.split('~').map((v) => v.trim())

  return (
    // w-full이 꼭 필요함: 상위가 flex-col 컨테이너라 mx-auto만 있으면 auto margin이
    // stretch를 밀어내고 콘텐츠 기준 shrink-to-fit으로 좁아져버림(실측 768px→559px).
    // w-full로 우선 꽉 채운 다음 max-w-3xl로 캡을 씌워야 의도대로 중앙정렬된 768px 폼이 됨.
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">기본정보 등록</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          배치요구서를 확인한 후 기본정보를 등록하세요. 등록하면 경호계획서·근무 스케줄·파기확인서
          섹션이 활성화됩니다.
        </p>
      </div>

      <FormSection
        title="1. 경호대상자"
        action={
          <button
            type="button"
            onClick={() => setDispatchViewOpen(true)}
            className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            배치요구서 원본보기
          </button>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Label>성명 (성만 표기)</Label>
          <Input value={securityCase.subject.nameInitial} disabled />
          <p className="text-[11px] text-muted-foreground">
            배치요구서에 등록된 성명이 표기됩니다.
          </p>
        </div>
      </FormSection>

      <FormSection title="2. 배치기간">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>시작일</Label>
            <Input value={securityCase.startDate} disabled />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>종료일</Label>
            <Input value={securityCase.endDate} disabled />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          배치요구서에 등록된 배치기간이 고정 적용됩니다. 수정이 필요한 경우 연장 신청 절차를
          이용하세요.
        </p>
      </FormSection>

      <FormSection title="3. 배치시간">
        <div className="flex flex-col gap-1.5">
          <Label>기본 경호 근무 시간</Label>
          <div className="flex flex-wrap items-center gap-2.5">
            <HourMinuteSelect
              value={workHoursStart}
              onChange={(next) => update('workHours', `${next} ~ ${workHoursEnd}`)}
              ariaLabel="시작시간"
            />
            <span className="text-sm text-muted-foreground">~</span>
            <HourMinuteSelect
              value={workHoursEnd}
              onChange={(next) => update('workHours', `${workHoursStart} ~ ${next}`)}
              ariaLabel="종료시간"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          배치요구서의 시간을 기본값으로 불러오며, 필요 시 수정할 수 있습니다.
        </p>
      </FormSection>

      <FormSection title="4. 기본 근무자">
        <p className="-mt-2 text-[11px] text-muted-foreground">
          근무자를 등록하고, 근무 스케줄 생성 시 배치기간 전체에 자동 배정할 대표근무자를
          체크하세요.
        </p>
        <div className="flex flex-col gap-2.5">
          {form.workers.map((row, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>근무자 {index + 1}</Label>
                <Select
                  value={row.workerId}
                  onValueChange={(value) => updateWorkerRow(index, { workerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                onClick={() => updateWorkerRow(index, { isDefault: !row.isDefault })}
                aria-pressed={row.isDefault}
                aria-label={`근무자 ${index + 1} 대표근무자로 지정`}
                className="flex items-center gap-1.5 pt-6 whitespace-nowrap"
              >
                {row.isDefault ? (
                  <CheckCircle2 className="size-4 text-blue-600" />
                ) : (
                  <Circle className="size-4 text-muted-foreground/40" />
                )}
                <span className="text-sm text-foreground">대표근무자</span>
              </button>
              <button
                type="button"
                onClick={() => removeWorkerRow(index)}
                className="mt-6 text-muted-foreground hover:text-destructive"
                aria-label={`근무자 ${index + 1} 삭제`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addWorkerRow}
            className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-border px-3.5 py-2 text-sm font-semibold text-primary hover:bg-muted"
          >
            <Plus className="size-3.5" />
            근무자 추가
          </button>
        </div>
      </FormSection>

      <FormSection title="5. 담당 경찰관">
        <p className="-mt-2 text-[11px] text-muted-foreground">
          배치요구서에 등록된 값이 표기됩니다. 변경이 필요하면 배치요구서를 작성한 경찰서에
          문의하세요.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label>수사관</Label>
          <div className="flex gap-2.5">
            <Input placeholder="이름" value={form.investigatorName} disabled />
            <Input placeholder="연락처" value={form.investigatorPhone} disabled />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>피전 (담당 경찰관)</Label>
          <div className="flex gap-2.5">
            <Input value={form.victimOfficerName} disabled />
            <Input value={form.victimOfficerPhone} disabled />
          </div>
        </div>
      </FormSection>

      <FormSection title="6. 배치 장소">
        <div className="flex flex-col gap-1.5">
          <Label>주거지</Label>
          <Input
            value={form.placeResidence}
            onChange={(e) => update('placeResidence', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>직장</Label>
          <Input
            value={form.placeWorkplace}
            onChange={(e) => update('placeWorkplace', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>기타 1</Label>
          <Input
            placeholder="이동경로, 기타 장소 등"
            value={form.placeEtc1}
            onChange={(e) => update('placeEtc1', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>기타 2</Label>
          <Input
            placeholder="이동경로, 기타 장소 등"
            value={form.placeEtc2}
            onChange={(e) => update('placeEtc2', e.target.value)}
          />
        </div>
      </FormSection>

      <FormSection title="7. 안전조치">
        <MeasureChips
          options={SAFETY_MEASURES}
          selected={form.safetyMeasures}
          onToggle={(v) => toggleMeasure('safetyMeasures', v)}
        />
        {form.safetyMeasures.length > 0 && (
          <MeasurePeriodFields
            period={form.safetyMeasuresPeriod}
            onChange={(p) => update('safetyMeasuresPeriod', p)}
          />
        )}
      </FormSection>

      <FormSection title="8. 긴급응급조치">
        <MeasureChips
          options={EMERGENCY_MEASURES}
          selected={form.emergencyMeasures}
          onToggle={(v) => toggleMeasure('emergencyMeasures', v)}
        />
        {form.emergencyMeasures.length > 0 && (
          <MeasurePeriodFields
            period={form.emergencyMeasuresPeriod}
            onChange={(p) => update('emergencyMeasuresPeriod', p)}
          />
        )}
      </FormSection>

      <FormSection title="9. 잠정조치">
        <MeasureChips
          options={PROVISIONAL_MEASURES}
          selected={form.provisionalMeasures}
          onToggle={(v) => toggleMeasure('provisionalMeasures', v)}
        />
        {form.provisionalMeasures.length > 0 && (
          <MeasurePeriodFields
            period={form.provisionalMeasuresPeriod}
            onChange={(p) => update('provisionalMeasuresPeriod', p)}
          />
        )}
      </FormSection>

      <FormSection title="10. 긴급임시조치">
        <MeasureChips
          options={EMERGENCY_TEMP_MEASURES}
          selected={form.emergencyTempMeasures}
          onToggle={(v) => toggleMeasure('emergencyTempMeasures', v)}
        />
        {form.emergencyTempMeasures.length > 0 && (
          <MeasurePeriodFields
            period={form.emergencyTempMeasuresPeriod}
            onChange={(p) => update('emergencyTempMeasuresPeriod', p)}
          />
        )}
      </FormSection>

      <FormSection title="11. 임시조치">
        <MeasureChips
          options={TEMPORARY_MEASURES}
          selected={form.temporaryMeasures}
          onToggle={(v) => toggleMeasure('temporaryMeasures', v)}
        />
        {form.temporaryMeasures.length > 0 && (
          <MeasurePeriodFields
            period={form.temporaryMeasuresPeriod}
            onChange={(p) => update('temporaryMeasuresPeriod', p)}
          />
        )}
      </FormSection>

      <div className="flex justify-end gap-2.5">
        <Button type="button" variant="secondary" onClick={onCancel} className="px-6">
          취소
        </Button>
        <Button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="px-6"
        >
          등록
        </Button>
      </div>

      <DispatchRequestViewDialog
        securityCase={securityCase}
        open={dispatchViewOpen}
        onOpenChange={setDispatchViewOpen}
      />
    </div>
  )
}

export default BaseInfoForm
