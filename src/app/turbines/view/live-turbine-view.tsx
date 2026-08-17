'use client'

import { useSearchParams } from 'next/navigation'
import { TurbineTwin } from '../[id]/turbine-twin'
import { EmptyState } from '@/components/feedback/states'
import { Wind } from '@phosphor-icons/react/dist/ssr'

export function LiveTurbineView() {
  const id = useSearchParams().get('t')
  if (!id) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          icon={Wind}
          title="No turbine selected"
          description="This page shows a turbine by id — open it from the fleet list."
        />
      </div>
    )
  }
  return <TurbineTwin id={id} />
}
