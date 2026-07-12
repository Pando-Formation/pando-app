'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Renders a route's content as a centered overlay instead of a full page.
 * Paired with a Next.js intercepting route (`@modal/(.)...`) — the URL is
 * real and shareable/refreshable as a full page, but navigating to it via a
 * link from within the app shows it as an overlay on top of whatever was
 * already on screen. Dismissing (Escape, backdrop click, close button)
 * returns to that exact page — same tab, same scroll position, nothing
 * re-fetched from scratch.
 *
 * 🔴 `path` MUST be the exact pathname this modal's own intercepting route
 * matches (e.g. `/parcours/${id}/sequences/nouveau`) — passed in, never
 * inferred. Reason: a successful submit calls redirect() inside the Server
 * Action. That updates the browser URL correctly, but Next re-mounts a
 * FRESH instance of this component while still rendering the stale form —
 * confirmed by browser testing, a known rough edge with Server Action
 * redirects and parallel routes. A fresh instance means any "URL at the
 * moment I mounted" comparison is worthless: it mounts AFTER the URL has
 * already moved to the destination, so it never sees a mismatch. Comparing
 * against this fixed, known-correct `path` instead of a captured one closes
 * it correctly regardless of when the remount happens.
 */
export function Modal({ path, children }: { path: string; children: React.ReactNode }) {
  const router = useRouter()
  const [visible, setVisible] = useState(() => typeof window !== 'undefined' && window.location.pathname === path)

  useEffect(() => {
    const check = () => setVisible(window.location.pathname === path)
    check()
    const interval = setInterval(check, 150)
    return () => clearInterval(interval)
  }, [path])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') router.back()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [router])

  // Separate from the listener above: must also release the scroll lock
  // the moment `visible` flips false, not only on unmount — this component
  // stays mounted (returning null) rather than unmounting in the redirect
  // race described above.
  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => router.back()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowY: 'auto',
        padding: 'var(--space-9) var(--space-6)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card card-elevated"
        style={{
          width: '100%',
          maxWidth: 720,
          boxShadow: 'var(--shadow-4)',
          position: 'relative',
          margin: 'auto 0',
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Fermer"
          className="btn btn-sm btn-ghost"
          style={{ position: 'absolute', top: 'var(--space-5)', right: 'var(--space-5)' }}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}
