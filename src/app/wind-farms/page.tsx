import type { Metadata } from 'next'
import { WindFarmsView } from './wind-farms-view'

export const metadata: Metadata = {
  title: 'Wind Farms',
  description: 'Every monitored wind farm with capacity, availability, generation and risk posture.',
}

export default function WindFarmsPage() {
  return <WindFarmsView />
}
