import { cn } from '@/lib/utils'
import { paymentStatusLabel, leaseStatusLabel, unitStatusLabel } from '@/lib/formatters'

type StatusType = 'lease' | 'payment' | 'unit'

const styles: Record<string, string> = {
  ACTIVE: 'border-l-success bg-success/10 text-success',
  EXPIRED: 'border-l-[#78716c] bg-[#78716c]/10 text-[#78716c]',
  TERMINATED: 'border-l-danger bg-danger/10 text-danger',
  PENDING: 'border-l-warning bg-warning/10 text-warning',
  PAID: 'border-l-success bg-success/10 text-success',
  PARTIAL: 'border-l-info bg-info/10 text-info',
  OVERDUE: 'border-l-danger bg-danger/10 text-danger',
  VACANT: 'border-l-info bg-info/10 text-info',
  OCCUPIED: 'border-l-success bg-success/10 text-success',
  MAINTENANCE: 'border-l-warning bg-warning/10 text-warning',
}

function getLabel(status: string, type: StatusType) {
  if (type === 'lease') return leaseStatusLabel[status] ?? status
  if (type === 'payment') return paymentStatusLabel[status] ?? status
  return unitStatusLabel[status] ?? status
}

export function StatusBadge({
  status,
  type = 'payment',
  className,
}: {
  status: string
  type?: StatusType
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border-l-[3px] px-2.5 py-1 text-xs font-medium uppercase tracking-wide',
        styles[status] ?? 'border-l-[#78716c] bg-[#78716c]/10 text-[#78716c]',
        className,
      )}
    >
      {getLabel(status, type)}
    </span>
  )
}
