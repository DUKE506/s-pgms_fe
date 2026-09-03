import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'

// 근무자(경호원) 마스터 — 본사 운영/시스템관리자용 CRUD.
// 실측: docs/backend-integration-responses/Guard-Stec-GuardInfo.md
//
// ⚠️ deptName 비대칭(issues.md #8): AddGuardInfo/PatchGuardInfo는 deptName을
// 받지만 GetGuardList 응답엔 deptName이 없고 근무자 상세조회 API도 없다.
// → 저장은 하되 목록에서 부서를 표시할 수 없어 부서 열을 뺐다
// (docs/backend-integration-exclusions.md). 등록/수정 폼의 부서 입력은 유지.
export interface Worker {
  id: string
  name: string
  employeeId: string
  phone: string
}

// 등록: 부서(deptName)는 서버 필수라 폼에서 계속 입력받는다.
export interface WorkerCreateInput {
  name: string
  employeeId: string
  department: string
  phone: string
}

// 수정: 사번(sabun)은 PatchGuardInfo 스키마에 없어 변경 불가 → 입력에서 제외.
export interface WorkerUpdateInput {
  id: string
  name: string
  department: string
  phone: string
}

// GET /api/v1/Guard/Stec/W/GetGuardList 의 항목 형태(실측).
interface GuardListRow {
  guardSeq: number
  sabun: string
  name: string
  phone: string | null
}

export async function listWorkers(): Promise<Worker[]> {
  const res = await apiFetch('/v1/Guard/Stec/W/GetGuardList')
  if (!res.ok) {
    throw new Error('근무자 목록을 불러오지 못했습니다')
  }
  const rows = await unwrapEnvelope<GuardListRow[]>(res)
  return rows.map((row) => ({
    id: String(row.guardSeq),
    name: row.name,
    employeeId: row.sabun,
    phone: row.phone ?? '',
  }))
}

export async function registerWorker(input: WorkerCreateInput): Promise<void> {
  const res = await apiFetch('/v1/Guard/Stec/W/AddGuardInfo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sabun: input.employeeId,
      name: input.name,
      deptName: input.department,
      phone: input.phone,
    }),
  })
  if (!res.ok) {
    throw new Error('근무자 등록에 실패했습니다')
  }
}

export async function updateWorker(input: WorkerUpdateInput): Promise<void> {
  // deptName은 현재 값을 조회할 수 없어(issues.md #8) 입력했을 때만 보낸다 —
  // 빈 값을 보내면 서버 기존 부서를 덮어쓸 수 있어 아예 필드를 뺀다.
  const body: Record<string, unknown> = {
    guardSeq: Number(input.id),
    name: input.name,
    phone: input.phone,
  }
  if (input.department !== '') {
    body.deptName = input.department
  }

  const res = await apiFetch('/v1/Guard/Stec/W/PatchGuardInfo', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error('근무자 정보 수정에 실패했습니다')
  }
}

export async function deleteWorker(id: string): Promise<void> {
  const res = await apiFetch(`/v1/Guard/Stec/W/DeleteGuardInfo?guardSeq=${Number(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error('근무자 삭제에 실패했습니다')
  }
}

// 경호 상세(#9)·이력 상세(#13)가 근무자 이름/연락처 조인용으로 아직 mock을
// 읽는다 — 그 화면들이 각자 iteration에서 경호건별 스케줄 조회 API(issues.md #6)로
// 대체하기 전까지 임시. admin 목록(listWorkers, ['workers'])과 함수·쿼리키를
// 분리해 실제 GetGuardList 연동이 이 두 화면 회귀를 건드리지 않게 한다
// (2번 GuestListPage 분리와 같은 처리).
export async function listCaseJoinWorkers(): Promise<Worker[]> {
  const res = await apiFetch('/workers')
  if (!res.ok) {
    throw new Error('근무자 목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<Worker[]>
}
