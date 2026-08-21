import { apiFetch } from '../../auth/api/client'

export interface Manager {
  id: string
  name: string
  branch?: string
  assignedCount: number
}

export async function listManagers(): Promise<Manager[]> {
  const res = await apiFetch('/managers')
  if (!res.ok) {
    throw new Error('담당자 목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<Manager[]>
}
