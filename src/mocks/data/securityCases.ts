import type {
  CaseAttachments,
  CaseBaseInfo,
  ScheduleGroup,
  SecurityCase,
  SecurityCaseCreateInput,
} from '../../features/police/types/securityCase'

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

export const securityCases: SecurityCase[] = [
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
]

let nextCaseId = 1
let nextSecurityCodeSeq = 1

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
  return record
}

// 담당자 배정: 접수 → 배정 상태 전환 + 경호코드 발급 (project-overview.md 업무 워크플로우 3단계)
export function assignManager(caseId: string, managerName: string): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record || record.status !== '접수') return null

  record.status = '배정'
  record.assignee = managerName
  record.securityCode = issueSecurityCode()
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

// 화면 7e: 배치기간+근무시간을 입력하면 일자별 섹션이 자동 생성되고, 각 일자에
// 그룹 1이 만들어져 "대표근무자로 체크된" 기본 근무자만 입력한 시간으로 자동
// 배정된다 (roster 전체가 아니라 isDefault만 — s7c 안내문구 기준). s7d → s7 전이.
export function createInitialSchedule(
  caseId: string,
  input: { startDate: string; endDate: string; startTime: string; endTime: string },
): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record || !record.baseInfo) return null

  const defaultWorkers = record.baseInfo.defaultWorkers.filter((w) => w.isDefault)

  const days = []
  let cursor = toDateOnly(input.startDate)
  const end = toDateOnly(input.endDate)
  while (cursor <= end) {
    days.push({
      date: cursor,
      groups: [
        {
          id: `${caseId}-${cursor}-group-1`,
          note: '',
          assignments: defaultWorkers.map((w) => ({
            workerId: w.workerId,
            startTime: input.startTime,
            endTime: input.endTime,
            isOff: false,
          })),
        },
      ],
    })
    cursor = nextDate(cursor)
  }

  record.workSchedule = {
    preMeeting: { enabled: false, date: '', workerId: '', startTime: '', endTime: '' },
    days,
  }
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
  return record
}

export function setPreMeeting(
  caseId: string,
  preMeeting: NonNullable<SecurityCase['workSchedule']>['preMeeting'],
): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record?.workSchedule) return null
  record.workSchedule.preMeeting = preMeeting
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
  return record
}

export function setDestructionCertFile(caseId: string, fileName: string): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record) return null
  ensureAttachments(record).destructionCertFileName = fileName
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
  return record
}
