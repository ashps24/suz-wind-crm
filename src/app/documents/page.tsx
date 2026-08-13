import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DocumentsView } from './documents-view'

export const metadata: Metadata = {
  title: 'Documents',
  description: 'Contracts, EPC documents, drawings, wind reports, inspections, certificates and drone imagery.',
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsView />
    </Suspense>
  )
}
