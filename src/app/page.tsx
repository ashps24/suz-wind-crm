import type { Metadata } from 'next'
import { CommandCenterView } from './command-center/command-center-view'

export const metadata: Metadata = {
  title: 'Command Center',
  description:
    'Live geospatial view of the Suzlon wind fleet — turbine health, environmental risk, field teams and AI-generated operational priorities.',
}

/**
 * The root renders the Command Center directly rather than redirecting to it.
 *
 * On Catalyst Slate the root document is what every unmatched path is served,
 * and the deep-link resolver replays the requested route from there. A redirect
 * on `/` would fire first and strand the visitor on the Command Center whatever
 * they actually asked for.
 */
export default function Home() {
  return <CommandCenterView />
}
