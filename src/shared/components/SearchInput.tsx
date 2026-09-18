import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  draft: string
  onDraftChange: (value: string) => void
  onCommit: () => void
  placeholder: string
  'aria-label': string
  className?: string
}

// 검색창 — 엔터 또는 왼쪽 돋보기 아이콘(버튼)을 눌러야 검색이 커밋된다. 입력 중
// 값(draft)은 매 키 입력마다 부모 상태(주로 URL 쿼리)를 갱신하지 않아 한글 조합
// (IME) 도중 리렌더가 끼어들어 글자가 깨지는 문제가 없다(2026-09-18, 사용자
// 리포트로 전환 — docs/architecture.md "상태관리"). useUrlSearchInput/
// useSearchDraft와 짝을 이룬다.
function SearchInput({
  draft,
  onDraftChange,
  onCommit,
  placeholder,
  className,
  ...rest
}: SearchInputProps) {
  const ariaLabel = rest['aria-label']
  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={onCommit}
        aria-label="검색"
        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Search className="size-3.5" />
      </button>
      <Input
        placeholder={placeholder}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onCommit()
          }
        }}
        className="bg-card pl-8"
        aria-label={ariaLabel}
      />
    </div>
  )
}

export default SearchInput
