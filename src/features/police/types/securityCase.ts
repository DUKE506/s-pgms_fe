export type CaseType = '스토킹' | '가정폭력' | '교제폭력' | '협박' | '기타' | '사건미접수'
export type SecurityCaseStatus = '접수' | '배정' | '경호중' | '경호완료' | '종결' | '취소'

// 본사 경호목록(s6d)에는 배정 이후~진행 중인 건만 보인다 — 종결/취소는 이력 조회
// 화면(Phase 3, 아직 미구현) 쪽 소관이라 여기서는 제외한다 (2026-08-24 결정).
export const ACTIVE_SECURITY_CASE_STATUSES: SecurityCaseStatus[] = ['배정', '경호중', '경호완료']

export interface SecurityCaseSubject {
  nameInitial: string
  gender: string
  birthYear: string
  age: string
  occupation: string
  residence: string
}

export interface SecurityCaseLocation {
  residence: string
  workplace: string
  etc1: string
  etc2: string
}

export interface SecurityCasePoliceContact {
  victimOfficer: string
  investigator: string
}

// 본사 담당 본부관리자가 배치요구서 확인 후 등록하는 기본정보 (화면 7c).
// SecurityCase 접수 시점엔 없던 필드라 접수 데이터와 별도 구조로 둔다.
export interface CaseWorkerAssignment {
  workerId: string
  isDefault: boolean // 대표근무자 — 근무 스케줄 생성 시 배치기간 전체에 자동 배정
}

// 5개 조치 섹션 각각에 붙는 적용기간 — 섹션 안에서 체크된 항목 전체에 공통 적용되는
// 기간 하나(항목별 개별 기간 아님, 2026-08-24 결정). 체크된 항목이 없으면 null.
export interface MeasurePeriod {
  startDate: string
  endDate: string
}

export interface CaseBaseInfo {
  workHours: string // "09:00 ~ 18:00" 기본 경호 근무시간, 배치요구서 값에서 수정 가능
  defaultWorkers: CaseWorkerAssignment[]
  investigatorName: string
  investigatorPhone: string
  victimOfficerName: string
  victimOfficerPhone: string
  placeResidence: string
  placeWorkplace: string
  placeEtc1: string
  placeEtc2: string
  // 5개 조치 섹션 전부 다중선택 (2026-08-22 결정)
  safetyMeasures: string[]
  emergencyMeasures: string[]
  provisionalMeasures: string[]
  emergencyTempMeasures: string[]
  temporaryMeasures: string[]
  safetyMeasuresPeriod: MeasurePeriod | null
  emergencyMeasuresPeriod: MeasurePeriod | null
  provisionalMeasuresPeriod: MeasurePeriod | null
  emergencyTempMeasuresPeriod: MeasurePeriod | null
  temporaryMeasuresPeriod: MeasurePeriod | null
}

export interface ScheduleAssignment {
  workerId: string
  startTime: string
  endTime: string
  isOff: boolean
}

export interface ScheduleGroup {
  id: string
  note: string
  assignments: ScheduleAssignment[]
}

export interface ScheduleDay {
  date: string // YYYY-MM-DD
  groups: ScheduleGroup[]
}

export interface PreMeetingAssignment {
  workerId: string
  startTime: string
  endTime: string
}

// 등록 여부를 별도 플래그로 안 두고 레코드 존재 자체로 표현한다 — 등록 안 됐으면
// null (2026-08-24 결정: 시스템이 "근무시간 내/외" 여부를 판단하지 않고, 등록은
// 순수하게 사용자가 필요할 때만 하는 CRUD로 둔다).
export interface PreMeeting {
  date: string
  assignments: PreMeetingAssignment[]
}

export interface WorkSchedule {
  preMeeting: PreMeeting | null
  days: ScheduleDay[]
}

// 파일 업로드는 브라우저 파일선택까지만 동작 — 실제 저장 없이 파일명만 보관
// (2026-08-22 결정, 백엔드 미확정이라 서버 업로드는 범위 밖)
export interface CaseAttachments {
  securityPlanFileName: string | null
  workerConsentFileNames: Record<string, string>
  destructionCertFileName: string | null
}

export interface SecurityCase {
  id: string
  receiptNumber: string
  policeStation: string
  jurisdiction: string
  status: SecurityCaseStatus
  caseType: CaseType
  subject: SecurityCaseSubject
  caseSummary: string
  startDate: string
  endDate: string
  location: SecurityCaseLocation
  additionalNotes: string
  policeContact: SecurityCasePoliceContact
  requester: string
  createdAt: string
  assignee?: string
  securityCode?: string
  baseInfo?: CaseBaseInfo
  workSchedule?: WorkSchedule
  attachments?: CaseAttachments
  // 배정 상태 이후 경호취소 시에만 채워짐 (project-overview.md: 접수 단계 취소는
  // DB 삭제라 이 필드가 필요 없음)
  cancelReason?: string
  canceledAt?: string
}

export type SecurityCaseCreateInput = Omit<
  SecurityCase,
  | 'id'
  | 'receiptNumber'
  | 'status'
  | 'policeStation'
  | 'jurisdiction'
  | 'createdAt'
  | 'assignee'
  | 'securityCode'
>
