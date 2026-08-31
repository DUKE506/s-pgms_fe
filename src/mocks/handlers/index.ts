import { authHandlers } from './auth'
import { securityCaseHandlers } from './securityCases'
import { managerHandlers } from './managers'
import { workerHandlers } from './workers'
import { guestHandlers } from './guests'
import { companyAccountHandlers } from './companyAccounts'

export const handlers = [
  ...authHandlers,
  ...securityCaseHandlers,
  ...managerHandlers,
  ...workerHandlers,
  ...guestHandlers,
  ...companyAccountHandlers,
]
