import type { Metadata } from 'next'
import { CrmRedirect } from './crm-redirect'

export const metadata: Metadata = {
  title: 'CRM',
  description: 'Accounts, contacts, opportunities and quotes.',
}

/**
 * `redirect()` is a server response and has no equivalent in a static export,
 * so the landing is performed on the client instead.
 */
export default function CrmIndex() {
  return <CrmRedirect />
}
