import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface MonthlyTrendChartProps {
  data: { month: string; count: number }[]
  height?: number
}

// 월별 추이 — 최근 6개월 전체 건수. natural 곡선 + 선 아래 그라데이션 채움
// (2026-09-15, 사용자 요청). gradient id는 모바일/데스크톱 동시 마운트(CSS로만
// 토글) 상황에서 두 인스턴스가 같은 id를 공유하면 안 되므로 useId로 고유화.
function MonthlyTrendChart({ data, height = 130 }: MonthlyTrendChartProps) {
  const gradientId = `monthly-trend-fill-${useId()}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        {/* min을 0으로 고정 — 예전엔 dataMin 기준 -60 패딩이라 실 데이터처럼 값이
            작으면(0~10건대) 0선이 차트 중간에 떠 보였다(2026-09-16 실사용 피드백).
            max는 dataMax에 20%+1 여유를 줘 선이 위쪽 끝에 붙지 않게 한다. */}
        <YAxis hide domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2) + 1]} />
        <Tooltip formatter={(value) => [`${value}건`, '접수 건수']} />
        <Area
          type="natural"
          dataKey="count"
          stroke="#60a5fa"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default MonthlyTrendChart
