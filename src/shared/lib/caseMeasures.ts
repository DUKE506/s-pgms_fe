// 경호계획 "조치 5개" ↔ 백엔드 summaryN 매핑 헬퍼.
//
// 폼(BaseInfoForm)은 섹션(안전조치/긴급응급조치/잠정조치/긴급임시조치/임시조치)마다
// 다중선택 배열 + {시작일,종료일} 기간을 다루는데, 백엔드는 섹션당 단일 문자열 2개
// (`summaryN` = 선택 항목, `summaryNDate` = 기간)뿐이다. 실제로는 섹션 옵션 순서대로
// 비트 위치 문자열("1001")로 저장한다(2026-09-15 백엔드 확인·실측, 5개 섹션 전부 —
// 지금 옵션 배열 순서 = 비트 자리 확정. findings #11 종결).
//
// 조회(GetGuardCaseDetail/GetDeployDetail/GetHistoryDetail)는 서버가 변환한 값을
// 주는 것으로 확인돼 `parseMeasureItems`는 그대로 유지(콤마 조인 기준 역파싱).
// 등록(AddGuardCaseInfo)·수정(PatchCaseInfo) 둘 다 비트 인코딩으로 전환 완료
// (2026-09-15, 5개 섹션 전부 등록·수정 실측 확인).
//
// 본사 경호 상세(GetGuardCaseDetail)와 피전 경호 상세(GetDeployDetail, 2026-09-07부터
// summaryN 포함)가 같은 포맷을 쓰므로 헬퍼를 공유한다.

import type { MeasurePeriod } from '@/features/police/types/securityCase'

// 조치 5개 섹션의 옵션 배열 — 폼(BaseInfoForm)과 등록 인코더(securityCaseDetail.ts)가
// 이 배열을 공유해야 비트 위치가 어긋나지 않는다. 순서 = 비트 자리.
// "맞춤형순찰"은 띄어쓰기 없음이 공식 표기(2026-09-15 확인 — 서버가 조회 시 이
// 표기로 변환해서 줘서 발견, 프론트가 띄어쓰기를 넣어 잘못 쓰고 있었음).
export const SAFETY_MEASURE_OPTIONS = ['맞춤형순찰', '임시숙소', '스마트워치', 'CCTV']
export const EMERGENCY_MEASURE_OPTIONS = ['1호', '2호']
export const PROVISIONAL_MEASURE_OPTIONS = ['1호', '2호', '3호', '3-2호', '4호', '신청예정']
export const EMERGENCY_TEMP_MEASURE_OPTIONS = ['1호', '2호', '3호']
export const TEMPORARY_MEASURE_OPTIONS = ['1호', '2호', '3호', '4호', '5호', '신청예정']

export function parseMeasureItems(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

// 선택 항목 배열 → 옵션 순서 기준 비트 위치 문자열("1001"). 미선택 항목은 "0"으로
// 채워 옵션 개수만큼 항상 고정 길이로 보낸다(등록 전용, findings #11).
export function joinMeasureItemsAsBits(items: string[], options: readonly string[]): string {
  return options.map((option) => (items.includes(option) ? '1' : '0')).join('')
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
