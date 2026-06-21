import { Link } from '@tanstack/react-router'
import { Buildings } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export function BrandLogo({
  variant = 'owner',
  size = 'md',
  linkTo = '/',
  showText = true,
}: {
  variant?: 'owner' | 'tenant' | 'landing'
  size?: 'sm' | 'md' | 'lg'
  linkTo?: string
  showText?: boolean
}) {
  const sizes = {
    sm: { box: 'h-7 w-7', icon: 16, text: 'text-base' },
    md: { box: 'h-9 w-9', icon: 20, text: 'text-lg' },
    lg: { box: 'h-11 w-11', icon: 24, text: 'text-xl' },
  }[size]

  const accent =
    variant === 'tenant'
      ? 'bg-tenant-accent shadow-[0_0_24px_-4px_rgba(13,148,136,0.5)]'
      : variant === 'landing'
        ? 'bg-gradient-to-br from-[#3b82f6] to-[#6366f1] shadow-[0_0_32px_-6px_rgba(59,130,246,0.55)]'
        : 'bg-owner-accent shadow-[0_0_24px_-4px_rgba(59,130,246,0.45)]'

  const content = (
    <span className="inline-flex items-center gap-2.5 group">
      <span
        className={cn(
          'flex items-center justify-center rounded-xl text-white transition-transform group-hover:scale-105',
          sizes.box,
          accent,
        )}
      >
        <Buildings weight="duotone" size={sizes.icon} />
      </span>
      {showText && (
        <span className={cn(
          'font-semibold tracking-tight',
          sizes.text,
          variant === 'tenant' ? 'text-tenant-text' : 'text-white',
        )}>RentEase</span>
      )}
    </span>
  )

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex">
        {content}
      </Link>
    )
  }

  return content
}
