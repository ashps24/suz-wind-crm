import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EnvironmentView } from './environment-view'

export const metadata: Metadata = {
  title: 'Environment',
  description:
    'Environmental intelligence — weather, cyclones, earthquakes, tsunami advisories, lightning and flood risk against the wind fleet.',
}

export default function EnvironmentPage() {
  return (
    <Suspense fallback={null}>
      <EnvironmentView />
    </Suspense>
  )
}
