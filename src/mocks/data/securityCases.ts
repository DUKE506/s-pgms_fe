import type { SecurityCase, SecurityCaseCreateInput } from '../../features/police/types/securityCase'

export const securityCases: SecurityCase[] = []

let nextCaseId = 1

export function issueReceiptNumber(policeStation: string, now = new Date()): string {
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `${yy}-${mm}-${policeStation}`
}

export function createSecurityCase(
  policeStation: string,
  input: SecurityCaseCreateInput,
): SecurityCase {
  const record: SecurityCase = {
    ...input,
    id: `case-${nextCaseId++}`,
    receiptNumber: issueReceiptNumber(policeStation),
    policeStation,
    status: '접수',
    createdAt: new Date().toISOString(),
  }
  securityCases.push(record)
  return record
}
