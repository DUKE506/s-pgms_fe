import type { GuestAccount } from '../../features/police/api/guests'
import { policeAccounts, type Account } from './accounts'
import { loadPersisted, savePersisted } from './persist'

const STORAGE_KEY = 's-pgms:guest-accounts'

// 경찰서 표시명 → 게스트 로그인 아이디 접두어. 지금은 강남경찰서만 실제
// 로그인 계정으로 존재해 하나만 매핑해두고, 매핑에 없는 서는 "Guest"로 대체한다.
const STATION_ID_PREFIX: Record<string, string> = {
  강남경찰서: 'Gangnam',
}

function idPrefixForStation(policeStation: string): string {
  return STATION_ID_PREFIX[policeStation] ?? 'Guest'
}

// 목업(s9)의 GangnamGuest1~6을 그대로 seed — 1은 기존 정적 계정(gangnamguest1)을
// 대체하므로 로그인 아이디를 유지한다(run-s-pgms SKILL.md 검증 계정과 동일).
// 조회가능 경호건은 강남경찰서 소속 중 경호코드가 발급된 실제 seed 건
// (mocks/data/securityCases.ts: ST101~103 진행중, ST110~112 이력)에서 배정.
const SEED_GUEST_ACCOUNTS: GuestAccount[] = [
  {
    id: 'gangnamguest1',
    name: 'GangnamGuest1',
    policeStation: '강남경찰서',
    caseIds: ['case-seed-6', 'case-seed-7'],
    issuedAt: '2026-01-10',
  },
  {
    id: 'gangnamguest2',
    name: 'GangnamGuest2',
    policeStation: '강남경찰서',
    caseIds: ['case-seed-7'],
    issuedAt: '2026-01-22',
  },
  {
    id: 'gangnamguest3',
    name: 'GangnamGuest3',
    policeStation: '강남경찰서',
    caseIds: ['case-seed-8'],
    issuedAt: '2026-02-03',
  },
  {
    id: 'gangnamguest4',
    name: 'GangnamGuest4',
    policeStation: '강남경찰서',
    caseIds: ['case-hist-1', 'case-hist-2'],
    issuedAt: '2026-02-11',
  },
  {
    id: 'gangnamguest5',
    name: 'GangnamGuest5',
    policeStation: '강남경찰서',
    caseIds: [],
    issuedAt: '2025-11-05',
  },
  {
    id: 'gangnamguest6',
    name: 'GangnamGuest6',
    policeStation: '강남경찰서',
    caseIds: [],
    issuedAt: '2025-09-18',
  },
]

export const guestAccounts: GuestAccount[] = loadPersisted(STORAGE_KEY, SEED_GUEST_ACCOUNTS)

// 근무자/경호건 카운터와 같은 이유로 별도 카운터를 저장하지 않고 현재 데이터에서
// 매번 다시 계산한다(mocks/data/workers.ts 패턴).
function nextGuestNumber(policeStation: string): number {
  const prefix = idPrefixForStation(policeStation)
  const max = guestAccounts
    .filter((g) => g.policeStation === policeStation)
    .reduce((acc, g) => {
      const n = Number(g.name.replace(`${prefix}Guest`, ''))
      return Number.isFinite(n) ? Math.max(acc, n) : acc
    }, 0)
  return max + 1
}

function nextGuestName(policeStation: string): string {
  return `${idPrefixForStation(policeStation)}Guest${nextGuestNumber(policeStation)}`
}

// 발급 모달(화면 10)이 실제 생성 전에 보여줄 아이디 미리보기 — 생성 로직과
// 같은 함수를 써서 미리보기와 실제 발급 결과가 어긋나지 않게 한다.
export function previewNextGuestId(policeStation: string): { id: string; name: string } {
  const name = nextGuestName(policeStation)
  return { id: name.toLowerCase(), name }
}

export function createGuestAccount(policeStation: string, caseIds: string[]): GuestAccount {
  const name = nextGuestName(policeStation)
  const record: GuestAccount = {
    id: name.toLowerCase(),
    name,
    policeStation,
    caseIds,
    issuedAt: new Date().toISOString().slice(0, 10),
    password: name,
    // 최초 로그인 강제 변경 플로우(후속 항목) — 발급 시점엔 항상 true.
    mustChangePassword: true,
  }
  guestAccounts.push(record)
  savePersisted(STORAGE_KEY, guestAccounts)
  return record
}

// 최초 로그인 강제 변경 모달에서 실제 비밀번호를 교체 — 성공하면
// mustChangePassword를 해제해 다음 로그인부터는 정상 로그인된다.
export function changeGuestAccountPassword(id: string, newPassword: string): GuestAccount | null {
  const record = guestAccounts.find((g) => g.id === id)
  if (!record) return null
  record.password = newPassword
  record.mustChangePassword = false
  savePersisted(STORAGE_KEY, guestAccounts)
  return record
}

export function updateGuestAccountCases(id: string, caseIds: string[]): GuestAccount | null {
  const record = guestAccounts.find((g) => g.id === id)
  if (!record) return null
  record.caseIds = caseIds
  savePersisted(STORAGE_KEY, guestAccounts)
  return record
}

export function deleteGuestAccount(id: string): boolean {
  const index = guestAccounts.findIndex((g) => g.id === id)
  if (index === -1) return false
  guestAccounts.splice(index, 1)
  savePersisted(STORAGE_KEY, guestAccounts)
  return true
}

// 경호건이 종결/취소되면 모든 게스트 계정의 조회가능 경호건에서도 함께
// 제거한다 — 발급 모달의 관리번호 선택 후보도 종결/취소 건은 애초에 보여주지
// 않으므로(IssueGuestAccountDialog), 이미 끝난 건이 계속 조회 가능한 상태로
// 남아있으면 안 된다(2026-08-27, 사용자 확인). mocks/data/securityCases.ts의
// closeCase/cancelAssignedCase에서 호출한다.
export function removeCaseFromAllGuestAccounts(caseId: string): void {
  let changed = false
  for (const g of guestAccounts) {
    if (g.caseIds.includes(caseId)) {
      g.caseIds = g.caseIds.filter((id) => id !== caseId)
      changed = true
    }
  }
  if (changed) savePersisted(STORAGE_KEY, guestAccounts)
}

// 위 removeCaseFromAllGuestAccounts는 종결/취소가 "지금부터" 일어나는 건만
// 정리한다 — 이 기능이 생기기 전에 이미 종결/취소된 건에 할당돼 있던 게스트
// 계정(예: seed의 GangnamGuest4)이나, localStorage에 남아있는 과거 테스트
// 데이터는 자동으로 정리되지 않는다. 그래서 게스트 데이터를 읽는 시점마다
// 호출해 자가 치유한다 — securityCases 배열은 이 모듈이 직접 들고 있지 않아
// (mocks/data/securityCases.ts가 반대로 이 모듈을 참조하므로 순환 참조를
// 피하려면 여기서 그쪽을 import할 수 없다) 호출부에서 현재 상태 목록을
// 넘겨받는다.
export function pruneTerminalCaseAssignments(
  cases: { id: string; status: string }[],
): void {
  const activeIds = new Set(
    cases.filter((c) => c.status !== '종결' && c.status !== '취소').map((c) => c.id),
  )
  let changed = false
  for (const g of guestAccounts) {
    const filtered = g.caseIds.filter((id) => activeIds.has(id))
    if (filtered.length !== g.caseIds.length) {
      g.caseIds = filtered
      changed = true
    }
  }
  if (changed) savePersisted(STORAGE_KEY, guestAccounts)
}

// 게스트도 경찰 로그인 화면에서 로그인해야 하므로(project-overview.md 화면10 설명)
// 로그인/토큰 조회 시 policeAccounts와 합쳐서 찾을 수 있어야 한다. 초기
// 비밀번호는 아이디와 동일하게 발급된다 — `g.password`가 없는(이 필드가 생기기
// 전의) 과거 seed 데이터는 기존 동작대로 이름을 그대로 비밀번호로 대체한다.
export function guestLoginAccounts(): Account[] {
  return guestAccounts.map((g) => ({
    id: g.id,
    password: g.password ?? g.name,
    name: g.name,
    role: '게스트',
    mustChangePassword: g.mustChangePassword,
  }))
}

export function allPoliceLoginAccounts(): Account[] {
  return [...policeAccounts, ...guestLoginAccounts()]
}
