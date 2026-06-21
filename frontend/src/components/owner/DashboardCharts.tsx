import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts'
import type { Dashboard } from '@/types/owner'

interface Props {
  data: Dashboard
}

// Custom tooltip for currency values
function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-owner rounded-xl px-3 py-2 text-xs border border-white/10 shadow-xl">
      {label && <p className="text-owner-muted mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}:{' '}
          <span className="font-semibold">
            ₹{p.value.toLocaleString('en-IN')}
          </span>
        </p>
      ))}
    </div>
  )
}

export function DashboardCharts({ data }: Props) {
  const { summary: s, financials: f } = data

  // Occupancy pie data
  const occupancyData = [
    { name: 'Occupied', value: s.occupied_units },
    { name: 'Vacant', value: s.vacant_units },
  ]

  // Revenue bar data (collected vs expected)
  const revenueData = [
    {
      name: 'This Month',
      Collected: f.current_month_collected,
      Expected: f.current_month_expected,
    },
  ]

  // Unit health radar
  const healthData = [
    {
      metric: 'Occupancy',
      value: s.occupancy_rate,
      fullMark: 100,
    },
    {
      metric: 'Collection',
      value:
        f.current_month_expected > 0
          ? Math.round((f.current_month_collected / f.current_month_expected) * 100)
          : 0,
      fullMark: 100,
    },
    {
      metric: 'On-time',
      value:
        f.overdue_count === 0
          ? 100
          : Math.max(0, 100 - Math.round((f.overdue_count / Math.max(s.occupied_units, 1)) * 100)),
      fullMark: 100,
    },
  ]

  const PIE_COLORS = ['#3b82f6', '#1e293b']
  const OCCUPIED_COLOR = '#3b82f6'
  const EXPECTED_COLOR = '#334155'
  const RADAR_COLOR = '#3b82f6'

  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-10">
      {/* Occupancy Donut */}
      <div className="glass-owner rounded-2xl p-6 flex flex-col">
        <h3 className="text-sm font-semibold text-owner-text mb-1">Occupancy</h3>
        <p className="text-xs text-owner-muted mb-4">Units occupied vs vacant</p>
        <div className="flex-1 flex items-center justify-center" style={{ minHeight: 180 }}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={occupancyData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={3}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {occupancyData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]
                  return (
                    <div className="glass-owner rounded-xl px-3 py-2 text-xs border border-white/10 shadow-xl">
                      <p style={{ color: d.payload.fill ?? '#fff' }}>
                        {d.name}:{' '}
                        <span className="font-semibold">{String(d.value)}</span>
                      </p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* legend */}
        <div className="flex justify-center gap-4 mt-2">
          {occupancyData.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs text-owner-muted">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: PIE_COLORS[i] }}
              />
              {d.name} ({d.value})
            </div>
          ))}
        </div>
        <p className="text-center text-2xl font-bold text-owner-accent mt-3">
          {s.occupancy_rate}%
        </p>
      </div>

      {/* Revenue Bar */}
      <div className="glass-owner rounded-2xl p-6 flex flex-col">
        <h3 className="text-sm font-semibold text-owner-text mb-1">Revenue</h3>
        <p className="text-xs text-owner-muted mb-4">Collected vs expected this month</p>
        <div className="flex-1" style={{ minHeight: 180 }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueData} barCategoryGap="40%" barGap={4}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                width={42}
              />
              <Tooltip content={<CurrencyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#64748b', paddingTop: 8 }}
              />
              <Bar dataKey="Expected" fill={EXPECTED_COLOR} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Collected" fill={OCCUPIED_COLOR} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {f.overdue_count > 0 && (
          <p className="text-xs text-danger text-center mt-2">
            {f.overdue_count} overdue · ₹{f.overdue_amount.toLocaleString('en-IN')} pending
          </p>
        )}
        {f.overdue_count === 0 && (
          <p className="text-xs text-green-400 text-center mt-2">
            No overdue payments 🎉
          </p>
        )}
      </div>

      {/* Portfolio Health Radar */}
      <div className="glass-owner rounded-2xl p-6 flex flex-col">
        <h3 className="text-sm font-semibold text-owner-text mb-1">Portfolio Health</h3>
        <p className="text-xs text-owner-muted mb-4">Occupancy · Collection · On-time rate</p>
        <div className="flex-1" style={{ minHeight: 180 }}>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={healthData} cx="50%" cy="50%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Radar
                name="Score"
                dataKey="value"
                stroke={RADAR_COLOR}
                fill={RADAR_COLOR}
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="glass-owner rounded-xl px-3 py-2 text-xs border border-white/10 shadow-xl">
                      <p className="text-owner-accent font-semibold">{payload[0].payload.metric}</p>
                      <p className="text-owner-muted">{String(payload[0].value)}%</p>
                    </div>
                  )
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center flex-wrap gap-3 mt-2">
          {healthData.map((d) => (
            <div key={d.metric} className="text-center">
              <p className="text-lg font-bold text-owner-accent">{d.value}%</p>
              <p className="text-[10px] text-owner-muted">{d.metric}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
