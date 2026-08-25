import type {
  CaseAttachments,
  CaseBaseInfo,
  ScheduleGroup,
  SecurityCase,
  SecurityCaseCreateInput,
} from '../../features/police/types/securityCase'
import { loadPersisted, savePersisted } from './persist'

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
// 상태를 표현하려면 status/assignee/securityCode를 직접 덮어써야 한다.
function seedActiveCase(input: {
  id: string
  policeStation: string
  receiptNumber: string
  requestedAt: string
  startDate: string
  endDate: string
  nameInitial: string
  status: '배정' | '경호중' | '경호완료'
  assignee: string
  securityCode: string
}): SecurityCase {
  const base = seedPendingCase(input)
  return {
    ...base,
    status: input.status,
    assignee: input.assignee,
    securityCode: input.securityCode,
    subject: { ...base.subject, nameInitial: input.nameInitial },
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
    assignee: '김민수',
    securityCode: 'ST101',
  }),
  seedActiveCase({
    id: 'case-seed-7',
    policeStation: '강남경찰서',
    receiptNumber: '26-03-강남경찰서',
    requestedAt: '2026-01-02T00:00:00.000Z',
    startDate: '2026-01-05',
    endDate: '2026-01-19',
    nameInitial: '홍○○',
    status: '경호중',
    assignee: '이영희',
    securityCode: 'ST102',
  }),
  seedActiveCase({
    id: 'case-seed-8',
    policeStation: '강남경찰서',
    receiptNumber: '26-04-강남경찰서',
    requestedAt: '2026-01-10T00:00:00.000Z',
    startDate: '2026-01-18',
    endDate: '2026-02-01',
    nameInitial: '강○○',
    status: '경호완료',
    assignee: '박준혁',
    securityCode: 'ST103',
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

// 담당자 배정: 접수 → 배정 상태 전환 + 경호코드 발급 (project-overview.md 업무 워크플로우 3단계)
export function assignManager(caseId: string, managerName: string): SecurityCase | null {
  const record = securityCases.find((c) => c.id === caseId)
  if (!record || record.status !== '접수') return null

  record.status = '배정'
  record.assignee = managerName
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
    preMeeting: null,
    days,
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
