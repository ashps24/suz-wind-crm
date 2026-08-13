import type { Metadata } from 'next'
import { OpportunitiesView } from './opportunities-view'

export const metadata: Metadata = {
  title: 'Opportunities',
  description: 'Wind pipeline from lead to award, with capacity, value and technical risk.',
}

export default function OpportunitiesPage() {
  return <OpportunitiesView />
}
