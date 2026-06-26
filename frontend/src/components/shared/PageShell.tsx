import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function PageShell({
  title,
  subtitle,
  action,
  children,
  variant = 'owner',
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  variant?: 'owner' | 'tenant'
}) {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1
            className={cn(
              'text-3xl md:text-4xl font-semibold tracking-tight',
              variant === 'owner' ? 'text-gradient-owner' : 'text-gradient-tenant',
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'mt-2 text-base max-w-xl leading-relaxed',
                variant === 'owner' ? 'text-owner-muted' : 'text-tenant-muted',
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </motion.div>
      {children}
    </div>
  )
}

export function PageSection({
  title,
  children,
  variant = 'owner',
}: {
  title?: string
  children: React.ReactNode
  variant?: 'owner' | 'tenant'
}) {
  return (
    <section className="space-y-4">
      {title && (
        <h2
          className={cn(
            'text-sm font-semibold uppercase tracking-wider',
            variant === 'owner' ? 'text-owner-muted' : 'text-tenant-muted',
          )}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
