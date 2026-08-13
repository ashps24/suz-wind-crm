'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

export function CrmRedirect() {
  const router = useRouter()

  React.useEffect(() => {
    router.replace('/crm/accounts')
  }, [router])

  return (
    <div className="flex h-full items-center justify-center p-10">
      <p className="text-[13px] text-[var(--ink-muted)]">Opening Accounts…</p>
    </div>
  )
}
