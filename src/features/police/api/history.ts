import { apiFetch } from '../../auth/api/client'
import { assertOk, unwrapEnvelope } from '@/shared/api/envelope'
import { splitMgmtNo } from '@/shared/lib/managementNumber'
import { crimeCodeToCaseType } from '@/shared/lib/crimeType'
import { parseMeasureItems, parseMeasurePeriod } from '@/shared/lib/caseMeasures'
import { useAuthStore } from '../../auth/store/authStore'
import type { HistoryGuard, SecurityCase, SecurityCaseStatus } from '../types/securityCase'

// [경찰서] 이력 조회(#14)와 [본청]/[지역청] 이력 조회(#15)는 같은 실 엔드포인트
// (History/Police/W/GetHistoryList · GetHistoryDetail)를 역할 스코프만 다르게 공유한다.
// - 목록: groupSeq 를 안 보내면 서버가 토큰 역할대로 스코프를 건다 — 본청=전국,
//   지역청=관할 이하, 피전=자기 경찰서. 본청/지역청은 접수·진행중·종결·취소 전 구간이
//   오고(HIST-001), 피전은 끝난 건(종결·취소)만 온다. groupSeq 는 그중 한 경찰서만
//   골라 보는 필터일 뿐이라 피전 경로는 회귀 방지로 세션 groupSeq 를 계속 붙인다.
// - 상세: 종결·취소 건만 이 EP로 열고(GetHistoryDetail?caseSeq=), 접수·진행중 건은
//   경호상세 화면(/security-cases/:id = GetDeployDetail?deployReqSeq=)으로 보낸다.
//   그래서 목록 매핑에서 SecurityCase.id 를 종결·취소면 caseSeq, 그 외면 deploySeq 로
//   채운다(HistoryListPage 의 historyTarget 이 상태로 갈라 라우팅).

// GET /api/v1/History/Police/W/GetHistoryList 항목 형태 (실측:
// docs/backend-integration/responses/History-Police-GetHistoryList.md).
// 응답은 GetGuardCaseList처럼 {meta, data:[...]}를 envelope로 한 번 더 감싼다.
interface HistoryListRow {
  // 접수 행은 caseSeq 가 null 이고 deploySeq 만 있다. 종결·취소 행은 반대로
  // 배치요구서가 지워져(END-007) deploySeq 가 null 이다.
  caseSeq: number | null
  deploySeq: number | null
  mgmtNo: string
  groupName: string
  parentGroupName: string
  startDt: string | null
  endDt: string | null
  totalMin: number | null
  // 0:배정 1:경호중 2:경호완료 3:종결 4:경호취소, 접수 행은 null. statusName 과 함께 온다.
  status: number | null
  statusName: string
  remark: string | null
}

// GET /api/v1/History/Police/W/GetHistoryDetail 응답 형태 (실측:
// docs/backend-integration/responses/History-Police-GetHistoryDetail.md).
// 본사용 History/Stec/W/GetHistoryDetail 은 여기에 groupName/parentGroupName 이 더 붙어
// 오므로(#13) 그 두 필드를 optional 로 두고 공유한다.
export interface HistoryDetailRow {
  caseSeq: number
  mgmtNo: string
  statusName: string
  groupName?: string | null
  parentGroupName?: string | null
  suspectUserName: string | null
  startDate: string | null
  endDate: string | null
  totalGuardWorkMinutes: number | null
  investigator: string | null
  responsibleOfficer: string | null
  // 사건유형 — 2026-09-14 백엔드가 응답에 추가(findings 이력조회 갭 부분 해소).
  crimeType?: string | null
  // 5개 조치(안전/긴급응급/잠정/긴급임시/임시조치) + 적용기간. 오래 테스트로 오염된
  // 건(caseSeq 46·51)은 비어 보였지만 caseSeq 48로 실값 확인(2026-09-14, 사용자 확인)
  // — exclusions 해제, `@/shared/lib/caseMeasures`로 본사·피전 경호상세와 같은 방식 파싱.
  summary1: string | null
  summary1Date: string | null
  summary2: string | null
  summary2Date: string | null
  summary3: string | null
  summary3Date: string | null
  summary4: string | null
  summary4Date: string | null
  summary5: string | null
  summary5Date: string | null
  endDt: string | null
  remark: string | null
  guards: HistoryGuard[]
}

interface Paged<T> {
  meta: { pageNumber: number; pageSize: number; totalCount: number; totalPages: number }
  data: T[]
}

// statusName("경호취소"·"접수"·"배정"·"경호중"·"경호완료"·"종결") → 프론트 상태 타입.
function toStatus(statusName: string): SecurityCaseStatus {
  if (statusName.includes('취소')) return '취소'
  if (statusName === '접수') return '접수'
  if (statusName === '배정') return '배정'
  if (statusName === '경호중') return '경호중'
  if (statusName === '경호완료') return '경호완료'
  return '종결'
}

function isTerminal(status: SecurityCaseStatus) {
  return status === '종결' || status === '취소'
}

// 공통 빈 SecurityCase — 이력 응답이 안 주는 필드는 화면에서 "-"로 표시된다
// (배치장소 등, exclusions — 개인정보라 이력 화면 전체가 의도적으로 미표시).
// caseType·5개 조치(baseInfo)는 상세(detailRowToSecurityCase)에서 실값으로 덮어쓴다 —
// 목록(listRowToSecurityCase)엔 여전히 없어 이 기본값 유지.
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
  // 종결·취소 상세는 caseSeq 로 이력 상세를, 접수·진행중은 deploySeq 로 경호상세를 연다.
  const id = isTerminal(status) ? row.caseSeq : row.deploySeq
  return {
    ...emptySecurityCase(),
    id: String(id ?? row.caseSeq ?? row.deploySeq ?? ''),
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

// GetHistoryDetail(경찰용/본사용 공통) 응답 → SecurityCase. 본사용은 groupName/
// parentGroupName 이 더 오므로 있으면 채운다(경찰용은 undefined → 빈 문자열).
export function detailRowToSecurityCase(row: HistoryDetailRow): SecurityCase {
  const { receiptNumber, securityCode } = splitMgmtNo(row.mgmtNo)
  const status = toStatus(row.statusName)
  return {
    ...emptySecurityCase(),
    id: String(row.caseSeq),
    receiptNumber,
    securityCode,
    policeStation: row.groupName ?? '',
    jurisdiction: row.parentGroupName ?? '',
    status,
    caseType: crimeCodeToCaseType(row.crimeType),
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
    // 5개 조치만 채운다 — 근무시간·기본근무자·배치장소는 이 화면 소관이 아니라
    // (배치장소는 개인정보라 이력 화면 전체가 의도적으로 미표시) 빈 값으로 둔다.
    baseInfo: {
      workHours: '',
      defaultWorkers: [],
      investigator: '',
      victimOfficer: '',
      placeResidence: '',
      placeWorkplace: '',
      placeEtc1: '',
      placeEtc2: '',
      safetyMeasures: parseMeasureItems(row.summary1),
      emergencyMeasures: parseMeasureItems(row.summary2),
      provisionalMeasures: parseMeasureItems(row.summary3),
      emergencyTempMeasures: parseMeasureItems(row.summary4),
      temporaryMeasures: parseMeasureItems(row.summary5),
      safetyMeasuresPeriod: parseMeasurePeriod(row.summary1Date),
      emergencyMeasuresPeriod: parseMeasurePeriod(row.summary2Date),
      provisionalMeasuresPeriod: parseMeasurePeriod(row.summary3Date),
      emergencyTempMeasuresPeriod: parseMeasurePeriod(row.summary4Date),
      temporaryMeasuresPeriod: parseMeasurePeriod(row.summary5Date),
    },
    ...toStatusExtra(status, row.endDt, row.remark),
  }
}

export interface PoliceHistorySearchParams {
  searchKey?: string
  status?: number
  startDate?: string
  endDate?: string
  pageNumber: number
  pageSize: number
}

export interface PoliceHistorySearchResult {
  rows: SecurityCase[]
  meta: Paged<HistoryListRow>['meta']
}

async function fetchHistoryPage(
  useSessionGroupSeq: boolean,
  params: PoliceHistorySearchParams,
): Promise<Paged<HistoryListRow>> {
  // 피전(#14) 경로만 세션 groupSeq(로그인한 경찰서 조직번호, GetMyProfile로 받아 저장)를
  // 붙인다. 본청/지역청(#15)은 안 붙여야 서버가 관할 이하 전체를 캐스케이드로 준다.
  const groupSeq = useSessionGroupSeq ? useAuthStore.getState().user?.groupSeq : undefined
  const qs = new URLSearchParams()
  qs.set('pageNumber', String(params.pageNumber))
  qs.set('pageSize', String(params.pageSize))
  if (groupSeq != null) qs.set('groupSeq', String(groupSeq))
  if (params.searchKey) qs.set('searchKey', params.searchKey)
  if (params.status != null) qs.set('status', String(params.status))
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate) qs.set('endDate', params.endDate)
  const res = await apiFetch(`/v1/History/Police/W/GetHistoryList?${qs.toString()}`)
  if (!res.ok) {
    throw new Error('이력 조회 목록을 불러오지 못했습니다')
  }
  return unwrapEnvelope<Paged<HistoryListRow>>(res)
}

// 필터·페이지네이션 서버 연동(docs/architecture.md "상태관리") — xl 이상은 선택된
// 페이지 1개만 받아 교체 렌더. "접수"는 서버 status 코드가 없는 상태라(접수 행은
// status=null) 서버 필터 대상에서 빠진다 — 화면에서 그 옵션만 별도로 현재 페이지
// 안에서 클라이언트 후처리한다(알려진 한계, 서버가 접수만 격리해 줄 방법이 없음).
async function searchHistory(
  useSessionGroupSeq: boolean,
  params: PoliceHistorySearchParams,
): Promise<PoliceHistorySearchResult> {
  const page = await fetchHistoryPage(useSessionGroupSeq, params)
  return { rows: page.data.map(listRowToSecurityCase), meta: page.meta }
}

// xl 미만 "더보기" — 1..pageNumber까지 같은 필터로 이어붙인다.
async function searchHistoryAccumulated(
  useSessionGroupSeq: boolean,
  params: PoliceHistorySearchParams,
): Promise<PoliceHistorySearchResult> {
  const pages = await Promise.all(
    Array.from({ length: params.pageNumber }, (_, i) =>
      fetchHistoryPage(useSessionGroupSeq, { ...params, pageNumber: i + 1 }),
    ),
  )
  return {
    rows: pages.flatMap((p) => p.data.map(listRowToSecurityCase)),
    meta: pages[pages.length - 1].meta,
  }
}

// 화면 #14: [경찰서] 이력 조회 목록 — 로그인한 경찰서의 종결·취소 건만(서버 스코프).
export function searchPoliceStationHistory(
  params: PoliceHistorySearchParams,
): Promise<PoliceHistorySearchResult> {
  return searchHistory(true, params)
}
export function searchPoliceStationHistoryAccumulated(
  params: PoliceHistorySearchParams,
): Promise<PoliceHistorySearchResult> {
  return searchHistoryAccumulated(true, params)
}

// 화면 #15: [본청]/[지역청] 이력 조회 목록 — 관할 이하 전 구간(접수·진행중 포함).
// 서버가 토큰 역할로 스코프를 걸어 준다(본청=전국, 지역청=관할 이하).
export function searchSecurityCaseHistory(
  params: PoliceHistorySearchParams,
): Promise<PoliceHistorySearchResult> {
  return searchHistory(false, params)
}
export function searchSecurityCaseHistoryAccumulated(
  params: PoliceHistorySearchParams,
): Promise<PoliceHistorySearchResult> {
  return searchHistoryAccumulated(false, params)
}

// 화면 #14·#15: 이력 상세(종결·취소 건). id = caseSeq. 본청/지역청 토큰도 관할 건이면
// 200(실측). 접수·진행중 건은 이 함수가 아니라 경호상세 화면으로 라우팅된다.
export async function getPoliceStationHistoryDetail(id: string): Promise<SecurityCase> {
  const res = await apiFetch(`/v1/History/Police/W/GetHistoryDetail?caseSeq=${id}`)
  assertOk(res, '이력 상세를 불러오지 못했습니다')
  return detailRowToSecurityCase(await unwrapEnvelope<HistoryDetailRow>(res))
}
