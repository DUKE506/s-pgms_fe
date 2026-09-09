import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { splitMgmtNo } from '@/shared/lib/managementNumber'
import type { SecurityCase } from '../../police/types/securityCase'

// GET /api/v1/GuardCase/Stec/W/GetDeployRequestList 의 항목 형태
// (docs/backend-integration/responses/GuardCase-Stec-GetDeployRequestList.md 실측).
interface DeployRequestRow {
  deploySeq: number
  caseSeq: number | null
  mgmtNo: string
  groupName: string
  parentGroupName: string
  createDt: string
  periodFrom: string
  periodTo: string
  requestedEndDate: string | null
}

// 배치요청 목록은 미배정(caseSeq: null) 배치요구서만 담는다 — 화면이 읽는 필드
// (관리번호·경찰서·지역청·요청일·배치기간)만 채우고 나머지 SecurityCase 필드는 빈
// 값으로 둔다. mgmtNo는 접미사·경호코드 없는 "26-09-동래경찰서" 형태라 그대로 쓴다.
// 대상자·배치요구서 상세는 이 응답에 없다 — 본사가 배치요구서 원본을 볼 API 자체가
// 없어(issues.md #7) DispatchRequestViewDialog는 목록 필드만 보여준다.
function toSecurityCase(row: DeployRequestRow): SecurityCase {
  return {
    id: String(row.deploySeq),
    receiptNumber: row.mgmtNo,
    policeStation: row.groupName,
    jurisdiction: row.parentGroupName,
    status: '접수',
    caseType: '사건미접수',
    subject: { nameInitial: '', gender: '', birthDate: '', occupation: '', residence: '' },
    caseSummary: '',
    startDate: row.periodFrom,
    endDate: row.periodTo,
    location: { residence: '', workplace: '', etc1: '', etc2: '' },
    additionalNotes: '',
    policeContact: { victimOfficer: '', investigator: '' },
    requester: { dept: '', position: '', name: '' },
    createdAt: row.createDt,
  }
}

// 화면: [본사] 배치요청 목록. 운영/시스템관리자는 전국 모든 미배정 배치요청을 본다
// (스코프 필터 없음 — 서버가 파라미터 없이도 전량 반환). 본부관리자는 403.
export async function listPendingRequests(): Promise<SecurityCase[]> {
  const res = await apiFetch('/v1/GuardCase/Stec/W/GetDeployRequestList')
  if (!res.ok) {
    throw new Error('배치요청 목록을 불러오지 못했습니다')
  }
  const rows = await unwrapEnvelope<DeployRequestRow[]>(res)
  return rows.map(toSecurityCase)
}

// GET /api/v1/GuardCase/Stec/W/GetGuardCaseList 의 항목 형태 (실측:
// docs/backend-integration/responses/GuardCase-Stec-GetGuardCaseList.md).
// 응답은 {meta:{pageNumber,pageSize,totalCount,totalPages}, data:[...]} 를 한 번 더
// envelope로 감싼 형태다.
interface GuardCaseRow {
  caseSeq: number
  mgmtNo: string
  groupName: string
  // 배정된 본부관리자 계정명(userName) — 담당자 id는 응답에 없다.
  userName: string
  statusName: string
  // 배정 직후엔 null(경호계획 등록 전), 경호중 이후 ISO datetime.
  startDate: string | null
  endDate: string | null
}

interface Paged<T> {
  meta: { pageNumber: number; pageSize: number; totalCount: number; totalPages: number }
  data: T[]
}

// 본사 경호목록은 이 응답만 쓰므로 화면이 읽는 필드(관리번호·경찰서·담당자명·상태·
// 경호기간)만 채우고 나머지는 빈 값으로 둔다. mgmtNo는 경호코드가 붙은 완성형
// ("26-09-동래경찰서 ST0004")이라 splitMgmtNo로 나눠 formatManagementNumber가
// 재조합하게 한다(경찰서 경호목록과 동일). 지역청(jurisdiction)은 응답에 없어 빈 값
// — 지역청 필터는 사실상 "전체"만 남는다(exclusions).
function guardCaseRowToSecurityCase(row: GuardCaseRow): SecurityCase {
  const { receiptNumber, securityCode } = splitMgmtNo(row.mgmtNo)
  return {
    id: String(row.caseSeq),
    receiptNumber,
    securityCode,
    policeStation: row.groupName,
    jurisdiction: '',
    status: row.statusName as SecurityCase['status'],
    caseType: '사건미접수',
    subject: { nameInitial: '', gender: '', birthDate: '', occupation: '', residence: '' },
    caseSummary: '',
    startDate: row.startDate ?? '',
    endDate: row.endDate ?? '',
    location: { residence: '', workplace: '', etc1: '', etc2: '' },
    additionalNotes: '',
    policeContact: { victimOfficer: '', investigator: '' },
    requester: { dept: '', position: '', name: '' },
    createdAt: '',
    assigneeName: row.userName || undefined,
  }
}

// 서버 pageSize 상한이 100이라 전량을 한 번에 못 받는다 — meta.totalPages까지 순회해
// 이어붙인 뒤 클라이언트에서 필터/정렬한다(화면에 페이지네이션 UI 없음, URL 쿼리
// 필터는 후속). 방어적으로 최대 페이지 수를 제한한다.
const GUARD_CASE_PAGE_SIZE = 100
const GUARD_CASE_MAX_PAGES = 50

async function fetchGuardCasePage(pageNumber: number): Promise<Paged<GuardCaseRow>> {
  const res = await apiFetch(
    `/v1/GuardCase/Stec/W/GetGuardCaseList?pageNumber=${pageNumber}&pageSize=${GUARD_CASE_PAGE_SIZE}`,
  )
  if (!res.ok) {
    throw new Error('경호목록을 불러오지 못했습니다')
  }
  return unwrapEnvelope<Paged<GuardCaseRow>>(res)
}

// 화면 8: [본사] 경호목록. 운영/시스템관리자는 전국 전체, 본부관리자는 본인 배정
// 건만(서버가 WORK-009로 강제).
export async function listSecurityCases(): Promise<SecurityCase[]> {
  const first = await fetchGuardCasePage(1)
  const rows = [...first.data]
  const lastPage = Math.min(first.meta.totalPages, GUARD_CASE_MAX_PAGES)
  for (let page = 2; page <= lastPage; page += 1) {
    rows.push(...(await fetchGuardCasePage(page)).data)
  }
  return rows.map(guardCaseRowToSecurityCase)
}

// 본부 배정 — POST GuardCase/Stec/W/AddGuardCase {deploySeq, userSeq}.
// 여기서 GuardCase(경호건)가 처음 생성된다. 성공 응답은 {data:true}뿐이라 호출부는
// 목록을 재조회해 확인한다(반환값 없음). caseId=SecurityCase.id=deploySeq(문자열),
// managerId=Manager.id=userSeq(문자열).
export async function assignManager(caseId: string, managerId: string): Promise<void> {
  const res = await apiFetch('/v1/GuardCase/Stec/W/AddGuardCase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deploySeq: Number(caseId), userSeq: Number(managerId) }),
  })
  if (!res.ok) {
    throw new Error('담당자 배정에 실패했습니다')
  }
}

// ⚠️ 배치요청 "취소" API가 아직 없다 — GuardCase/Stec/W/CancelGuardCase는 스웨거에
// 없고, 유일한 취소 엔드포인트 Deploy/Police/W/CancelGuardCase는 Police 태그라 본사
// 토큰으로 호출 불가(issues.md에 신규 이슈로 기록, 섹션 일괄 요청 대상). 반영 전까지
// RequestListPage의 "취소" 메뉴는 disabled — 이 함수는 호출되지 않는다.
export async function cancelPendingRequest(caseId: string): Promise<void> {
  const res = await apiFetch(`/security-cases/${caseId}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error('배치요청 취소에 실패했습니다')
  }
}

// GET /api/v1/GuardCase/Stec/W/GetExtendRequestList · GetShortenRequestList 의 항목
// 형태 (실측: docs/backend-integration/responses/GuardCase-Stec-GetExtend-GetShortenRequestList.md).
// GetDeployRequestList와 거의 같은 구조 — caseSeq가 채워져 있고(배정된 건),
// requestedEndDate가 신청한 새 종료일이라는 점만 다르다.
interface PeriodRequestRow {
  deploySeq: number
  caseSeq: number
  mgmtNo: string
  groupName: string
  parentGroupName: string
  createDt: string
  periodFrom: string
  periodTo: string
  requestedEndDate: string
}

// 항목엔 연장/단축 구분 필드가 없다 — 어느 엔드포인트를 불렀는지로 type을 정한다.
// id는 caseSeq(승인 = ConfirmCasePeriod가 caseSeq를 받음). mgmtNo는 접미사 없는
// 접수번호만("26-09-동래경찰서")이라 그대로 쓴다.
function periodRequestRowToSecurityCase(
  row: PeriodRequestRow,
  type: '연장' | '단축',
): SecurityCase {
  return {
    id: String(row.caseSeq),
    receiptNumber: row.mgmtNo,
    policeStation: row.groupName,
    jurisdiction: row.parentGroupName,
    status: '경호중',
    caseType: '사건미접수',
    subject: { nameInitial: '', gender: '', birthDate: '', occupation: '', residence: '' },
    caseSummary: '',
    startDate: row.periodFrom,
    endDate: row.periodTo,
    location: { residence: '', workplace: '', etc1: '', etc2: '' },
    additionalNotes: '',
    policeContact: { victimOfficer: '', investigator: '' },
    requester: { dept: '', position: '', name: '' },
    createdAt: row.createDt,
    pendingPeriodRequest: {
      type,
      requestedEndDate: row.requestedEndDate,
      // 응답에 "신청 시각"이 없어 배치요구서 최초 생성일(createDt)을 화면 "요청일"
      // 표시에 대신 쓴다(exclusions). 승인 판단엔 영향 없음.
      requestedAt: row.createDt,
    },
  }
}

// [본사] 연장요청/단축요청 목록. 운영/시스템관리자는 전국, 본부관리자는 본인 배정
// 건만(서버 스코프). 연장은 GetExtendRequestList, 단축은 GetShortenRequestList로 분리.
export async function listPeriodRequests(type: '연장' | '단축'): Promise<SecurityCase[]> {
  const path =
    type === '연장'
      ? '/v1/GuardCase/Stec/W/GetExtendRequestList'
      : '/v1/GuardCase/Stec/W/GetShortenRequestList'
  const res = await apiFetch(path)
  if (!res.ok) {
    throw new Error('연장/단축 요청 목록을 불러오지 못했습니다')
  }
  const rows = await unwrapEnvelope<PeriodRequestRow[]>(res)
  return rows.map((r) => periodRequestRowToSecurityCase(r, type))
}

// 승인 — POST GuardCase/Stec/W/AddGuardCase 와 같은 계열. body는 caseSeq 하나뿐이고
// 서버가 배치요구서 상태(2:연장 / 3:단축)를 읽어 배치기간·근무스케줄에 반영한다.
// 성공 {data:true}. caseId = SecurityCase.id = caseSeq(문자열).
export async function approvePeriodRequest(caseId: string): Promise<void> {
  const res = await apiFetch('/v1/GuardCase/Stec/W/ConfirmCasePeriod', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseSeq: Number(caseId) }),
  })
  if (!res.ok) {
    throw new Error('승인에 실패했습니다')
  }
}

// ⚠️ 연장/단축 "거부"에 대응하는 백엔드 EP가 없다(issues.md #2 — 승인만 있고 거부
// 경로 자체가 없음). PeriodRequestListPage에서 거부 메뉴를 비활성화하므로 이 함수는
// 호출되지 않는다 — 방어적으로 throw. EP가 생기면 여기에 연결한다.
export async function rejectPeriodRequest(_caseId: string): Promise<void> {
  void _caseId
  throw new Error('연장/단축 거부 기능은 현재 사용할 수 없습니다')
}
