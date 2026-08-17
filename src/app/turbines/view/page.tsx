import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LiveTurbineView } from './live-turbine-view'

export const metadata: Metadata = { title: 'Turbine' }

/** Host page for turbines belonging to wind farms created at runtime. */
export default function LiveTurbinePage() {
  return (
    <Suspense fallback={null}>
      <LiveTurbineView />
    </Suspense>
  )
}
