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
