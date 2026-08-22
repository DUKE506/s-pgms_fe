import { authHandlers } from './auth'
import { securityCaseHandlers } from './securityCases'
import { managerHandlers } from './managers'
import { workerHandlers } from './workers'

export const handlers = [...authHandlers, ...securityCaseHandlers, ...managerHandlers, ...workerHandlers]
