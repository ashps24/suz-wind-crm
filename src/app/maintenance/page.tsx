import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MaintenanceView } from './maintenance-view'

export const metadata: Metadata = {
  title: 'Maintenance',
  description: 'Work orders, service calendar, preventive matrix and the overdue queue.',
}

export default function MaintenancePage() {
  return (
    <Suspense fallback={null}>
      <MaintenanceView />
    </Suspense>
  )
}
