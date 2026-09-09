import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { splitMgmtNo } from '@/shared/lib/managementNumber'
import {
  detailRowToSecurityCase,
  type HistoryDetailRow,
} from '../../police/api/history'
import type { SecurityCase, SecurityCaseStatus } from '../../police/types/securityCase'

// 화면 13: [본사] 이력 조회. 목록은 본사 전용 엔드포인트(History/Stec/W/GetHistoryList),
// 상세는 History/Stec/W/GetHistoryDetail(2026-09-09 신설 — 경찰용 응답 + groupName·
// parentGroupName). 매핑은 경찰 쪽(detailRowToSecurityCase)을 공유한다.

// GET /api/v1/History/Stec/W/GetHistoryList 항목 형태 (실측:
// docs/backend-integration/responses/History-Stec-GetHistoryList.md).
// 응답은 GetGuardCaseList처럼 {meta, data:[...]}를 envelope로 한 번 더 감싼다.
interface HistoryRow {
  caseSeq: number
  mgmtNo: string
  groupName: string
  parentGroupName: string
  // 배정 후 취소된 건만 값 있음(YYYY-MM-DD), 배정 전 취소·미상은 null.
  startDt: string | null
  endDt: string | null
  // 서버 집계 총근무시간(분) — 종결 건만 실값, 취소 건은 null.
  totalMin: number | null
  // 3:종결 / 4:경호취소 (statusName과 함께 옴). 매핑은 statusName으로 하고 이 값은
  // status 파라미터 필터용 — 목록량이 작아 현재는 클라이언트 필터 유지(exclusions).
  status: number | null
  // "경호취소" / "종결". 프론트 라벨('취소'/'종결')로 좁힌다.
  statusName: string
  // 종결이면 종결 코드(END_REASON), 취소면 취소 사유(CANCEL_REASON).
  remark: string | null
}

interface Paged<T> {
  meta: { pageNumber: number; pageSize: number; totalCount: number; totalPages: number }
  data: T[]
}

// GetHistoryList는 끝난 건(종결·취소)만 반환한다(HIST-001). statusName이 "경호취소"
// 형태라 프론트 타입으로 매핑한다 — 그 외는 전부 종결로 본다(종결 코드값은 실데이터가
// 없어 미확정, exclusions).
function toStatus(statusName: string): SecurityCaseStatus {
  return statusName.includes('취소') ? '취소' : '종결'
}

// 목록 행이 읽는 필드(관리번호·지역청·경찰서·경호기간·총경호시간·최종상태·remark)만
// 채우고 나머지 SecurityCase 필드는 빈 값으로 둔다. 대상자·담당자·사건유형 등은 이
// 응답에 없다(exclusions). 상세(/admin/history/:id)는 본사용 조회 EP가 없어 별도 처리.
function toSecurityCase(row: HistoryRow): SecurityCase {
  const { receiptNumber, securityCode } = splitMgmtNo(row.mgmtNo)
  const status = toStatus(row.statusName)
  return {
    id: String(row.caseSeq),
    receiptNumber,
    securityCode,
    policeStation: row.groupName,
    jurisdiction: row.parentGroupName,
    status,
    caseType: '사건미접수',
    subject: { nameInitial: '', gender: '', birthDate: '', occupation: '', residence: '' },
    caseSummary: '',
    startDate: row.startDt ?? '',
    endDate: row.endDt ?? '',
    location: { residence: '', workplace: '', etc1: '', etc2: '' },
    additionalNotes: '',
    policeContact: { victimOfficer: '', investigator: '' },
    requester: { dept: '', position: '', name: '' },
    createdAt: '',
    totalGuardMinutes: row.totalMin ?? undefined,
    ...(status === '취소'
      ? { cancelReason: row.remark ?? undefined }
      : { closureReason: (row.remark ?? undefined) as SecurityCase['closureReason'] }),
  }
}

// 서버 pageSize 상한이 100이라 meta.totalPages까지 순회해 이어붙인다(본사 경호목록과
// 동일). 화면에 페이지네이션 UI 없음.
const HISTORY_PAGE_SIZE = 100
const HISTORY_MAX_PAGES = 50

async function fetchHistoryPage(pageNumber: number): Promise<Paged<HistoryRow>> {
  const res = await apiFetch(
    `/v1/History/Stec/W/GetHistoryList?pageNumber=${pageNumber}&pageSize=${HISTORY_PAGE_SIZE}`,
  )
  if (!res.ok) {
    throw new Error('이력 조회 목록을 불러오지 못했습니다')
  }
  return unwrapEnvelope<Paged<HistoryRow>>(res)
}

// 운영/시스템관리자는 전국 전체, 본부관리자는 본인 배정 건만(서버가 HIST-003으로
// 강제 — StecM3(배정 0건) → 이력 0건 실측).
export async function listCompanyHistory(): Promise<SecurityCase[]> {
  const first = await fetchHistoryPage(1)
  const rows = [...first.data]
  const lastPage = Math.min(first.meta.totalPages, HISTORY_MAX_PAGES)
  for (let page = 2; page <= lastPage; page += 1) {
    rows.push(...(await fetchHistoryPage(page)).data)
  }
  return rows.map(toSecurityCase)
}

// 화면 13: 본사 이력 상세. id = caseSeq. 상태를 가리지 않으나(진행중 건도 200) 이
// 화면은 종결·취소 건만 도달한다(목록이 끝난 건만). 운영/시스템=전국, 본부관리자=
// 본인 배정 건, 범위 밖이면 404(실측).
export async function getCompanyHistoryDetail(id: string): Promise<SecurityCase> {
  const res = await apiFetch(`/v1/History/Stec/W/GetHistoryDetail?caseSeq=${id}`)
  if (!res.ok) {
    throw new Error('이력 상세를 불러오지 못했습니다')
  }
  return detailRowToSecurityCase(await unwrapEnvelope<HistoryDetailRow>(res))
}
