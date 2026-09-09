import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { splitMgmtNo } from '@/shared/lib/managementNumber'
import { useAuthStore } from '../../auth/store/authStore'
import type { HistoryGuard, SecurityCase, SecurityCaseStatus } from '../types/securityCase'

// ── mock (본청/지역청 이력 화면 #15가 아직 사용) ─────────────────────────────
// 서버(mock)가 종결/취소 건만, 조직 계층별 스코프로 필터링해서 내려준다.
export async function listSecurityCaseHistory(): Promise<SecurityCase[]> {
  const res = await apiFetch('/security-cases/history')
  if (!res.ok) {
    throw new Error('이력 조회 목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<SecurityCase[]>
}

export async function getSecurityCaseHistoryDetail(id: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/history/${id}`)
  if (!res.ok) {
    throw new Error('이력 상세를 불러오지 못했습니다')
  }
  return res.json() as Promise<SecurityCase>
}

// ── 실 API ([경찰서] 이력 조회, 화면 #14) ────────────────────────────────────

// GET /api/v1/History/Police/W/GetHistoryList 항목 형태 (실측:
// docs/backend-integration/responses/History-Police-GetHistoryList.md).
// 응답은 GetGuardCaseList처럼 {meta, data:[...]}를 envelope로 한 번 더 감싼다.
interface HistoryListRow {
  caseSeq: number
  mgmtNo: string
  groupName: string
  parentGroupName: string
  startDt: string | null
  endDt: string | null
  totalMin: number | null
  statusName: string
  remark: string | null
}

// GET /api/v1/History/Police/W/GetHistoryDetail 응답 형태 (실측:
// docs/backend-integration/responses/History-Police-GetHistoryDetail.md).
interface HistoryDetailRow {
  caseSeq: number
  mgmtNo: string
  statusName: string
  suspectUserName: string | null
  startDate: string | null
  endDate: string | null
  totalGuardWorkMinutes: number | null
  investigator: string | null
  responsibleOfficer: string | null
  endDt: string | null
  remark: string | null
  guards: HistoryGuard[]
}

interface Paged<T> {
  meta: { pageNumber: number; pageSize: number; totalCount: number; totalPages: number }
  data: T[]
}

// GetHistoryList/Detail는 끝난 건(종결·취소)만 준다(HIST-001). statusName이 "경호취소"
// 형태라 프론트 타입으로 좁힌다 — 그 외는 전부 종결로 본다.
function toStatus(statusName: string): SecurityCaseStatus {
  return statusName.includes('취소') ? '취소' : '종결'
}

// 공통 빈 SecurityCase — 이력 응답이 안 주는 필드는 화면에서 "-"로 표시된다
// (caseType·5개 조치·배치장소 등, exclusions).
function emptySecurityCase(): Omit<SecurityCase, 'id' | 'receiptNumber' | 'status'> {
  return {
    policeStation: '',
    jurisdiction: '',
    caseType: '사건미접수',
    subject: { nameInitial: '', gender: '', birthDate: '', occupation: '', residence: '' },
    caseSummary: '',
    startDate: '',
    endDate: '',
    location: { residence: '', workplace: '', etc1: '', etc2: '' },
    additionalNotes: '',
    policeContact: { victimOfficer: '', investigator: '' },
    requester: { dept: '', position: '', name: '' },
    createdAt: '',
  }
}

function toStatusExtra(status: SecurityCaseStatus, endDt: string | null, remark: string | null) {
  return status === '취소'
    ? { canceledAt: endDt ?? undefined, cancelReason: remark ?? undefined }
    : { closedAt: endDt ?? undefined, closureReason: (remark ?? undefined) as SecurityCase['closureReason'] }
}

function listRowToSecurityCase(row: HistoryListRow): SecurityCase {
  const { receiptNumber, securityCode } = splitMgmtNo(row.mgmtNo)
  const status = toStatus(row.statusName)
  return {
    ...emptySecurityCase(),
    id: String(row.caseSeq),
    receiptNumber,
    securityCode,
    policeStation: row.groupName,
    jurisdiction: row.parentGroupName,
    status,
    startDate: row.startDt ?? '',
    endDate: row.endDt ?? '',
    totalGuardMinutes: row.totalMin ?? undefined,
    ...toStatusExtra(status, row.endDt, row.remark),
  }
}

function detailRowToSecurityCase(row: HistoryDetailRow): SecurityCase {
  const { receiptNumber, securityCode } = splitMgmtNo(row.mgmtNo)
  const status = toStatus(row.statusName)
  return {
    ...emptySecurityCase(),
    id: String(row.caseSeq),
    receiptNumber,
    securityCode,
    status,
    subject: {
      // suspectUserName은 이미 마스킹("홍**")돼서 온다 — nameInitial로 취급.
      nameInitial: row.suspectUserName ?? '',
      gender: '',
      birthDate: '',
      occupation: '',
      residence: '',
    },
    startDate: row.startDate ? row.startDate.slice(0, 10) : '',
    endDate: row.endDate ? row.endDate.slice(0, 10) : '',
    totalGuardMinutes: row.totalGuardWorkMinutes ?? undefined,
    policeContact: {
      victimOfficer: row.responsibleOfficer ?? '',
      investigator: row.investigator ?? '',
    },
    historyGuards: row.guards ?? [],
    ...toStatusExtra(status, row.endDt, row.remark),
  }
}

// 서버 pageSize 상한이 100이라 meta.totalPages까지 순회해 이어붙인다(본사 이력·경호목록과
// 동일). GetHistoryList는 groupSeq(로그인한 경찰서 조직번호, GetMyProfile로 받아 세션에
// 저장) 없이 부르면 빈 목록을 준다 — GetDeployList와 같은 규칙.
const HISTORY_PAGE_SIZE = 100
const HISTORY_MAX_PAGES = 50

async function fetchHistoryPage(pageNumber: number): Promise<Paged<HistoryListRow>> {
  const groupSeq = useAuthStore.getState().user?.groupSeq
  const query = `?pageNumber=${pageNumber}&pageSize=${HISTORY_PAGE_SIZE}${
    groupSeq != null ? `&groupSeq=${groupSeq}` : ''
  }`
  const res = await apiFetch(`/v1/History/Police/W/GetHistoryList${query}`)
  if (!res.ok) {
    throw new Error('이력 조회 목록을 불러오지 못했습니다')
  }
  return unwrapEnvelope<Paged<HistoryListRow>>(res)
}

// 화면 #14: [경찰서] 이력 조회 목록. 로그인한 경찰서의 종결·취소 건만.
export async function listPoliceStationHistory(): Promise<SecurityCase[]> {
  const first = await fetchHistoryPage(1)
  const rows = [...first.data]
  const lastPage = Math.min(first.meta.totalPages, HISTORY_MAX_PAGES)
  for (let page = 2; page <= lastPage; page += 1) {
    rows.push(...(await fetchHistoryPage(page)).data)
  }
  return rows.map(listRowToSecurityCase)
}

// 화면 #14: [경찰서] 이력 상세. id = caseSeq.
export async function getPoliceStationHistoryDetail(id: string): Promise<SecurityCase> {
  const res = await apiFetch(`/v1/History/Police/W/GetHistoryDetail?caseSeq=${id}`)
  if (!res.ok) {
    throw new Error('이력 상세를 불러오지 못했습니다')
  }
  return detailRowToSecurityCase(await unwrapEnvelope<HistoryDetailRow>(res))
}
