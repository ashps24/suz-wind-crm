import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getProject } from '@/lib/mocks/projects'
import { ProjectWorkspace } from './workspace'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const project = getProject(id)
  return {
    title: project?.name ?? 'Project',
    description: project
      ? `${project.type} project — ${project.capacityMw} MW, ${project.completionPct}% complete, target ${project.targetCommissioning}.`
      : undefined,
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <ProjectWorkspace id={id} />
    </Suspense>
  )
}
