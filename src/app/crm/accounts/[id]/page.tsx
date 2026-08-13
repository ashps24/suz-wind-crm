import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getAccount } from '@/lib/mocks/crm'
import { AccountWorkspace } from './workspace'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const account = getAccount(id)
  return {
    title: account?.name ?? 'Account',
    description: account ? `${account.type} · ${account.installedMw} MW installed · ${account.headquarters}` : undefined,
  }
}

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <AccountWorkspace id={id} />
    </Suspense>
  )
}
