import { setupServer } from 'msw/node'
import { handlers, testOnlyHandlers } from './handlers'

export const server = setupServer(...handlers, ...testOnlyHandlers)
