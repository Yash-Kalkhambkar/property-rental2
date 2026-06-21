import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { UserCircle, ArrowRight } from '@phosphor-icons/react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOwnerLogin } from '@/hooks/owner/useAuth'

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const login = useOwnerLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const tenantInfoPanel = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5 }}
      className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-6 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-owner-accent/15 text-owner-accent shrink-0">
          <UserCircle weight="duotone" size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-owner-text">Tenant portal access</p>
          <p className="text-xs text-owner-muted">How your tenants log in</p>
        </div>
      </div>

      <ol className="space-y-2.5">
        {[
          { step: '1', text: 'You add a tenant under the Tenants tab — set their email and a temporary password.' },
          { step: '2', text: 'Share those credentials with your tenant. They log in at the Resident Portal.' },
          { step: '3', text: 'Tenants can view their lease, track payments, and update their profile independently.' },
        ].map((item) => (
          <li key={item.step} className="flex gap-3 text-xs text-owner-muted">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-owner-accent/20 text-owner-accent font-semibold text-[10px]">
              {item.step}
            </span>
            <span className="leading-relaxed pt-px">{item.text}</span>
          </li>
        ))}
      </ol>

      <Link
        to="/tenant/login"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-owner-accent hover:underline"
      >
        Open resident portal <ArrowRight weight="bold" size={12} />
      </Link>
    </motion.div>
  )

  return (
    <AuthLayout
      variant="owner"
      title="Sign in to your portfolio."
      subtitle="Manage properties, tenants, leases, and payments from one place."
      sidebarExtra={tenantInfoPanel}
      footer={
        <p className="text-owner-muted">
          New here?{' '}
          <Link to="/register" className="text-owner-accent hover:underline font-medium">
            Create an owner account
          </Link>
        </p>
      }
    >
      <h2 className="text-2xl font-semibold mb-1">Owner sign in</h2>
      <p className="text-sm text-owner-muted mb-8">Access your rental portfolio</p>

      <form onSubmit={handleSubmit((v) => login.mutate(v))} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-owner-muted">
        <Link to="/" className="hover:text-owner-accent transition-colors">
          ← Back to home
        </Link>
        {' · '}
        Tenant?{' '}
        <Link to="/tenant/login" className="text-owner-accent hover:underline">
          Resident portal
        </Link>
      </p>
    </AuthLayout>
  )
}
