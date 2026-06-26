import { useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, useInView, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion'
import {
  ArrowRight, Buildings, ChartLineUp, CreditCard, House,
  Lightbulb, ShieldCheck, UsersThree, Robot, EnvelopeSimple,
} from '@phosphor-icons/react'
import { LandingBackground } from '@/components/shared/AppBackground'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { cn } from '@/lib/utils'

const ease = [0.22, 1, 0.36, 1] as const

// ── Data ──────────────────────────────────────────────────────────────────────

const features = [
  { icon: ChartLineUp, title: 'Portfolio dashboard', description: 'Occupancy, revenue, and overdue accounts in one view — no spreadsheet juggling.' },
  { icon: UsersThree, title: 'Tenant management', description: 'Profiles, leases, and contact details linked to each unit across all your properties.' },
  { icon: CreditCard, title: 'Payment tracking', description: 'Record collections, flag overdue rent, and reconcile expected vs collected monthly.' },
  { icon: ShieldCheck, title: 'Separate resident access', description: 'Tenants see only their leases and payments. Owners keep full portfolio control.' },
  { icon: Robot, title: 'AI chat assistant', description: 'Context-aware Groq LLaMA chatbot — different personas for owners and residents.' },
  { icon: EnvelopeSimple, title: 'Email notifications', description: 'Automated alerts for overdue rent, lease confirmations, receipts, and resets.' },
]

const steps = [
  { step: '01', title: 'Create your owner account', description: 'Register, add properties and units, then connect tenants when leases are ready.' },
  { step: '02', title: 'Set up leases & payments', description: 'Record rent amounts, due dates, and terms. Track collections as they come in.' },
  { step: '03', title: 'Residents sign in separately', description: 'Tenants use their own portal — fully isolated from your owner data and other units.' },
]

const insights = [
  { tag: 'Market insight', icon: Lightbulb, title: 'Vacancy costs more than you think', body: 'One empty month on ₹25,000 rent is ₹25,000 gone — plus upkeep. Tracking vacancy early lets you act before gaps widen.' },
  { tag: 'Best practice', icon: ShieldCheck, title: 'Document everything at move-in', body: 'Lease terms, deposits, and unit condition notes stored digitally prevent disputes months later.' },
  { tag: 'Collection tip', icon: CreditCard, title: 'Remind before the due date', body: 'A reminder 3 days before rent is due cuts late payments significantly. RentEase surfaces overdue accounts automatically.' },
]

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Tracks mouse position and returns normalised -0.5..0.5 values */
function useMouseParallax() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  useEffect(() => {
    const move = (e: MouseEvent) => {
      x.set((e.clientX / window.innerWidth) - 0.5)
      y.set((e.clientY / window.innerHeight) - 0.5)
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [x, y])
  return { x, y }
}

// ── Reveal wrapper ────────────────────────────────────────────────────────────

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Animated gradient text ────────────────────────────────────────────────────

function GradientText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('animated-gradient-text', className)}>
      {children}
    </span>
  )
}

// ── 3D tilt card (VR depth illusion) ─────────────────────────────────────────

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 })
  const glowX = useMotionValue(50)
  const glowY = useMotionValue(50)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = (e.clientX - rect.left) / rect.width - 0.5
    const cy = (e.clientY - rect.top) / rect.height - 0.5
    rotateX.set(-cy * 18)
    rotateY.set(cx * 18)
    glowX.set((cx + 0.5) * 100)
    glowY.set((cy + 0.5) * 100)
  }
  const onLeave = () => { rotateX.set(0); rotateY.set(0) }

  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 800 }}
      className={cn('relative cursor-default', className)}
    >
      {/* Radial glow that follows cursor */}
      <motion.div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: useTransform([glowX, glowY], ([gx, gy]) => `radial-gradient(circle at ${gx}% ${gy}%, rgba(59,130,246,0.18) 0%, transparent 65%)`) }}
      />
      {children}
    </motion.div>
  )
}

// ── Portal entry card ─────────────────────────────────────────────────────────

function PortalCard({ variant, title, description, href, icon: Icon }:
  { variant: 'owner' | 'tenant'; title: string; description: string; href: string; icon: React.ComponentType<{ weight?: 'duotone'; size?: number; className?: string }> }) {
  const isOwner = variant === 'owner'
  return (
    <Link to={href} className={cn('group relative landing-glass flex flex-1 flex-col rounded-2xl p-6 transition-all duration-300 overflow-hidden',
      isOwner ? 'hover:border-[#3b82f6]/40 hover:shadow-[0_0_60px_-10px_rgba(59,130,246,0.4)]'
               : 'hover:border-[#5eead4]/30 hover:shadow-[0_0_60px_-10px_rgba(13,148,136,0.3)]')}>
      {/* Shimmer sweep on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent skew-x-12 pointer-events-none" />
      <div className={cn('mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
        isOwner ? 'bg-[#3b82f6]/15 text-[#93c5fd]' : 'bg-[#0d9488]/15 text-[#5eead4]')}>
        <Icon weight="duotone" size={22} />
      </div>
      <h3 className="mt-1 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-200">{description}</p>
      <span className={cn('mt-5 inline-flex items-center gap-1.5 text-sm font-medium', isOwner ? 'text-[#93c5fd]' : 'text-[#5eead4]')}>
        Sign in
        <ArrowRight weight="bold" size={14} className="transition-transform group-hover:translate-x-1.5" />
      </span>
    </Link>
  )
}

// ── Feature preview card ───────────────────────────────────────────────────────

function DashboardWidget() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  const highlights = [
    { icon: ChartLineUp, label: 'Occupancy at a glance', sub: 'See which units are vacant right now' },
    { icon: CreditCard,  label: 'Rent collection',       sub: 'Track paid, pending, and overdue' },
    { icon: UsersThree,  label: 'Tenant profiles',        sub: 'Contacts, leases, and ID docs in one place' },
    { icon: ShieldCheck, label: 'Resident portal',        sub: 'Tenants see only their own data' },
  ]

  return (
    <TiltCard className="group">
      <div ref={ref} className="landing-glass relative rounded-2xl p-6 overflow-hidden">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-[#3b82f6]/20 blur-2xl animate-pulse" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300 mb-5">
          Everything in one place
        </p>
        <div className="space-y-3">
          {highlights.map(({ icon: Icon, label, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: 16 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3.5 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 hover:bg-white/[0.09] transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3b82f6]/15 text-[#93c5fd]">
                <Icon weight="duotone" size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-white leading-tight">{label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </TiltCard>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function LandingPage() {
  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60])
  const { x: mx, y: my } = useMouseParallax()
  const navBg = useTransform(scrollYProgress, [0, 0.05], ['rgba(6,10,20,0)', 'rgba(6,10,20,0.85)'])

  // Parallax layers at different depths
  const layer1x = useTransform(mx, v => v * -18)
  const layer1y = useTransform(my, v => v * -18)
  const layer2x = useTransform(mx, v => v * 10)
  const layer2y = useTransform(my, v => v * 10)

  return (
    <div className="relative min-h-screen text-[#e2e8f0] overflow-x-hidden">
      <LandingBackground />

      {/* ── Sticky nav ───────────────────────────────────────────────────────── */}
      <motion.header style={{ background: navBg }}
        className="sticky top-0 z-50 border-b border-white/[0.05] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
          <BrandLogo variant="landing" linkTo="/" />
          <nav className="hidden items-center gap-8 text-sm text-slate-200 sm:flex">
            {[['#features','Features'],['#insights','Insights'],['#how-it-works','How it works']].map(([href, label]) => (
              <a key={href} href={href} className="relative group transition-colors hover:text-white font-medium">
                {label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-[#3b82f6] to-[#6366f1] transition-all group-hover:w-full" />
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/tenant/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:text-white sm:inline-block">
              Resident login
            </Link>
            <Link to="/login" className="rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#6366f1] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(99,102,241,0.5)] transition-all hover:shadow-[0_0_36px_-4px_rgba(99,102,241,0.7)] hover:scale-105">
              Owner login
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-white/[0.04] min-h-[92vh] flex items-center">
        <motion.div style={{ y: heroY }} className="mx-auto max-w-6xl px-6 py-20 sm:px-8 w-full">
          <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <Reveal>
                {/* Pill badge */}
                <motion.span
                  animate={{ boxShadow: ['0 0 0 0 rgba(59,130,246,0)', '0 0 0 8px rgba(59,130,246,0.1)', '0 0 0 0 rgba(59,130,246,0)'] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/25 bg-[#3b82f6]/08 px-3 py-1 text-xs font-medium text-[#93c5fd]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
                  Property rental management · India
                </motion.span>

                <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.07] tracking-tight sm:text-5xl lg:text-[3.6rem]">
                  Run your rentals with{' '}
                  <GradientText>clarity, not chaos.</GradientText>
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-200">
                  One workspace for owners. One calm portal for residents. Leases, tenants,
                  and payments — finally in one place.
                </p>
              </Reveal>

              <Reveal delay={0.12} className="mt-10 flex flex-col gap-4 sm:flex-row">
                <PortalCard variant="owner" title="Owner portal" description="Manage properties, leases, tenants, and collections." href="/login" icon={Buildings} />
                <PortalCard variant="tenant" title="Resident portal" description="View leases, payments, and your rental profile." href="/tenant/login" icon={House} />
              </Reveal>
            </div>

            {/* 3D depth widget — right side */}
            <Reveal delay={0.18} className="hidden lg:block">
              <motion.div style={{ x: layer1x, y: layer1y }}>
                <DashboardWidget />
              </motion.div>
            </Reveal>
          </div>

          {/* Scroll indicator */}
          <Reveal delay={0.3} className="mt-16 flex flex-col items-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Explore</p>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-3 h-12 w-px bg-gradient-to-b from-[#3b82f6] via-[#6366f1] to-transparent" />
          </Reveal>
        </motion.div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" className="relative border-b border-white/[0.04] py-24 sm:py-32">
        <motion.div style={{ x: layer2x, y: layer2y }} className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#6366f1]/8 blur-[120px]" />
        </motion.div>
        <div className="relative mx-auto max-w-6xl px-6 sm:px-8">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#93c5fd]">Features</p>
            <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for how rentals{' '}
              <GradientText>actually work</GradientText>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.06}>
                <TiltCard className="group h-full">
                  <article className="landing-section-card relative h-full rounded-2xl p-6 transition-all duration-300 overflow-hidden hover:border-[#3b82f6]/30 hover:shadow-[0_8px_40px_-12px_rgba(59,130,246,0.3)]">
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent skew-x-12 pointer-events-none" />
                    <div className="icon-chip-owner mb-5 h-11 w-11 transition-all group-hover:scale-110 group-hover:shadow-[0_0_20px_-4px_rgba(59,130,246,0.5)]">
                      <feature.icon weight="duotone" size={22} />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-200">{feature.description}</p>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Insights ─────────────────────────────────────────────────────────── */}
      <section id="insights" className="relative border-b border-white/[0.04] py-24 sm:py-32" style={{ background: 'linear-gradient(180deg,#0f172a 0%,#0a0f1a 100%)' }}>
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#5eead4]">Insights</p>
            <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
              Smarter rental{' '}
              <GradientText>decisions</GradientText>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {insights.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <TiltCard className="group h-full">
                  <article className="landing-section-card relative flex h-full flex-col rounded-2xl p-6 overflow-hidden transition-all hover:border-[#5eead4]/20 hover:shadow-[0_8px_40px_-12px_rgba(13,148,136,0.25)]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-white/[0.12] bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-slate-200">{item.tag}</span>
                      <item.icon weight="duotone" size={20} className="text-[#5eead4]" />
                    </div>
                    <h3 className="mt-5 text-base font-semibold leading-snug text-white">{item.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-200">{item.body}</p>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative border-b border-white/[0.04] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#93c5fd]">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Up and running in{' '}
              <GradientText>three steps</GradientText>
            </h2>
          </Reveal>
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((item, i) => (
              <Reveal key={item.step} delay={i * 0.1}>
                <TiltCard className="group h-full">
                  <li className="landing-section-card relative h-full rounded-2xl p-7 overflow-hidden transition-all hover:border-[#3b82f6]/25 hover:shadow-[0_8px_40px_-12px_rgba(59,130,246,0.25)]">
                    {/* Step number — large behind content */}
                    <span className="absolute -top-4 -right-2 text-[7rem] font-black text-white/[0.03] select-none leading-none">
                      {item.step}
                    </span>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6]/25 to-[#6366f1]/15 text-lg font-bold text-[#93c5fd] ring-1 ring-[#3b82f6]/20 transition-all group-hover:ring-[#3b82f6]/50 group-hover:shadow-[0_0_20px_-4px_rgba(59,130,246,0.4)]">
                      {item.step}
                    </div>
                    <h3 className="relative mt-5 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="relative mt-2 text-sm leading-relaxed text-slate-200">{item.description}</p>
                  </li>
                </TiltCard>
              </Reveal>
            ))}
          </ol>
          {/* Connector line between steps on desktop */}
          <div className="hidden md:block relative mt-0 -mt-[calc(50%+2rem)] pointer-events-none" aria-hidden>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        {/* Deep glow behind CTA */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#3b82f6]/12 via-[#6366f1]/6 to-transparent pointer-events-none" />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[#6366f1]/20 blur-[100px] pointer-events-none"
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center sm:px-8">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Ready to simplify<br />
              <GradientText>your rentals?</GradientText>
            </h2>
            <p className="mt-5 text-lg text-slate-200 max-w-xl mx-auto">
              Join property owners managing their portfolio with clarity — not chaos.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register"
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#6366f1] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(99,102,241,0.6)] transition-all hover:shadow-[0_0_56px_-6px_rgba(99,102,241,0.8)] hover:scale-105 sm:w-auto">
                <span className="relative">Create owner account →</span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
              </Link>
              <Link to="/tenant/login"
                className="w-full rounded-xl border border-white/[0.15] px-7 py-3.5 text-sm font-medium text-slate-200 transition-all hover:border-white/30 hover:text-white hover:bg-white/[0.05] sm:w-auto">
                Resident sign in
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] bg-[#060a14]/80 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-400 sm:flex-row sm:px-8">
          <BrandLogo variant="landing" linkTo="/" size="sm" />
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-white transition-colors">Owner portal</Link>
            <Link to="/tenant/login" className="hover:text-white transition-colors">Resident portal</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
          <span>© {new Date().getFullYear()} RentEase</span>
        </div>
      </footer>
    </div>
  )
}
