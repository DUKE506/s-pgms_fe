import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface RatioDonutProps {
  data: { name: string; value: number; color: string }[]
  total: number
  size?: number
}

// 비율 도넛 — 상태별 비율/연령층 비율 등 범용, 모바일/데스크톱 공용(size로 지름만 다르게).
function RatioDonut({ data, total, size = 130 }: RatioDonutProps) {
  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      {/* 중앙 총건수 라벨을 차트보다 먼저 그려서(DOM 순서) 뒤에 오는 recharts
          Tooltip(같은 relative 컨테이너 안에 absolute로 뜸)이 항상 위에
          쌓이게 한다 — 순서를 바꾸면 호버 툴팁이 이 라벨에 가려짐(2026-09-15). */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex size-[62%] items-center justify-center rounded-full bg-card text-sm font-bold text-foreground">
          {total}건
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value}건`, name]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default RatioDonut
