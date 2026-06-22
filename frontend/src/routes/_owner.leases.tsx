import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, FileText, ArrowUpRight, Prohibit, WarningCircle } from '@phosphor-icons/react'
import { PageShell } from '@/components/shared/PageShell'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { FadeInItem, PageTransition, Skeleton } from '@/components/shared/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LeaseFormDialog } from '@/components/features/leases/LeaseFormDialog'
import { useLeases, useTerminateLease } from '@/hooks/owner/useLeases'
import { formatCurrency, formatDateShort } from '@/lib/formatters'
import type { Lease } from '@/types/owner'
import { cn } from '@/lib/utils'

const filters = [
  { label: 'All', value: undefined as string | undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Terminated', value: 'TERMINATED' },
]

export const Route = createFileRoute('/_owner/leases')({
  component: LeasesPage,
})

function LeasesPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | undefined>()
  const [expiringSoon, setExpiringSoon] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Terminate dialog state
  const [terminateLease, setTerminateLease] = useState<Lease | null>(null)
  const [reason, setReason] = useState('')
  const [terminationDate, setTerminationDate] = useState('')

  const { data, isLoading } = useLeases({
    page,
    limit: 12,
    status,
    expiring_in_days: expiringSoon ? 30 : undefined,
  })

  const terminate = useTerminateLease(terminateLease?.id ?? '')

  const openTerminate = (lease: Lease, e: React.MouseEvent) => {
    e.preventDefault()  // stop the Link navigation
    e.stopPropagation()
    setTerminateLease(lease)
    setReason('')
    // Default to today
    setTerminationDate(new Date().toISOString().split('T')[0])
  }

  const closeTerminate = () => {
    setTerminateLease(null)
    setReason('')
    setTerminationDate('')
  }

  const confirmTerminate = () => {
    if (!reason.trim() || !terminationDate) return
    terminate.mutate(
      { reason: reason.trim(), termination_date: terminationDate },
      { onSuccess: closeTerminate },
    )
  }

  return (
    <PageTransition>
      <PageShell
        title="Leases"
        subtitle="Track every agreement — filter by status or find leases nearing expiration."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus weight="bold" size={16} /> New lease
          </Button>
        }
      >
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={() => { setStatus(f.value); setExpiringSoon(false); setPage(1) }}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium transition-all',
                status === f.value && !expiringSoon
                  ? 'bg-owner-accent text-owner-bg'
                  : 'glass-owner text-owner-muted hover:text-owner-text',
              )}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => { setExpiringSoon(!expiringSoon); setStatus(undefined); setPage(1) }}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition-all',
              expiringSoon
                ? 'bg-warning/20 text-warning border border-warning/30'
                : 'glass-owner text-owner-muted hover:text-owner-text',
            )}
          >
            Expiring soon
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={FileText}
            title="No leases"
            description="Create a lease to connect a tenant with a unit."
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus weight="bold" size={16} /> New lease
              </Button>
            }
          />
        ) : (
          <>
            <div className="space-y-3">
              {data.items.map((lease) => (
                <FadeInItem key={lease.id}>
                  <motion.div whileHover={{ x: 2 }} className="relative group">
                    <Link
                      to="/leases/$id"
                      params={{ id: lease.id }}
                      className="block glass-owner rounded-2xl p-5 hover:glow-accent transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <StatusBadge status={lease.status} type="lease" />
                            <span className="text-xs text-owner-muted">
                              {formatDateShort(lease.start_date)} – {formatDateShort(lease.end_date)}
                            </span>
                          </div>
                          <h3 className="font-display text-xl font-semibold group-hover:text-owner-accent transition-colors truncate">
                            {lease.tenant.full_name}
                          </h3>
                          <p className="text-sm text-owner-muted mt-1 truncate">
                            {lease.unit.property_name} · Unit {lease.unit.unit_number}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-owner-muted">Monthly rent</p>
                            <p className="text-lg font-semibold text-owner-accent">
                              {formatCurrency(lease.monthly_rent)}
                            </p>
                          </div>

                          {/* Terminate button — only shown on ACTIVE leases */}
                          <AnimatePresence>
                            {lease.status === 'ACTIVE' && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                onClick={(e) => openTerminate(lease as unknown as Lease, e)}
                                title="Terminate lease"
                                className={cn(
                                  'flex h-9 w-9 items-center justify-center rounded-xl',
                                  'bg-danger/10 text-danger hover:bg-danger/20',
                                  'transition-colors border border-danger/20',
                                  'opacity-0 group-hover:opacity-100',
                                )}
                              >
                                <Prohibit weight="duotone" size={17} />
                              </motion.button>
                            )}
                          </AnimatePresence>

                          <ArrowUpRight
                            weight="bold"
                            size={18}
                            className="text-owner-muted group-hover:text-owner-accent transition-colors"
                          />
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

      {/* Create lease dialog */}
      <LeaseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Terminate confirmation dialog */}
      <Dialog open={!!terminateLease} onOpenChange={(o) => !o && closeTerminate()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <WarningCircle weight="duotone" size={20} />
              Terminate lease
            </DialogTitle>
          </DialogHeader>

          {terminateLease && (
            <div className="space-y-5">
              {/* Summary card */}
              <div className="rounded-xl bg-danger/5 border border-danger/15 px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-owner-text">
                  {terminateLease.tenant.full_name}
                </p>
                <p className="text-xs text-owner-muted">
                  {terminateLease.unit.property_name} · Unit {terminateLease.unit.unit_number}
                </p>
                <p className="text-xs text-owner-muted">
                  {formatDateShort(terminateLease.start_date)} – {formatDateShort(terminateLease.end_date)}
                  &nbsp;·&nbsp;{formatCurrency(terminateLease.monthly_rent)}/mo
                </p>
              </div>

              <p className="text-sm text-owner-muted leading-relaxed">
                This will mark the lease as <strong className="text-danger">Terminated</strong> and
                set the unit back to <strong>Vacant</strong>. This cannot be undone.
              </p>

              <div className="space-y-2">
                <Label>Termination date</Label>
                <Input
                  type="date"
                  value={terminationDate}
                  onChange={(e) => setTerminationDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Reason <span className="text-owner-muted font-normal">(required)</span></Label>
                <Textarea
                  placeholder="e.g. Tenant vacating at end of tenancy, mutual agreement…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={closeTerminate}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || !terminationDate || terminate.isPending}
              onClick={confirmTerminate}
            >
              {terminate.isPending ? 'Terminating…' : 'Terminate lease'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
