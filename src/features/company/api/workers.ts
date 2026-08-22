import { apiFetch } from '../../auth/api/client'

export interface Worker {
  id: string
  name: string
  employeeId: string
  department: string
  phone: string
}

export type WorkerCreateInput = Omit<Worker, 'id'>

export async function listWorkers(): Promise<Worker[]> {
  const res = await apiFetch('/workers')
  if (!res.ok) {
    throw new Error('근무자 목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<Worker[]>
}

export async function registerWorker(input: WorkerCreateInput): Promise<Worker> {
  const res = await apiFetch('/workers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error('근무자 등록에 실패했습니다')
  }
  return res.json() as Promise<Worker>
}
