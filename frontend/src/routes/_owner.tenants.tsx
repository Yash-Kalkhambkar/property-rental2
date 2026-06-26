import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, UsersThree, MagnifyingGlass, Phone, EnvelopeSimple, ArrowUpRight } from '@phosphor-icons/react'
import { PageShell } from '@/components/shared/PageShell'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { FadeInItem, PageTransition, Skeleton } from '@/components/shared/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TenantFormDialog } from '@/components/features/tenants/TenantFormDialog'
import { useTenants } from '@/hooks/owner/useTenants'

export const Route = createFileRoute('/_owner/tenants')({
  component: TenantsPage,
})

function TenantsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isLoading } = useTenants({
    page,
    limit: 12,
    search: debouncedSearch || undefined,
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
    window.clearTimeout((handleSearch as unknown as { t?: number }).t)
    ;(handleSearch as unknown as { t?: number }).t = window.setTimeout(() => {
      setDebouncedSearch(value)
    }, 350)
  }

  return (
    <PageTransition>
      <PageShell
        title="Tenants"
        subtitle="Everyone living across your portfolio — search, manage, and stay connected."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus weight="bold" size={16} /> Add tenant
          </Button>
        }
      >
        <div className="relative mb-6 max-w-md">
          <MagnifyingGlass weight="regular" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-owner-muted" />
          <Input
            className="pl-10"
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={UsersThree}
            title="No tenants found"
            description={
              debouncedSearch
                ? 'Try a different search term.'
                : 'Add tenants to assign them to units and leases.'
            }
            action={
              !debouncedSearch ? (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus weight="bold" size={16} /> Add tenant
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="space-y-3">
              {data.items.map((tenant) => (
                <FadeInItem key={tenant.id}>
                  <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                    <Link
                      to="/tenants/$id"
                      params={{ id: tenant.id }}
                      className="group flex items-center gap-5 glass-owner rounded-2xl p-5 hover:glow-accent transition-all duration-300"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-owner-accent/20 text-owner-accent font-display text-2xl font-semibold">
                        {tenant.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-xl font-semibold group-hover:text-owner-accent transition-colors">
                          {tenant.full_name}
                        </h3>
                        <div className="flex flex-wrap gap-4 mt-1 text-sm text-owner-muted">
                          <span className="flex items-center gap-1">
                            <Phone weight="duotone" size={14} /> {tenant.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <EnvelopeSimple weight="duotone" size={14} /> {tenant.email}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight weight="bold" size={18} className="text-owner-muted group-hover:text-owner-accent transition-colors shrink-0" />
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

      <TenantFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageTransition>
  )
}
