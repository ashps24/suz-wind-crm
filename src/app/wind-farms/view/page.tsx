import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LiveSiteView } from './live-site-view'

export const metadata: Metadata = { title: 'Wind farm' }

/**
 * Host page for wind farms created at runtime. Static export only emits
 * documents for compiled-in ids, so live records are viewed here via
 * `?site=<id>` — a path that always exists on the host.
 */
export default function LiveWindFarmPage() {
  return (
    <Suspense fallback={null}>
      <LiveSiteView />
    </Suspense>
  )
}
