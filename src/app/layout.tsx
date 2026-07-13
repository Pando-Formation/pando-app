import type { Metadata, Viewport } from 'next'
import { Agentation } from 'agentation'
import './globals.css'

export const metadata: Metadata = {
  title: 'PANDO',
  description: 'Système de gestion des formations PANDO',
}

// Slice 8: the formateur émargement surface is a PWA — offline is architectural.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0b0e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && <Agentation endpoint="http://localhost:4747" />}
      </body>
    </html>
  )
}
