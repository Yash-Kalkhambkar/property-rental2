import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CalendarBlank, CreditCard, FileText, User, Sparkle } from '@phosphor-icons/react'
import { PageShell } from '@/components/shared/PageShell'
import { QuickActions } from '@/components/shared/QuickActions'
import { StatRibbon } from '@/components/shared/StatRibbon'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageTransition, FadeInItem, Skeleton } from '@/components/shared/motion'
import { TenantDashboardCharts } from '@/components/tenant/DashboardCharts'
import { useTenantDashboard } from '@/hooks/tenant/usePortal'
import { formatCurrency, formatDateShort } from '@/lib/formatters'

export const Route = createFileRoute('/tenant/_tenant/')({
  component: TenantDashboardPage,
})

function TenantDashboardPage() {
  const { data, isLoading, isError } = useTenantDashboard()

  if (isLoading) {
    return (
      <PageShell title="Home" subtitle="Loading…" variant="tenant">
        <Skeleton variant="tenant" className="h-32 mb-6" />
        <Skeleton variant="tenant" className="h-64" />
      </PageShell>
    )
  }

  if (isError || !data) {
    return (
      <PageShell title="Home" variant="tenant">
        <div className="glass-tenant rounded-2xl p-8 text-center text-tenant-muted">
          Could not load dashboard.
        </div>
      </PageShell>
    )
  }

  return (
    <PageTransition>
      <PageShell
        title="Home"
        subtitle="What's due, what's coming up, and your active leases."
        variant="tenant"
      >
        <StatRibbon
          variant="tenant"
          stats={[
            {
              label: 'Active leases',
              value: String(data.active_leases_count),
              icon: FileText,
            },
            {
              label: 'Amount due',
              value: formatCurrency(data.total_amount_due),
              accent: data.total_amount_due > 0,
              icon: CreditCard,
            },
            {
              label: 'Upcoming',
              value: String(data.upcoming_payments.length),
              sub: 'Next 30 days',
              icon: CalendarBlank,
            },
          ]}
        />

        <div className="mt-8">
          <QuickActions
            variant="tenant"
            actions={[
              {
                label: 'View leases',
                description: 'Check terms and lease status',
                to: '/tenant/leases',
                icon: FileText,
              },
              {
                label: 'Payment history',
                description: 'See past and pending rent',
                to: '/tenant/payments',
                icon: CreditCard,
              },
              {
                label: 'Your profile',
                description: 'Update contact details',
                to: '/tenant/profile',
                icon: User,
              },
            ]}
          />
        </div>

        <FadeInItem className="mt-10">
          <div className="glass-tenant rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-tenant-border">
              <h3 className="text-base font-semibold text-tenant-text">Upcoming payments</h3>
            </div>
            {data.upcoming_payments.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-tenant-muted">No payments due in the next 30 days.</p>
                <Link
                  to="/tenant/payments"
                  className="mt-3 inline-block text-sm font-medium text-tenant-accent hover:underline"
                >
                  View payment history →
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-tenant-border">
                {data.upcoming_payments.map((p, i) => (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to="/tenant/payments"
                      className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-tenant-accent/5"
                    >
                      <div>
                        <p className="font-medium text-tenant-text">Unit {p.unit_number}</p>
                        <p className="text-sm text-tenant-muted">
                          Due {formatDateShort(p.due_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <StatusBadge status={p.status} type="payment" />
                        <span className="font-semibold text-tenant-accent">
                          {formatCurrency(p.amount_due)}
                        </span>
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </FadeInItem>

        {/* Charts */}
        <FadeInItem>
          <TenantDashboardCharts data={data} />
        </FadeInItem>

        {/* Renter tips */}
        <FadeInItem className="mt-8">
          <TenantTips />
        </FadeInItem>

      </PageShell>
    </PageTransition>
  )
}

const TENANT_TIPS = [
  {
    emoji: '📸',
    title: 'Document on move-in day',
    tip: 'Take time-stamped photos of every room before unpacking. It\'s your best protection when the time comes to get your deposit back.',
  },
  {
    emoji: '✉️',
    title: 'Report issues in writing',
    tip: 'Always report maintenance problems via message or email — never just verbally. A paper trail protects you if repairs go unaddressed.',
  },
  {
    emoji: '📅',
    title: 'Pay rent before the due date',
    tip: 'Even 1 day early is better than on the day. Most online payment systems have cut-off times, and late fees add up fast over a year.',
  },
  {
    emoji: '📄',
    title: 'Read your lease carefully',
    tip: 'Know your notice period, pet policy, and subletting rules before you need them. Surprises in lease agreements are rarely good surprises.',
  },
  {
    emoji: '🔑',
    title: 'Never share your access credentials',
    tip: 'Your portal login is personal. If a family member needs access to payment records, ask your landlord to set up separate access.',
  },
  {
    emoji: '💬',
    title: 'Talk to your landlord early',
    tip: 'If you\'re struggling with rent one month, reach out before the due date — not after. Most landlords would rather work something out than start eviction proceedings.',
  },
]

function TenantTips() {
  return (
    <div className="glass-tenant rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-tenant-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-tenant-accent/15 text-tenant-accent">
          <Sparkle weight="duotone" size={18} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-tenant-text">Renter Tips</h3>
          <p className="text-xs text-tenant-muted">Make the most of your tenancy</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 divide-y divide-tenant-border sm:divide-y-0 sm:[&>*:nth-child(n+3)]:border-t sm:[&>*:nth-child(n+3)]:border-tenant-border lg:[&>*:nth-child(n+4)]:border-t lg:[&>*:nth-child(n+4)]:border-tenant-border">
        {TENANT_TIPS.map((tip, i) => (
          <motion.div
            key={tip.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={[
              'p-5 hover:bg-tenant-accent/5 transition-colors',
              // right border between columns
              'sm:[&:not(:nth-child(2n))]:border-r sm:border-tenant-border',
              'lg:[&:not(:nth-child(3n))]:border-r lg:border-tenant-border',
            ].join(' ')}
          >
            <p className="text-2xl mb-2">{tip.emoji}</p>
            <p className="text-sm font-semibold text-tenant-text mb-1">{tip.title}</p>
            <p className="text-xs text-tenant-muted leading-relaxed">{tip.tip}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
