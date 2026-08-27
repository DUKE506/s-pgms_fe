import { describe, expect, it } from 'vitest'
import { computeCaseHistorySummary } from './historySummary'
import type { WorkSchedule } from '../types/securityCase'

describe('computeCaseHistorySummary', () => {
  it('workSchedule이 없으면 0건을 반환한다', () => {
    expect(computeCaseHistorySummary(undefined)).toEqual({ totalHours: 0, workers: [] })
  })

  it('근무자별 근무일수·총근무시간을 합산하고, 이를 더해 총경호시간을 계산한다', () => {
    const workSchedule: WorkSchedule = {
      preMeeting: null,
      days: [
        {
          date: '2025-11-01',
          groups: [
            {
              id: 'g1',
              note: '',
              assignments: [
                { workerId: 'worker-1', startTime: '09:00', endTime: '18:00', isOff: false },
                { workerId: 'worker-2', startTime: '18:00', endTime: '24:00', isOff: false },
              ],
            },
          ],
        },
        {
          date: '2025-11-02',
          groups: [
            {
              id: 'g2',
              note: '',
              assignments: [
                { workerId: 'worker-1', startTime: '09:00', endTime: '18:00', isOff: false },
                { workerId: 'worker-2', startTime: '00:00', endTime: '00:00', isOff: true },
              ],
            },
          ],
        },
      ],
    }

    const result = computeCaseHistorySummary(workSchedule)

    expect(result.workers).toEqual(
      expect.arrayContaining([
        { workerId: 'worker-1', workedDays: 2, totalHours: 18 },
        { workerId: 'worker-2', workedDays: 1, totalHours: 6 },
      ]),
    )
    expect(result.totalHours).toBe(24)
  })
})
