import type { Metadata } from 'next'
import { CommandCenterView } from './command-center-view'

export const metadata: Metadata = {
  title: 'Command Center',
  description:
    'Live geospatial view of the Suzlon wind fleet — turbine health, environmental risk, field teams and AI-generated operational priorities.',
}

export default function CommandCenterPage() {
  return <CommandCenterView />
}
