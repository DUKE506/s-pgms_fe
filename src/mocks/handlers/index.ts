import { authHandlers } from './auth'
import { securityCaseHandlers } from './securityCases'
import { managerHandlers } from './managers'

export const handlers = [...authHandlers, ...securityCaseHandlers, ...managerHandlers]
