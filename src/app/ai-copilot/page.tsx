import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AiCopilotView } from './ai-copilot-view'

export const metadata: Metadata = {
  title: 'AI Copilot',
  description: 'Ask operational questions in plain language and get answers grounded in fleet data.',
}

export default function AiCopilotPage() {
  return (
    <Suspense fallback={null}>
      <AiCopilotView />
    </Suspense>
  )
}
