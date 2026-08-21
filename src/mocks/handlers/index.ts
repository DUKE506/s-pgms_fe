import { authHandlers } from './auth'
import { securityCaseHandlers } from './securityCases'

export const handlers = [...authHandlers, ...securityCaseHandlers]
