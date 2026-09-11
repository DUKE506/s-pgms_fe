import { http, HttpResponse } from 'msw'
import { companyAccounts } from '../data/accounts'

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — 근무자 마스터
// CRUD는 실제 백엔드(Guard/Stec/W/GetGuardList·AddGuardInfo·PatchGuardInfo·
// DeleteGuardInfo)로 연동 완료됐다
// (docs/backend-integration/responses/Guard-Stec-GuardInfo.md). 브라우저 dev에서는
// 이 경로들을 MSW 미등록으로 두고 vite 프록시가 실제 백엔드로 보낸다. 여기서는
// 실제 응답 envelope({message,data,code})와 항목 필드(guardSeq/sabun/name/phone)를
// 흉내내 vitest가 매핑 로직까지 오프라인으로 검증하게 한다.

interface GuardRow {
  guardSeq: number
  sabun: string
  name: string
  phone: string | null
  // 실제 GetGuardList 응답엔 없다(issues.md #8). 더블은 수정 왕복 확인용으로만 보관.
  deptName: string
}

// features 쪽 mock 근무자 시드와 같은 이름/사번을 써서 기존 화면 기대값을 유지한다.
const seed: GuardRow[] = [
  { guardSeq: 1, sabun: '240231', name: '최민준', phone: '010-1234-5678', deptName: '경호1팀' },
  { guardSeq: 2, sabun: '230245', name: '정우진', phone: '010-2345-6789', deptName: '경호1팀' },
  { guardSeq: 3, sabun: '220198', name: '이서연', phone: '010-3456-7890', deptName: '경호2팀' },
  { guardSeq: 4, sabun: '250312', name: '박지훈', phone: '010-4567-8901', deptName: '경호2팀' },
  { guardSeq: 5, sabun: '240287', name: '김도현', phone: '010-5678-9012', deptName: '경호3팀' },
  { guardSeq: 6, sabun: '250356', name: '윤태오', phone: '010-6789-0123', deptName: '경호3팀' },
  { guardSeq: 7, sabun: '260403', name: '강수아', phone: '010-7890-1234', deptName: '경호1팀' },
  { guardSeq: 8, sabun: '210179', name: '조은우', phone: '010-8901-2345', deptName: '경호2팀' },
  { guardSeq: 9, sabun: '260421', name: '임하준', phone: '010-9012-3456', deptName: '경호3팀' },
  { guardSeq: 10, sabun: '230367', name: '한지호', phone: '010-0123-4567', deptName: '경호1팀' },
]

let guards: GuardRow[] = seed.map((g) => ({ ...g }))
let nextSeq = 11

// 테스트 간 격리 — server.ts의 resetHandlers만으로는 모듈 상태가 안 돌아온다.
export function resetGuardDouble() {
  guards = seed.map((g) => ({ ...g }))
  nextSeq = 11
}

// 근무자 상세 화면의 "근무 이력" — GetGuardSchedule 실제 응답(2026-09-11 프로브 재확인)이
// 경호건(cases) 단위로 그룹핑해 그 안에 일자별(schedules) 근무를 담아 준다. guardSeq 1
// (최민준)만 이력을 채워 카드 리스트+펼치기 검증, 나머지는 빈 이력(cases:[]) 케이스로 둔다.
interface GuardScheduleShift {
  date: string
  startDt: string
  endDt: string
  isWork: boolean
}
interface GuardScheduleCase {
  caseSeq: number
  guardCode: string
  mgmtNo: string
  statusName: string
  schedules: GuardScheduleShift[]
}

const scheduleSeed: Record<number, GuardScheduleCase[]> = {
  1: [
    {
      caseSeq: 101,
      guardCode: 'ST0101',
      mgmtNo: '26-08-강남경찰서',
      statusName: '경호완료',
      schedules: [
        { date: '2026-08-20', startDt: '2026-08-20T09:00:00', endDt: '2026-08-20T13:00:00', isWork: true },
        { date: '2026-08-21', startDt: '2026-08-21T09:00:00', endDt: '2026-08-21T18:00:00', isWork: true },
      ],
    },
    {
      caseSeq: 108,
      guardCode: 'ST0108',
      mgmtNo: '26-09-강남경찰서',
      statusName: '경호중',
      schedules: [
        { date: '2026-09-10', startDt: '2026-09-10T09:00:00', endDt: '2026-09-10T18:00:00', isWork: true },
        { date: '2026-09-11', startDt: '2026-09-11T00:00:00', endDt: '2026-09-11T00:00:00', isWork: false },
        { date: '2026-09-12', startDt: '2026-09-12T09:00:00', endDt: '2026-09-12T18:00:00', isWork: true },
      ],
    },
  ],
}

function stecUserFromBearer(request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const accountId = token.split('.')[1]
  return companyAccounts.find((a) => a.id === accountId)
}

function requireStec(request: Request) {
  return stecUserFromBearer(request)
    ? null
    : HttpResponse.json({ message: '인증이 필요합니다.', data: null, code: 401 }, { status: 401 })
}

export const guardTestHandlers = [
  http.get('/api/v1/Guard/Stec/W/GetGuardList', ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    // 실제 응답이 deptNm으로 부서를 준다(2026-09-10, findings #8 해소).
    const data = guards.map((g) => ({
      guardSeq: g.guardSeq,
      sabun: g.sabun,
      name: g.name,
      phone: g.phone,
      deptNm: g.deptName,
    }))
    return HttpResponse.json({ message: 'ok', data, code: 200 })
  }),

  http.post('/api/v1/Guard/Stec/W/AddGuardInfo', async ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    const dto = (await request.json()) as {
      sabun?: string
      name?: string
      deptName?: string
      phone?: string
    }
    guards.push({
      guardSeq: nextSeq++,
      sabun: String(dto.sabun ?? ''),
      name: String(dto.name ?? ''),
      phone: dto.phone ?? null,
      deptName: String(dto.deptName ?? ''),
    })
    return HttpResponse.json({ message: 'ok', data: true, code: 200 })
  }),

  http.patch('/api/v1/Guard/Stec/W/PatchGuardInfo', async ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    const dto = (await request.json()) as {
      guardSeq?: number
      name?: string | null
      deptName?: string | null
      phone?: string | null
    }
    const row = guards.find((g) => g.guardSeq === Number(dto.guardSeq))
    if (!row) {
      return HttpResponse.json(
        { message: '존재하지 않는 근무자입니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    if (dto.name != null) row.name = dto.name
    if (dto.deptName != null) row.deptName = dto.deptName
    if (dto.phone != null) row.phone = dto.phone
    return HttpResponse.json({ message: 'ok', data: true, code: 200 })
  }),

  http.delete('/api/v1/Guard/Stec/W/DeleteGuardInfo', ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    const seq = Number(new URL(request.url).searchParams.get('guardSeq'))
    const idx = guards.findIndex((g) => g.guardSeq === seq)
    if (idx === -1) {
      return HttpResponse.json(
        { message: '존재하지 않는 근무자입니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    guards.splice(idx, 1)
    return HttpResponse.json({ message: 'ok', data: true, code: 200 })
  }),

  http.get('/api/v1/Guard/Stec/W/GetGuardSchedule', ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    const seq = Number(new URL(request.url).searchParams.get('guardSeq'))
    const row = guards.find((g) => g.guardSeq === seq)
    if (!row) {
      return HttpResponse.json(
        { message: '등록되지 않은 경호원입니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    return HttpResponse.json({
      message: 'ok',
      data: { guardSeq: row.guardSeq, name: row.name, cases: scheduleSeed[seq] ?? [] },
      code: 200,
    })
  }),
]
