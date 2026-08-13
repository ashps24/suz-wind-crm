'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefersReducedMotion } from '@/hooks'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { CommandPalette } from './command-palette'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reducedMotion = usePrefersReducedMotion()
  // The Command Center manages its own full-bleed canvas; every other route
  // gets the standard scrolling page container.
  const fullBleed = pathname.startsWith('/command-center')

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--canvas)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main" className="relative min-h-0 flex-1" role="main">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={pathname.split('/').slice(0, 3).join('/')}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={fullBleed ? 'h-full' : 'scrollbar-thin h-full overflow-y-auto'}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}

/** Standard page container for non-map routes. */
export function Page({
  title,
  description,
  actions,
  children,
  wide,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className={wide ? 'mx-auto w-full max-w-[110rem] px-4 pb-16 pt-5 md:px-6' : 'mx-auto w-full max-w-7xl px-4 pb-16 pt-5 md:px-6'}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)] md:text-[22px]">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-[13px] text-[var(--ink-muted)]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
