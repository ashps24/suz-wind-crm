import type { Metadata } from 'next'
import { AccountsView } from './accounts-view'

export const metadata: Metadata = {
  title: 'Accounts',
  description: 'Customer organisations with installed base, service exposure and relationship health.',
}

export default function AccountsPage() {
  return <AccountsView />
}
