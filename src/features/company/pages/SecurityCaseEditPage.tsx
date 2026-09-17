import { useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import DetailHeader from '@/shared/components/DetailHeader'
import DetailSkeleton, { DetailTitleSkeleton } from '@/shared/components/DetailSkeleton'
import AccessBlockedScreen from '@/shared/components/AccessBlockedScreen'
import { isNotFoundOrForbidden } from '@/shared/api/errors'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { getSecurityCase } from '../api/securityCaseDetail'
import { getCaseGuards } from '../api/workers'
import { useHideMobileNav } from '@/shared/hooks/useMobileNavStore'
import BaseInfoForm from '../components/BaseInfoForm'

// 경호계획서 정보 등록/수정 — 원래 SecurityCaseDetailPage 안에서 editingBaseInfo
// state로 화면 전환하던 것을 별도 라우트로 분리(2026-09-17 사용자 요청). 모바일
// 뒤로가기 제스처가 브라우저 히스토리(popstate) 기준으로 동작해서, 같은 URL 안에서
// state만 토글하던 예전 구조는 제스처 한 번에 이 화면을 건너뛰고 목록까지
// 튕겨나갔다 — 경찰 배치요구서 수정(`/security-cases/:id/edit`)과 동일 패턴.
function SecurityCaseEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  useHideMobileNav(true)

  const caseQuery = useQuery({
    queryKey: ['security-case', id],
    queryFn: () => getSecurityCase(id!),
    enabled: Boolean(id),
  })
  const workersQuery = useQuery({
    queryKey: ['case-guards', id],
    queryFn: () => getCaseGuards(id!),
    enabled: Boolean(id),
  })

  const backToDetail = () => navigate(`/admin/security-cases/${id}`)

  if (caseQuery.isLoading || workersQuery.isLoading) {
    return (
      <main className="flex flex-col gap-4 p-4 pb-8 sm:p-8 sm:pb-8">
        <div className="flex flex-col gap-3 xl:contents">
          <DetailHeader
            breadcrumb="경호관리 / 경호계획서 정보 등록"
            fallbackTo={`/admin/security-cases/${id}`}
          />
          <DetailTitleSkeleton />
        </div>
        <DetailSkeleton sections={1} />
      </main>
    )
  }

  if (caseQuery.isError && isNotFoundOrForbidden(caseQuery.error)) {
    return <AccessBlockedScreen label="경호건" fallbackTo="/admin/security-cases" />
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <main className="p-4 sm:p-8">
        <p className="py-8 text-center text-sm text-destructive">경호건을 불러오지 못했습니다</p>
      </main>
    )
  }

  const securityCase = caseQuery.data
  const workers = workersQuery.data ?? []
  const managementNumber = formatManagementNumber(securityCase.receiptNumber, securityCase.securityCode)

  return (
    <main className="flex flex-col gap-4 p-4 pb-8 sm:p-8 sm:pb-8">
      <DetailHeader
        breadcrumb={
          '경호관리' +
          (managementNumber ? ` / ${managementNumber}` : '') +
          ' / 경호계획서 정보 등록'
        }
        fallbackTo={`/admin/security-cases/${id}`}
      />

      <BaseInfoForm
        securityCase={securityCase}
        workers={workers}
        onCancel={backToDetail}
        onRegistered={backToDetail}
      />
    </main>
  )
}

export default SecurityCaseEditPage
