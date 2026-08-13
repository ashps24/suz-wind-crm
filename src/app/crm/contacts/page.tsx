import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ContactsView } from './contacts-view'

export const metadata: Metadata = {
  title: 'Contacts',
  description: 'People across customer organisations, with influence, ownership and related records.',
}

export default function ContactsPage() {
  return (
    <Suspense fallback={null}>
      <ContactsView />
    </Suspense>
  )
}
