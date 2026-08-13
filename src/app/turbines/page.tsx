import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TurbinesView } from './turbines-view'

export const metadata: Metadata = {
  title: 'Turbines',
  description: 'Fleet-wide turbine list with status, output, availability and health scores.',
}

export default function TurbinesPage() {
  return (
    <Suspense fallback={null}>
      <TurbinesView />
    </Suspense>
  )
}
