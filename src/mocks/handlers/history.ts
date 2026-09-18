import { http, HttpResponse } from 'msw'
import { allPoliceLoginAccounts } from '../data/guests'
import { securityCases } from '../data/securityCases'
import { workers } from '../data/workers'
import { computeCaseHistorySummary } from '../../features/police/lib/historySummary'
import type { SecurityCase } from '../../features/police/types/securityCase'
import { caseTypeToCrimeCode } from '../../shared/lib/crimeType'
import { joinMeasureItems, formatMeasurePeriod } from '../../shared/lib/caseMeasures'

// 5개 조치 — c.baseInfo(등록돼 있으면)를 summaryN/summaryNDate 문자열로 직렬화.
// 실 API와 같은 손실 매핑(features/company/api/securityCaseDetail.ts::toCaseInfoBody와 동일).
function summariesOf(c: SecurityCase) {
  const b = c.baseInfo
  return {
    summary1: b ? joinMeasureItems(b.safetyMeasures) : null,
    summary1Date: b ? formatMeasurePeriod(b.safetyMeasuresPeriod) : null,
    summary2: b ? joinMeasureItems(b.emergencyMeasures) : null,
    summary2Date: b ? formatMeasurePeriod(b.emergencyMeasuresPeriod) : null,
    summary3: b ? joinMeasureItems(b.provisionalMeasures) : null,
    summary3Date: b ? formatMeasurePeriod(b.provisionalMeasuresPeriod) : null,
    summary4: b ? joinMeasureItems(b.emergencyTempMeasures) : null,
    summary4Date: b ? formatMeasurePeriod(b.emergencyTempMeasuresPeriod) : null,
    summary5: b ? joinMeasureItems(b.temporaryMeasures) : null,
    summary5Date: b ? formatMeasurePeriod(b.temporaryMeasuresPeriod) : null,
  }
}

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — 이력 조회는 실제
// 백엔드(GET /api/v1/History/Police/W/GetHistoryList · GetHistoryDetail)로 연동 완료됐다
// (docs/backend-integration/responses/History-Police-Get*.md, #14·#15). 브라우저 dev에서는
// 이 경로를 MSW 미등록으로 두고 vite 프록시가 실제 백엔드로 보낸다. 여기서는 실제 응답
// envelope·항목 필드를 흉내내 vitest가 매핑 로직을 오프라인으로 검증하게 한다. 역할
// 스코프(본청=전국 / 지역청=관할 이하 / 피전=자기 경찰서, groupSeq 필터)는 실제
// 백엔드 몫이라 Bearer 토큰의 소속·역할로 판별한다.

function policeAccountFromBearer(request: Request) {
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

// 한글 상태 → 실 API status 코드(접수는 null).
function statusCodeOf(c: SecurityCase): number | null {
  switch (c.status) {
    case '배정':
      return 0
    case '경호중':
      return 1
    case '경호완료':
      return 2
    case '종결':
      return 3
    case '취소':
      return 4
    default:
      return null
  }
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

// 역할별 조회 범위 + 대상 상태. 본청/지역청은 접수·진행중·종결·취소 전 구간,
// 피전은 끝난 건(종결·취소)만(HIST-001).
function scopedCases(account: { role?: string; jurisdiction?: string; name?: string }) {
  if (account.role === '본청') return securityCases
  if (account.role === '지역청') {
    return securityCases.filter((c) => c.jurisdiction === account.jurisdiction)
  }
  // 경찰서(피전) / 게스트 등 — 자기 경찰서의 끝난 건만
  return securityCases.filter((c) => c.policeStation === account.name && isTerminal(c))
}

export const historyTestHandlers = [
  // 이력 목록 — GET History/Police/W/GetHistoryList.
  // 응답은 {meta, data:[...]}를 envelope로 감싼다. 행에 deploySeq·status(int)가 함께 온다.
  http.get('/api/v1/History/Police/W/GetHistoryList', ({ request }) => {
    const account = policeAccountFromBearer(request)
    if (!account) {
      return HttpResponse.json(
        { message: '인증이 필요합니다.', data: null, code: 401 },
        { status: 401 },
      )
    }
    const url = new URL(request.url)
    const pageNumber = Number(url.searchParams.get('pageNumber') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
    // 2026-09-18 필터/페이지네이션 배치 적용(화면#14·#15) — searchKey/status/startDate/
    // endDate 서버 파라미터 재현(docs/architecture.md "상태관리").
    const searchKeyParam = url.searchParams.get('searchKey')
    const statusParam = url.searchParams.get('status')
    const startDateParam = url.searchParams.get('startDate')
    const endDateParam = url.searchParams.get('endDate')

    const all = scopedCases(account)
      .filter((c) => {
        if (!searchKeyParam) return true
        const mgmtNo = `${c.receiptNumber} ${c.securityCode ?? ''}`.trim()
        return mgmtNo.includes(searchKeyParam) || (c.cancelReason ?? '').includes(searchKeyParam)
      })
      .filter((c) => !statusParam || statusCodeOf(c) === Number(statusParam))
      .filter((c) => !startDateParam || c.startDate >= startDateParam)
      .filter((c) => !endDateParam || c.startDate <= endDateParam)
      .map((c) => {
        const canceled = c.status === '취소'
        const terminal = isTerminal(c)
        const pending = c.status === '접수'
        return {
          // 접수 행은 caseSeq 없음, 종결·취소 행은 deploySeq 없음.
          caseSeq: pending ? null : caseSeqOf(c),
          deploySeq: terminal ? null : caseSeqOf(c),
          mgmtNo: `${c.receiptNumber} ${pending ? '접수' : (c.securityCode ?? '접수')}`,
          groupName: c.policeStation,
          parentGroupName: c.jurisdiction,
          startDt: canceled ? null : (c.startDate ?? null),
          endDt: canceled ? null : (c.endDate ?? null),
          totalMin:
            c.status === '종결'
              ? Math.round(computeCaseHistorySummary(c.workSchedule).totalHours * 60)
              : null,
          status: statusCodeOf(c),
          statusName: canceled ? '경호취소' : c.status,
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
  // 실 API는 상태를 가리지 않으나(진행중도 200) 화면은 종결·취소 건만 이 경로로 온다.
  http.get('/api/v1/History/Police/W/GetHistoryDetail', ({ request }) => {
    const account = policeAccountFromBearer(request)
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
    if (!c) {
      return HttpResponse.json(
        { message: '존재하지 않는 경호건입니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    const canceled = c.status === '취소'
    return HttpResponse.json({
      message: 'ok',
      data: {
        caseSeq: caseSeqOf(c),
        mgmtNo: `${c.receiptNumber} ${c.securityCode ?? '접수'}`,
        statusName: canceled ? '경호취소' : c.status,
        crimeType: caseTypeToCrimeCode(c.caseType),
        suspectUserName: c.subject.nameInitial,
        startDate: canceled ? null : c.startDate,
        endDate: canceled ? null : c.endDate,
        totalGuardWorkMinutes:
          c.status === '종결'
            ? Math.round(computeCaseHistorySummary(c.workSchedule).totalHours * 60)
            : null,
        investigator: c.policeContact.investigator || null,
        responsibleOfficer: c.policeContact.victimOfficer || null,
        ...summariesOf(c),
        endDt: (canceled ? c.canceledAt : c.closedAt) ?? null,
        remark: (canceled ? c.cancelReason : c.closureReason) ?? null,
        guards: guardsOf(c),
      },
      code: 200,
    })
  }),
]
