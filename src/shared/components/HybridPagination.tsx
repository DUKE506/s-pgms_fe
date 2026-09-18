import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

interface PageSizeSelectProps {
  pageSize: number
  onPageSizeChange: (size: number) => void
}

function PageSizeSelect({ pageSize, onPageSizeChange }: PageSizeSelectProps) {
  return (
    <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
      <SelectTrigger className="w-24 bg-card" aria-label="페이지당 표시 개수">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAGE_SIZE_OPTIONS.map((size) => (
          <SelectItem key={size} value={String(size)}>
            {size}개씩
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface PaginationBarProps {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  className?: string
}

// 서버 페이지네이션 화면(xl 이상) 전용 — 왼쪽 "총 N건", 가운데 페이지 번호, 오른쪽
// pageSize 선택. xl 미만은 "더보기"(LoadMoreButton)만 쓰고 pageSize 선택은 누적
// 로드 방식과 맞지 않아 노출하지 않는다(docs/architecture.md "상태관리").
export function PaginationBar({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationBarProps) {
  return (
    <div className={cn('hidden items-center justify-between xl:flex', className)}>
      <span className="text-sm text-muted-foreground">총 {totalCount}건</span>
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      <PageSizeSelect pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
    </div>
  )
}
