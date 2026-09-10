import { useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { getDeployRequestForEdit } from '../api/securityCaseDetail'
import { updateSecurityCase } from '../api/securityCases'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import SecurityCaseForm, { type FormState } from '../components/SecurityCaseForm'
import type { SecurityCase } from '../types/securityCase'

function toFormState(securityCase: SecurityCase): FormState {
  return {
    nameInitial: securityCase.subject.nameInitial,
    gender: securityCase.subject.gender,
    birthDate: securityCase.subject.birthDate,
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
    requesterDept: securityCase.requester.dept,
    requesterPosition: securityCase.requester.position,
    requesterName: securityCase.requester.name,
  }
}

function SecurityCaseEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)
  const queryClient = useQueryClient()
  // 상세(getSecurityCase, GetDeployDetail)와 소스가 다르므로(GetDeployDetailUpdate)
  // 캐시 키도 분리한다.
  const caseQuery = useQuery({
    queryKey: ['deploy-request-edit', id],
    queryFn: () => getDeployRequestForEdit(id!),
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
  // GetDeployDetailUpdate 응답엔 mgmtNo가 없어 receiptNumber가 빈 값일 수 있다.
  const managementNumber = formatManagementNumber(securityCase.receiptNumber, securityCase.securityCode)
  const breadcrumb = managementNumber ? `경호목록 / ${managementNumber}` : '경호목록'
  // 접수/배정까지는 배치기간 포함 전체 수정, 경호중 이후는 배치기간만 잠근다
  // (2026-08-25 결정 — 기간 변경은 경호 상세의 연장/단축 요청 몫).
  const disablePeriod = securityCase.status !== '접수' && securityCase.status !== '배정'

  async function handleSubmit(form: FormState) {
    await updateSecurityCase(securityCase.id, {
      subject: {
        nameInitial: form.nameInitial,
        gender: form.gender,
        birthDate: form.birthDate,
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
      requester: {
        dept: form.requesterDept,
        position: form.requesterPosition,
        name: form.requesterName,
      },
    })
    // 저장 후 캐시 정리. 수정 화면은 SecurityCaseForm이 첫 렌더의 initialForm을
    // useState로 고정하므로, 다음 진입 때 stale 캐시가 즉시 뜨면 수정 전 내용이
    // 그대로 보인다(백그라운드 refetch가 끝나도 폼은 안 바뀜). 이 키는 아예 제거해
    // 재진입 시 로딩 후 새로 조회하도록 한다. 상세/목록은 무효화로 충분.
    queryClient.removeQueries({ queryKey: ['deploy-request-edit', id] })
    queryClient.invalidateQueries({ queryKey: ['security-case', id] })
    queryClient.invalidateQueries({ queryKey: ['police-security-cases'] })
    showToast('배치요구서가 수정되었습니다', 'success')
    navigate(`/security-cases/${securityCase.id}`, { replace: true })
  }

  return (
    <SecurityCaseForm
      initialForm={toFormState(securityCase)}
      disablePeriod={disablePeriod}
      breadcrumb={breadcrumb}
      backTo={`/security-cases/${securityCase.id}`}
      title="배치요구서 수정"
      description="배치요구서 내용을 수정합니다."
      submitLabel="저장"
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/security-cases/${securityCase.id}`)}
    />
  )
}

export default SecurityCaseEditPage
