import type {
  CaseAttachments,
  CaseBaseInfo,
  ClosureReason,
  ScheduleGroup,
  SecurityCase,
  SecurityCaseCreateInput,
} from '../../features/police/types/securityCase'
import { loadPersisted, savePersisted } from './persist'
import { removeCaseFromAllGuestAccounts } from './guests'

const STORAGE_KEY = 's-pgms:security-cases'

const JURISDICTION_BY_STATION: Record<string, string> = {
  강남경찰서: '서울지방경찰청',
  서초경찰서: '서울지방경찰청',
  종로경찰서: '서울지방경찰청',
  분당경찰서: '경기남부지방경찰청',
  부산진경찰서: '부산지방경찰청',
}

export function jurisdictionForStation(policeStation: string): string {
  return JURISDICTION_BY_STATION[policeStation] ?? '미지정'
}

// 접수 단계(배치요청)에서는 아직 경호코드가 발급되지 않은 상태라 관리번호 없이
// 접수번호만으로 표기한다 — 경호코드는 담당자 배정 시점에 발급된다(project-overview.md).
function seedPendingCase(input: {
  id: string
  policeStation: string
  receiptNumber: string
  requestedAt: string
  startDate: string
  endDate: string
}): SecurityCase {
  return {
    id: input.id,
    receiptNumber: input.receiptNumber,
    policeStation: input.policeStation,
    jurisdiction: jurisdictionForStation(input.policeStation),
    status: '접수',
    caseType: '스토킹',
    subject: {
      nameInitial: '김○○',
      gender: '여',
      birthYear: '1992',
      age: '34',
      occupation: '회사원',
      residence: `${input.policeStation} 관할`,
    },
    caseSummary: '지속적인 접근 시도가 확인되어 신변보호 조치가 필요함.',
    startDate: input.startDate,
    endDate: input.endDate,
    location: {
      residence: `${input.policeStation} 관할`,
      workplace: `${input.policeStation} 관할`,
      etc1: '',
      etc2: '',
    },
    additionalNotes: '',
    policeContact: {
      victimOfficer: '홍길동 / 경사 / 01000000000',
      investigator: '김수사 / 경장 / 01000000001',
    },
    requester: `${input.policeStation} 여청과 여청계`,
    createdAt: input.requestedAt,
  }
}

// 경찰서 경호목록(s3) 화면 검증용 — 접수 상태만 있던 기존 seed로는 배정/경호중/
// 경호완료 상태의 행이 하나도 없어 강남경찰서 소속으로 각 상태를 하나씩 보강한다
// (2026-08-25 결정). seedPendingCase는 항상 접수 상태만 만들기 때문에 배정 이후
// 상태를 표현하려면 status/assigneeId/securityCode를 직접 덮어써야 한다.
function seedActiveCase(input: {
  id: string
  policeStation: string
  receiptNumber: string
  requestedAt: string
  startDate: string
  endDate: string
  nameInitial: string
  status: '배정' | '경호중' | '경호완료'
  assigneeId: string
  securityCode: string
}): SecurityCase {
  const base = seedPendingCase(input)
  return {
    ...base,
    status: input.status,
    assigneeId: input.assigneeId,
    securityCode: input.securityCode,
    subject: { ...base.subject, nameInitial: input.nameInitial },
  }
}

function seedDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  let cursor = startDate
  while (cursor <= endDate) {
    dates.push(cursor)
    const next = new Date(`${cursor}T00:00:00.000Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    cursor = next.toISOString().slice(0, 10)
  }
  return dates
}

// 경찰 경호 상세화면(s5) 검증용 — 기본정보/근무스케줄/첨부가 전부 채워진
// 케이스가 있어야 목업처럼 내용이 꽉 찬 화면을 확인할 수 있어 worker-1/worker-2
// 두 명을 대표근무자로 배치기간 전체에 매일 09:00~18:00로 배정한다(2026-08-25).
function withDemoDetail(record: SecurityCase, opts: { destructionCert: boolean }): SecurityCase {
  const defaultWorkers = [
    { workerId: 'worker-1', isDefault: true },
    { workerId: 'worker-2', isDefault: true },
  ]

  const baseInfo: CaseBaseInfo = {
    workHours: '09:00 ~ 18:00',
    defaultWorkers,
    investigator: record.policeContact.investigator,
    victimOfficer: record.policeContact.victimOfficer,
    placeResidence: record.location.residence,
    placeWorkplace: record.location.workplace,
    placeEtc1: '',
    placeEtc2: '',
    safetyMeasures: ['맞춤형 순찰', '스마트워치'],
    emergencyMeasures: ['1호'],
    provisionalMeasures: ['2호'],
    emergencyTempMeasures: [],
    temporaryMeasures: ['1호'],
    safetyMeasuresPeriod: { startDate: record.startDate, endDate: record.endDate },
    emergencyMeasuresPeriod: null,
    provisionalMeasuresPeriod: null,
    emergencyTempMeasuresPeriod: null,
    temporaryMeasuresPeriod: null,
  }

  const days = seedDateRange(record.startDate, record.endDate).map((date) => ({
    date,
    groups: [
      {
        id: `${record.id}-${date}-group-1`,
        note: '',
        assignments: defaultWorkers.map((w) => ({
          workerId: w.workerId,
          startTime: '09:00',
          endTime: '18:00',
          isOff: false,
        })),
      },
    ],
  }))

  const attachments: CaseAttachments = {
    securityPlanFileName: '경호계획서.pdf',
    workerConsentFileNames: {
      'worker-1': '동의서_최민준.pdf',
      'worker-2': '동의서_정우진.pdf',
    },
    destructionCertFileName: opts.destructionCert ? `파기확인서_${record.securityCode}.pdf` : null,
  }

  return { ...record, baseInfo, workSchedule: { preMeeting: null, days }, attachments }
}

// 이력 조회(Phase 3-1) 검증용 — 종결/취소 건이 기존 seed에 하나도 없어서 별도로
// 만든다. withDemoDetail로 근무 스케줄을 채워야 이력 상세의 "근무자 배정 이력"
// (근무일수·총근무시간, workSchedule 실 배정을 합산해서 계산)이 빈 값이 아니게 나온다.
function seedClosedCase(input: {
  id: string
  policeStation: string
  receiptNumber: string
  requestedAt: string
  startDate: string
  endDate: string
  nameInitial: string
  assigneeId: string
  securityCode: string
  closureReason: ClosureReason
  closedAt: string
}): SecurityCase {
  const record = withDemoDetail(
    seedActiveCase({ ...input, status: '경호완료' }),
    { destructionCert: true },
  )
  return { ...record, status: '종결', closureReason: input.closureReason, closedAt: input.closedAt }
}

// 취소는 배정 상태에서 바로 전환되므로(기본정보/스케줄 미등록) withDemoDetail을
// 쓰지 않는다 — 목업(s1h/s2h)도 취소 건은 경호시작/종료/총경호시간을 "-"로 표기.
function seedCanceledCase(input: {
  id: string
  policeStation: string
  receiptNumber: string
  requestedAt: string
  startDate: string
  endDate: string
  nameInitial: string
  assigneeId: string
  securityCode: string
  cancelReason: string
  canceledAt: string
}): SecurityCase {
  const record = seedActiveCase({ ...input, status: '배정' })
  return {
    ...record,
    status: '취소',
    cancelReason: input.cancelReason,
    canceledAt: input.canceledAt,
  }
}

const SEED_CASES: SecurityCase[] = [
  seedPendingCase({
    id: 'case-seed-1',
    policeStation: '강남경찰서',
    receiptNumber: '26-02-강남경찰서',
    requestedAt: '2026-02-03T00:00:00.000Z',
    startDate: '2026-02-10',
    endDate: '2026-02-24',
  }),
  seedPendingCase({
    id: 'case-seed-2',
    policeStation: '서초경찰서',
    receiptNumber: '26-02-서초경찰서',
    requestedAt: '2026-02-04T00:00:00.000Z',
    startDate: '2026-02-12',
    endDate: '2026-02-26',
  }),
  seedPendingCase({
    id: 'case-seed-3',
    policeStation: '분당경찰서',
    receiptNumber: '26-02-분당경찰서',
    requestedAt: '2026-02-05T00:00:00.000Z',
    startDate: '2026-02-15',
    endDate: '2026-03-01',
  }),
  seedPendingCase({
    id: 'case-seed-4',
    policeStation: '부산진경찰서',
    receiptNumber: '26-02-부산진경찰서',
    requestedAt: '2026-02-06T00:00:00.000Z',
    startDate: '2026-02-18',
    endDate: '2026-03-04',
  }),
  seedPendingCase({
    id: 'case-seed-5',
    policeStation: '종로경찰서',
    receiptNumber: '26-02-종로경찰서',
    requestedAt: '2026-02-07T00:00:00.000Z',
    startDate: '2026-02-20',
    endDate: '2026-03-06',
  }),
  seedActiveCase({
    id: 'case-seed-6',
    policeStation: '강남경찰서',
    receiptNumber: '26-01-강남경찰서',
    requestedAt: '2026-01-08T00:00:00.000Z',
    startDate: '2026-02-01',
    endDate: '2026-02-15',
    nameInitial: '윤○○',
    status: '배정',
    assigneeId: 'hqmanager1',
    securityCode: 'ST101',
  }),
  withDemoDetail(
    seedActiveCase({
      id: 'case-seed-7',
      policeStation: '강남경찰서',
      receiptNumber: '26-03-강남경찰서',
      requestedAt: '2026-01-02T00:00:00.000Z',
      startDate: '2026-01-05',
      endDate: '2026-01-19',
      nameInitial: '홍○○',
      status: '경호중',
      assigneeId: 'hqmanager2',
      securityCode: 'ST102',
    }),
    { destructionCert: false },
  ),
  withDemoDetail(
    seedActiveCase({
      id: 'case-seed-8',
      policeStation: '강남경찰서',
      receiptNumber: '26-04-강남경찰서',
      requestedAt: '2026-01-10T00:00:00.000Z',
      startDate: '2026-01-18',
      endDate: '2026-02-01',
      nameInitial: '강○○',
      status: '경호완료',
      assigneeId: 'hqmanager3',
      securityCode: 'ST103',
    }),
    { destructionCert: true },
  ),
  seedClosedCase({
    id: 'case-hist-1',
    policeStation: '강남경찰서',
    receiptNumber: '25-11-강남경찰서',
    requestedAt: '2025-10-20T00:00:00.000Z',
    startDate: '2025-11-01',
    endDate: '2025-11-14',
    nameInitial: '박○○',
    assigneeId: 'hqmanager1',
    securityCode: 'ST110',
    closureReason: '경호기간 만료',
    closedAt: '2025-11-15',
  }),
  seedClosedCase({
    id: 'case-hist-2',
    policeStation: '강남경찰서',
    receiptNumber: '25-09-강남경찰서',
    requestedAt: '2025-08-20T00:00:00.000Z',
    startDate: '2025-09-03',
    endDate: '2025-09-17',
    nameInitial: '이○○',
    assigneeId: 'hqmanager2',
    securityCode: 'ST111',
    closureReason: '피해자 요청에 의한 종결',
    closedAt: '2025-09-18',
  }),
  seedCanceledCase({
    id: 'case-hist-3',
    policeStation: '강남경찰서',
    receiptNumber: '25-08-강남경찰서',
    requestedAt: '2025-08-05T00:00:00.000Z',
    startDate: '2025-08-10',
    endDate: '2025-08-24',
    nameInitial: '최○○',
    assigneeId: 'hqmanager3',
    securityCode: 'ST112',
    cancelReason: '피해자 소재불명으로 신변보호 실익 없음',
    canceledAt: '2025-08-20',
  }),
  seedClosedCase({
    id: 'case-hist-4',
    policeStation: '서초경찰서',
    receiptNumber: '25-10-서초경찰서',
    requestedAt: '2025-09-22T00:00:00.000Z',
    startDate: '2025-10-06',
    endDate: '2025-10-20',
    nameInitial: '정○○',
    assigneeId: 'hqmanager1',
    securityCode: 'ST113',
    closureReason: '피의자 구속',
    closedAt: '2025-10-21',
  }),
  seedClosedCase({
    id: 'case-hist-5',
    policeStation: '분당경찰서',
    receiptNumber: '25-07-분당경찰서',
    requestedAt: '2025-06-18T00:00:00.000Z',
    startDate: '2025-07-02',
    endDate: '2025-07-16',
    nameInitial: '한○○',
    assigneeId: 'hqmanager2',
    securityCode: 'ST114',
    closureReason: '경호기간 만료',
    closedAt: '2025-07-17',
  }),
  seedCanceledCase({
    id: 'case-hist-6',
    policeStation: '분당경찰서',
    receiptNumber: '25-06-분당경찰서',
    requestedAt: '2025-06-01T00:00:00.000Z',
    startDate: '2025-06-05',
    endDate: '2025-06-19',
    nameInitial: '오○○',
    assigneeId: 'hqmanager3',
    securityCode: 'ST115',
    cancelReason: '피해자 요청으로 조기 종료',
    canceledAt: '2025-06-15',
  }),
  seedClosedCase({
    id: 'case-hist-7',
    policeStation: '부산진경찰서',
    receiptNumber: '25-05-부산진경찰서',
    requestedAt: '2025-04-28T00:00:00.000Z',
    startDate: '2025-05-12',
    endDate: '2025-05-26',
    nameInitial: '유○○',
    assigneeId: 'hqmanager2',
    securityCode: 'ST116',
    closureReason: '경호기간 만료',
    closedAt: '2025-05-27',
  }),
]

export const securityCases: SecurityCase[] = loadPersisted(STORAGE_KEY, SEED_CASES)

function persist() {
  savePersisted(STORAGE_KEY, securityCases)
}

// 카운터 자체는 persist하지 않고, 로드된(=새로고침 전 저장된) 데이터에서 이미 쓰인
// 최댓값을 읽어 다음 값을 계산한다 — 배열만 정상 저장돼 있으면 항상 정합성 있게
// 이어서 발급된다.
function deriveNextSeq(pattern: RegExp, values: (string | undefined)[]): number {
  const max = values.reduce((acc, v) => {
    const m = v?.match(pattern)
    if (!m) return acc
    return Math.max(acc, Number(m[1]))
  }, 0)
  return max + 1
}

let nextCaseId = deriveNextSeq(
  /^case-(\d+)$/,
  securityCases.map((c) => c.id),
)
let nextSecurityCodeSeq = deriveNextSeq(
  /^ST(\d+)$/,
  securityCases.map((c) => c.securityCode),
)

export function issueReceiptNumber(policeStation: string, now = new Date()): string {
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `${yy}-${mm}-${policeStation}`
}

// 개별 경찰서 단위가 아니라 전 경찰서 통합·연 단위로 발급되는 일련번호
// (project-overview.md 관리번호 체계). mock 단계라 연도 롤오버는 시뮬레이션하지 않음.
export function issueSecurityCode(): string {
  const code = `ST${String(nextSecurityCodeSeq).padStart(3, '0')}`
  nextSecurityCodeSeq += 1
  return code
}

export function createSecurityCase(
  policeStation: string,
  input: SecurityCaseCreateInput,
): SecurityCase {
  const record: SecurityCase = {
    ...input,
    id: `case-${nextCaseId++}`,
    receiptNumber: issueReceiptNumber(policeStation),
    policeStation,
    jurisdiction: jurisdictionForStation(policeStation),
    status: '접수',
    createdAt: new Date().toISOString(),
  }
  securityCases.push(record)
  persist()
  return record
}

// 화면5: 피전이 자기가 작성한 배치요구서를 수정한다. 접수/배정 상태는 배치기간
// (startDate/endDate)까지 포함해 전부 수정 가능하고, 경호중 이후는 화면단에서
// 배치기간 입력을 비활성화해두므로 여기서는 항상 넘어온 값 그대로 덮어쓴다
// (2026-08-25 결정 — 기간 변경은 경호중부터는 연장/단축 요청 몫).
export function updateSecurityCase(
  caseId: string,
  input: SecurityCaseCreateInput,
): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record) return null

  record.subject = input.subject
  record.caseType = input.caseType
  record.caseSummary = input.caseSummary
  record.startDate = input.startDate
  record.endDate = input.endDate
  record.location = input.location
  record.additionalNotes = input.additionalNotes
  record.policeContact = input.policeContact
  record.requester = input.requester
  persist()
  return record
}

// 담당자 배정: 접수 → 배정 상태 전환 + 경호코드 발급 (project-overview.md 업무 워크플로우 3단계)
export function assignManager(caseId: string, managerId: string): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record || record.status !== '접수') return null

  record.status = '배정'
  record.assigneeId = managerId
  record.securityCode = issueSecurityCode()
  persist()
  return record
}

// 접수취소: 아직 경호코드가 발급되지 않은 상태라 상태값으로 남기지 않고 DB에서
// 완전히 삭제한다 (project-overview.md 취소 규칙).
export function cancelPendingCase(caseId: string): boolean {
  const index = securityCases.findIndex((c) => c.id === caseId)
  if (index === -1 || securityCases[index].status !== '접수') return false
  securityCases.splice(index, 1)
  persist()
  return true
}

// 경호취소: 배정 상태 이후(경호코드 발급 후)라 상태값 '취소'로 전환하고 이력에
// 남긴다 — 사유를 필수로 받는다 (project-overview.md 취소 규칙).
export function cancelAssignedCase(caseId: string, reason: string): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record || record.status !== '배정') return null

  record.status = '취소'
  record.cancelReason = reason
  record.canceledAt = new Date().toISOString()
  removeCaseFromAllGuestAccounts(record.id)
  persist()
  return record
}

// 화면 5: 경찰서가 경호중 상태에서 연장(+7일 고정)/단축(배치기간 내 새 종료일)을
// 요청한다. 즉시 반영되지 않고 대기 상태로만 남는다 — 실제 startDate/endDate·
// 근무스케줄 반영은 본사 승인 화면(후속 항목) 몫이다. 이미 대기 중인 요청이 있으면
// 재요청할 수 없다.
export function requestPeriodChange(
  caseId: string,
  type: '연장' | '단축',
  requestedEndDate: string,
): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record || record.status !== '경호중' || record.pendingPeriodRequest) return null

  record.pendingPeriodRequest = {
    type,
    requestedEndDate,
    requestedAt: new Date().toISOString(),
  }
  persist()
  return record
}

// [본사] 연장요청/단축요청 승인: startDate/endDate만 바꾸면 상세 페이지 배치기간
// 표시와 스케줄 일자가 어긋나므로(스케줄 일자는 최초 생성 후 추가/삭제 UI가 없음)
// 여기서 workSchedule.days도 같이 늘리거나(연장) 잘라낸다(단축).
export function approvePeriodRequest(caseId: string): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  const request = record?.pendingPeriodRequest
  if (!record || record.status !== '경호중' || !request) return null

  const { type, requestedEndDate } = request

  if (record.workSchedule) {
    if (type === '연장') {
      const defaultWorkers = record.baseInfo?.defaultWorkers.filter((w) => w.isDefault) ?? []
      const [startTime, endTime] = (record.baseInfo?.workHours ?? '09:00 ~ 18:00')
        .split(' ~ ')
        .map((s) => s.trim())
      const newDays = generateScheduleDays(
        caseId,
        nextDate(toDateOnly(record.endDate)),
        requestedEndDate,
        startTime,
        endTime,
        defaultWorkers,
      )
      record.workSchedule.days = [...record.workSchedule.days, ...newDays]
    } else {
      record.workSchedule.days = record.workSchedule.days.filter(
        (d) => d.date <= toDateOnly(requestedEndDate),
      )
    }
  }

  record.endDate = requestedEndDate
  record.pendingPeriodRequest = undefined
  persist()
  return record
}

// [본사] 연장요청/단축요청 거부: 거부 사유는 데이터 모델/요구사항에 없어 대기 요청만
// 해제한다(단순 확인 후 처리).
export function rejectPeriodRequest(caseId: string): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record || record.status !== '경호중' || !record.pendingPeriodRequest) return null

  record.pendingPeriodRequest = undefined
  persist()
  return record
}

// 화면 5: 경호완료 상태에서 파기확인서 업로드가 끝난 뒤에만 종결 처리할 수 있다
// (project-overview.md 업무 워크플로우 6단계, 목업 s5-done 사이드 안내문구 기준).
export function closeCase(
  caseId: string,
  closureReason: ClosureReason,
  closureReasonDetail?: string,
): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (
    !record ||
    record.status !== '경호완료' ||
    !record.attachments?.destructionCertFileName
  ) {
    return null
  }

  record.status = '종결'
  record.closureReason = closureReason
  if (closureReason === '기타' && closureReasonDetail) {
    record.closureReasonDetail = closureReasonDetail
  }
  record.closedAt = new Date().toISOString()
  removeCaseFromAllGuestAccounts(record.id)
  persist()
  return record
}

export function findSecurityCase(caseId: string): SecurityCase | null {
  return securityCases.find((c) => c.id === caseId) ?? null
}

// 화면 7c: 본부관리자가 배치요구서를 확인한 뒤 기본정보를 등록/수정 (s7a → s7d 전이)
export function registerBaseInfo(caseId: string, input: CaseBaseInfo): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record) return null
  record.baseInfo = input
  persist()
  return record
}

function toDateOnly(iso: string) {
  return iso.slice(0, 10)
}

function nextDate(dateOnly: string): string {
  const d = new Date(`${dateOnly}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return toDateOnly(d.toISOString())
}

// 배치기간 내 일자별로 그룹 1을 자동 생성 — "대표근무자로 체크된" 기본 근무자만
// 입력한 시간으로 배정된다(roster 전체가 아니라 isDefault만, s7c 안내문구 기준).
// createInitialSchedule(최초 생성)과 approvePeriodRequest(연장 승인 시 일자 추가)가 공유.
function generateScheduleDays(
  caseId: string,
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  defaultWorkers: { workerId: string }[],
) {
  const days = []
  let cursor = toDateOnly(startDate)
  const end = toDateOnly(endDate)
  while (cursor <= end) {
    days.push({
      date: cursor,
      groups: [
        {
          id: `${caseId}-${cursor}-group-1`,
          note: '',
          assignments: defaultWorkers.map((w) => ({
            workerId: w.workerId,
            startTime,
            endTime,
            isOff: false,
          })),
        },
      ],
    })
    cursor = nextDate(cursor)
  }
  return days
}

// 화면 7e: 배치기간+근무시간을 입력하면 일자별 섹션이 자동 생성된다. s7d → s7 전이.
export function createInitialSchedule(
  caseId: string,
  input: { startDate: string; endDate: string; startTime: string; endTime: string },
): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record || !record.baseInfo) return null

  const defaultWorkers = record.baseInfo.defaultWorkers.filter((w) => w.isDefault)

  record.workSchedule = {
    preMeeting: null,
    days: generateScheduleDays(
      caseId,
      input.startDate,
      input.endDate,
      input.startTime,
      input.endTime,
      defaultWorkers,
    ),
  }
  persist()
  return record
}

// 화면 7b: 특정 일자의 그룹 하나를 추가/수정 (그룹 id가 이미 있으면 교체, 없으면 추가)
export function upsertScheduleGroup(
  caseId: string,
  date: string,
  group: ScheduleGroup,
): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record?.workSchedule) return null

  const day = record.workSchedule.days.find((d) => d.date === date)
  if (!day) return null

  const idx = day.groups.findIndex((g) => g.id === group.id)
  if (idx >= 0) day.groups[idx] = group
  else day.groups.push(group)
  persist()
  return record
}

export function setPreMeeting(
  caseId: string,
  preMeeting: NonNullable<SecurityCase['workSchedule']>['preMeeting'],
): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record?.workSchedule) return null
  record.workSchedule.preMeeting = preMeeting
  persist()
  return record
}

function ensureAttachments(record: SecurityCase): CaseAttachments {
  if (!record.attachments) {
    record.attachments = {
      securityPlanFileName: null,
      workerConsentFileNames: {},
      destructionCertFileName: null,
    }
  }
  return record.attachments
}

export function setSecurityPlanFile(caseId: string, fileName: string): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record) return null
  ensureAttachments(record).securityPlanFileName = fileName
  persist()
  return record
}

export function setDestructionCertFile(caseId: string, fileName: string): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record) return null
  ensureAttachments(record).destructionCertFileName = fileName
  persist()
  return record
}

export function setWorkerConsentFile(
  caseId: string,
  workerId: string,
  fileName: string,
): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record) return null
  ensureAttachments(record).workerConsentFileNames[workerId] = fileName
  persist()
  return record
}
