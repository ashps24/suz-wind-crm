import type { Metadata } from 'next'
import { AdminView } from './admin-view'

export const metadata: Metadata = {
  title: 'Administration',
  description: 'Users, roles, permissions, notifications, integrations and display preferences.',
}

export default function AdminPage() {
  return <AdminView />
}
