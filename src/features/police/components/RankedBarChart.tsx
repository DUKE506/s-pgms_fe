import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface RankedBarChartProps {
  data: { name: string; count: number }[]
  height?: number
  unit?: string
  yAxisWidth?: number
  marginRight?: number
}

// 이름 + 가로 막대 + 값 형태의 순위/비교 차트 — 지역별 건수 순위, 안전조치
// 항목별 적용 현황 양쪽에서 재사용. 애니메이션 켜진 상태라 recharts Bar
// 내부 동작상(showLabels: !isAnimating) 막대가 다 자랄 때까지 값 라벨이
// 살짝 늦게 나타난다 — 의도된 진입 효과, 버그 아님(2026-09-15 확인).
//
// yAxisWidth/marginRight — 카테고리명 열·우측 값 여백을 고정폭으로 뺴는
// 만큼 실제 막대가 그려지는 플롯 영역이 줄어든다. 모바일처럼 컨테이너 폭이
// 좁은 곳에서 데스크톱과 같은 고정값(92/32)을 쓰면 막대 영역이 과도하게
// 눌려 보여서(2026-09-15 피드백) 호출부에서 더 좁은 값으로 오버라이드할 수
// 있게 열어둠(목업 실측: 모바일 이름열 74px).
function RankedBarChart({ data, height = 200, unit = '건', yAxisWidth = 92, marginRight = 32 }: RankedBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: marginRight, bottom: 4, left: 4 }}
        barCategoryGap="30%"
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={yAxisWidth}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fontWeight: 500, fill: 'var(--foreground)' }}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          formatter={(value) => [`${value}${unit}`, '건수']}
        />
        <Bar dataKey="count" radius={4} barSize={10} fill="var(--foreground)">
          <LabelList
            dataKey="count"
            position="right"
            style={{ fontSize: 12, fontWeight: 700, fill: 'var(--foreground)' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default RankedBarChart
