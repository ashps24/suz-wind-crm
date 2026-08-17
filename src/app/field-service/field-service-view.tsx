'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Camera,
  CaretRight,
  CheckCircle,
  CloudSlash,
  MapPin,
  NavigationArrow,
  Note,
  Package,
  PenNib,
  Play,
  ShieldWarning,
  SignIn,
  Wind,
} from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Avatar,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Progress,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/ui/primitives'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/dialog'
import { SeverityBadge, WorkOrderStatusBadge } from '@/components/cards/status'
import { CardGridSkeleton, EmptyState, QueryState } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { TONE_VAR, WORK_ORDER_TYPE } from '@/lib/constants'
import { fmtDate, fmtDuration, fmtRelative, fmtSpeed, fmtTime, isOverdue, isToday } from '@/lib/formatters'
import { useIsMobile } from '@/hooks'
import { cn } from '@/lib/utils'
import type { Technician, WorkOrder } from '@/types'
import { turbineHref } from '@/lib/routing'

const JOB_STEPS = [
  { key: 'review', label: 'Review turbine context', icon: Wind },
  { key: 'safety', label: 'Confirm safety notes', icon: ShieldWarning },
  { key: 'travel', label: 'Start travel', icon: NavigationArrow },
  { key: 'checkin', label: 'Check in on site', icon: SignIn },
  { key: 'checklist', label: 'Complete checklist', icon: CheckCircle },
  { key: 'evidence', label: 'Capture evidence', icon: Camera },
  { key: 'notes', label: 'Add notes & parts', icon: Note },
  { key: 'signoff', label: 'Signature & close', icon: PenNib },
]

export function FieldServiceView() {
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const [technicianId, setTechnicianId] = React.useState('tech-01')
  const [openOrderId, setOpenOrderId] = React.useState<string | null>(searchParams.get('order'))
  const [offline, setOffline] = React.useState(false)

  const technicians = useQuery({ queryKey: ['technicians'], queryFn: api.technicians.list })
  const orders = useQuery({
    queryKey: ['work-orders', 'technician', technicianId],
    queryFn: () => api.workOrders.forTechnician(technicianId),
  })
  const weather = useQuery({ queryKey: ['environment', 'weather'], queryFn: api.environment.weather })

  const technician = technicians.data?.find((t) => t.id === technicianId)
  const list = orders.data ?? []

  const buckets = {
    today: list.filter((w) => isToday(w.scheduledFor) && w.status !== 'completed'),
    assigned: list.filter((w) => w.status === 'scheduled' || w.status === 'dispatched'),
    progress: list.filter((w) => w.status === 'in-progress' || w.status === 'awaiting-parts'),
    completed: list.filter((w) => w.status === 'completed'),
  }

  const openOrder = list.find((w) => w.id === openOrderId) ?? null

  return (
    <Page
      title="Field Service"
      description="The technician’s day — assigned jobs, turbine context, safety briefing, checklists and sign-off."
      actions={
        <label className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-1.5">
          <CloudSlash className="size-4 text-[var(--ink-muted)]" aria-hidden />
          <span className="text-[12.5px] text-[var(--ink-secondary)]">Offline mode</span>
          <Switch checked={offline} onCheckedChange={setOffline} aria-label="Simulate offline mode" />
        </label>
      }
    >
      <AnimatePresence>
        {offline && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{
              borderColor: 'color-mix(in oklab, var(--status-warning) 34%, transparent)',
              backgroundColor: 'var(--status-warning-soft)',
            }}
            role="status"
          >
            <CloudSlash className="mt-0.5 size-5 shrink-0" style={{ color: TONE_VAR.warning }} weight="fill" aria-hidden />
            <div>
              <p className="text-[13px] font-semibold text-[var(--ink)]">Working offline</p>
              <p className="mt-0.5 text-[12px] text-[var(--ink-secondary)]">
                Job data is served from the device cache. Checklist progress, photos and notes are queued and will sync
                when connectivity returns.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Technician summary */}
      {technician && (
        <div className="mb-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5">
          <div className="flex items-start gap-3">
            <Avatar name={technician.name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-[var(--ink)]">{technician.name}</p>
              <p className="truncate text-[12px] text-[var(--ink-muted)]">{technician.role}</p>
              <p className="truncate text-[11.5px] text-[var(--ink-muted)]">{technician.homeBase}</p>
            </div>
            <Badge
              tone={technician.status === 'on-site' ? 'good' : technician.status === 'travelling' ? 'info' : 'neutral'}
              dot
              size="md"
              className="shrink-0"
            >
              {technician.status}
            </Badge>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1">
            {technician.certification.map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </div>

          <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-3">
            {[
              ['Today', String(buckets.today.length)],
              ['Utilisation', `${technician.utilisationPct}%`],
              ['Experience', `${technician.yearsExperience} yrs`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10.5px] uppercase tracking-wider text-[var(--ink-muted)]">{label}</dt>
                <dd className="kpi-value mt-0.5 text-[17px] font-semibold text-[var(--ink)]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {(technicians.data ?? []).map((t) => (
          <button
            key={t.id}
            onClick={() => setTechnicianId(t.id)}
            aria-pressed={technicianId === t.id}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors',
              technicianId === t.id
                ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]'
                : 'border-[var(--line)] bg-[var(--elevated)] text-[var(--ink-secondary)] hover:border-[var(--line-strong)]',
            )}
          >
            <Avatar name={t.name} size={20} />
            {t.name.split(' ')[0]}
          </button>
        ))}
      </div>

      <Tabs defaultValue="today">
        <TabsList className="mb-4">
          <TabsTrigger value="today">Today ({buckets.today.length})</TabsTrigger>
          <TabsTrigger value="assigned">Assigned ({buckets.assigned.length})</TabsTrigger>
          <TabsTrigger value="progress">In progress ({buckets.progress.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({buckets.completed.length})</TabsTrigger>
        </TabsList>

        {(
          [
            ['today', buckets.today, 'No jobs scheduled today', 'Nothing is on this technician’s schedule for today. Check the assigned queue for upcoming work.'],
            ['assigned', buckets.assigned, 'Nothing assigned', 'No jobs are currently slotted against this technician.'],
            ['progress', buckets.progress, 'No jobs in progress', 'Jobs move here once travel starts or the crew checks in on site.'],
            ['completed', buckets.completed, 'No completed jobs', 'Completed work orders with sign-off appear here.'],
          ] as const
        ).map(([value, items, emptyTitle, emptyDesc]) => (
          <TabsContent key={value} value={value}>
            <QueryState
              query={orders}
              skeleton={
                <div className="grid gap-3 md:grid-cols-2">
                  <CardGridSkeleton count={4} height={190} />
                </div>
              }
              errorTitle="Job list unavailable"
            >
              {() =>
                items.length === 0 ? (
                  <EmptyState icon={CheckCircle} title={emptyTitle} description={emptyDesc} />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {items.map((order) => (
                      <JobCard
                        key={order.id}
                        order={order}
                        windSpeed={weather.data?.find((w) => w.windFarmId === order.windFarmId)?.windSpeedMs}
                        onOpen={() => setOpenOrderId(order.id)}
                      />
                    ))}
                  </div>
                )
              }
            </QueryState>
          </TabsContent>
        ))}
      </Tabs>

      <Sheet open={Boolean(openOrder)} onOpenChange={(o) => !o && setOpenOrderId(null)}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className={isMobile ? 'h-[92vh] p-0' : 'w-[min(94vw,30rem)] p-0'}>
          {openOrder && (
            <JobFlow
              order={openOrder}
              technician={technician}
              windSpeed={weather.data?.find((w) => w.windFarmId === openOrder.windFarmId)?.windSpeedMs}
              offline={offline}
              onClose={() => setOpenOrderId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </Page>
  )
}

/* --------------------------------- Job card --------------------------------- */

function JobCard({
  order,
  windSpeed,
  onOpen,
}: {
  order: WorkOrder
  windSpeed?: number
  onOpen: () => void
}) {
  const done = order.checklist.filter((c) => c.done).length
  const late = order.status !== 'completed' && isOverdue(order.slaDueAt)
  const blocked = order.parts.some((p) => !p.available)

  return (
    <button
      onClick={onOpen}
      className={cn(
        'panel w-full p-4 text-left transition-shadow hover:shadow-[var(--shadow-md)]',
        late && 'border-[color-mix(in_oklab,var(--status-critical)_34%,transparent)]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold leading-snug text-[var(--ink)]">{order.title}</p>
          <p className="mt-0.5 text-[12px] text-[var(--ink-muted)]">
            {order.id} · {order.turbineName}
          </p>
        </div>
        <SeverityBadge severity={order.priority} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <WorkOrderStatusBadge status={order.status} />
        <Chip>{WORK_ORDER_TYPE[order.type].label}</Chip>
        {late && (
          <Badge tone="critical" dot>
            Past SLA
          </Badge>
        )}
        {blocked && (
          <Badge tone="serious" dot>
            Parts pending
          </Badge>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-3 text-[11.5px]">
        <div>
          <dt className="text-[var(--ink-muted)]">Site</dt>
          <dd className="mt-0.5 truncate font-medium text-[var(--ink)]">{order.windFarmName}</dd>
        </div>
        <div>
          <dt className="text-[var(--ink-muted)]">Window</dt>
          <dd className="mt-0.5 font-medium text-[var(--ink)]">{fmtTime(order.scheduledFor)}</dd>
        </div>
        <div>
          <dt className="text-[var(--ink-muted)]">Duration</dt>
          <dd className="mt-0.5 font-medium text-[var(--ink)]">{fmtDuration(order.estimatedHours)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-3">
        <span className="flex-1">
          <Progress value={(done / Math.max(1, order.checklist.length)) * 100} />
        </span>
        <span className="tabular text-[11.5px] text-[var(--ink-muted)]">
          {done}/{order.checklist.length}
        </span>
        {windSpeed !== undefined && (
          <span
            className="text-[11.5px] font-medium"
            style={{ color: windSpeed > 18 ? TONE_VAR.critical : 'var(--ink-muted)' }}
            title={windSpeed > 18 ? 'Above the 18 m/s ascent limit' : 'Within the ascent limit'}
          >
            {fmtSpeed(windSpeed)}
          </span>
        )}
        <CaretRight className="size-4 text-[var(--ink-muted)]" aria-hidden />
      </div>
    </button>
  )
}

/* --------------------------------- Job flow --------------------------------- */

function JobFlow({
  order,
  technician,
  windSpeed,
  offline,
  onClose,
}: {
  order: WorkOrder
  technician?: Technician
  windSpeed?: number
  offline: boolean
  onClose: () => void
}) {
  const [step, setStep] = React.useState(0)
  const [checks, setChecks] = React.useState<Record<string, boolean>>(
    Object.fromEntries(order.checklist.map((c) => [c.id, c.done])),
  )
  const [notes, setNotes] = React.useState('')
  const [signed, setSigned] = React.useState(false)

  const done = Object.values(checks).filter(Boolean).length
  const StepIcon = JOB_STEPS[step]!.icon
  const windBlocked = windSpeed !== undefined && windSpeed > 18

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[var(--line)] px-5 pb-3 pt-4">
        <SheetTitle className="pr-8 text-[15px] font-semibold leading-snug text-[var(--ink)]">{order.title}</SheetTitle>
        <p className="mt-0.5 text-[12px] text-[var(--ink-muted)]">
          {order.id} · {order.turbineName} · {order.windFarmName}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <WorkOrderStatusBadge status={order.status} />
          <SeverityBadge severity={order.priority} />
          {offline && (
            <Badge tone="warning" dot>
              Queued offline
            </Badge>
          )}
        </div>
      </div>

      {/* Step rail */}
      <div className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--line)] px-4 py-2.5">
        {JOB_STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setStep(i)}
            aria-current={step === i ? 'step' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-medium transition-colors',
              step === i
                ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)]'
                : i < step
                  ? 'text-[var(--status-good)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
            )}
          >
            <span
              className="flex size-4 items-center justify-center rounded-full text-[9px] font-bold"
              style={{
                backgroundColor: i < step ? TONE_VAR.good : step === i ? 'var(--brand)' : 'var(--inset)',
                color: i <= step ? '#fff' : 'var(--ink-muted)',
              }}
            >
              {i + 1}
            </span>
            {s.label.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-ink)]">
            <StepIcon className="size-[18px]" weight="duotone" aria-hidden />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-[var(--ink)]">{JOB_STEPS[step]!.label}</p>
            <p className="text-[11.5px] text-[var(--ink-muted)]">
              Step {step + 1} of {JOB_STEPS.length}
            </p>
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-[var(--ink-secondary)]">{order.description}</p>
            <Card className="p-3.5">
              <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
                {[
                  ['Turbine', order.turbineName],
                  ['Site', order.windFarmName],
                  ['Customer', order.customerName],
                  ['Type', WORK_ORDER_TYPE[order.type].label],
                  ['Estimated', fmtDuration(order.estimatedHours)],
                  ['Crew size', String(order.crewSize)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[var(--ink-muted)]">{label}</dt>
                    <dd className="mt-0.5 font-medium text-[var(--ink)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Button variant="secondary" size="sm" className="w-full" asChild>
              <Link href={turbineHref(order.turbineId)}>
                <Wind aria-hidden />
                Open turbine digital twin
              </Link>
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {windBlocked && (
              <div
                className="rounded-lg border px-3.5 py-3"
                style={{
                  borderColor: 'color-mix(in oklab, var(--status-critical) 40%, transparent)',
                  backgroundColor: 'var(--status-critical-soft)',
                }}
                role="alert"
              >
                <p className="text-[13px] font-semibold text-[var(--ink)]">Ascent blocked — wind above limit</p>
                <p className="mt-0.5 text-[12px] text-[var(--ink-secondary)]">
                  Site wind is {fmtSpeed(windSpeed!)}, above the 18 m/s hub-height limit. Do not ascend until it drops.
                </p>
              </div>
            )}
            <ul className="space-y-2">
              {order.safetyNotes.map((note, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--ink-secondary)]"
                >
                  <ShieldWarning className="mt-0.5 size-4 shrink-0" style={{ color: TONE_VAR.warning }} aria-hidden />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Card className="p-4 text-center">
              <MapPin className="mx-auto size-7 text-[var(--brand)]" weight="duotone" aria-hidden />
              <p className="mt-2 text-[14px] font-semibold text-[var(--ink)]">{order.windFarmName}</p>
              <p className="mt-0.5 text-[12px] text-[var(--ink-muted)]">
                {technician ? `Departing ${technician.homeBase}` : 'Departing service hub'}
              </p>
              <Button variant="primary" size="sm" className="mt-3 w-full">
                <NavigationArrow aria-hidden />
                Start travel
              </Button>
            </Card>
            <p className="text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
              Travel time counts toward the SLA window. The job clock starts when you check in on site.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Card className="p-4">
              <p className="text-[13px] font-medium text-[var(--ink)]">Check in at {order.windFarmName}</p>
              <p className="mt-1 text-[12px] text-[var(--ink-muted)]">
                Confirm arrival, log the crew and apply lock-out / tag-out before ascent.
              </p>
              <Button variant="primary" size="sm" className="mt-3 w-full" disabled={windBlocked}>
                <SignIn aria-hidden />
                {windBlocked ? 'Blocked — wind above limit' : 'Check in'}
              </Button>
            </Card>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex-1">
                <Progress value={(done / Math.max(1, order.checklist.length)) * 100} />
              </span>
              <span className="tabular text-[12px] text-[var(--ink-muted)]">
                {done}/{order.checklist.length}
              </span>
            </div>
            {order.checklist.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5 transition-colors hover:border-[var(--line-strong)]"
              >
                <Checkbox
                  checked={checks[item.id] ?? false}
                  onCheckedChange={(value) => setChecks((c) => ({ ...c, [item.id]: value === true }))}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className="block text-[13px]"
                    style={{
                      color: checks[item.id] ? 'var(--ink-muted)' : 'var(--ink)',
                      textDecoration: checks[item.id] ? 'line-through' : undefined,
                    }}
                  >
                    {item.label}
                  </span>
                  {item.required && <span className="text-[10.5px] text-[var(--ink-muted)]">Required</span>}
                </span>
              </label>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: Math.max(3, order.evidenceCount) }, (_, i) => (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--subtle)]"
                >
                  <Camera className="size-5 text-[var(--ink-muted)]" aria-hidden />
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="w-full">
              <Camera aria-hidden />
              Capture photo
            </Button>
            <p className="text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
              {order.evidenceCount} item{order.evidenceCount === 1 ? '' : 's'} captured so far.
              {offline && ' Photos are stored on the device and upload when connectivity returns.'}
            </p>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-[var(--ink)]">Job notes</p>
              <Textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Findings, deviations from the method statement, follow-up recommendations…"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-[var(--ink)]">Parts used</p>
              {order.parts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--line-strong)] px-3 py-4 text-center text-[12px] text-[var(--ink-muted)]">
                  No spares reserved for this job.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {order.parts.map((part) => (
                    <li
                      key={part.sku}
                      className="flex items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2"
                    >
                      <Package className="size-4 shrink-0 text-[var(--ink-muted)]" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--ink)]">{part.name}</span>
                      <span className="tabular text-[12px] text-[var(--ink-muted)]">
                        {part.quantity} {part.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3">
            <Card className="p-4">
              <p className="text-[13px] font-medium text-[var(--ink)]">Customer sign-off</p>
              <p className="mt-1 text-[12px] text-[var(--ink-muted)]">
                Capture the site representative’s signature to close this order.
              </p>
              <button
                onClick={() => setSigned(true)}
                className="mt-3 flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--subtle)] transition-colors hover:border-[var(--brand)]"
              >
                {signed ? (
                  <span className="flex items-center gap-2 text-[13px] font-medium" style={{ color: TONE_VAR.good }}>
                    <CheckCircle className="size-5" weight="fill" aria-hidden />
                    Signature captured
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-[12.5px] text-[var(--ink-muted)]">
                    <PenNib className="size-4" aria-hidden />
                    Tap to sign
                  </span>
                )}
              </button>
            </Card>
            <Button variant="primary" className="w-full" disabled={!signed}>
              <CheckCircle aria-hidden />
              Close work order
            </Button>
            {offline && (
              <p className="text-center text-[11.5px] text-[var(--ink-muted)]">
                Closure will be queued and submitted when the device reconnects.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-[var(--line)] p-3">
        <Button variant="secondary" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={() => (step === JOB_STEPS.length - 1 ? onClose() : setStep((s) => s + 1))}
        >
          {step === JOB_STEPS.length - 1 ? 'Done' : JOB_STEPS[step + 1]!.label}
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}
