import { http, HttpResponse } from 'msw'
import { allPoliceLoginAccounts } from '../data/guests'
import { securityCases } from '../data/securityCases'
import { SAFETY_MEASURE_OPTIONS } from '../../shared/lib/caseMeasures'
import type { SecurityCase, SecurityCaseStatus } from '../../features/police/types/securityCase'

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — 홈 대시보드(#18)는
// 실제 백엔드(GET /api/v1/DashBoard/Police/W/*)로 연동 완료됐다(docs/backend-integration/
// responses/DashBoard-Police-Get*.md). 브라우저 dev에서는 이 경로를 MSW 미등록으로 두고
// vite 프록시가 실제 백엔드로 보낸다. 여기서는 mock 조직트리(3계층, 실 securityCases
// seed의 policeStation/jurisdiction과 맞춘 합성 groupSeq)를 기준으로 실 응답 shape을
// 흉내낸다. 기간(fromDate/toDate) 파라미터는 프론트가 아예 안 보내므로(2026-09-16 결정)
// 여기서도 무시 — 항상 "현재 seed 전체"를 하나의 조회기간으로 취급한다.

interface StationNode {
  groupSeq: number
  groupName: string
}
interface JurisdictionNode {
  groupSeq: number
  groupName: string
  stations: StationNode[]
}

// src/mocks/data/securityCases.ts의 JURISDICTION_BY_STATION과 1:1 대응.
const ORG_TREE: { groupSeq: number; groupName: string; jurisdictions: JurisdictionNode[] } = {
  groupSeq: 1,
  groupName: '본청',
  jurisdictions: [
    {
      groupSeq: 10,
      groupName: '서울지방경찰청',
      stations: [
        { groupSeq: 101, groupName: '강남경찰서' },
        { groupSeq: 102, groupName: '서초경찰서' },
        { groupSeq: 103, groupName: '종로경찰서' },
      ],
    },
    { groupSeq: 11, groupName: '경기남부지방경찰청', stations: [{ groupSeq: 111, groupName: '분당경찰서' }] },
    { groupSeq: 12, groupName: '부산지방경찰청', stations: [{ groupSeq: 121, groupName: '부산진경찰서' }] },
  ],
}

function policeAccountFromBearer(request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const accountId = token.split('.')[1]
  return allPoliceLoginAccounts().find((a) => a.id === accountId)
}

// 로그인 계정 role/jurisdiction/name → 자기 scope의 뿌리 groupSeq(파라미터 없을 때 기본값).
function defaultGroupSeqOf(account: { role?: string; jurisdiction?: string; name?: string }): number {
  if (account.role === '본청') return ORG_TREE.groupSeq
  if (account.role === '지역청') {
    return ORG_TREE.jurisdictions.find((j) => j.groupName === account.jurisdiction)?.groupSeq ?? ORG_TREE.groupSeq
  }
  for (const j of ORG_TREE.jurisdictions) {
    const station = j.stations.find((s) => s.groupName === account.name)
    if (station) return station.groupSeq
  }
  return ORG_TREE.groupSeq
}

// groupSeq가 가리키는 노드 밑의 station groupName 목록(자기 자신 포함) — 집계 필터용.
function stationNamesUnder(groupSeq: number): string[] {
  if (groupSeq === ORG_TREE.groupSeq) {
    return ORG_TREE.jurisdictions.flatMap((j) => j.stations.map((s) => s.groupName))
  }
  const jurisdiction = ORG_TREE.jurisdictions.find((j) => j.groupSeq === groupSeq)
  if (jurisdiction) return jurisdiction.stations.map((s) => s.groupName)
  for (const j of ORG_TREE.jurisdictions) {
    const station = j.stations.find((s) => s.groupSeq === groupSeq)
    if (station) return [station.groupName]
  }
  return []
}

function scopedCases(groupSeq: number): SecurityCase[] {
  const names = new Set(stationNamesUnder(groupSeq))
  return securityCases.filter((c) => names.has(c.policeStation))
}

const TRACKED: Record<Exclude<SecurityCaseStatus, '종결' | '취소'>, SecurityCase['status']> = {
  접수: '접수',
  배정: '배정',
  경호중: '경호중',
  경호완료: '경호완료',
}

function countsOf(cases: SecurityCase[]) {
  const receipt = cases.filter((c) => c.status === TRACKED.접수).length
  const assignment = cases.filter((c) => c.status === TRACKED.배정).length
  const inprogress = cases.filter((c) => c.status === TRACKED.경호중).length
  const complete = cases.filter((c) => c.status === TRACKED.경호완료).length
  return { receipt, assignment, inprogress, complete, total: receipt + assignment + inprogress + complete }
}

// 평균 경호기간·성별·나이·안전조치 대상 = 배정/경호중/경호완료(접수 제외).
function assignedOrLater(cases: SecurityCase[]) {
  return cases.filter((c) => c.status === '배정' || c.status === '경호중' || c.status === '경호완료')
}

function ageOf(birthDate: string): number {
  const year = Number(birthDate.slice(0, 4))
  return Number.isFinite(year) ? new Date().getFullYear() - year : 0
}

function ageGroupOf(age: number): number {
  if (age <= 19) return 10
  if (age < 70) return Math.floor(age / 10) * 10
  return 60
}

function buildNode(groupSeq: number, groupName: string, children: { groupSeq: number; groupName: string }[]) {
  const own = countsOf(scopedCases(groupSeq))
  return {
    groupSeq,
    parentSeq: null,
    groupName,
    depth: 0,
    totalCount: own.total,
    children: children.map((c) => ({
      groupSeq: c.groupSeq,
      parentSeq: groupSeq,
      groupName: c.groupName,
      depth: 1,
      totalCount: countsOf(scopedCases(c.groupSeq)).total,
      children: [] as unknown[],
    })),
  }
}

// GetDashBoardGroupCount 응답 트리 — 요청 계정의 서브트리 루트만 준다(실 API와 동일 스코프).
function groupCountTreeFor(account: { role?: string; jurisdiction?: string; name?: string }) {
  if (account.role === '본청') {
    return {
      groupSeq: ORG_TREE.groupSeq,
      parentSeq: null,
      groupName: ORG_TREE.groupName,
      depth: 0,
      totalCount: countsOf(scopedCases(ORG_TREE.groupSeq)).total,
      children: ORG_TREE.jurisdictions.map((j) => buildNode(j.groupSeq, j.groupName, j.stations)),
    }
  }
  if (account.role === '지역청') {
    const j = ORG_TREE.jurisdictions.find((x) => x.groupName === account.jurisdiction) ?? ORG_TREE.jurisdictions[0]
    return buildNode(j.groupSeq, j.groupName, j.stations)
  }
  const groupSeq = defaultGroupSeqOf(account)
  const station = ORG_TREE.jurisdictions.flatMap((j) => j.stations).find((s) => s.groupSeq === groupSeq)
  return {
    groupSeq,
    parentSeq: null,
    groupName: station?.groupName ?? account.name ?? '',
    depth: 0,
    totalCount: countsOf(scopedCases(groupSeq)).total,
    children: [] as unknown[],
  }
}

function topOrderFor(account: { role?: string; jurisdiction?: string }) {
  if (account.role === '본청') {
    return ORG_TREE.jurisdictions
      .map((j) => ({ groupSeq: j.groupSeq, groupName: j.groupName, count: countsOf(scopedCases(j.groupSeq)).total }))
      .sort((a, b) => b.count - a.count)
  }
  const j = ORG_TREE.jurisdictions.find((x) => x.groupName === account.jurisdiction) ?? ORG_TREE.jurisdictions[0]
  return j.stations
    .map((s) => ({ groupSeq: s.groupSeq, groupName: s.groupName, count: countsOf(scopedCases(s.groupSeq)).total }))
    .sort((a, b) => b.count - a.count)
}

function json(data: unknown) {
  return HttpResponse.json({ message: 'ok', data, code: 200 })
}

function unauthorized() {
  return HttpResponse.json({ message: '인증이 필요합니다.', data: null, code: 401 }, { status: 401 })
}

function withScope(
  request: Request,
  handler: (account: ReturnType<typeof policeAccountFromBearer> & object, groupSeq: number) => Response,
) {
  const account = policeAccountFromBearer(request)
  if (!account) return unauthorized()
  const url = new URL(request.url)
  const groupSeqParam = url.searchParams.get('groupSeq')
  const groupSeq = groupSeqParam != null ? Number(groupSeqParam) : defaultGroupSeqOf(account)
  return handler(account, groupSeq)
}

export const dashboardTestHandlers = [
  http.get('/api/v1/DashBoard/Police/W/GetDashBoardCount', ({ request }) =>
    withScope(request, (_account, groupSeq) => json(countsOf(scopedCases(groupSeq)))),
  ),

  http.get('/api/v1/DashBoard/Police/W/GetDashBoardGroupCount', ({ request }) => {
    const account = policeAccountFromBearer(request)
    if (!account) return unauthorized()
    return json([groupCountTreeFor(account)])
  }),

  http.get('/api/v1/DashBoard/Police/W/GetDashBoardAvgGuardDays', ({ request }) =>
    withScope(request, (_account, groupSeq) => {
      const target = assignedOrLater(scopedCases(groupSeq)).filter((c) => c.startDate && c.endDate)
      const days = target.map((c) => {
        const diff = (new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / 86_400_000
        return Math.round(diff) + 1
      })
      const avg = days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0
      return json({ avgGuardDays: Math.floor(avg * 10) / 10 })
    }),
  ),

  http.get('/api/v1/DashBoard/Police/W/GetDashBoardGenderCount', ({ request }) =>
    withScope(request, (_account, groupSeq) => {
      const target = assignedOrLater(scopedCases(groupSeq)).concat(
        scopedCases(groupSeq).filter((c) => c.status === '접수'),
      )
      const maleCount = target.filter((c) => c.subject.gender === '남').length
      const feMaleCount = target.filter((c) => c.subject.gender === '여').length
      return json({ maleCount, feMaleCount })
    }),
  ),

  http.get('/api/v1/DashBoard/Police/W/GetMonthDashBoardCount', ({ request }) =>
    withScope(request, (_account, groupSeq) => {
      const now = new Date()
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      })
      // mock seed엔 여러 달치 이력이 없어 이번 달만 실제 집계, 과거 5개월은 0으로 채운다
      // (실 API shape 검증이 목적 — 값 자체의 시계열 다양성은 이 테스트 더블 범위 밖).
      const thisMonth = countsOf(scopedCases(groupSeq))
      return json(
        months.map((date, i) => ({
          date,
          counts: [i === 0 ? thisMonth : { receipt: 0, assignment: 0, inprogress: 0, complete: 0, total: 0 }],
        })),
      )
    }),
  ),

  http.get('/api/v1/DashBoard/Police/W/GetDashBoardAvgAge', ({ request }) =>
    withScope(request, (_account, groupSeq) => {
      const target = assignedOrLater(scopedCases(groupSeq)).concat(
        scopedCases(groupSeq).filter((c) => c.status === '접수'),
      )
      const ages = target.map((c) => ageOf(c.subject.birthDate))
      const avg = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0
      return json({ avgGuardAge: Math.floor(avg * 10) / 10 })
    }),
  ),

  http.get('/api/v1/DashBoard/Police/W/GetDashBoardSummaryCount', ({ request }) =>
    withScope(request, (_account, groupSeq) => {
      const target = assignedOrLater(scopedCases(groupSeq))
      const has = (item: string) => target.filter((c) => c.baseInfo?.safetyMeasures.includes(item)).length
      const [customized, accommodation, watch, cctv] = SAFETY_MEASURE_OPTIONS.map(has)
      return json({ customized, accommodation, watch, cctv })
    }),
  ),

  http.get('/api/v1/DashBoard/Police/W/GetDashBoardAgeGroup', ({ request }) =>
    withScope(request, (_account, groupSeq) => {
      const target = assignedOrLater(scopedCases(groupSeq)).concat(
        scopedCases(groupSeq).filter((c) => c.status === '접수'),
      )
      const buckets = [10, 20, 30, 40, 50, 60]
      const counts = new Map(buckets.map((b) => [b, 0]))
      for (const c of target) {
        const bucket = ageGroupOf(ageOf(c.subject.birthDate))
        counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
      }
      return json(buckets.map((ageGroup) => ({ ageGroup, count: counts.get(ageGroup) ?? 0 })))
    }),
  ),

  http.get('/api/v1/DashBoard/Police/W/GetDashBoardTopOrder', ({ request }) => {
    const account = policeAccountFromBearer(request)
    if (!account) return unauthorized()
    return json(topOrderFor(account))
  }),
]
