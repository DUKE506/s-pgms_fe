import { useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { getSecurityCase } from '../api/securityCaseDetail'
import { updateSecurityCase } from '../api/securityCases'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import SecurityCaseForm, { type FormState } from '../components/SecurityCaseForm'
import type { SecurityCase } from '../types/securityCase'

function toFormState(securityCase: SecurityCase): FormState {
  return {
    nameInitial: securityCase.subject.nameInitial,
    gender: securityCase.subject.gender,
    birthYear: securityCase.subject.birthYear,
    age: securityCase.subject.age,
    occupation: securityCase.subject.occupation,
    residence: securityCase.subject.residence,
    caseType: securityCase.caseType,
    caseSummary: securityCase.caseSummary,
    startDate: securityCase.startDate,
    endDate: securityCase.endDate,
    locResidence: securityCase.location.residence,
    locWorkplace: securityCase.location.workplace,
    locEtc1: securityCase.location.etc1,
    locEtc2: securityCase.location.etc2,
    additionalNotes: securityCase.additionalNotes,
    victimOfficer: securityCase.policeContact.victimOfficer,
    investigator: securityCase.policeContact.investigator,
    requester: securityCase.requester,
  }
}

function SecurityCaseEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const caseQuery = useQuery({
    queryKey: ['security-case', id],
    queryFn: () => getSecurityCase(id!),
    enabled: Boolean(id),
  })

  if (caseQuery.isLoading) {
    return (
      <main className="p-4 sm:p-8">
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    )
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <main className="p-4 sm:p-8">
        <p className="py-8 text-center text-sm text-destructive">경호건을 불러오지 못했습니다</p>
      </main>
    )
  }

  const securityCase = caseQuery.data
  const managementNumber = formatManagementNumber(securityCase.receiptNumber, securityCase.securityCode)
  // 접수/배정까지는 배치기간 포함 전체 수정, 경호중 이후는 배치기간만 잠근다
  // (2026-08-25 결정 — 기간 변경은 경호 상세의 연장/단축 요청 몫).
  const disablePeriod = securityCase.status !== '접수' && securityCase.status !== '배정'

  async function handleSubmit(form: FormState) {
    await updateSecurityCase(securityCase.id, {
      subject: {
        nameInitial: form.nameInitial,
        gender: form.gender,
        birthYear: form.birthYear,
        age: form.age,
        occupation: form.occupation,
        residence: form.residence,
      },
      caseType: form.caseType!,
      caseSummary: form.caseSummary,
      startDate: form.startDate,
      endDate: form.endDate,
      location: {
        residence: form.locResidence,
        workplace: form.locWorkplace,
        etc1: form.locEtc1,
        etc2: form.locEtc2,
      },
      additionalNotes: form.additionalNotes,
      policeContact: {
        victimOfficer: form.victimOfficer,
        investigator: form.investigator,
      },
      requester: form.requester,
    })
    showToast('배치요구서가 수정되었습니다', 'success')
    navigate(`/security-cases/${securityCase.id}`)
  }

  return (
    <SecurityCaseForm
      initialForm={toFormState(securityCase)}
      disablePeriod={disablePeriod}
      breadcrumb={`경호관리 / ${managementNumber}`}
      title="배치요구서 수정"
      description="배치요구서 내용을 수정합니다."
      submitLabel="저장"
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/security-cases/${securityCase.id}`)}
    />
  )
}

export default SecurityCaseEditPage
