'use client'

import * as React from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CaretRight, CheckCircle, Sparkle, X } from '@phosphor-icons/react/dist/ssr'
import { Badge } from '@/components/ui/badge'
import { SeverityBadge } from '@/components/cards/status'
import { EmptyState } from '@/components/feedback/states'
import { fmtMw, fmtRelative } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useMapStore } from '@/stores/map-store'
import { useUiStore } from '@/stores/ui-store'
import type { AiPriority } from '@/types'

export function PriorityCard({
  priority,
  onFocusSite,
  defaultExpanded = false,
  className,
}: {
  priority: AiPriority
  onFocusSite?: (siteId: string) => void
  defaultExpanded?: boolean
  className?: string
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const dismissPriority = useUiStore((s) => s.dismissPriority)
  const critical = priority.severity === 'critical'

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-[var(--elevated)] shadow-[var(--shadow-sm)]',
        critical ? 'border-[color-mix(in_oklab,var(--status-critical)_38%,transparent)]' : 'border-[var(--line)]',
        critical && 'animate-[pulse-once_1.4s_cubic-bezier(0.4,0,0.2,1)_2]',
        className,
      )}
    >
      {critical && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-[var(--status-critical)]" />
      )}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityBadge severity={priority.severity} />
            <Badge tone="neutral">{priority.category}</Badge>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-[10.5px] text-[var(--ink-muted)]">{fmtRelative(priority.detectedAt)}</span>
            <button
              onClick={() => dismissPriority(priority.id)}
              aria-label="Dismiss priority"
              className="rounded p-0.5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--subtle)] hover:text-[var(--ink)]"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>

        <button
          className="mt-2 w-full text-left"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          <h3 className="text-[13px] font-semibold leading-snug text-[var(--ink)]">{priority.headline}</h3>
        </button>

        <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--ink-secondary)]">
          {expanded ? priority.whatHappened : priority.businessImpact}
        </p>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <dl className="mt-2.5 space-y-2 border-t border-[var(--line)] pt-2.5 text-[12px]">
                <div>
                  <dt className="font-medium text-[var(--ink-muted)]">Why it matters</dt>
                  <dd className="mt-0.5 leading-relaxed text-[var(--ink-secondary)]">{priority.whyItMatters}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--ink-muted)]">Business impact</dt>
                  <dd className="mt-0.5 leading-relaxed text-[var(--ink-secondary)]">{priority.businessImpact}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--ink-muted)]">Recommended action</dt>
                  <dd className="mt-0.5 leading-relaxed text-[var(--ink)]">{priority.recommendedAction}</dd>
                </div>
                {priority.affectedCustomers.length > 0 && (
                  <div>
                    <dt className="font-medium text-[var(--ink-muted)]">Customers</dt>
                    <dd className="mt-0.5 text-[var(--ink-secondary)]">{priority.affectedCustomers.join(' · ')}</dd>
                  </div>
                )}
              </dl>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Affected sites */}
        {priority.affectedSiteIds.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {priority.affectedSiteIds.slice(0, 3).map((siteId, i) => (
              <button
                key={siteId}
                onClick={() => onFocusSite?.(siteId)}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--ink-secondary)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand-ink)]"
              >
                {priority.affectedSiteNames[i]}
                <CaretRight className="size-2.5" aria-hidden />
              </button>
            ))}
            {priority.affectedSiteIds.length > 3 && (
              <span className="self-center text-[11px] text-[var(--ink-muted)]">
                +{priority.affectedSiteIds.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[var(--ink-muted)]">
            {priority.affectedMw > 0 && <>{fmtMw(priority.affectedMw, 0)} · </>}
            confidence {priority.confidencePct}%
          </span>
          <Link
            href={priority.cta.href}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--brand)] transition-colors hover:text-[var(--brand-hover)]"
          >
            {priority.cta.label}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

export function PriorityPanel({
  priorities,
  onFocusSite,
}: {
  priorities: AiPriority[]
  onFocusSite: (siteId: string) => void
}) {
  const dismissed = useUiStore((s) => s.dismissedPriorities)
  const restore = useUiStore((s) => s.restorePriorities)
  const visible = priorities.filter((p) => !dismissed.includes(p.id))

  return (
    <div className="glass pointer-events-auto flex h-full w-[21rem] flex-col overflow-hidden rounded-xl shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between border-b border-[var(--glass-line)] px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
          <Sparkle className="size-4 text-[var(--brand)]" weight="fill" aria-hidden />
          AI Priorities
        </p>
        <span className="flex items-center gap-2">
          {dismissed.length > 0 && (
            <button onClick={restore} className="text-[10.5px] font-medium text-[var(--brand)] hover:underline">
              Restore {dismissed.length}
            </button>
          )}
          <Badge tone={visible.some((p) => p.severity === 'critical') ? 'critical' : 'info'} dot>
            {visible.length} open
          </Badge>
        </span>
      </div>
      <div className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto p-3">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              compact
              title="No open priorities"
              description="Wind Intelligence has nothing needing your attention right now. New priorities appear here the moment they are detected."
            />
          ) : (
            visible.map((priority, i) => (
              <PriorityCard
                key={priority.id}
                priority={priority}
                onFocusSite={onFocusSite}
                defaultExpanded={i === 0}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
