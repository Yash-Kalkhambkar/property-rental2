import { Link, useRouterState } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Buildings,
  ChartPie,
  CreditCard,
  FileText,
  List,
  SignOut,
  UsersThree,
  X,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { AppBackground } from '@/components/shared/AppBackground'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { AiChat } from '@/components/shared/AiChat'
import { Button } from '@/components/ui/button'
import { useOwnerAuthStore } from '@/stores/ownerAuthStore'
import { useOwnerLogout } from '@/hooks/owner/useAuth'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: ChartPie },
  { to: '/properties', label: 'Properties', icon: Buildings },
  { to: '/tenants', label: 'Tenants', icon: UsersThree },
  { to: '/leases', label: 'Leases', icon: FileText },
  { to: '/payments', label: 'Payments', icon: CreditCard },
] as const

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const owner = useOwnerAuthStore((s) => s.owner)
  const accessToken = useOwnerAuthStore((s) => s.accessToken)
  const logout = useOwnerLogout()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!mobileOpen) return
    function handleClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mobileOpen])

  return (
    <div className="mesh-owner min-h-screen flex">
      <AppBackground variant="owner" />

      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-60">
        <div className="flex flex-col w-full m-3 rounded-2xl glass-owner overflow-hidden">
          <div className="p-5 border-b border-white/[0.06]">
            <BrandLogo variant="owner" linkTo="/dashboard" size="sm" />
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const active =
                item.to === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'text-owner-accent'
                      : 'text-owner-muted hover:text-owner-text hover:bg-owner-elevated',
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="owner-nav-active"
                      className="absolute inset-0 rounded-xl bg-owner-accent-soft border border-owner-accent/20"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon weight={active ? 'duotone' : 'regular'} size={20} className="relative shrink-0" />
                  <span className="relative">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-owner-accent/20 text-owner-accent text-sm font-semibold ring-1 ring-owner-accent/30">
                {owner?.full_name?.charAt(0) ?? 'O'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{owner?.full_name}</p>
                <p className="text-xs text-owner-muted truncate">{owner?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-owner-muted"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <SignOut weight="regular" size={16} /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50" ref={mobileMenuRef}>
        <div className="glass-owner mx-3 mt-3 rounded-xl px-4 py-3 flex items-center justify-between">
          <BrandLogo variant="owner" linkTo="/dashboard" size="sm" />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X weight="bold" size={20} /> : <List weight="bold" size={20} />}
          </Button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-3 mt-1 glass-owner rounded-xl p-4"
            >
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-owner-muted hover:text-owner-text hover:bg-owner-elevated"
                  >
                    <item.icon weight="duotone" size={20} /> {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => logout.mutate()}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-danger"
                >
                  <SignOut size={18} /> Sign out
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <main className="relative z-10 flex-1 lg:ml-64 pt-20 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-10 max-w-[1400px]">{children}</div>
      </main>

      <AiChat portal="owner" token={accessToken} userId={owner?.id ?? null} />
    </div>
  )
}
