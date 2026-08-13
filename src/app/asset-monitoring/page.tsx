import type { Metadata } from 'next'
import { AssetMonitoringView } from './asset-monitoring-view'

export const metadata: Metadata = {
  title: 'Asset Monitoring',
  description: 'Fleet health — availability, downtime, MTBF, MTTR, generation, performance ratio and alarms.',
}

export default function AssetMonitoringPage() {
  return <AssetMonitoringView />
}
