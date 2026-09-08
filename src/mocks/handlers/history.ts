import { http, HttpResponse } from 'msw'
import { allPoliceLoginAccounts } from '../data/guests'
import { securityCases } from '../data/securityCases'
import { workers } from '../data/workers'
import { computeCaseHistorySummary } from '../../features/police/lib/historySummary'
import type { SecurityCase } from '../../features/police/types/securityCase'

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — [경찰서] 이력 조회는
// 실제 백엔드(GET /api/v1/History/Police/W/GetHistoryList · GetHistoryDetail)로 연동
// 완료됐다(docs/backend-integration-responses/History-Police-Get*.md). 브라우저 dev에서는
// 이 경로를 MSW 미등록으로 두고 vite 프록시가 실제 백엔드로 보낸다. 여기서는 실제 응답
// envelope·항목 필드를 흉내내 vitest가 매핑 로직을 오프라인으로 검증하게 한다. groupSeq
// 필터는 실제 백엔드 몫이라 Bearer 토큰으로 소속 경찰서를 판별한다.

function stationFromBearer(request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const accountId = token.split('.')[1]
  return allPoliceLoginAccounts().find((a) => a.id === accountId)
}

function caseSeqOf(c: SecurityCase) {
  return Number(c.id.replace(/\D/g, '')) || 0
}

function isTerminal(c: SecurityCase) {
  return c.status === '종결' || c.status === '취소'
}

// 근무자별 투입실적 — 실제 응답의 guards[]는 이름이 인라인이라, mock seed의
// workSchedule을 computeCaseHistorySummary로 집계하고 workers에서 이름을 붙인다.
function guardsOf(c: SecurityCase) {
  return computeCaseHistorySummary(c.workSchedule).workers.map((w) => ({
    guardSeq: Number(w.workerId.replace(/\D/g, '')) || 0,
    guardName: workers.find((worker) => worker.id === w.workerId)?.name ?? w.workerId,
    workDays: w.workedDays,
    totalMinutes: Math.round(w.totalHours * 60),
  }))
}

export const historyTestHandlers = [
  // 이력 목록 — GET History/Police/W/GetHistoryList.
  // 로그인한 경찰서의 종결·취소 건만. 응답은 {meta, data:[...]}를 envelope로 감싼다.
  http.get('/api/v1/History/Police/W/GetHistoryList', ({ request }) => {
    const account = stationFromBearer(request)
    if (!account) {
      return HttpResponse.json(
        { message: '인증이 필요합니다.', data: null, code: 401 },
        { status: 401 },
      )
    }
    const url = new URL(request.url)
    const pageNumber = Number(url.searchParams.get('pageNumber') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
    // groupSeq 필수(없으면 빈 목록)는 실제 백엔드가 강제하는 규칙이라 이 더블에서는
    // 재현하지 않고 Bearer 토큰의 소속 경찰서로 판별한다(GetDeployList 더블과 동일).
    const scoped = securityCases.filter((c) => c.policeStation === account.name && isTerminal(c))

    const all = scoped.map((c) => {
      const canceled = c.status === '취소'
      return {
        caseSeq: caseSeqOf(c),
        mgmtNo: `${c.receiptNumber} ${c.securityCode}`,
        groupName: c.policeStation,
        parentGroupName: c.jurisdiction,
        startDt: canceled ? null : c.startDate,
        endDt: canceled ? null : c.endDate,
        totalMin: canceled ? null : Math.round(computeCaseHistorySummary(c.workSchedule).totalHours * 60),
        statusName: canceled ? '경호취소' : '종결',
        remark: canceled ? (c.cancelReason ?? null) : (c.closureReason ?? null),
      }
    })

    const start = (pageNumber - 1) * pageSize
    return HttpResponse.json({
      message: 'ok',
      data: {
        meta: {
          pageNumber,
          pageSize,
          totalCount: all.length,
          totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
        },
        data: all.slice(start, start + pageSize),
      },
      code: 200,
    })
  }),

  // 이력 상세 — GET History/Police/W/GetHistoryDetail?caseSeq=.
  http.get('/api/v1/History/Police/W/GetHistoryDetail', ({ request }) => {
    const account = stationFromBearer(request)
    if (!account) {
      return HttpResponse.json(
        { message: '인증이 필요합니다.', data: null, code: 401 },
        { status: 401 },
      )
    }
    const seq = new URL(request.url).searchParams.get('caseSeq') ?? ''
    const c =
      securityCases.find((x) => x.id === seq) ??
      securityCases.find((x) => String(caseSeqOf(x)) === seq)
    if (!c || !isTerminal(c)) {
      return HttpResponse.json(
        { message: '이력을 찾을 수 없습니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    const canceled = c.status === '취소'
    return HttpResponse.json({
      message: 'ok',
      data: {
        caseSeq: caseSeqOf(c),
        mgmtNo: `${c.receiptNumber} ${c.securityCode}`,
        statusName: canceled ? '경호취소' : '종결',
        suspectUserName: c.subject.nameInitial,
        startDate: canceled ? null : c.startDate,
        endDate: canceled ? null : c.endDate,
        totalGuardWorkMinutes: canceled
          ? null
          : Math.round(computeCaseHistorySummary(c.workSchedule).totalHours * 60),
        investigator: c.policeContact.investigator || null,
        responsibleOfficer: c.policeContact.victimOfficer || null,
        endDt: (canceled ? c.canceledAt : c.closedAt) ?? null,
        remark: (canceled ? c.cancelReason : c.closureReason) ?? null,
        guards: guardsOf(c),
      },
      code: 200,
    })
  }),
]
