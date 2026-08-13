import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTurbine } from '@/lib/mocks/fleet'
import { TurbineTwin } from './turbine-twin'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const turbine = getTurbine(id)
  return {
    title: turbine?.name ?? 'Turbine',
    description: turbine
      ? `${turbine.product} at ${turbine.windFarmName} — live status, telemetry, component health and service history.`
      : undefined,
  }
}

export default async function TurbinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <TurbineTwin id={id} />
    </Suspense>
  )
}
