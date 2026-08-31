import type { AuthUser } from '../../features/auth/store/authStore'
import { loadPersisted, savePersisted } from './persist'

export interface Account extends AuthUser {
  password: string
  branch?: string
  assignedCount?: number
  // 지역청 계정의 관할 지방청 — 표시용 계정명(예: "경기지역청")과 실제
  // SecurityCase.jurisdiction 값(예: "경기남부지방경찰청")이 달라서 스코프 필터링에
  // 계정명을 그대로 쓸 수 없다(경찰서 계정은 계정명===policeStation이라 문제없음).
  // 이력 조회(Phase 3-1)에서 지역청 스코프 매칭에 사용(2026-08-27).
  jurisdiction?: string
  // 관리자 계정 관리(Phase 3.6 항목2)의 정보수정 대상 필드 — 본사 계정에만 사용.
  phone?: string
  // 최초 로그인 강제 비밀번호 변경 플로우(후속 항목) — 실제 백엔드의 users
  // 테이블 "최초 로그인" 컬럼을 미리 대응한 필드(2026-08-31 결정). 문자열
  // 비교(비밀번호===아이디) 대신 이 플래그만 보고 판단한다. 게스트 발급/
  // 관리자 비밀번호 초기화 시점에 true로 세팅, 변경 완료 시 false로 해제.
  // 기존 시드 계정은 이미 사용 중인 것으로 간주해 세팅하지 않는다(undefined=false).
  mustChangePassword?: boolean
}

export const policeAccounts: Account[] = [
  { id: 'hq', password: 'password123', name: '본청 관리자', role: '본청' },
  {
    id: 'gyeonggi',
    password: 'password123',
    name: '경기지역청',
    role: '지역청',
    jurisdiction: '경기남부지방경찰청',
  },
  { id: 'gangnam', password: 'password123', name: '강남경찰서', role: '경찰서' },
  // 게스트 계정은 여기 고정 seed가 아니라 mocks/data/guests.ts에서 동적으로
  // 발급/삭제된다 — 로그인 시에는 그쪽의 guestLoginAccounts()와 합쳐서 조회한다
  // (화면 9/10, 2026-08-27).
]

const COMPANY_ACCOUNTS_STORAGE_KEY = 's-pgms:company-accounts'

// 관리자 계정 관리(Phase 3.6 항목2)에서 정보수정/비밀번호 초기화로 값이
// 바뀌므로 workers/guests와 같은 패턴으로 localStorage persist를 적용한다.
const SEED_COMPANY_ACCOUNTS: Account[] = [
  {
    id: 'sysadmin',
    password: 'password123',
    name: '시스템 관리자',
    role: '시스템관리자',
    phone: '010-1000-0001',
  },
  {
    id: 'opadmin',
    password: 'password123',
    name: '운영 관리자',
    role: '운영관리자',
    phone: '010-1000-0002',
  },
  {
    id: 'hqmanager1',
    password: 'password123',
    name: '김민수',
    role: '본부관리자',
    branch: '서울본부',
    assignedCount: 3,
    phone: '010-2000-0001',
  },
  {
    id: 'hqmanager2',
    password: 'password123',
    name: '이영희',
    role: '본부관리자',
    branch: '경인본부',
    assignedCount: 5,
    phone: '010-2000-0002',
  },
  {
    id: 'hqmanager3',
    password: 'password123',
    name: '박준혁',
    role: '본부관리자',
    branch: '서부본부',
    assignedCount: 2,
    phone: '010-2000-0003',
  },
  {
    id: 'hqmanager4',
    password: 'password123',
    name: '서지훈',
    role: '본부관리자',
    branch: '메디칼본부',
    assignedCount: 1,
    phone: '010-2000-0004',
  },
]

export const companyAccounts: Account[] = loadPersisted(
  COMPANY_ACCOUNTS_STORAGE_KEY,
  SEED_COMPANY_ACCOUNTS,
)

export function updateCompanyAccountInfo(
  id: string,
  updates: { name: string; phone?: string },
): Account | null {
  const record = companyAccounts.find((a) => a.id === id)
  if (!record) return null
  record.name = updates.name
  record.phone = updates.phone
  savePersisted(COMPANY_ACCOUNTS_STORAGE_KEY, companyAccounts)
  return record
}

// 초기화 시 아이디와 동일한 값으로 재설정 — 게스트 계정 발급 때와 같은 방식.
// mustChangePassword를 true로 세팅해 다음 로그인 때 강제 변경 모달이 뜨게 한다.
export function resetCompanyAccountPassword(id: string): Account | null {
  const record = companyAccounts.find((a) => a.id === id)
  if (!record) return null
  record.password = record.id
  record.mustChangePassword = true
  savePersisted(COMPANY_ACCOUNTS_STORAGE_KEY, companyAccounts)
  return record
}

// 최초 로그인 강제 변경 모달에서 실제 비밀번호를 교체 — 성공하면
// mustChangePassword를 해제해 다음 로그인부터는 정상 로그인된다.
export function changeCompanyAccountPassword(id: string, newPassword: string): Account | null {
  const record = companyAccounts.find((a) => a.id === id)
  if (!record) return null
  record.password = newPassword
  record.mustChangePassword = false
  savePersisted(COMPANY_ACCOUNTS_STORAGE_KEY, companyAccounts)
  return record
}
