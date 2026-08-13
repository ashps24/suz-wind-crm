'use client'

import * as React from 'react'
import { TONE_VAR } from '@/lib/constants'
import { fmtDate, daysBetween } from '@/lib/formatters'
import { DEMO_NOW } from '@/lib/utils'
import { useMeasure } from '@/hooks'
import { cn } from '@/lib/utils'
import type { Milestone } from '@/types'

const RISK_TONE: Record<Milestone['risk'], keyof typeof TONE_VAR> = {
  severe: 'critical',
  elevated: 'serious',
  moderate: 'warning',
  low: 'good',
}

/**
 * Horizontal milestone timeline. Planned bars sit behind actual bars so slip is
 * visible as an offset rather than needing a separate "delay" column.
 */
export function MilestoneTimeline({
  milestones,
  selectedId,
  onSelect,
  className,
}: {
  milestones: Milestone[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  className?: string
}) {
  const [ref, { width }] = useMeasure<HTMLDivElement>()

  const bounds = React.useMemo(() => {
    const dates = milestones.flatMap((m) => [
      new Date(m.plannedStart).getTime(),
      new Date(m.plannedEnd).getTime(),
      ...(m.actualStart ? [new Date(m.actualStart).getTime()] : []),
      ...(m.actualEnd ? [new Date(m.actualEnd).getTime()] : []),
    ])
    const min = Math.min(...dates)
    const max = Math.max(...dates)
    return { min, max, span: max - min || 1 }
  }, [milestones])

  const labelW = 152
  // Reserve the trailing progress/slip column so it is never clipped.
  const statusW = 76
  const trackW = Math.max(120, width - labelW - statusW - 8)
  const x = (time: number) => ((time - bounds.min) / bounds.span) * trackW
  const nowX = x(DEMO_NOW.getTime())

  // Quarter gridlines
  const ticks = React.useMemo(() => {
    const out: { x: number; label: string }[] = []
    const start = new Date(bounds.min)
    const cursor = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1)
    while (cursor.getTime() <= bounds.max) {
      const t = cursor.getTime()
      if (t >= bounds.min) {
        out.push({
          x: x(t),
          label: `Q${Math.floor(cursor.getMonth() / 3) + 1} ${String(cursor.getFullYear()).slice(2)}`,
        })
      }
      cursor.setMonth(cursor.getMonth() + 3)
    }
    return out
  }, [bounds, trackW])

  return (
    <div ref={ref} className={cn('min-w-0', className)}>
      {width > 0 && (
        <>
          {/* Axis */}
          <div className="relative mb-2 h-4" style={{ marginLeft: labelW }}>
            {ticks.map((tick) => (
              <span
                key={tick.label}
                className="absolute top-0 text-[10px] tabular text-[var(--ink-muted)]"
                style={{ left: tick.x, transform: 'translateX(-50%)' }}
              >
                {tick.label}
              </span>
            ))}
            {nowX >= 0 && nowX <= trackW && (
              <span
                className="absolute top-0 whitespace-nowrap rounded px-1 text-[9.5px] font-semibold text-white"
                style={{ left: nowX, transform: 'translateX(-50%)', backgroundColor: 'var(--brand)' }}
              >
                Today
              </span>
            )}
          </div>

          <ol className="relative space-y-1.5">
            {/* Vertical gridlines */}
            <div className="pointer-events-none absolute inset-y-0" style={{ left: labelW, width: trackW }} aria-hidden>
              {ticks.map((tick) => (
                <span key={tick.label} className="absolute inset-y-0 w-px bg-[var(--grid)]" style={{ left: tick.x }} />
              ))}
              {nowX >= 0 && nowX <= trackW && (
                <span className="absolute inset-y-0 w-px" style={{ left: nowX, backgroundColor: 'var(--brand)', opacity: 0.6 }} />
              )}
            </div>

            {milestones.map((milestone) => {
              const plannedStart = x(new Date(milestone.plannedStart).getTime())
              const plannedEnd = x(new Date(milestone.plannedEnd).getTime())
              const actualStart = milestone.actualStart ? x(new Date(milestone.actualStart).getTime()) : null
              const actualEnd = milestone.actualEnd
                ? x(new Date(milestone.actualEnd).getTime())
                : milestone.actualStart
                  ? Math.max(nowX, (actualStart ?? 0) + 6)
                  : null
              const slip = milestone.actualEnd
                ? daysBetween(milestone.plannedEnd, milestone.actualEnd)
                : milestone.actualStart
                  ? daysBetween(milestone.plannedStart, milestone.actualStart)
                  : 0
              const tone = TONE_VAR[RISK_TONE[milestone.risk]]
              const selected = selectedId === milestone.id

              return (
                <li key={milestone.id} className="relative">
                  <button
                    onClick={() => onSelect?.(milestone.id)}
                    className={cn(
                      'group flex w-full items-center rounded-lg py-1.5 text-left transition-colors',
                      onSelect && 'hover:bg-[var(--subtle)]',
                      selected && 'bg-[var(--brand-soft)]',
                    )}
                  >
                    <span className="shrink-0 pr-3" style={{ width: labelW }}>
                      <span className="block truncate text-[12px] font-medium text-[var(--ink)]">{milestone.stage}</span>
                      <span className="block truncate text-[10.5px] text-[var(--ink-muted)]">{milestone.owner}</span>
                    </span>

                    <span className="relative h-7 shrink-0" style={{ width: trackW }}>
                      {/* Planned */}
                      <span
                        className="absolute top-1 h-2 rounded-full bg-[var(--inset)]"
                        style={{ left: plannedStart, width: Math.max(4, plannedEnd - plannedStart) }}
                        title={`Planned ${fmtDate(milestone.plannedStart)} – ${fmtDate(milestone.plannedEnd)}`}
                      />
                      {/* Actual */}
                      {actualStart !== null && actualEnd !== null && (
                        <span
                          className="absolute top-3.5 h-2.5 rounded-full"
                          style={{
                            left: actualStart,
                            width: Math.max(4, actualEnd - actualStart),
                            backgroundColor: tone,
                            opacity: milestone.progressPct === 100 ? 1 : 0.85,
                          }}
                          title={`Actual from ${fmtDate(milestone.actualStart!)}`}
                        />
                      )}
                      {/* In-progress marker */}
                      {milestone.progressPct > 0 && milestone.progressPct < 100 && actualStart !== null && (
                        <span
                          className="absolute top-[11px] size-3.5 rounded-full border-2 border-[var(--surface)]"
                          style={{ left: (actualEnd ?? actualStart) - 7, backgroundColor: tone }}
                          title={`${milestone.progressPct}% complete`}
                        />
                      )}
                    </span>

                    <span className="shrink-0 pl-3 text-right" style={{ width: statusW }}>
                      {milestone.progressPct === 100 ? (
                        <span className="text-[11px] font-medium" style={{ color: TONE_VAR.good }}>
                          Done
                        </span>
                      ) : milestone.progressPct > 0 ? (
                        <span className="tabular text-[11px] font-medium text-[var(--ink)]">{milestone.progressPct}%</span>
                      ) : (
                        <span className="text-[11px] text-[var(--ink-muted)]">—</span>
                      )}
                      {slip > 2 && (
                        <span className="block text-[10px]" style={{ color: 'var(--delta-down)' }}>
                          +{slip} d
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--ink-secondary)]">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-6 rounded-full bg-[var(--inset)]" />
              Planned
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-6 rounded-full" style={{ backgroundColor: TONE_VAR.good }} />
              Actual, on schedule
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-6 rounded-full" style={{ backgroundColor: TONE_VAR.serious }} />
              Actual, slipping
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-px" style={{ backgroundColor: 'var(--brand)' }} />
              Today
            </span>
          </div>
        </>
      )}

      {/* Text equivalent */}
      <table className="sr-only">
        <caption>Project milestones with planned and actual dates</caption>
        <thead>
          <tr>
            <th>Stage</th>
            <th>Owner</th>
            <th>Planned start</th>
            <th>Planned end</th>
            <th>Actual start</th>
            <th>Actual end</th>
            <th>Progress</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {milestones.map((m) => (
            <tr key={m.id}>
              <td>{m.stage}</td>
              <td>{m.owner}</td>
              <td>{fmtDate(m.plannedStart)}</td>
              <td>{fmtDate(m.plannedEnd)}</td>
              <td>{m.actualStart ? fmtDate(m.actualStart) : 'not started'}</td>
              <td>{m.actualEnd ? fmtDate(m.actualEnd) : 'not complete'}</td>
              <td>{m.progressPct}%</td>
              <td>{m.risk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
