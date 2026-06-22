import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Buildings, MapPin } from '@phosphor-icons/react'
import { PageShell } from '@/components/shared/PageShell'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageTransition, FadeInItem, Skeleton } from '@/components/shared/motion'
import { useTenantProperties } from '@/hooks/tenant/usePortal'
import { propertyTypeLabel, unitTypeLabel } from '@/lib/formatters'

export const Route = createFileRoute('/tenant/_tenant/properties')({
  component: TenantPropertiesPage,
})

function TenantPropertiesPage() {
  const { data: properties, isLoading } = useTenantProperties()

  return (
    <PageTransition>
      <PageShell
        title="My Properties"
        subtitle="Places you've called home — only the units tied to your leases."
        variant="tenant"
      >
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} variant="tenant" className="h-48" />
            ))}
          </div>
        ) : !properties?.length ? (
          <EmptyState
            variant="tenant"
            icon={Buildings}
            title="No properties"
            description="Properties linked to your leases will appear here."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {properties.map((property, i) => (
              <FadeInItem key={property.id}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="glass-tenant rounded-2xl overflow-hidden h-full"
                >
                  <div className="h-1.5 bg-gradient-to-r from-tenant-accent/60 via-tenant-accent to-tenant-accent/40" />
                  <div className="p-6">
                    <p className="text-xs uppercase tracking-widest text-tenant-muted mb-1">
                      {propertyTypeLabel[property.property_type] ?? property.property_type}
                    </p>
                    <h3 className="font-display text-2xl font-semibold text-tenant-text mb-2">
                      {property.name}
                    </h3>
                    <p className="flex items-start gap-1.5 text-sm text-tenant-muted mb-5">
                      <MapPin weight="duotone" size={14} className="shrink-0 mt-0.5" />
                      {property.address_line}, {property.city}
                    </p>
                    <div className="space-y-2 pt-4 border-t border-tenant-border">
                      <p className="text-xs uppercase tracking-wider text-tenant-muted">Your units</p>
                      {property.units.map((unit) => (
                        <div
                          key={unit.unit_number}
                          className="flex items-center justify-between rounded-xl bg-tenant-accent/5 px-4 py-3"
                        >
                          <span className="font-medium text-tenant-text">Unit {unit.unit_number}</span>
                          <span className="text-sm text-tenant-muted">
                            {unitTypeLabel[unit.unit_type] ?? unit.unit_type}
                          </span>
                        </div>
                      ))}
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
