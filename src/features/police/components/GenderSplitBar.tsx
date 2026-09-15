interface GenderSplitBarProps {
  data: { label: string; count: number; color: string }[]
  total: number
}

// 성별 비율 — 도넛 대신 얇은 2분할 바(범례 겸용 라벨 줄 + 막대). 값이 2개뿐이라
// 도넛보다 이게 더 컴팩트해서 연령층 비율 카드 하단에 얹어 쓴다.
function GenderSplitBar({ data, total }: GenderSplitBarProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[13px] font-medium text-foreground/80">
        {data.map((entry) => (
          <span key={entry.label} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
            {entry.label} {entry.count}건 ({Math.round((entry.count / total) * 100)}%)
          </span>
        ))}
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {data.map((entry) => (
          <div
            key={entry.label}
            style={{ width: `${(entry.count / total) * 100}%`, backgroundColor: entry.color }}
          />
        ))}
      </div>
    </div>
  )
}

export default GenderSplitBar
