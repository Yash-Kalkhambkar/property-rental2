import { cn } from '@/lib/utils'

type BackgroundVariant = 'owner' | 'tenant' | 'auth-owner' | 'auth-tenant'

export function AppBackground({
  variant,
  className,
}: {
  variant: BackgroundVariant
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}
    >
      {variant === 'owner' || variant === 'auth-owner' ? (
        <>
          <div className="absolute inset-0 bg-owner-bg" />
          <div className="bg-blob bg-blob-owner-1" />
          <div className="bg-blob bg-blob-owner-2" />
          <div className="bg-blob bg-blob-owner-3" />
          <div className="bg-grid-owner absolute inset-0 opacity-[0.35]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-tenant-bg" />
          <div className="bg-blob bg-blob-tenant-1" />
          <div className="bg-blob bg-blob-tenant-2" />
          <div className="bg-grid-tenant absolute inset-0 opacity-40" />
        </>
      )}
    </div>
  )
}

export function LandingBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Fallback colour while video loads */}
      <div className="absolute inset-0 bg-[#060a14]" />

      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        disablePictureInPicture
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/i_would_like_u_to_animate_this.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay — keeps text readable and blends into page */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#060a14]/70 via-[#060a14]/55 to-[#060a14]" />

      {/* Subtle vignette on the sides */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_40%,rgba(6,10,20,0.55)_100%)]" />

      {/* Keep the fine grid overlay for texture */}
      <div className="bg-grid-landing absolute inset-0 opacity-30" />
    </div>
  )
}
