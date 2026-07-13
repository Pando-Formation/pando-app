import type { ReactNode } from 'react'
import Image from 'next/image'

/**
 * The same image-banner treatment as the dashboard's own header, reused as
 * every page's title band. Content sits full-width so a flex row (title +
 * action button) can justify-between across it, not just stacked text.
 */
export function PageHero({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex overflow-hidden rounded-xl border"
      style={{
        minHeight: 240,
        marginBottom: 'var(--space-9)',
        backgroundColor: 'var(--color-bg-base)',
      }}
    >
      <Image
        src="/dashboard-hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* scrim: guarantees text contrast and blends the image's own edge into
          PANDO's exact --color-bg-base rather than a visible seam */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,11,14,0.15) 0%, rgba(10,11,14,0.55) 55%, var(--color-bg-base) 100%)',
        }}
      />
      <div className="relative z-10 flex w-full flex-col justify-end" style={{ padding: 'var(--space-8)' }}>
        {children}
      </div>
    </div>
  )
}
