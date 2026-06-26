import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  MapPin,
  Plus,
  PencilSimple,
  Trash,
  Door,
} from '@phosphor-icons/react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/shared/motion'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PropertyFormDialog } from '@/components/features/properties/PropertyFormDialog'
import { UnitFormDialog } from '@/components/features/properties/UnitFormDialog'
import {
  useProperty,
  useDeleteProperty,
  useDeleteUnit,
} from '@/hooks/owner/useProperties'
import { useLeases } from '@/hooks/owner/useLeases'
import { formatCurrency, propertyTypeLabel, unitTypeLabel } from '@/lib/formatters'

export const Route = createFileRoute('/_owner/properties/$id')({
  component: PropertyDetailPage,
})

function PropertyDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: property, isLoading } = useProperty(id)
  const deleteProperty = useDeleteProperty()
  const deleteUnit = useDeleteUnit(id)
  const [editOpen, setEditOpen] = useState(false)
  const [unitDialog, setUnitDialog] = useState<{ open: boolean; unitId?: string }>({
    open: false,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!property) {
    return <p className="text-owner-muted">Property not found.</p>
  }

  return (
    <div className="space-y-8">
      <Link
        to="/properties"
        className="inline-flex items-center gap-2 text-sm text-owner-muted hover:text-owner-accent transition-colors"
      >
        <ArrowLeft weight="regular" size={16} /> Back to properties
      </Link>

      <div className="glass-owner rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-owner-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-owner-muted mb-2">
              {propertyTypeLabel[property.property_type]}
            </p>
            <h1 className="font-display text-4xl font-semibold text-gradient-owner mb-3">
              {property.name}
            </h1>
            <p className="flex items-center gap-2 text-owner-muted">
              <MapPin weight="duotone" size={16} />
              {property.address_line}, {property.city}, {property.state} {property.pincode}
            </p>
            <div className="flex flex-wrap gap-6 mt-6">
              <Stat label="Total units" value={String(property.total_units)} />
              <Stat label="Occupied" value={String(property.occupied_units)} />
              <Stat label="Monthly revenue" value={formatCurrency(property.monthly_revenue)} accent />
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <PencilSimple weight="regular" size={16} /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash weight="regular" size={16} /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete property?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove {property.name}. Active leases will block deletion.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      deleteProperty.mutate(id, {
                        onSuccess: () => navigate({ to: '/properties' }),
                      })
                    }
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
            <Door weight="duotone" size={24} className="text-owner-accent" /> Units
          </h2>
          <Button onClick={() => setUnitDialog({ open: true })}>
            <Plus weight="bold" size={16} /> Add unit
          </Button>
        </div>

        <div className="space-y-3">
          {property.units?.map((unit, i) => (
            <UnitRow
              key={unit.id}
              unit={unit}
              index={i}
              onEdit={() => setUnitDialog({ open: true, unitId: unit.id })}
              onDelete={() => deleteUnit.mutate(unit.id)}
            />
          ))}
          {!property.units?.length && (
            <p className="text-center text-owner-muted py-12 glass-owner rounded-2xl">
              No units yet — add your first unit above.
            </p>
          )}
        </div>
      </div>

      <PropertyFormDialog open={editOpen} onOpenChange={setEditOpen} property={property} />
      <UnitFormDialog
        propertyId={id}
        open={unitDialog.open}
        onOpenChange={(open) => setUnitDialog({ open })}
        unit={property.units?.find((u) => u.id === unitDialog.unitId)}
      />
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-owner-muted uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-semibold ${accent ? 'text-owner-accent' : ''}`}>{value}</p>
    </div>
  )
}

function UnitRow({
  unit,
  index,
  onEdit,
  onDelete,
}: {
  unit: NonNullable<ReturnType<typeof useProperty>['data']>['units'][0]
  index: number
  onEdit: () => void
  onDelete: () => void
}) {
  const { data: leaseData } = useLeases(
    { unit_id: unit.id, status: 'ACTIVE', limit: 1 },
    { enabled: unit.status === 'OCCUPIED' },
  )
  const activeLease = leaseData?.items[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-owner rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-display text-xl font-semibold">Unit {unit.unit_number}</span>
          <StatusBadge status={unit.status} type="unit" />
        </div>
        <p className="text-sm text-owner-muted">
          {unitTypeLabel[unit.unit_type]} · Floor {unit.floor ?? '—'} ·{' '}
          {formatCurrency(unit.monthly_rent)}/mo
        </p>
        {unit.current_tenant && (
          <p className="text-sm mt-1">
            Tenant:{' '}
            {activeLease ? (
              <Link
                to="/leases/$id"
                params={{ id: activeLease.id }}
                className="text-owner-accent hover:underline"
              >
                {unit.current_tenant.full_name}
              </Link>
            ) : (
              unit.current_tenant.full_name
            )}
          </p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <PencilSimple weight="regular" size={14} />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash weight="regular" size={14} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete unit {unit.unit_number}?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  )
}
