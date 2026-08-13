import type { Metadata } from 'next'
import { Suspense } from 'react'
import { FieldServiceView } from './field-service-view'

export const metadata: Metadata = {
  title: 'Field Service',
  description: 'Technician workspace — today’s jobs, turbine context, safety notes, checklists and evidence capture.',
}

export default function FieldServicePage() {
  return (
    <Suspense fallback={null}>
      <FieldServiceView />
    </Suspense>
  )
}
