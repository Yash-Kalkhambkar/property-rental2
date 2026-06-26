import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Buildings, MapPin, ArrowUpRight } from '@phosphor-icons/react'
import { PageShell } from '@/components/shared/PageShell'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { FadeInItem, PageTransition, Skeleton } from '@/components/shared/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PropertyFormDialog } from '@/components/features/properties/PropertyFormDialog'
import { useProperties } from '@/hooks/owner/useProperties'
import { formatCurrency, propertyTypeLabel } from '@/lib/formatters'

export const Route = createFileRoute('/_owner/properties')({
  component: PropertiesPage,
})

function PropertiesPage() {
  const [page, setPage] = useState(1)
  const [city, setCity] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data, isLoading } = useProperties({ page, limit: 12, city: city || undefined })

  return (
    <PageTransition>
      <PageShell
        title="Properties"
        subtitle="Every building in your portfolio — explore occupancy, revenue, and unit details."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus weight="bold" size={16} /> Add property
          </Button>
        }
      >
        <div className="mb-6 max-w-xs">
          <Input
            placeholder="Filter by city…"
            value={city}
            onChange={(e) => {
              setCity(e.target.value)
              setPage(1)
            }}
          />
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Buildings}
            title="No properties yet"
            description="Add your first property to start managing units, tenants, and leases."
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus weight="bold" size={16} /> Add property
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((property) => (
                <FadeInItem key={property.id}>
                  <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
                    <Link
                      to="/properties/$id"
                      params={{ id: property.id }}
                      className="group block glass-owner rounded-2xl overflow-hidden hover:glow-accent transition-shadow duration-300"
                    >
                      <div className="h-2 bg-gradient-to-r from-owner-accent/60 via-owner-accent to-owner-accent/40" />
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <p className="text-xs uppercase tracking-widest text-owner-muted mb-1">
                              {propertyTypeLabel[property.property_type]}
                            </p>
                            <h3 className="font-display text-2xl font-semibold group-hover:text-owner-accent transition-colors">
                              {property.name}
                            </h3>
                          </div>
                          <ArrowUpRight weight="bold" size={18} className="text-owner-muted group-hover:text-owner-accent transition-colors" />
                        </div>
                        <p className="flex items-center gap-1.5 text-sm text-owner-muted mb-5">
                          <MapPin weight="duotone" size={14} className="shrink-0" />
                          {property.city}, {property.state}
                        </p>
                        <div className="flex items-end justify-between pt-4 border-t border-owner-border/50">
                          <div>
                            <p className="text-xs text-owner-muted">Units</p>
                            <p className="text-lg font-semibold">
                              {property.occupied_units}/{property.total_units}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-owner-muted">Monthly</p>
                            <p className="text-lg font-semibold text-owner-accent">
                              {formatCurrency(property.monthly_revenue)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                </FadeInItem>
              ))}
            </div>
            <Pagination
              page={data.page}
              pages={data.pages}
              total={data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </PageShell>

      <PropertyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageTransition>
  )
}
