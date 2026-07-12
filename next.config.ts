import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Slice 8: the formateur émargement surface is a PWA.
  // Offline is ARCHITECTURAL, not a feature. Service worker + IndexedDB.
  // See AGENTS.md §6.
}

export default nextConfig
