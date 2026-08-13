'use client'

import * as React from 'react'
import { CaretRight, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr'
import { Input } from '@/components/ui/primitives'
import { RiskBadge, SiteStatusBadge } from '@/components/cards/status'
import { Sparkline } from '@/components/charts'
import { EmptyState } from '@/components/feedback/states'
import { fmtMw, fmtPct } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { WindFarm } from '@/types'

/**
 * Text equivalent of the map layer. Everything a marker communicates is
 * available here as a sortable, searchable list — the map is never the only
 * route to the information.
 */
export function SiteList({
  farms,
  selectedId,
  onSelect,
  className,
  compact,
}: {
  farms: WindFarm[]
  selectedId: string | null
  onSelect: (id: string) => void
  className?: string
  compact?: boolean
}) {
  const [query, setQuery] = React.useState('')
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? farms.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.state.toLowerCase().includes(q) ||
            f.customerName.toLowerCase().includes(q),
        )
      : farms
    return [...list].sort((a, b) => b.riskScore - a.riskScore)
  }, [farms, query])

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {!compact && (
        <div className="relative shrink-0 px-3 pb-2.5">
          <MagnifyingGlass
            className="pointer-events-none absolute left-5.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-muted)]"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter sites…"
            className="pl-8"
            aria-label="Filter wind farm list"
          />
        </div>
      )}
      <ul className="scrollbar-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
        {filtered.length === 0 ? (
          <li>
            <EmptyState
              compact
              icon={MagnifyingGlass}
              title="No sites match"
              description={`Nothing matches “${query}”. Clear the filter to see all ${farms.length} sites.`}
            />
          </li>
        ) : (
          filtered.map((farm) => (
            <li key={farm.id}>
              <button
                onClick={() => onSelect(farm.id)}
                aria-current={selectedId === farm.id ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-2.5 py-2.5 text-left transition-colors',
                  selectedId === farm.id
                    ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
                    : 'border-[var(--line)] bg-[var(--elevated)] hover:border-[var(--line-strong)]',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[12.5px] font-medium text-[var(--ink)]">{farm.name}</p>
                    {farm.activeAlerts > 0 && (
                      <span
                        className="shrink-0 rounded px-1 py-px text-[10px] font-semibold text-white"
                        style={{ backgroundColor: 'var(--status-critical)' }}
                      >
                        {farm.activeAlerts}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] text-[var(--ink-muted)]">
                    {farm.state} · {fmtMw(farm.installedMw, 0)} · {fmtPct(farm.availabilityPct)} avail
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <RiskBadge band={farm.riskBand} />
                    {farm.status !== 'operational' && <SiteStatusBadge status={farm.status} />}
                  </div>
                </div>
                <Sparkline values={farm.generation24h} width={52} height={26} tone="info" area={false} />
                <CaretRight className="size-3.5 shrink-0 text-[var(--ink-muted)]" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
