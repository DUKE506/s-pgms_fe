import type { AuthUser } from '../../features/auth/store/authStore'

export interface Account extends AuthUser {
  password: string
  branch?: string
  assignedCount?: number
  // 지역청 계정의 관할 지방청 — 표시용 계정명(예: "경기지역청")과 실제
  // SecurityCase.jurisdiction 값(예: "경기남부지방경찰청")이 달라서 스코프 필터링에
  // 계정명을 그대로 쓸 수 없다(경찰서 계정은 계정명===policeStation이라 문제없음).
  // 이력 조회(Phase 3-1)에서 지역청 스코프 매칭에 사용(2026-08-27).
  jurisdiction?: string
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

export const companyAccounts: Account[] = [
  { id: 'sysadmin', password: 'password123', name: '시스템 관리자', role: '시스템관리자' },
  { id: 'opadmin', password: 'password123', name: '운영 관리자', role: '운영관리자' },
  {
    id: 'hqmanager1',
    password: 'password123',
    name: '김민수',
    role: '본부관리자',
    branch: '서울본부',
    assignedCount: 3,
  },
  {
    id: 'hqmanager2',
    password: 'password123',
    name: '이영희',
    role: '본부관리자',
    branch: '경인본부',
    assignedCount: 5,
  },
  {
    id: 'hqmanager3',
    password: 'password123',
    name: '박준혁',
    role: '본부관리자',
    branch: '서부본부',
    assignedCount: 2,
  },
  {
    id: 'hqmanager4',
    password: 'password123',
    name: '서지훈',
    role: '본부관리자',
    branch: '메디칼본부',
    assignedCount: 1,
  },
]
