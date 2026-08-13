'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretLeft, Stack } from '@phosphor-icons/react/dist/ssr'
import { Switch } from '@/components/ui/primitives'
import { MAP_LAYERS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useMapStore } from '@/stores/map-store'

const GROUPS = ['Assets', 'Environment', 'Operations'] as const

export function LayerPanel() {
  const layers = useMapStore((s) => s.layers)
  const toggleLayer = useMapStore((s) => s.toggleLayer)
  const resetLayers = useMapStore((s) => s.resetLayers)
  const open = useMapStore((s) => s.layersOpen)
  const setOpen = useMapStore((s) => s.setLayersOpen)

  // h-full (not max-h-full) on the wrapper so the panel's percentage max-height resolves.
  return (
    <div className="pointer-events-auto flex h-full items-start gap-1.5">
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="glass flex max-h-full w-[13.5rem] flex-col overflow-hidden rounded-xl shadow-[var(--shadow-md)]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--glass-line)] px-3.5 py-2.5">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-[var(--ink)]">
                <Stack className="size-4 text-[var(--ink-muted)]" aria-hidden />
                Map layers
              </p>
              <button
                onClick={resetLayers}
                className="text-[10.5px] font-medium text-[var(--brand)] hover:underline"
              >
                Reset
              </button>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
              {GROUPS.map((group) => (
                <div key={group} className="mb-1 last:mb-0">
                  <p className="px-1.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    {group}
                  </p>
                  {MAP_LAYERS.filter((l) => l.group === group).map((layer) => (
                    <label
                      key={layer.id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-1.5 py-[7px] transition-colors hover:bg-[var(--subtle)]"
                      title={layer.description}
                    >
                      <span className="text-[12px] text-[var(--ink-secondary)]">{layer.label}</span>
                      <Switch
                        checked={layers.includes(layer.id)}
                        onCheckedChange={() => toggleLayer(layer.id)}
                        aria-label={`Toggle ${layer.label} layer`}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Hide layer controls' : 'Show layer controls'}
        aria-expanded={open}
        className="glass flex size-8 items-center justify-center rounded-lg text-[var(--ink-secondary)] shadow-[var(--shadow-md)] transition-colors hover:text-[var(--ink)]"
      >
        {open ? <CaretLeft className="size-4" aria-hidden /> : <Stack className="size-4" aria-hidden />}
      </button>
    </div>
  )
}
