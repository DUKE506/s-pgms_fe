// 경호계획 "조치 5개" ↔ 백엔드 summaryN 매핑 헬퍼.
//
// 폼(BaseInfoForm)은 섹션(안전조치/긴급응급조치/잠정조치/긴급임시조치/임시조치)마다
// 다중선택 배열 + {시작일,종료일} 기간을 다루는데, 백엔드는 섹션당 단일 문자열 2개
// (`summaryN` = 선택 항목, `summaryNDate` = 기간)뿐이다. 그래서 항목은 ", "로 조인,
// 기간은 "시작일 ~ 종료일" 문자열로 직렬화해 저장하고 읽을 때 역파싱한다.
// 손실 매핑이라 exclusions.md에 기록, 구조화 요청은 issues.md #11.
//
// 본사 경호 상세(GetGuardCaseDetail)와 피전 경호 상세(GetDeployDetail, 2026-09-07부터
// summaryN 포함)가 같은 포맷을 쓰므로 헬퍼를 공유한다.

import type { MeasurePeriod } from '@/features/police/types/securityCase'

export function parseMeasureItems(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function parseMeasurePeriod(text: string | null | undefined): MeasurePeriod | null {
  if (!text) return null
  const [start, end] = text.split('~').map((t) => t.trim())
  if (!start || !end) return null
  return { startDate: start, endDate: end }
}

export function joinMeasureItems(items: string[]): string {
  return items.join(', ')
}

export function formatMeasurePeriod(period: MeasurePeriod | null): string {
  if (!period?.startDate || !period.endDate) return ''
  return `${period.startDate} ~ ${period.endDate}`
}

// "09:00:00" 또는 "2026-09-10T09:00:00" → "09:00"
export function hhmm(value: string | null | undefined): string {
  if (!value) return ''
  const time = value.includes('T') ? value.split('T')[1] : value
  return time.slice(0, 5)
}
