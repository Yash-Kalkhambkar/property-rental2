import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { TenantDashboard } from '@/types/tenant'
import { formatDateShort } from '@/lib/formatters'

interface Props {
  data: TenantDashboard
}

export function TenantDashboardCharts({ data }: Props) {
  const totalDue = data.total_amount_due
  const upcomingTotal = data.upcoming_payments.reduce((s, p) => s + p.amount_due, 0)

  // Payment status breakdown for the pie
  const statusMap: Record<string, number> = {}
  for (const p of data.upcoming_payments) {
    statusMap[p.status] = (statusMap[p.status] ?? 0) + 1
  }
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

  const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b',
    paid: '#10b981',
    overdue: '#ef4444',
    upcoming: '#0d9488',
  }
  const DEFAULT_COLOR = '#0d9488'

  // Timeline bar chart — upcoming due amounts
  const timelineData = [...data.upcoming_payments]
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 6)
    .map((p) => ({
      label: `Unit ${p.unit_number}`,
      date: formatDateShort(p.due_date),
      Amount: p.amount_due,
      status: p.status,
    }))

  return (
    <div className="grid gap-6 sm:grid-cols-2 mt-8">
      {/* Payment Status Pie */}
      <div className="glass-tenant rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-tenant-text mb-1">Payment Breakdown</h3>
        <p className="text-xs text-tenant-muted mb-4">Status of your upcoming payments</p>
        {statusData.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-tenant-muted">No upcoming payments</p>
          </div>
        ) : (
          <>
            <div style={{ minHeight: 160 }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] ?? DEFAULT_COLOR}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]
                      return (
                        <div className="glass-tenant rounded-xl px-3 py-2 text-xs border border-tenant-border shadow-xl">
                          <p style={{ color: STATUS_COLORS[d.name as string] ?? DEFAULT_COLOR }}>
                            {d.name}: <span className="font-semibold">{String(d.value)}</span>
                          </p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {statusData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-tenant-muted">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: STATUS_COLORS[d.name] ?? DEFAULT_COLOR }}
                  />
                  <span className="capitalize">{d.name}</span> ({d.value})
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Upcoming amounts bar chart */}
      <div className="glass-tenant rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-tenant-text mb-1">Upcoming Dues</h3>
        <p className="text-xs text-tenant-muted mb-4">
          {timelineData.length > 0
            ? `Next ${timelineData.length} payments · Total ₹${upcomingTotal.toLocaleString('en-IN')}`
            : 'No payments due soon'}
        </p>
        {timelineData.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-tenant-muted">You're all clear! 🎉</p>
          </div>
        ) : (
          <div style={{ minHeight: 160 }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={timelineData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#5eead4', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                  width={40}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const entry = timelineData.find((d) => d.label === label)
                    return (
                      <div className="glass-tenant rounded-xl px-3 py-2 text-xs border border-tenant-border shadow-xl">
                        <p className="text-tenant-accent font-medium">{label}</p>
                        {entry && <p className="text-tenant-muted">Due {entry.date}</p>}
                        <p className="text-tenant-text font-semibold">
                          ₹{Number(payload[0].value).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )
                  }}
                  cursor={{ fill: 'rgba(13,148,136,0.08)' }}
                />
                <Bar
                  dataKey="Amount"
                  radius={[6, 6, 0, 0]}
                  fill="#0d9488"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {totalDue > 0 && (
          <p className="text-xs text-amber-400 text-center mt-3">
            ₹{totalDue.toLocaleString('en-IN')} total currently due
          </p>
        )}
      </div>
    </div>
  )
}
