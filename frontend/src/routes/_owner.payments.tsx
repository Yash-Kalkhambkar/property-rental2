import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, CreditCard, PencilSimple, Trash } from '@phosphor-icons/react'
import { PageShell } from '@/components/shared/PageShell'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { FadeInItem, PageTransition, Skeleton } from '@/components/shared/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { PaymentFormDialog } from '@/components/features/payments/PaymentFormDialog'
import { usePayments, useDeletePayment } from '@/hooks/owner/usePayments'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const statusFilters = ['', 'PENDING', 'PAID', 'PARTIAL', 'OVERDUE']

export const Route = createFileRoute('/_owner/payments')({
  component: PaymentsPage,
})

function PaymentsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [month, setMonth] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editPayment, setEditPayment] = useState<string | undefined>()
  const deletePayment = useDeletePayment()

  const { data, isLoading } = usePayments({
    page,
    limit: 15,
    status: status || undefined,
    month: month || undefined,
  })

  return (
    <PageTransition>
      <PageShell
        title="Payments"
        subtitle="Every rent collection — filter by status or month, record and reconcile."
        action={
          <Button onClick={() => { setEditPayment(undefined); setDialogOpen(true) }}>
            <Plus weight="bold" size={16} /> Record payment
          </Button>
        }
      >
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((s) => (
              <button
                key={s || 'all'}
                onClick={() => { setStatus(s); setPage(1) }}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-all',
                  status === s
                    ? 'bg-owner-accent text-owner-bg'
                    : 'glass-owner text-owner-muted hover:text-owner-text',
                )}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
          <Input
            type="month"
            className="max-w-[180px]"
            value={month}
            onChange={(e) => { setMonth(e.target.value); setPage(1) }}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={CreditCard}
            title="No payments"
            description="Record a payment to track rent collection."
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus weight="bold" size={16} /> Record payment
              </Button>
            }
          />
        ) : (
          <>
            <div className="space-y-2">
              {data.items.map((payment) => (
                <FadeInItem key={payment.id}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-owner rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <StatusBadge status={payment.status} type="payment" />
                        <span className="text-xs text-owner-muted">
                          Due {formatDate(payment.due_date)}
                        </span>
                      </div>
                      <p className="text-sm text-owner-muted">Lease {payment.lease_id.slice(0, 8)}…</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-owner-muted">Due / Paid</p>
                        <p className="font-semibold">
                          {formatCurrency(payment.amount_paid)}{' '}
                          <span className="text-owner-muted font-normal">
                            / {formatCurrency(payment.amount_due)}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditPayment(payment.id)
                            setDialogOpen(true)
                          }}
                        >
                          <PencilSimple weight="regular" size={16} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash weight="regular" size={16} className="text-danger" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete payment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the payment record.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePayment.mutate(payment.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </motion.div>
                </FadeInItem>
              ))}
            </div>
            <Pagination page={data.page} pages={data.pages} total={data.total} onPageChange={setPage} />
          </>
        )}
      </PageShell>

      <PaymentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        paymentId={editPayment}
      />
    </PageTransition>
  )
}
