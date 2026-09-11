import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'

// 근무자(경호원) 마스터 — 본사 운영/시스템관리자용 CRUD.
// 실측: docs/backend-integration/responses/Guard-Stec-GuardInfo.md
//
// 부서: GetGuardList 응답이 `deptNm`으로 부서를 준다(2026-09-10 실측 — 이전엔
// 누락돼 findings #8이었으나 해소). GetCaseGuardList는 `deptName`으로 준다(엔드포인트별
// 필드명 다름). 등록/수정 DTO는 `deptName`.
export interface Worker {
  id: string
  name: string
  employeeId: string
  phone: string
  department: string
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
  deptNm: string | null
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
    department: row.deptNm ?? '',
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

// 이력 상세(#13)가 근무자 이름/연락처 조인용으로 아직 mock을 읽는다 — 그 화면이
// 자기 iteration에서 정리하기 전까지 임시. admin 목록(listWorkers, ['workers'])과
// 함수·쿼리키를 분리해 실제 GetGuardList 연동이 이 화면 회귀를 건드리지 않게 한다
// (2번 GuestListPage 분리와 같은 처리).
export async function listCaseJoinWorkers(): Promise<Worker[]> {
  const res = await apiFetch('/workers')
  if (!res.ok) {
    throw new Error('근무자 목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<Worker[]>
}

// GET /api/v1/GuardCase/Stec/W/GetCaseGuardList 의 항목 형태(실측 — 화면9).
interface CaseGuardRow {
  guardSeq: number
  name: string
  sabun: string
  deptName: string | null
  isAssigned: boolean
  phone: string | null
}

// 화면9(경호 상세)의 경호원 배정 드롭다운·근무자 이름 조인용. 경호건 스코프.
// 부서는 이 응답에선 `deptName`으로 온다(GetGuardList의 `deptNm`과 필드명 다름).
export async function getCaseGuards(id: string): Promise<Worker[]> {
  const res = await apiFetch(
    `/v1/GuardCase/Stec/W/GetCaseGuardList?caseSeq=${encodeURIComponent(id)}`,
  )
  if (!res.ok) {
    throw new Error('근무자 목록을 불러오지 못했습니다')
  }
  const rows = await unwrapEnvelope<CaseGuardRow[]>(res)
  return rows.map((row) => ({
    id: String(row.guardSeq),
    name: row.name,
    employeeId: row.sabun,
    phone: row.phone ?? '',
    department: row.deptName ?? '',
  }))
}

// 근무자 상세 화면의 "근무 이력" — 근무자 한 명의 근무 일정을 경호건(cases) 단위로
// 그룹핑해 그 안에 일자별(schedules) 근무를 담아 준다(2026-09-11 프로브 재확인 —
// 이전엔 경호건 구분 없이 날짜만 평면으로 오는 걸로 알았으나 실제로는 cases[] 구조,
// 필드명 오타(schdules)도 없음). 경호취소된 건은 응답에서 빠진다. 근무가 없으면
// cases가 빈 배열, 없는 경호원이면 404.
export interface WorkerScheduleShift {
  date: string
  startDt: string
  endDt: string
  isWork: boolean
}
export interface WorkerScheduleCase {
  caseSeq: number
  guardCode: string
  mgmtNo: string
  statusName: string
  schedules: WorkerScheduleShift[]
}
export interface WorkerSchedule {
  guardSeq: number
  name: string
  cases: WorkerScheduleCase[]
}

export async function getWorkerSchedule(id: string): Promise<WorkerSchedule> {
  const res = await apiFetch(`/v1/Guard/Stec/W/GetGuardSchedule?guardSeq=${encodeURIComponent(id)}`)
  if (res.status === 404) {
    // 근무 이력 자체가 없는 근무자도 이 화면에선 정상 진입 상태 — 빈 이력으로 처리.
    return { guardSeq: Number(id), name: '', cases: [] }
  }
  if (!res.ok) {
    throw new Error('근무 이력을 불러오지 못했습니다')
  }
  return unwrapEnvelope<WorkerSchedule>(res)
}
