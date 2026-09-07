import { describe, expect, it } from 'vitest'
import {
  formatMeasurePeriod,
  hhmm,
  joinMeasureItems,
  parseMeasureItems,
  parseMeasurePeriod,
} from './caseMeasures'

describe('caseMeasures', () => {
  describe('parseMeasureItems', () => {
    it('", "로 조인된 항목 문자열을 배열로 되돌린다', () => {
      expect(parseMeasureItems('맞춤형 순찰, CCTV')).toEqual(['맞춤형 순찰', 'CCTV'])
    })

    it('빈 값/null/undefined는 빈 배열', () => {
      expect(parseMeasureItems(null)).toEqual([])
      expect(parseMeasureItems(undefined)).toEqual([])
      expect(parseMeasureItems('')).toEqual([])
    })

    it('앞뒤 공백과 빈 토큰을 제거한다', () => {
      expect(parseMeasureItems(' 1호 , , 2호 ')).toEqual(['1호', '2호'])
    })
  })

  describe('parseMeasurePeriod', () => {
    it('"시작 ~ 종료" 문자열을 기간 객체로 되돌린다', () => {
      expect(parseMeasurePeriod('2026-09-10 ~ 2026-09-20')).toEqual({
        startDate: '2026-09-10',
        endDate: '2026-09-20',
      })
    })

    it('빈 값이거나 한쪽만 있으면 null', () => {
      expect(parseMeasurePeriod(null)).toBeNull()
      expect(parseMeasurePeriod('')).toBeNull()
      expect(parseMeasurePeriod('2026-09-10 ~ ')).toBeNull()
    })
  })

  it('join/format은 parse의 역방향이다', () => {
    expect(joinMeasureItems(['맞춤형 순찰', 'CCTV'])).toBe('맞춤형 순찰, CCTV')
    expect(formatMeasurePeriod({ startDate: '2026-09-10', endDate: '2026-09-20' })).toBe(
      '2026-09-10 ~ 2026-09-20',
    )
    expect(formatMeasurePeriod(null)).toBe('')
  })

  describe('hhmm', () => {
    it('datetime과 time 문자열 모두 "HH:MM"으로 자른다', () => {
      expect(hhmm('2026-09-10T09:00:00')).toBe('09:00')
      expect(hhmm('18:00:00')).toBe('18:00')
    })

    it('빈 값은 빈 문자열', () => {
      expect(hhmm(null)).toBe('')
      expect(hhmm(undefined)).toBe('')
    })
  })
})
