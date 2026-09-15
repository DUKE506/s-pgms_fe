import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrgRegion, OrgScopeOption } from '../data/orgScope'

interface OrgScopeTreeProps {
  root: OrgScopeOption
  regions: OrgRegion[]
  selectedId: string
  onSelect: (option: OrgScopeOption) => void
  defaultExpandedId?: string
  className?: string
}

// 조직 계층 드릴다운 트리 — 데스크톱 사이드바(상시 노출)와 모바일 바텀시트
// 양쪽에서 재사용. 지방청은 한 번에 하나만 펼쳐지는 단일 펼침 아코디언
// (2026-09-15 사용자 결정) — 새 shadcn 컴포넌트 없이 로컬 state로 구현.
function OrgScopeTree({ root, regions, selectedId, onSelect, defaultExpandedId, className }: OrgScopeTreeProps) {
  const [expandedId, setExpandedId] = useState<string | null>(defaultExpandedId ?? null)

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <button
        type="button"
        onClick={() => onSelect(root)}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold',
          selectedId === root.id
            ? 'bg-foreground text-background'
            : 'text-foreground/80 hover:bg-muted',
        )}
      >
        {root.label}
        <span
          className={cn(
            'ml-auto text-xs font-semibold',
            selectedId === root.id ? 'text-blue-300' : 'text-muted-foreground',
          )}
        >
          {root.count}건
        </span>
      </button>

      {regions.map((region) => {
        const expanded = expandedId === region.id
        const active = selectedId === region.id
        const hasChildren = !!region.children?.length

        return (
          <div key={region.id} className="flex flex-col">
            <button
              type="button"
              onClick={() => {
                onSelect(region)
                if (hasChildren) setExpandedId(expanded ? null : region.id)
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg py-2.5 pr-3 pl-3 text-left text-sm font-semibold',
                active ? 'text-foreground' : 'text-foreground/80 hover:bg-muted',
              )}
            >
              {hasChildren ? (
                expanded ? (
                  <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                )
              ) : (
                <span className="size-3 shrink-0" />
              )}
              {region.label}
              <span className="ml-auto text-xs font-medium text-muted-foreground">{region.count}건</span>
            </button>

            {expanded && region.children && (
              <div className="flex flex-col pl-7">
                {region.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onSelect(child)}
                    className={cn(
                      'flex items-center rounded-md px-2.5 py-2 text-left text-xs',
                      selectedId === child.id
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {child.label}
                    <span className="ml-auto">{child.count}건</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default OrgScopeTree
