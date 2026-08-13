'use client'

import * as React from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CaretDown,
  CheckCircle,
  CloudLightning,
  HardHat,
  Lightning,
  Plugs,
  Sparkle,
  Warning,
  Wrench,
} from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@/components/ui/icon'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/feedback/states'
import { SEVERITY, TONE_VAR } from '@/lib/constants'
import { fmtRelative, fmtTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { OperationalEvent } from '@/types'

const KIND_ICON: Record<OperationalEvent['kind'], Icon> = {
  alarm: Warning,
  'work-order': Wrench,
  environment: CloudLightning,
  grid: Plugs,
  project: HardHat,
  commissioning: CheckCircle,
  ai: Sparkle,
}

const KIND_LABEL: Record<OperationalEvent['kind'], string> = {
  alarm: 'Alarm',
  'work-order': 'Work order',
  environment: 'Environment',
  grid: 'Grid',
  project: 'Project',
  commissioning: 'Commissioning',
  ai: 'Intelligence',
}

const FILTERS: (OperationalEvent['kind'] | 'all')[] = ['all', 'alarm', 'work-order', 'environment', 'grid', 'project']

export function EventStream({
  events,
  open,
  onOpenChange,
  onSelectSite,
}: {
  events: OperationalEvent[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectSite?: (siteId: string) => void
}) {
  const [filter, setFilter] = React.useState<OperationalEvent['kind'] | 'all'>('all')
  const filtered = filter === 'all' ? events : events.filter((e) => e.kind === filter)

  return (
    <div className="glass pointer-events-auto overflow-hidden rounded-xl shadow-[var(--shadow-md)]">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--ink)]"
        >
          <CaretDown
            className={cn('size-3.5 text-[var(--ink-muted)] transition-transform', !open && '-rotate-90')}
            aria-hidden
          />
          Operational stream
        </button>
        <Badge tone="neutral">{events.length}</Badge>

        {open && (
          <div className="no-scrollbar ml-auto flex items-center gap-1 overflow-x-auto">
            {FILTERS.map((kind) => (
              <button
                key={kind}
                onClick={() => setFilter(kind)}
                className={cn(
                  'shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                  filter === kind
                    ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)]'
                    : 'text-[var(--ink-muted)] hover:bg-[var(--subtle)] hover:text-[var(--ink)]',
                )}
              >
                {kind === 'all' ? 'All' : KIND_LABEL[kind]}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden border-t border-[var(--glass-line)]"
          >
            {filtered.length === 0 ? (
              <div className="p-3">
                <EmptyState
                  compact
                  icon={CheckCircle}
                  title="Nothing in this stream"
                  description="No events of this type in the current window. Switch filters or widen the time range."
                />
              </div>
            ) : (
              <ul className="scrollbar-thin flex max-h-[9.5rem] gap-2 overflow-x-auto p-2.5 md:max-h-none">
                {filtered.slice(0, 24).map((event) => {
                  const EventIcon = KIND_ICON[event.kind]
                  const tone = SEVERITY[event.severity].tone
                  return (
                    <li key={event.id} className="w-[16.5rem] shrink-0">
                      <div className="flex h-full flex-col rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="flex size-6 shrink-0 items-center justify-center rounded-md"
                            style={{ backgroundColor: `var(--status-${tone}-soft)`, color: TONE_VAR[tone] }}
                          >
                            <EventIcon className="size-3.5" weight="fill" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
                            {KIND_LABEL[event.kind]}
                          </span>
                          <time
                            className="shrink-0 text-[10.5px] tabular text-[var(--ink-muted)]"
                            dateTime={event.at}
                            title={fmtRelative(event.at)}
                          >
                            {fmtTime(event.at)}
                          </time>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[12px] font-medium leading-snug text-[var(--ink)]">
                          {event.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-[var(--ink-muted)]">
                          {event.detail}
                        </p>
                        {event.siteName && (
                          <button
                            onClick={() => event.siteId && onSelectSite?.(event.siteId)}
                            className="mt-auto pt-2 text-left text-[10.5px] font-medium text-[var(--brand)] hover:underline"
                          >
                            {event.siteName}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
