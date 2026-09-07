interface DonutSegment {
  value: number
  color: string
  label: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  total: number
  size?: number
  strokeWidth?: number
  centerLabel?: string
  centerValue?: string
}

export default function DonutChart({
  segments,
  total,
  size = 180,
  strokeWidth = 24,
  centerLabel = 'Total',
  centerValue,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const cx = size / 2
  const cy = size / 2

  let cumulativePercent = 0

  const arcs = segments
    .filter(s => s.value > 0)
    .map((segment) => {
      const percent = total > 0 ? segment.value / total : 0
      const startDashoffset = circumference * (1 - cumulativePercent)
      const dashArray = `${circumference * percent} ${circumference * (1 - percent)}`
      cumulativePercent += percent

      return {
        ...segment,
        dashArray,
        dashOffset: startDashoffset,
        percent,
      }
    })

  if (arcs.length === 0) {
    arcs.push({
      value: 1, color: '#E5E7EB', label: '', percent: 1,
      dashArray: `${circumference} 0`,
      dashOffset: circumference * 0.25,
    })
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 2 }}>
          {centerLabel}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-heading)' }}>
          {centerValue}
        </span>
      </div>
    </div>
  )
}
