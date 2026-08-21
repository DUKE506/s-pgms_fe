import type { AuthUser } from '../../features/auth/store/authStore'

export interface Account extends AuthUser {
  password: string
  branch?: string
  assignedCount?: number
}

export const policeAccounts: Account[] = [
  { id: 'hq', password: 'password123', name: '본청 관리자', role: '본청' },
  { id: 'gyeonggi', password: 'password123', name: '경기지역청', role: '지역청' },
  { id: 'gangnam', password: 'password123', name: '강남경찰서', role: '경찰서' },
  { id: 'gangnamguest1', password: 'password123', name: 'GangnamGuest1', role: '게스트' },
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
