import { apiFetch } from '../../auth/api/client'
import type {
  CaseBaseInfo,
  ScheduleGroup,
  SecurityCase,
  WorkSchedule,
} from '../../police/types/securityCase'

async function unwrap(res: Response, errorMessage: string): Promise<SecurityCase> {
  if (!res.ok) {
    throw new Error(errorMessage)
  }
  return res.json() as Promise<SecurityCase>
}

export async function getSecurityCase(id: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}`)
  return unwrap(res, '경호건을 불러오지 못했습니다')
}

export async function registerBaseInfo(id: string, input: CaseBaseInfo): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}/base-info`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return unwrap(res, '기본정보 등록에 실패했습니다')
}

export async function cancelAssignedCase(id: string, reason: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  return unwrap(res, '경호취소에 실패했습니다')
}

export async function createSchedule(
  id: string,
  input: { startDate: string; endDate: string; startTime: string; endTime: string },
): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return unwrap(res, '근무 스케줄 생성에 실패했습니다')
}

export async function upsertScheduleGroup(
  id: string,
  date: string,
  group: ScheduleGroup,
): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}/schedule/${date}/groups`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(group),
  })
  return unwrap(res, '근무 그룹 저장에 실패했습니다')
}

export async function setPreMeeting(
  id: string,
  preMeeting: WorkSchedule['preMeeting'],
): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}/schedule/pre-meeting`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preMeeting),
  })
  return unwrap(res, '사전미팅 설정에 실패했습니다')
}

export async function setSecurityPlanFile(id: string, fileName: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}/attachments/security-plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName }),
  })
  return unwrap(res, '경호계획서 업로드에 실패했습니다')
}

export async function setDestructionCertFile(id: string, fileName: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}/attachments/destruction-cert`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName }),
  })
  return unwrap(res, '파기확인서 업로드에 실패했습니다')
}

export async function setWorkerConsentFile(
  id: string,
  workerId: string,
  fileName: string,
): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}/attachments/worker-consent/${workerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName }),
  })
  return unwrap(res, '개인정보동의서 업로드에 실패했습니다')
}
