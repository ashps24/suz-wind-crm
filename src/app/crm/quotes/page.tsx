import type { Metadata } from 'next'
import { QuotesView } from './quotes-view'

export const metadata: Metadata = {
  title: 'Quotes',
  description: 'Turbine supply, EPC, logistics, installation and service quotations.',
}

export default function QuotesPage() {
  return <QuotesView />
}
