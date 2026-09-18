import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 목록/이력 화면 하이브리드 페이지네이션(docs/architecture.md "상태관리") — xl
// 이상은 번호형(Pagination, 클릭 시 그 페이지로 교체), xl 미만은 "더보기"
// (LoadMoreButton, 누르면 다음 페이지를 fetch해 기존 목록에 누적). 두 컴포넌트는
// 항상 함께 쓰되 각자 `xl:` CSS로만 노출을 가른다 — 어떤 fetch를 하느냐는
// useIsDesktop이 결정하고, 여기는 순수 표시만 담당한다.

function pageNumbers(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)
  const result: (number | 'ellipsis')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('ellipsis')
    result.push(p)
  })
  return result
}

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="페이지네이션">
      <Button
        variant="ghost"
        size="icon"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="이전 페이지"
      >
        <ChevronLeft className="size-4" />
      </Button>
      {pageNumbers(page, totalPages).map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`${p}페이지`}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        variant="ghost"
        size="icon"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="다음 페이지"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  )
}

interface LoadMoreButtonProps {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  className?: string
}

export function LoadMoreButton({ hasMore, loading, onLoadMore, className }: LoadMoreButtonProps) {
  if (!hasMore) return null
  return (
    <Button
      variant="outline"
      onClick={onLoadMore}
      disabled={loading}
      className={cn('w-full', className)}
    >
      {loading ? '불러오는 중…' : '더보기'}
    </Button>
  )
}
