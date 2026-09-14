export type CaseType = '스토킹' | '가정폭력' | '교제폭력' | '협박' | '기타' | '사건미접수'

// 종결 사유: 경찰 쪽에서 아직 확정 목록을 안 줘서 통상적으로 쓰이는 항목으로 임시
// 구성(2026-08-27). 추후 실제 목록으로 교체될 수 있음.
export type ClosureReason =
  | '경호기간 만료'
  | '피해자 요청에 의한 종결'
  | '피의자 구속'
  | '피해자 소재불명·연락두절'
  | '기타'
export type SecurityCaseStatus = '접수' | '배정' | '경호중' | '경호완료' | '종결' | '취소'

// 본사 경호목록(s6d)에는 배정 이후~진행 중인 건만 보인다 — 종결/취소는 이력 조회
// 화면(Phase 3, 아직 미구현) 쪽 소관이라 여기서는 제외한다 (2026-08-24 결정).
export const ACTIVE_SECURITY_CASE_STATUSES: SecurityCaseStatus[] = ['배정', '경호중', '경호완료']

export interface SecurityCaseSubject {
  nameInitial: string
  gender: string
  // 실제 API(AddDeployRequestDto.suspectBirthDate)가 date라 연도만이 아니라
  // 생년월일 전체를 받는다(2026-09-02). 만나이는 저장하지 않고 이 값에서 계산한다
  // (shared/lib/subject.ts calcAge).
  birthDate: string
  occupation: string
  residence: string
}

// 배치요구서 요구자 — 실제 API는 부서/직급/성명 3필드로 분리돼 있다
// (AddDeployRequestDto.clientDept/clientPosition/clientName, 2026-09-02).
export interface SecurityCaseRequester {
  dept: string
  position: string
  name: string
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
  investigator: string
  victimOfficer: string
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

// 등록 여부를 별도 플래그로 안 두고 레코드 존재 자체로 표현한다 — 등록 안 됐으면
// null (2026-08-24 결정: 시스템이 "근무시간 내/외" 여부를 판단하지 않고, 등록은
// 순수하게 사용자가 필요할 때만 하는 CRUD로 둔다).
//
// 시간은 미팅 전체 1구간(근무자별 개별 시간 아님) — 백엔드 API(SaveCaseMeeting)가
// 애초에 이 형태로만 받는다는 걸 반영해 UI도 맞췄다(2026-09-11 운영팀 결정,
// 이전엔 UI만 근무자별이었고 저장 시 뭉쳐 보내고 있었음 — issues #11 해소).
export interface PreMeeting {
  date: string
  startTime: string
  endTime: string
  workerIds: string[]
}

export interface WorkSchedule {
  preMeeting: PreMeeting | null
  days: ScheduleDay[]
}

// 본사가 업로드한 문서함 파일들. 실 API에선 GetDeployDetail(피전)·GetCaseDoc(본사)이
// 파일명과 저장 경로를 함께 준다. *FilePath는 경호계획서·동의서 다운로드용
// (/files/<path>) — 파기확인서는 전용 API라 경로가 없다(destructionCertDownloaded 참고).
export interface CaseAttachments {
  securityPlanFileName: string | null
  // 경호계획서 저장 경로(docGuardDetail.docPath / caseInfoDto.filePath). 파일명은 있는데
  // 경로가 없으면(구 데이터 등) 다운로드 버튼을 숨긴다.
  securityPlanFilePath?: string | null
  workerConsentFileNames: Record<string, string>
  // 근무자(guardSeq)별 동의서 저장 경로. 키는 workerConsentFileNames와 동일. 본사(화면9,
  // guardSeq 보유)에서만 쓴다.
  workerConsentFilePaths?: Record<string, string>
  // 피전(화면4) 전용 — 업로드된 동의서만 그대로 나열(GetDeployDetail.docAgreeDetail은
  // guardSeq가 없어 workerConsentFileNames처럼 키로 매칭할 수 없다, 2026-09-11).
  consentDocs?: { name: string; fileName: string; filePath: string }[]
  destructionCertFileName: string | null
}

export interface HistoryGuard {
  guardSeq: number
  guardName: string
  workDays: number
  totalMinutes: number
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
  requester: SecurityCaseRequester
  createdAt: string
  // 담당 본부관리자 계정 id(companyAccounts 참조) — 이름 문자열이 아니라 id로
  // 저장해야 인사이동으로 담당자 이름이 바뀌어도 스코프 필터링/표시가 안 깨진다
  // (2026-08-31 리팩터, 예전엔 이름 문자열 스냅샷이었음)
  assigneeId?: string
  // 담당 본부관리자 이름(표시 전용). 실 API GetGuardCaseList는 담당자 id 없이
  // 이름(userName)만 내려줘서, id 조인이 불가능한 경로(본사 경호목록)에서 이 값을
  // 그대로 표시한다. mock 경로는 assigneeId 조인을 계속 쓴다.
  assigneeName?: string
  securityCode?: string
  // 배치요구서 시퀀스(deployReqSeq). 배치요청 목록은 id 자체가 deploySeq지만, 경호목록/
  // 상세는 id=caseSeq라 별도로 담는다 — 취소(GuardCase/Stec/W/CancelGuardCase)가 caseSeq가
  // 아니라 deployReqSeq를 키로 받기 때문(본사 getSecurityCase가 GetCaseDoc.deploySeq로 채움).
  deploySeq?: number
  baseInfo?: CaseBaseInfo
  workSchedule?: WorkSchedule
  attachments?: CaseAttachments
  // 배정 상태 이후 경호취소 시에만 채워짐 (project-overview.md: 접수 단계 취소는
  // DB 삭제라 이 필드가 필요 없음)
  cancelReason?: string
  canceledAt?: string
  // 종결 시에만 채워짐(경호완료 → 종결 전환, ClosureReason 참고)
  closureReason?: ClosureReason
  closureReasonDetail?: string
  closedAt?: string
  // 파기확인서를 피전이 다운로드했는지(GetDeployDetail.downloadYn = DESTROY_DOC_DOWNLOAD_YN).
  // 다운로드가 최종 종결(CloseGuardCase)의 선결조건이라 — 안 받고 종결하면 서버가 409 —
  // 경호 상세의 종결 버튼 활성 조건에 포함된다.
  destructionCertDownloaded?: boolean
  // 이력 조회 목록(History/*/GetHistoryList)이 서버에서 집계해 내려주는 총근무시간(분).
  // mock 경로는 workSchedule에서 computeCaseHistorySummary로 계산하지만, 실 API는
  // 이 값을 직접 준다(종결 건만 실값, 취소 건은 null → undefined).
  totalGuardMinutes?: number
  // 이력 상세(History/Police/W/GetHistoryDetail)의 근무자별 투입실적. 실 API는
  // guards[]로 근무자 이름까지 함께 줘서, 상세 화면이 근무자 명단을 따로 조회하지
  // 않고 바로 "근무자 배정 이력" 표를 그린다. mock 경로는 이 값 없이 workSchedule +
  // computeCaseHistorySummary로 계산한다.
  historyGuards?: HistoryGuard[]
  // 경찰서가 경호중 상태에서 연장/단축을 요청하면 즉시 반영되지 않고 여기 대기한다
  // — 본사(운영관리자/본부관리자) 승인 화면(후속 항목)에서 승인해야 실제 startDate/
  // endDate·근무스케줄에 반영된다(2026-08-25 결정). 대기 중엔 재요청 불가.
  pendingPeriodRequest?: {
    type: '연장' | '단축'
    requestedEndDate: string
    requestedAt: string
  }
  // 경찰서 경호목록(Deploy/Police/W/GetDeployList)이 "오늘 ~ endDt" 기준으로 서버에서
  // 계산해 내려주는 배치 종료까지 남은 일수(이미 지났으면 0으로 클램프). 경호중 건이
  // 임박했을 때 목록 하이라이트에 쓴다(사용자 요청, 2026-09-11) — 다른 목록/상세
  // 응답엔 없는 필드라 optional.
  remainDays?: number
}

export type SecurityCaseCreateInput = Omit<
  SecurityCase,
  | 'id'
  | 'receiptNumber'
  | 'status'
  | 'policeStation'
  | 'jurisdiction'
  | 'createdAt'
  | 'assigneeId'
  | 'securityCode'
>
