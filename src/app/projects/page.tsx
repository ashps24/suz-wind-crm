import type { Metadata } from 'next'
import { ProjectsView } from './projects-view'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'EPC, repowering, hybrid and O&M transition projects with milestones, risk and delay exposure.',
}

export default function ProjectsPage() {
  return <ProjectsView />
}
