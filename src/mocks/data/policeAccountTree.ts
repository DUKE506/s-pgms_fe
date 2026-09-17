// [경찰 계정 관리 + 본사 관리자 탭] GetPoliceUserList/ResetPassword 더블 —
// 2026-09-17 실백엔드 실측 확인 완료(docs/backend-integration/responses/
// User-Stec-GetPoliceUserList.md·User-Stec-ResetPassword.md). vitest 전용
// (mocks/handlers/index.ts의 testOnlyHandlers) — 브라우저는 실백엔드로 나간다.
//
// 스코프: 본청=전국(자기 자신이 트리 최상위), 지역청=관할 이하(자기 자신이
// 최상위), 경찰서=자기 자신 하나(+guestList), 본사(시스템/운영관리자)=전국.
// `data`는 항상 배열이고, 호출자 스코프의 "최상위 노드" 1개만 원소로 담는다.
//
// 게스트는 children이 아니라 노드별 guestList 필드에 붙는다(실측 확인).

export interface PoliceAccountUserInfo {
  userSeq: number
  codeSeq: number
  codeName: string
  loginId: string
  userName: string
  phone: string | null
  useYn: boolean
  pwChangedYn: boolean
}

export interface PoliceAccountNode {
  groupSeq: number | null
  groupName: string | null
  level: number
  levelName: string
  parentGroupSeq: number | null
  userInfo: PoliceAccountUserInfo | null
  guestList: PoliceAccountUserInfo[]
  children: PoliceAccountNode[]
}

// loginId는 기존 mocks/data/accounts.ts의 policeAccounts(hq/gyeonggi/gangnam)와
// 일부러 맞춰서, 그 계정으로 로그인하면 바로 이 트리에서 "나"를 찾을 수 있게 한다.
export const policeAccountTree: PoliceAccountNode = {
  groupSeq: 1,
  groupName: '경찰청',
  level: 1,
  levelName: '본청',
  parentGroupSeq: null,
  userInfo: {
    userSeq: 1,
    codeSeq: 4,
    codeName: '본청관리자',
    loginId: 'hq',
    userName: '본청 관리자',
    phone: null,
    useYn: true,
    pwChangedYn: false,
  },
  guestList: [],
  children: [
    {
      groupSeq: 23,
      groupName: '서울경찰청',
      level: 2,
      levelName: '지방청',
      parentGroupSeq: 1,
      userInfo: {
        userSeq: 51,
        codeSeq: 5,
        codeName: '지방청관리자',
        loginId: 'seoul',
        userName: '서울경찰청',
        phone: null,
        useYn: true,
        pwChangedYn: false,
      },
      guestList: [],
      children: [
        {
          groupSeq: 25,
          groupName: '강남경찰서',
          level: 3,
          levelName: '경찰서',
          parentGroupSeq: 23,
          userInfo: {
            userSeq: 53,
            codeSeq: 6,
            codeName: '피전',
            loginId: 'gangnam',
            userName: '강남경찰서',
            phone: null,
            useYn: true,
            pwChangedYn: false,
          },
          guestList: [
            {
              userSeq: 201,
              codeSeq: 7,
              codeName: '게스트',
              loginId: 'GuestM1',
              userName: '게스트',
              phone: null,
              useYn: true,
              pwChangedYn: true,
            },
          ],
          children: [],
        },
        {
          groupSeq: 26,
          groupName: '서초경찰서',
          level: 3,
          levelName: '경찰서',
          parentGroupSeq: 23,
          userInfo: null,
          guestList: [],
          children: [],
        },
      ],
    },
    {
      groupSeq: 24,
      groupName: '경기지역청',
      level: 2,
      levelName: '지방청',
      parentGroupSeq: 1,
      userInfo: {
        userSeq: 52,
        codeSeq: 5,
        codeName: '지방청관리자',
        loginId: 'gyeonggi',
        userName: '경기지역청',
        phone: null,
        useYn: true,
        pwChangedYn: false,
      },
      guestList: [],
      children: [
        {
          groupSeq: 27,
          groupName: '수원경찰서',
          level: 3,
          levelName: '경찰서',
          parentGroupSeq: 24,
          userInfo: {
            userSeq: 54,
            codeSeq: 6,
            codeName: '피전',
            loginId: 'suwon',
            userName: '수원경찰서',
            phone: null,
            useYn: true,
            pwChangedYn: false,
          },
          guestList: [],
          children: [],
        },
      ],
    },
  ],
}

function findNodeByLoginId(node: PoliceAccountNode, loginId: string): PoliceAccountNode | undefined {
  if (node.userInfo?.loginId === loginId) return node
  for (const child of node.children) {
    const found = findNodeByLoginId(child, loginId)
    if (found) return found
  }
  return undefined
}

// 호출자 role/loginId에 따라 "이 사람이 보는 최상위 노드"를 찾는다 — 실백엔드와
// 동일 규칙(요청자 노드 이하, 본청/본사는 전체).
export function scopedTreeFor(role: string, loginId: string): PoliceAccountNode[] {
  if (role === '본청' || role === '시스템관리자' || role === '운영관리자') {
    return [policeAccountTree]
  }
  const node = findNodeByLoginId(policeAccountTree, loginId)
  return node ? [node] : []
}

function walk(node: PoliceAccountNode, fn: (n: PoliceAccountNode) => void) {
  fn(node)
  node.children.forEach((child) => walk(child, fn))
}

export function findAccountByUserSeq(userSeq: number): PoliceAccountUserInfo | undefined {
  let found: PoliceAccountUserInfo | undefined
  walk(policeAccountTree, (n) => {
    if (n.userInfo?.userSeq === userSeq) found = n.userInfo
    const guest = n.guestList.find((g) => g.userSeq === userSeq)
    if (guest) found = guest
  })
  return found
}

export function resetPoliceAccountPasswordDouble(userSeq: number): boolean {
  const account = findAccountByUserSeq(userSeq)
  if (!account) return false
  account.pwChangedYn = true
  return true
}
