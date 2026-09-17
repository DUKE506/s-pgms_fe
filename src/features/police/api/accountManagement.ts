import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'

// [경찰 계정 관리(#①본청·지역청)+경찰서 계정 관리(#②)+본사 관리자 탭(#③)] 공용
// API 계층. 2026-09-17 실측 확인(docs/backend-integration/responses/
// User-Stec-GetPoliceUserList.md·User-Stec-ResetPassword.md) — 목록조회는
// 신규 엔드포인트가 아니라 기존 GetPoliceUserList가 확장된 것(guestList 필드
// 추가), 초기화는 신규 ResetPassword. 호출자 role에 따라 서버가 스코프를
// 좁혀 내려준다(본청=전국·지역청=관할 이하·경찰서=자기 자신, 본사=전국) —
// 프론트는 역할 분기 없이 그대로 평면화만 한다.

interface RawUserInfo {
  userSeq: number
  codeSeq: number
  codeName: string
  loginId: string
  userName: string
  phone: string | null
  useYn: boolean
  pwChangedYn: boolean
}

interface RawAccountNode {
  groupSeq: number | null
  groupName: string | null
  level: number
  levelName: string
  parentGroupSeq: number | null
  userInfo: RawUserInfo | null
  // 게스트는 children(하위 조직)이 아니라 이 별도 필드로 붙는다 — 게스트는
  // 조직이 아니라 조회권만 있는 계정이라 groupSeq를 안 가진다. 게스트 없는
  // 노드·본청/지방청은 항상 빈 배열(children이 없는 게 아니라 이 필드가 빈
  // 배열).
  guestList: RawUserInfo[]
  children: RawAccountNode[]
}

// 화면(테이블)이 쓰는 평면 행 — 트리를 펼치면서 "소속" 경로 문자열을 함께 만든다.
export interface PoliceAccountRow {
  userSeq: number
  loginId: string
  userName: string
  codeName: string
  // 게스트는 실제 트리 노드가 아니라 guestList에서 온 값이라 levelName이
  // 없다 — 여기서 '게스트'로 고정해 채운다(PoliceAccountsTab/GuestAccountsTab이
  // 이 값으로 필터링).
  levelName: string
  phone: string | null
  useYn: boolean
  // 트리 depth를 그대로 조상 이름들로 이어붙인 소속 경로. 예: "서울경찰청 · 강남경찰서".
  // 게스트는 소속된 경찰서의 경로를 그대로 쓴다(자기 groupName이 없어서).
  orgPath: string
}

function guestRow(guest: RawUserInfo, orgPath: string): PoliceAccountRow {
  return {
    userSeq: guest.userSeq,
    loginId: guest.loginId,
    userName: guest.userName,
    codeName: guest.codeName,
    levelName: '게스트',
    phone: guest.phone,
    useYn: guest.useYn,
    orgPath,
  }
}

function flatten(node: RawAccountNode, ancestors: string[]): PoliceAccountRow[] {
  const path = node.groupName ? [...ancestors, node.groupName] : ancestors
  const orgPath = path.join(' · ')
  const own: PoliceAccountRow[] = node.userInfo
    ? [
        {
          userSeq: node.userInfo.userSeq,
          loginId: node.userInfo.loginId,
          userName: node.userInfo.userName,
          codeName: node.userInfo.codeName,
          levelName: node.levelName,
          phone: node.userInfo.phone,
          useYn: node.userInfo.useYn,
          orgPath,
        },
      ]
    : []
  const guests = node.guestList.map((g) => guestRow(g, orgPath))
  return [...own, ...guests, ...node.children.flatMap((child) => flatten(child, path))]
}

// 화면: [경찰] 본청/지역청 계정 관리(#①), 경찰서 계정 관리 내 게스트 목록(#②),
// 본사 관리자 탭 경찰/게스트(#③) 공용.
export async function listPoliceAccounts(): Promise<PoliceAccountRow[]> {
  const res = await apiFetch('/v1/User/Stec/W/GetPoliceUserList')
  if (!res.ok) {
    throw new Error('계정 목록을 불러오지 못했습니다')
  }
  const roots = await unwrapEnvelope<RawAccountNode[]>(res)
  return roots.flatMap((root) => flatten(root, []))
}

export async function resetPoliceAccountPassword(userSeq: number): Promise<void> {
  const res = await apiFetch('/v1/User/Stec/W/ResetPassword', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userSeq }),
  })
  if (!res.ok) {
    throw new Error('비밀번호 초기화에 실패했습니다')
  }
}
