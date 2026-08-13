import type { Metadata } from 'next'
import { ReportsView } from './reports-view'

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Fleet availability, generation, maintenance, projects, customer, ESG and carbon reporting.',
}

export default function ReportsPage() {
  return <ReportsView />
}
