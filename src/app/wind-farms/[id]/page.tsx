import type { Metadata } from 'next'
import { Suspense } from 'react'
import { windFarms } from '@/lib/mocks/fleet'
import { WindFarmWorkspace } from './workspace'

export function generateStaticParams() {
  return windFarms.map((farm) => ({ id: farm.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const farm = windFarms.find((f) => f.id === id)
  return {
    title: farm?.name ?? 'Wind farm',
    description: farm
      ? `${farm.installedMw} MW across ${farm.turbineCount} turbines in ${farm.district}, ${farm.state}.`
      : undefined,
  }
}

export default async function WindFarmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <WindFarmWorkspace id={id} />
    </Suspense>
  )
}
