import { useNavigate } from 'react-router'
import { createSecurityCase } from '../api/securityCases'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import SecurityCaseForm, { INITIAL_FORM_STATE, type FormState } from '../components/SecurityCaseForm'

function SecurityCaseNewPage() {
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)

  async function handleSubmit(form: FormState) {
    await createSecurityCase({
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
    showToast('배치요구서가 접수되었습니다', 'success')
    navigate('/security-cases')
  }

  return (
    <SecurityCaseForm
      initialForm={INITIAL_FORM_STATE}
      breadcrumb="경호목록 / 신규 접수"
      title="신규 접수 · 배치요구서 작성"
      description="배치요구서를 작성합니다. 모든 항목 입력 후 등록해주세요."
      submitLabel="등록"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/security-cases')}
    />
  )
}

export default SecurityCaseNewPage
