import type { Metadata } from 'next'
import { getWorkOrder } from '@/lib/mocks/maintenance'
import { WorkOrderDetail } from './work-order-detail'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const order = getWorkOrder(id)
  return {
    title: order ? `${order.id} · ${order.title}` : 'Work order',
    description: order?.description,
  }
}

export default async function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <WorkOrderDetail id={id} />
}
