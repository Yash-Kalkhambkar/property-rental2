import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Buildings,
  CreditCard,
  Door,
  FileText,
  TrendUp,
  WarningCircle,
  Lightbulb,
} from '@phosphor-icons/react'
import { PageShell } from '@/components/shared/PageShell'
import { QuickActions } from '@/components/shared/QuickActions'
import { StatRibbon } from '@/components/shared/StatRibbon'
import { FadeInItem, PageTransition, Skeleton } from '@/components/shared/motion'
import { DashboardCharts } from '@/components/owner/DashboardCharts'
import { useDashboard } from '@/hooks/owner/useDashboard'
import { formatCurrency, formatDateShort } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_owner/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { data, isLoading, isError } = useDashboard()

  if (isLoading) {
    return (
      <PageShell title="Dashboard" subtitle="Loading your portfolio overview…">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2 mt-8">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </PageShell>
    )
  }

  if (isError || !data) {
    return (
      <PageShell title="Dashboard" subtitle="Could not load dashboard data.">
        <div className="glass-owner rounded-2xl p-8 text-center text-owner-muted">
          Something went wrong. Try refreshing the page.
        </div>
      </PageShell>
    )
  }

  const { summary: s, financials: f, alerts } = data

  return (
    <PageTransition>
      <PageShell
        title="Dashboard"
        subtitle="Occupancy, revenue, and items that need your attention."
      >
        <StatRibbon
          stats={[
            { label: 'Properties', value: String(s.total_properties), icon: Buildings },
            {
              label: 'Total units',
              value: String(s.total_units),
              sub: `${s.vacant_units} vacant`,
              icon: Door,
            },
            {
              label: 'Occupancy',
              value: `${s.occupancy_rate}%`,
              sub: `${s.occupied_units} occupied`,
              accent: true,
              icon: TrendUp,
            },
            {
              label: 'Collected',
              value: formatCurrency(f.current_month_collected),
              sub: 'This month',
              icon: CreditCard,
            },
            {
              label: 'Expected',
              value: formatCurrency(f.current_month_expected),
              sub: `${f.overdue_count} overdue`,
              icon: TrendUp,
            },
          ]}
        />

        <div className="mt-10">
          <QuickActions
            actions={[
              {
                label: 'Add property',
                description: 'Register a new building or unit block',
                to: '/properties',
                icon: Buildings,
              },
              {
                label: 'Record payment',
                description: 'Log rent received from a tenant',
                to: '/payments',
                icon: CreditCard,
              },
              {
                label: 'Create lease',
                description: 'Connect a tenant to a unit',
                to: '/leases',
                icon: FileText,
              },
            ]}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mt-10">
          <FadeInItem>
            <AlertPanel
              title="Overdue payments"
              empty="All caught up — no overdue payments."
              accent="danger"
              icon={WarningCircle}
              items={alerts.overdue_payments.map((p) => ({
                id: p.payment_id,
                primary: p.tenant_name,
                secondary: `${p.unit} · ${p.overdue_days} days late`,
                value: formatCurrency(p.amount),
                to: '/payments',
              }))}
            />
          </FadeInItem>

          <FadeInItem>
            <AlertPanel
              title="Leases expiring soon"
              empty="No leases expiring in the next 30 days."
              accent="warning"
              icon={FileText}
              items={alerts.leases_expiring_soon.map((l) => ({
                id: l.lease_id,
                primary: l.tenant_name,
                secondary: `${l.unit} · ends ${formatDateShort(l.end_date)}`,
                value: `${l.days_remaining}d left`,
                to: '/leases/$id',
                params: { id: l.lease_id },
              }))}
            />
          </FadeInItem>
        </div>

        {/* Charts section */}
        <FadeInItem>
          <DashboardCharts data={data} />
        </FadeInItem>

        {/* Landlord tips */}
        <FadeInItem>
          <InsightsTips />
        </FadeInItem>

      </PageShell>
    </PageTransition>
  )
}

function AlertPanel({
  title,
  icon: Icon,
  items,
  empty,
  accent,
}: {
  title: string
  icon: React.ComponentType<{ weight?: 'duotone'; size?: number; className?: string }>
  items: {
    id: string
    primary: string
    secondary: string
    value: string
    to: string
    params?: { id: string }
  }[]
  empty: string
  accent: 'danger' | 'warning'
}) {
  return (
    <div className="glass-owner rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl',
            accent === 'danger' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning',
          )}
        >
          <Icon weight="duotone" size={18} />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>

      <div className="flex-1 p-2">
        {items.length === 0 ? (
          <p className="text-sm text-owner-muted text-center py-12">{empty}</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item, i) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={item.to as '/leases/$id' | '/payments'}
                  params={item.params}
                  className="group flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-owner-elevated"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-owner-accent transition-colors">
                      {item.primary}
                    </p>
                    <p className="text-xs text-owner-muted truncate">{item.secondary}</p>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold shrink-0',
                      accent === 'danger' ? 'text-danger' : 'text-warning',
                    )}
                  >
                    {item.value}
                  </span>
                  <ArrowRight
                    weight="bold"
                    size={14}
                    className="text-owner-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  />
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const LANDLORD_TIPS = [
  {
    emoji: '📋',
    title: 'Screen tenants thoroughly',
    tip: 'Always verify employment, check references, and review credit history before signing a lease. A 30-minute background check can save months of stress.',
  },
  {
    emoji: '📅',
    title: 'Renew leases 60 days early',
    tip: 'Reach out to tenants 60 days before lease end. Early renewals cut vacancy periods and give you time to re-list if they decide to leave.',
  },
  {
    emoji: '🔧',
    title: 'Budget 1% for maintenance annually',
    tip: 'A good rule of thumb: set aside 1% of your property\'s value each year for repairs. Preventative maintenance is always cheaper than emergency fixes.',
  },
  {
    emoji: '📸',
    title: 'Document everything',
    tip: 'Take timestamped photos on move-in and move-out days. This single habit resolves 90% of security deposit disputes without court involvement.',
  },
  {
    emoji: '💡',
    title: 'Raise rents gradually',
    tip: 'A 3–5% annual increase retains good tenants while keeping pace with inflation. Large sudden hikes push reliable tenants out and spike your vacancy costs.',
  },
  {
    emoji: '📜',
    title: 'Keep digital copies of all agreements',
    tip: 'Store signed lease agreements, payment receipts, and inspection reports in the cloud. You\'ll thank yourself if a dispute ever goes to arbitration.',
  },
]

function InsightsTips() {
  return (
    <div className="glass-owner rounded-2xl overflow-hidden mt-0">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-owner-accent/15 text-owner-accent">
          <Lightbulb weight="duotone" size={18} />
        </div>
        <div>
          <h3 className="text-base font-semibold">Landlord Insights</h3>
          <p className="text-xs text-owner-muted">Tips to help you manage smarter</p>
        </div>
      </div>
      <div className="grid gap-px bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-3">
        {LANDLORD_TIPS.map((tip, i) => (
          <motion.div
            key={tip.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-owner-surface p-5 hover:bg-owner-elevated transition-colors"
          >
            <p className="text-2xl mb-2">{tip.emoji}</p>
            <p className="text-sm font-semibold text-owner-text mb-1">{tip.title}</p>
            <p className="text-xs text-owner-muted leading-relaxed">{tip.tip}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
