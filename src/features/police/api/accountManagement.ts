import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'

// [경찰 계정 관리(#①본청·지역청)+경찰서 계정 관리(#②)+본사 관리자 탭(#③)] 공용
// API 계층 — 신규 "목록조회"·"초기화" API 2종(2026-09-17 백엔드 요청, 스펙
// 미확정)을 상대로 스캐폴딩한다. 더블: mocks/handlers/policeAccounts.ts.
// 실제 스펙 도착하면 엔드포인트 경로/필드명만 이 파일에서 교체하면 된다
// (화면 쪽 타입은 PoliceAccountRow로 이미 정규화해뒀음).

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
  children: RawAccountNode[]
}

// 화면(테이블)이 쓰는 평면 행 — 트리를 펼치면서 "소속" 경로 문자열을 함께 만든다.
export interface PoliceAccountRow {
  userSeq: number
  loginId: string
  userName: string
  codeName: string
  levelName: string
  phone: string | null
  useYn: boolean
  // 트리 depth를 그대로 조상 이름들로 이어붙인 소속 경로. 예: "서울경찰청 · 강남경찰서".
  orgPath: string
}

function flatten(node: RawAccountNode, ancestors: string[]): PoliceAccountRow[] {
  const path = node.groupName ? [...ancestors, node.groupName] : ancestors
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
          orgPath: path.join(' · '),
        },
      ]
    : []
  return [...own, ...node.children.flatMap((child) => flatten(child, path))]
}

// 화면: [경찰] 본청/지역청 계정 관리(#①), 경찰서 계정 관리 내 게스트 목록(#②),
// 본사 관리자 탭 경찰/게스트(#③) 공용. 호출자 role에 따라 서버가 스코프를
// 좁혀 내려준다 — 프론트는 역할 분기 없이 그대로 평면화만 한다.
export async function listPoliceAccounts(): Promise<PoliceAccountRow[]> {
  const res = await apiFetch('/v1/User/Police/W/GetPoliceAccountTree')
  if (!res.ok) {
    throw new Error('계정 목록을 불러오지 못했습니다')
  }
  const roots = await unwrapEnvelope<RawAccountNode[]>(res)
  return roots.flatMap((root) => flatten(root, []))
}

export async function resetPoliceAccountPassword(userSeq: number): Promise<void> {
  const res = await apiFetch('/v1/User/Police/W/ResetPoliceAccountPassword', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userSeq }),
  })
  if (!res.ok) {
    throw new Error('비밀번호 초기화에 실패했습니다')
  }
}
