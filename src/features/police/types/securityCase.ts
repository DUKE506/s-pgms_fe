export type CaseType = '스토킹' | '가정폭력' | '교제폭력' | '협박' | '기타' | '사건미접수'
export type SecurityCaseStatus = '접수' | '배정' | '경호중' | '경호완료' | '종결' | '취소'

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

export interface PreMeeting {
  enabled: boolean // 근무시간 외 별도 진행 여부
  date: string
  workerId: string
  startTime: string
  endTime: string
}

export interface WorkSchedule {
  preMeeting: PreMeeting
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
