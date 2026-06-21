import { Link, useRouterState } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  Buildings,
  CreditCard,
  FileText,
  House,
  SignOut,
  User,
} from '@phosphor-icons/react'
import { AppBackground } from '@/components/shared/AppBackground'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { AiChat } from '@/components/shared/AiChat'
import { Button } from '@/components/ui/button'
import { useTenantAuthStore } from '@/stores/tenantAuthStore'
import { useTenantLogout } from '@/hooks/tenant/useAuth'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/tenant', label: 'Home', icon: House },
  { to: '/tenant/leases', label: 'Leases', icon: FileText },
  { to: '/tenant/payments', label: 'Payments', icon: CreditCard },
  { to: '/tenant/properties', label: 'Properties', icon: Buildings },
  { to: '/tenant/profile', label: 'Profile', icon: User },
] as const

export function TenantShell({ children }: { children: React.ReactNode }) {
  const tenant = useTenantAuthStore((s) => s.tenant)
  const accessToken = useTenantAuthStore((s) => s.accessToken)
  const logout = useTenantLogout()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="mesh-tenant min-h-screen flex flex-col">
      <AppBackground variant="tenant" />

      <header className="hidden md:block sticky top-0 z-40 mx-4 mt-4">
        <div className="glass-tenant rounded-2xl px-5 py-3.5 flex items-center justify-between max-w-6xl mx-auto">
          <BrandLogo variant="tenant" linkTo="/tenant" size="sm" />

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active =
                item.to === '/tenant'
                  ? pathname === '/tenant'
                  : pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'text-tenant-accent'
                      : 'text-tenant-muted hover:text-tenant-text hover:bg-tenant-accent/5',
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="tenant-nav-active"
                      className="absolute inset-0 rounded-xl bg-tenant-accent-soft"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon
                    weight={active ? 'duotone' : 'regular'}
                    size={18}
                    className="relative shrink-0"
                  />
                  <span className="relative hidden lg:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden xl:block">
              <p className="text-sm font-medium text-tenant-text">{tenant?.full_name}</p>
              <p className="text-xs text-tenant-muted">{tenant?.email}</p>
            </div>
            <Button
              variant="tenant-secondary"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <SignOut weight="regular" size={16} /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 pb-24 md:pb-8 pt-4 md:pt-2">
        <div className="px-4 sm:px-6 max-w-6xl mx-auto">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-tenant border-t border-tenant-border safe-area-pb">
        <div className="flex items-center justify-around px-1 py-1.5">
          {navItems.map((item) => {
            const active =
              item.to === '/tenant' ? pathname === '/tenant' : pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 min-w-[52px]',
                  active ? 'text-tenant-accent' : 'text-tenant-muted',
                )}
              >
                <item.icon weight={active ? 'duotone' : 'regular'} size={22} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 glass-tenant border-b border-tenant-border px-4 py-3 flex items-center justify-between">
        <BrandLogo variant="tenant" linkTo="/tenant" size="sm" />
        <span className="text-sm text-tenant-muted">{tenant?.full_name?.split(' ')[0]}</span>
      </div>
      <div className="md:hidden h-14" />

      {/* AI Chat — positioned above bottom nav on mobile */}
      <AiChat portal="tenant" token={accessToken} userId={tenant?.id ?? null} />
    </div>
  )
}
