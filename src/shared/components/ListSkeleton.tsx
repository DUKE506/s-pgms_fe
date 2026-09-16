import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'

interface ListSkeletonProps {
  // 데스크톱 테이블의 컬럼 수 — 각 목록 화면의 실제 <TableHead> 개수에 맞춰 전달.
  columns: number
  rows?: number
}

// 목록 화면 최초 조회 스켈레톤. 실제 목록과 같은 데스크톱 테이블/모바일 카드
// 반응형 분기(xl 기준)를 그대로 따라가고, 헤더 행은 데이터에 의존하지 않으므로
// 스켈레톤 대상에서 제외한다(호출부에서 <TableHeader>는 그대로 두고 이 컴포넌트를
// <TableBody> 대신 넣거나, 헤더까지 통째로 이 컴포넌트로 교체해 사용한다).
function ListSkeleton({ columns, rows = 5 }: ListSkeletonProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
        <Table>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {Array.from({ length: columns }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full max-w-32" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2.5 xl:hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
    </>
  )
}

export default ListSkeleton
