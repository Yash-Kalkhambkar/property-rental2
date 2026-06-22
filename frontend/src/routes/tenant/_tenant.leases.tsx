import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { FileText } from '@phosphor-icons/react'
import { PageShell } from '@/components/shared/PageShell'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageTransition, FadeInItem, Skeleton } from '@/components/shared/motion'
import { useTenantLeases } from '@/hooks/tenant/usePortal'
import { formatCurrency, formatDate, unitTypeLabel } from '@/lib/formatters'

export const Route = createFileRoute('/tenant/_tenant/leases')({
  component: TenantLeasesPage,
})

function TenantLeasesPage() {
  const { data: leases, isLoading } = useTenantLeases()

  return (
    <PageTransition>
      <PageShell
        title="My Leases"
        subtitle="Your complete lease history — newest agreements first."
        variant="tenant"
      >
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="tenant" className="h-36" />
            ))}
          </div>
        ) : !leases?.length ? (
          <EmptyState
            variant="tenant"
            icon={FileText}
            title="No leases yet"
            description="When you're assigned to a unit, your lease history will appear here."
          />
        ) : (
          <div className="space-y-4">
            {leases.map((lease, i) => (
              <FadeInItem key={lease.id}>
                <motion.div
                  whileHover={{ y: -2 }}
                  className="glass-tenant rounded-2xl p-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-tenant-accent rounded-full" />
                  <div className="pl-4">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <StatusBadge status={lease.status} type="lease" />
                      <span className="text-xs text-tenant-muted">
                        {formatDate(lease.start_date)} – {formatDate(lease.end_date)}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-tenant-text">
                      {lease.property_name}
                    </h3>
                    <p className="text-sm text-tenant-muted mt-1">{lease.property_address}</p>
                    <div className="flex flex-wrap gap-6 mt-4 text-sm text-tenant-muted">
                      <span>
                        Unit <strong className="text-tenant-text font-semibold">{lease.unit_number}</strong>
                        {' · '}{unitTypeLabel[lease.unit_type] ?? lease.unit_type}
                      </span>
                      <span className="text-tenant-accent font-semibold">
                        {formatCurrency(lease.monthly_rent)}/mo
                      </span>
                      <span>
                        Deposit <strong className="text-tenant-text font-semibold">{formatCurrency(lease.deposit_paid)}</strong>
                      </span>
                      <span>
                        Due day <strong className="text-tenant-text font-semibold">{lease.rent_due_day}</strong>
                      </span>
                    </div>
                  </div>
                </motion.div>
              </FadeInItem>
            ))}
          </div>
        )}
      </PageShell>
    </PageTransition>
  )
}
