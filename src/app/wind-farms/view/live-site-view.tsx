'use client'

import { useSearchParams } from 'next/navigation'
import { WindFarmWorkspace } from '../[id]/workspace'
import { EmptyState } from '@/components/feedback/states'
import { MapTrifold } from '@phosphor-icons/react/dist/ssr'

export function LiveSiteView() {
  const id = useSearchParams().get('site')
  if (!id) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          icon={MapTrifold}
          title="No site selected"
          description="This page shows a wind farm by id — open it from the Wind Farms list."
        />
      </div>
    )
  }
  return <WindFarmWorkspace id={id} />
}
