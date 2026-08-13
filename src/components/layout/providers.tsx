'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/primitives'
import { setFaultInjection } from '@/lib/api'
import { useUiStore } from '@/stores/ui-store'

function FaultInjectionBridge() {
  const enabled = useUiStore((s) => s.faultInjection)
  React.useEffect(() => {
    setFaultInjection(enabled)
  }, [enabled])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider delayDuration={260} skipDelayDuration={140}>
          <FaultInjectionBridge />
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
