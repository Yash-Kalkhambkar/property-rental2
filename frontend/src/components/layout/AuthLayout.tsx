import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { CheckCircle } from '@phosphor-icons/react'
import { AppBackground } from '@/components/shared/AppBackground'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { cn } from '@/lib/utils'

const trustItems = [
  'Secure, role-based sign-in',
  'Encrypted session tokens',
  'Separate owner & resident portals',
]

export function AuthLayout({
  children,
  variant = 'owner',
  title,
  subtitle,
  footer,
  sidebarExtra,
}: {
  children: React.ReactNode
  variant?: 'owner' | 'tenant'
  title: string
  subtitle: string
  footer?: React.ReactNode
  sidebarExtra?: React.ReactNode
}) {
  const isOwner = variant === 'owner'

  return (
    <div
      className={cn(
        'relative min-h-screen flex',
        isOwner ? 'mesh-owner text-owner-text' : 'mesh-tenant text-tenant-text',
      )}
    >
      <AppBackground variant={isOwner ? 'auth-owner' : 'auth-tenant'} />

      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 xl:p-16',
          isOwner ? 'border-r border-white/[0.06]' : 'border-r border-tenant-border',
        )}
      >
        <BrandLogo variant={variant} linkTo="/" size="md" />

        <div className="space-y-6 max-w-md">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.55 }}
            className={cn(
              'text-4xl xl:text-[2.75rem] font-semibold leading-[1.1] tracking-tight',
              isOwner ? 'text-gradient-owner' : 'text-gradient-tenant',
            )}
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.55 }}
            className={cn(
              'text-base leading-relaxed',
              isOwner ? 'text-owner-muted' : 'text-tenant-muted',
            )}
          >
            {subtitle}
          </motion.p>

          <ul className="mt-8 space-y-3">
            {trustItems.map((item, i) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.08 }}
                className={cn(
                  'flex items-center gap-3 text-sm',
                  isOwner ? 'text-owner-muted' : 'text-tenant-muted',
                )}
              >
                <CheckCircle
                  weight="duotone"
                  size={18}
                  className={isOwner ? 'text-owner-accent' : 'text-tenant-accent'}
                />
                {item}
              </motion.li>
            ))}
          </ul>
        </div>

        {sidebarExtra && (
          <div className="max-w-md">
            {sidebarExtra}
          </div>
        )}

        <p className={cn('text-xs', isOwner ? 'text-owner-muted/70' : 'text-tenant-muted')}>
          © {new Date().getFullYear()} RentEase
        </p>
      </motion.div>

      <div className="relative z-10 flex flex-1 items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'w-full max-w-md rounded-2xl p-8 sm:p-10',
            isOwner ? 'glass-owner' : 'glass-tenant',
          )}
        >
          <div className="lg:hidden mb-8">
            <BrandLogo variant={variant} linkTo="/" size="sm" />
          </div>
          {children}
          {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
        </motion.div>
      </div>
    </div>
  )
}
