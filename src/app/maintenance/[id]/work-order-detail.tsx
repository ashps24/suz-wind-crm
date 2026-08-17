'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  Camera,
  ChatText,
  CheckCircle,
  Clock,
  HardHat,
  Package,
  ShieldWarning,
  Wind,
  Wrench,
} from '@phosphor-icons/react/dist/ssr'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Progress } from '@/components/ui/primitives'
import { SeverityBadge, TurbineStatusBadge, WorkOrderStatusBadge } from '@/components/cards/status'
import { DetailHeader, StatStrip } from '@/components/layout/detail-header'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { TONE_VAR, WORK_ORDER_TYPE } from '@/lib/constants'
import { fmtDate, fmtDateTime, fmtDuration, fmtMwh, fmtNumber, fmtRelative, isOverdue } from '@/lib/formatters'
import { turbineHref, windFarmHref } from '@/lib/routing'

export function WorkOrderDetail({ id }: { id: string }) {
  const order = useQuery({ queryKey: ['work-orders', id], queryFn: () => api.workOrders.detail(id) })
  const turbine = useQuery({
    queryKey: ['turbines', order.data?.turbineId, 'summary'],
    queryFn: () => api.turbines.summary(order.data!.turbineId),
    enabled: Boolean(order.data?.turbineId),
  })
  const technicians = useQuery({ queryKey: ['technicians'], queryFn: api.technicians.list })

  if (order.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Work order not found"
          description={order.error instanceof Error ? order.error.message : undefined}
          onRetry={() => order.refetch()}
        />
      </div>
    )
  }

  if (order.isPending || !order.data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 md:px-6">
        <div className="grid gap-3 md:grid-cols-2">
          <CardGridSkeleton count={4} height={220} />
        </div>
      </div>
    )
  }

  const w = order.data
  const tech = technicians.data?.find((t) => t.id === w.technicianId)
  const done = w.checklist.filter((c) => c.done).length
  const late = w.status !== 'completed' && w.status !== 'cancelled' && isOverdue(w.slaDueAt)
  const blockedParts = w.parts.filter((p) => !p.available)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 md:px-6">
      <DetailHeader
        backHref="/maintenance"
        backLabel="Maintenance queue"
        eyebrow={w.id}
        title={w.title}
        meta={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={turbineHref(w.turbineId)} className="inline-flex items-center gap-1 hover:text-[var(--brand)]">
              <Wind className="size-3.5" aria-hidden />
              {w.turbineName}
            </Link>
            <span aria-hidden>·</span>
            <Link href={windFarmHref(w.windFarmId)} className="hover:text-[var(--brand)]">
              {w.windFarmName}
            </Link>
            <span aria-hidden>·</span>
            <span>{w.customerName}</span>
          </span>
        }
        badges={
          <>
            <WorkOrderStatusBadge status={w.status} size="md" />
            <SeverityBadge severity={w.priority} size="md" />
            <Chip>{WORK_ORDER_TYPE[w.type].label}</Chip>
            {late && (
              <Badge tone="critical" dot size="md">
                Past SLA
              </Badge>
            )}
          </>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/field-service?order=${w.id}`}>
                <HardHat aria-hidden />
                Technician view
              </Link>
            </Button>
            <Button variant="primary" size="sm">
              <CheckCircle aria-hidden />
              {w.status === 'completed' ? 'Reopen order' : 'Mark complete'}
            </Button>
          </>
        }
      />

      <StatStrip
        className="mb-5"
        items={[
          { label: 'Scheduled', value: fmtDate(w.scheduledFor), sub: fmtRelative(w.scheduledFor) },
          {
            label: 'SLA due',
            value: fmtRelative(w.slaDueAt),
            sub: fmtDateTime(w.slaDueAt),
            tone: late ? 'critical' : 'good',
          },
          { label: 'Estimated', value: fmtDuration(w.estimatedHours), sub: `Crew of ${w.crewSize}` },
          {
            label: 'Actual',
            value: w.actualHours ? fmtDuration(w.actualHours) : '—',
            sub: w.actualHours ? `${fmtNumber((w.actualHours / w.estimatedHours) * 100)}% of estimate` : 'Not started',
          },
          { label: 'Checklist', value: `${done}/${w.checklist.length}`, sub: 'Steps complete' },
          { label: 'Downtime avoided', value: fmtMwh(w.downtimeAvoidedMwh), sub: 'Estimated' },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Scope of work</CardTitle>
                <CardDescription>{WORK_ORDER_TYPE[w.type].description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] leading-relaxed text-[var(--ink-secondary)]">{w.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Checklist</CardTitle>
                <CardDescription>
                  {done} of {w.checklist.length} steps complete
                </CardDescription>
              </div>
              <span className="w-24">
                <Progress value={(done / Math.max(1, w.checklist.length)) * 100} />
              </span>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {w.checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--subtle)]"
                  >
                    <Checkbox checked={item.done} disabled className="mt-0.5" aria-label={item.label} />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-[13px]"
                        style={{
                          color: item.done ? 'var(--ink-muted)' : 'var(--ink)',
                          textDecoration: item.done ? 'line-through' : undefined,
                        }}
                      >
                        {item.label}
                      </span>
                      {item.required && !item.done && (
                        <span className="mt-0.5 block text-[10.5px] text-[var(--ink-muted)]">Required for sign-off</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Parts</CardTitle>
                <CardDescription>
                  {w.parts.length === 0
                    ? 'No spares required for this job'
                    : `${w.parts.length} line items · ${blockedParts.length} unavailable`}
                </CardDescription>
              </div>
              {blockedParts.length > 0 && (
                <Badge tone="serious" dot>
                  Blocked
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {w.parts.length === 0 ? (
                <EmptyState
                  compact
                  icon={Package}
                  title="No spares required"
                  description="This job is labour-only — no parts have been reserved against it."
                />
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {w.parts.map((part) => (
                    <li key={part.sku} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: part.available ? 'var(--status-good-soft)' : 'var(--status-serious-soft)',
                          color: part.available ? TONE_VAR.good : TONE_VAR.serious,
                        }}
                      >
                        <Package className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[var(--ink)]">{part.name}</span>
                        <span className="block text-[11px] text-[var(--ink-muted)]">{part.sku}</span>
                      </span>
                      <span className="tabular shrink-0 text-[12.5px] text-[var(--ink-secondary)]">
                        {part.quantity} {part.unit}
                      </span>
                      {part.available ? (
                        <Badge tone="good" dot>
                          In stock
                        </Badge>
                      ) : (
                        <Badge tone="serious" dot>
                          {part.leadTimeDays} d lead
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Shift handover and coordination log</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {w.notes.length === 0 ? (
                <EmptyState
                  compact
                  icon={ChatText}
                  title="No notes yet"
                  description="Coordination notes added by planners or the crew will appear here."
                />
              ) : (
                <ul className="space-y-3">
                  {w.notes.map((note, i) => (
                    <li key={i} className="flex gap-3">
                      <Avatar name={note.author} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-[12.5px] font-medium text-[var(--ink)]">{note.author}</span>
                          <time className="text-[11px] text-[var(--ink-muted)]">{fmtRelative(note.at)}</time>
                        </div>
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">{note.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card
            style={{
              borderColor: 'color-mix(in oklab, var(--status-warning) 34%, transparent)',
              backgroundColor: 'var(--status-warning-soft)',
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldWarning className="size-4" style={{ color: TONE_VAR.warning }} weight="fill" aria-hidden />
                <CardTitle className="text-[14px]">Safety notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {w.safetyNotes.map((note, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-[var(--ink-secondary)]">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE_VAR.warning }} />
                    {note}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Assigned crew</CardTitle>
                <CardDescription>Crew of {w.crewSize}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar name={w.technicianName} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--ink)]">{w.technicianName}</p>
                  <p className="truncate text-[11.5px] text-[var(--ink-muted)]">{tech?.role ?? 'Service Technician'}</p>
                </div>
              </div>
              {tech && (
                <dl className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3 text-[12px]">
                  <div className="flex justify-between">
                    <dt className="text-[var(--ink-muted)]">Status</dt>
                    <dd>
                      <Badge tone={tech.status === 'on-site' ? 'good' : tech.status === 'travelling' ? 'info' : 'neutral'} dot>
                        {tech.status}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--ink-muted)]">Home base</dt>
                    <dd className="font-medium text-[var(--ink)]">{tech.homeBase}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--ink-muted)]">Experience</dt>
                    <dd className="font-medium text-[var(--ink)]">{tech.yearsExperience} years</dd>
                  </div>
                  <div className="pt-1">
                    <dt className="mb-1 text-[var(--ink-muted)]">Certifications</dt>
                    <dd className="flex flex-wrap gap-1">
                      {tech.certification.map((c) => (
                        <Chip key={c}>{c}</Chip>
                      ))}
                    </dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          {turbine.data && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Turbine context</CardTitle>
                  <CardDescription>Asset state at the time of viewing</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--ink-muted)]">Status</dt>
                    <dd>
                      <TurbineStatusBadge status={turbine.data.status} />
                    </dd>
                  </div>
                  {[
                    ['Product', turbine.data.product],
                    ['Health score', String(turbine.data.healthScore)],
                    ['Availability', `${turbine.data.availabilityPct}%`],
                    ['Last service', fmtDate(turbine.data.lastMaintenance)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <dt className="text-[var(--ink-muted)]">{label}</dt>
                      <dd className="font-medium text-[var(--ink)]">{value}</dd>
                    </div>
                  ))}
                </dl>
                <Button variant="secondary" size="sm" className="mt-3 w-full" asChild>
                  <Link href={turbineHref(w.turbineId)}>Open turbine twin</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Evidence</CardTitle>
                <CardDescription>{w.evidenceCount} items captured</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {w.evidenceCount === 0 ? (
                <EmptyState
                  compact
                  icon={Camera}
                  title="No evidence yet"
                  description="Photographs and readings captured by the crew appear here as the job progresses."
                />
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: Math.min(w.evidenceCount, 6) }, (_, i) => (
                    <div
                      key={i}
                      className="flex aspect-square items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--subtle)]"
                    >
                      <Camera className="size-4 text-[var(--ink-muted)]" aria-hidden />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Timeline</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-3 border-l border-[var(--line)] pl-4 text-[12px]">
                {[
                  { label: 'Created', at: w.createdAt },
                  { label: 'Scheduled', at: w.scheduledFor },
                  ...(w.startedAt ? [{ label: 'Started', at: w.startedAt }] : []),
                  ...(w.completedAt ? [{ label: 'Completed', at: w.completedAt }] : []),
                ].map((entry) => (
                  <li key={entry.label} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[21px] top-1 size-2 rounded-full bg-[var(--brand)] ring-4 ring-[var(--surface)]"
                    />
                    <p className="font-medium text-[var(--ink)]">{entry.label}</p>
                    <p className="text-[var(--ink-muted)]">{fmtDateTime(entry.at)}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
