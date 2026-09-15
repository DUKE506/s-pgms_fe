import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

interface GaugeRingProps {
  percent: number
  size?: number
  color?: string
}

// 단일 값 게이지 링 — 0~100% 중 값만큼 호를 그리고 나머지는 옅은 트랙으로.
// 안전조치 항목별 적용률처럼 "항목별 독립 비율"(합이 100%가 아닌 데이터)을
// 표현할 때 도넛(부분의 합=전체) 대신 쓴다.
function GaugeRing({ percent, size = 64, color = 'var(--foreground)' }: GaugeRingProps) {
  const data = [
    { key: 'value', value: percent },
    { key: 'rest', value: Math.max(0, 100 - percent) },
  ]

  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="var(--muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-bold text-foreground"
        style={{ fontSize: Math.round(size * 0.2) }}
      >
        {percent}%
      </div>
    </div>
  )
}

export default GaugeRing
