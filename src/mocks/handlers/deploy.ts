import { http, HttpResponse } from 'msw'
import { allPoliceLoginAccounts } from '../data/guests'
import { securityCases } from '../data/securityCases'

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — 경찰서 경호목록은
// 이미 실제 백엔드(GET /api/v1/Deploy/Police/W/GetDeployList)로 연동 완료됐다
// (docs/backend-integration-responses/Deploy-Police-GetDeployList.md). 브라우저
// dev에서는 이 경로를 MSW 미등록으로 두고 vite 프록시가 실제 백엔드로 보낸다.
// 여기서는 실제 응답 envelope({message,data,code})와 항목 필드(deploySeq/caseSeq/
// mgmtNo/suspectUserName/statusName/startDt/endDt/...)를 흉내내 vitest가 매핑
// 로직까지 오프라인으로 검증하게 한다. groupSeq 필수·403 스코프는 실제 백엔드가
// 강제하는 부분이라 이 더블에서는 재현하지 않고 Bearer 토큰으로 소속을 판별한다.

function stationFromBearer(request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const accountId = token.split('.')[1]
  return allPoliceLoginAccounts().find((a) => a.id === accountId)
}

// 실제 백엔드는 관리번호를 조합해서 내려준다 — 접수 단계는 경호코드 자리에 "접수"를
// 넣고("26-08-동래경찰서 접수"), 배정 이후엔 경호코드가 들어간다고 가정.
function mgmtNo(receiptNumber: string, securityCode?: string) {
  return `${receiptNumber} ${securityCode ?? '접수'}`
}

export const deployTestHandlers = [
  http.get('/api/v1/Deploy/Police/W/GetDeployList', ({ request }) => {
    const account = stationFromBearer(request)
    if (!account || account.role !== '경찰서') {
      return HttpResponse.json(
        { message: '조회 권한이 없는 경찰서입니다.', data: null, code: 403 },
        { status: 403 },
      )
    }

    const keyword = new URL(request.url).searchParams.get('keyword')?.trim()
    const rows = securityCases
      .filter((c) => c.policeStation === account.name)
      .map((c, idx) => ({
        deploySeq: Number(c.id.replace(/\D/g, '')) || idx + 1,
        caseSeq: c.securityCode ? Number(c.securityCode.replace(/\D/g, '')) || null : null,
        mgmtNo: mgmtNo(c.receiptNumber, c.securityCode),
        suspectUserName: c.subject.nameInitial,
        statusName: c.status,
        startDt: c.startDate,
        endDt: c.endDate,
        extendCount: 0,
        remainDays: 0,
      }))
      .filter((r) => !keyword || r.mgmtNo.includes(keyword))

    return HttpResponse.json({ message: 'ok', data: rows, code: 200 })
  }),
]
