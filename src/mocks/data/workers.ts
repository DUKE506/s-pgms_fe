import type { Worker, WorkerCreateInput } from '../../features/company/api/workers'

export const workers: Worker[] = [
  { id: 'worker-1', name: '최민준', employeeId: '240231', department: '경호1팀', phone: '010-1234-5678' },
  { id: 'worker-2', name: '정우진', employeeId: '230245', department: '경호1팀', phone: '010-2345-6789' },
  { id: 'worker-3', name: '이서연', employeeId: '220198', department: '경호2팀', phone: '010-3456-7890' },
  { id: 'worker-4', name: '박지훈', employeeId: '250312', department: '경호2팀', phone: '010-4567-8901' },
  { id: 'worker-5', name: '김도현', employeeId: '240287', department: '경호3팀', phone: '010-5678-9012' },
  { id: 'worker-6', name: '윤태오', employeeId: '250356', department: '경호3팀', phone: '010-6789-0123' },
  { id: 'worker-7', name: '강수아', employeeId: '260403', department: '경호1팀', phone: '010-7890-1234' },
  { id: 'worker-8', name: '조은우', employeeId: '210179', department: '경호2팀', phone: '010-8901-2345' },
  { id: 'worker-9', name: '임하준', employeeId: '260421', department: '경호3팀', phone: '010-9012-3456' },
  { id: 'worker-10', name: '한지호', employeeId: '230367', department: '경호1팀', phone: '010-0123-4567' },
]

let nextWorkerId = workers.length + 1

export function createWorker(input: WorkerCreateInput): Worker {
  const record: Worker = { id: `worker-${nextWorkerId++}`, ...input }
  workers.push(record)
  return record
}
