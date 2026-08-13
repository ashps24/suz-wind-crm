'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CalendarBlank, CheckCircle, GridFour, Rows, Wrench } from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Progress, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives'
import { Heatmap } from '@/components/charts'
import { KpiCard } from '@/components/cards/kpi'
import { SeverityBadge, WorkOrderStatusBadge } from '@/components/cards/status'
import { CellTitle, DataTable, type Column } from '@/components/tables/data-table'
import { FilterBar, QuickFilters } from '@/components/tables/filter-bar'
import { EmptyState, KpiSkeleton, QueryState, TableSkeleton } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { TONE_VAR, WORK_ORDER_TYPE } from '@/lib/constants'
import { DEMO_NOW } from '@/lib/utils'
import { fmtDate, fmtDateShort, fmtDuration, fmtNumber, fmtRelative, isOverdue, isToday } from '@/lib/formatters'
import type { WorkOrder } from '@/types'

const TYPE_OPTIONS = Object.entries(WORK_ORDER_TYPE).map(([value, meta]) => ({ value, label: meta.label }))

export function MaintenanceView() {
  const searchParams = useSearchParams()
  const [segment, setSegment] = React.useState(searchParams.get('filter') ?? 'open')
  const [search, setSearch] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, string>>({
    type: 'all',
    priority: 'all',
    site: searchParams.get('site') ?? 'all',
    technician: 'all',
  })

  const orders = useQuery({ queryKey: ['work-orders'], queryFn: api.workOrders.list })
  const summary = useQuery({ queryKey: ['work-orders', 'summary'], queryFn: api.workOrders.summary })
  const matrix = useQuery({ queryKey: ['work-orders', 'matrix'], queryFn: api.workOrders.matrix })
  const farms = useQuery({ queryKey: ['wind-farms'], queryFn: api.windFarms.list })
  const technicians = useQuery({ queryKey: ['technicians'], queryFn: api.technicians.list })

  const turbineFilter = searchParams.get('turbine')

  const scoped = React.useMemo(() => {
    const list = orders.data ?? []
    return turbineFilter ? list.filter((w) => w.turbineId === turbineFilter) : list
  }, [orders.data, turbineFilter])

  const counts = React.useMemo(() => {
    const list = scoped
    return {
      all: list.length,
      open: list.filter((w) => w.status !== 'completed' && w.status !== 'cancelled').length,
      overdue: list.filter(
        (w) => w.status !== 'completed' && w.status !== 'cancelled' && isOverdue(w.slaDueAt),
      ).length,
      today: list.filter((w) => isToday(w.scheduledFor) && w.status !== 'completed').length,
      'awaiting-parts': list.filter((w) => w.status === 'awaiting-parts').length,
      completed: list.filter((w) => w.status === 'completed').length,
    }
  }, [scoped])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return scoped.filter((w) => {
      if (q && !`${w.id} ${w.title} ${w.turbineName} ${w.windFarmName} ${w.technicianName}`.toLowerCase().includes(q))
        return false
      if (segment === 'open' && (w.status === 'completed' || w.status === 'cancelled')) return false
      if (segment === 'overdue' && !(w.status !== 'completed' && w.status !== 'cancelled' && isOverdue(w.slaDueAt)))
        return false
      if (segment === 'today' && !(isToday(w.scheduledFor) && w.status !== 'completed')) return false
      if (segment === 'awaiting-parts' && w.status !== 'awaiting-parts') return false
      if (segment === 'completed' && w.status !== 'completed') return false
      if (filters.type !== 'all' && w.type !== filters.type) return false
      if (filters.priority !== 'all' && w.priority !== filters.priority) return false
      if (filters.site !== 'all' && w.windFarmId !== filters.site) return false
      if (filters.technician !== 'all' && w.technicianId !== filters.technician) return false
      return true
    })
  }, [scoped, search, segment, filters])

  const columns: Column<WorkOrder>[] = [
    {
      key: 'title',
      header: 'Work order',
      width: '26%',
      sortValue: (w) => w.title,
      render: (w) => <CellTitle title={w.title} subtitle={`${w.id} · ${w.turbineName}`} />,
    },
    {
      key: 'site',
      header: 'Site',
      hideBelow: 'lg',
      sortValue: (w) => w.windFarmName,
      render: (w) => <CellTitle title={w.windFarmName} subtitle={w.state} />,
    },
    { key: 'type', header: 'Type', sortValue: (w) => w.type, render: (w) => <Chip>{WORK_ORDER_TYPE[w.type].label}</Chip> },
    { key: 'priority', header: 'Priority', sortValue: (w) => w.priority, render: (w) => <SeverityBadge severity={w.priority} /> },
    { key: 'status', header: 'Status', sortValue: (w) => w.status, render: (w) => <WorkOrderStatusBadge status={w.status} /> },
    { key: 'tech', header: 'Technician', hideBelow: 'md', sortValue: (w) => w.technicianName, render: (w) => w.technicianName },
    {
      key: 'progress',
      header: 'Checklist',
      hideBelow: 'xl',
      render: (w) => {
        const done = w.checklist.filter((c) => c.done).length
        return (
          <span className="flex items-center gap-2">
            <span className="w-16">
              <Progress value={(done / Math.max(1, w.checklist.length)) * 100} />
            </span>
            <span className="tabular text-[11.5px] text-[var(--ink-muted)]">
              {done}/{w.checklist.length}
            </span>
          </span>
        )
      },
    },
    {
      key: 'sla',
      header: 'SLA due',
      numeric: true,
      sortValue: (w) => w.slaDueAt,
      render: (w) => {
        const late = w.status !== 'completed' && w.status !== 'cancelled' && isOverdue(w.slaDueAt)
        return (
          <span style={{ color: late ? 'var(--delta-down)' : undefined, fontWeight: late ? 600 : undefined }}>
            {fmtRelative(w.slaDueAt)}
          </span>
        )
      },
    },
    {
      key: 'scheduled',
      header: 'Scheduled',
      numeric: true,
      hideBelow: 'lg',
      sortValue: (w) => w.scheduledFor,
      render: (w) => fmtDate(w.scheduledFor),
    },
  ]

  return (
    <Page
      title="Maintenance"
      description="Every preventive, predictive, corrective and breakdown job across the fleet, with SLA and parts exposure."
      wide
      actions={
        <Button variant="primary" size="sm" asChild>
          <Link href="/field-service">
            <Wrench aria-hidden />
            Field service view
          </Link>
        </Button>
      }
    >
      {turbineFilter && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--brand-soft)] px-3.5 py-2.5">
          <p className="text-[12.5px] text-[var(--brand-ink)]">
            Filtered to work orders for turbine <strong>{turbineFilter}</strong>
          </p>
          <Button variant="ghost" size="xs" asChild className="ml-auto">
            <Link href="/maintenance">Clear</Link>
          </Button>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {summary.isPending ? (
          <KpiSkeleton count={5} />
        ) : summary.data ? (
          <>
            <KpiCard label="Open orders" value={fmtNumber(summary.data.open)} icon={Wrench} trendLabel={`${summary.data.total} in total`} />
            <KpiCard label="Past SLA" value={fmtNumber(summary.data.overdue)} emphasis="critical" trendLabel="Response window exceeded" />
            <KpiCard label="Due today" value={fmtNumber(summary.data.dueToday)} emphasis="warning" trendLabel="Scheduled for today" />
            <KpiCard label="Awaiting parts" value={fmtNumber(summary.data.awaitingParts)} trendLabel="Blocked on spares" />
            <KpiCard label="Breakdowns open" value={fmtNumber(summary.data.breakdowns)} emphasis="critical" trendLabel="Unplanned interventions" />
          </>
        ) : null}
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="mb-5">
          <TabsTrigger value="orders">Work orders</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="matrix">Preventive matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3">
          <QuickFilters
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'open', label: 'Open', count: counts.open },
              { value: 'overdue', label: 'Past SLA', count: counts.overdue, tone: 'critical' },
              { value: 'today', label: 'Due today', count: counts.today, tone: 'warning' },
              { value: 'awaiting-parts', label: 'Awaiting parts', count: counts['awaiting-parts'], tone: 'serious' },
              { value: 'completed', label: 'Completed', count: counts.completed, tone: 'good' },
              { value: 'all', label: 'All', count: counts.all },
            ]}
          />

          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search order ID, turbine, technician…"
            values={filters}
            onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
            filters={[
              { key: 'type', label: 'Type', options: TYPE_OPTIONS },
              {
                key: 'priority',
                label: 'Priority',
                options: [
                  { value: 'critical', label: 'Critical' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ],
              },
              { key: 'site', label: 'Site', options: (farms.data ?? []).map((f) => ({ value: f.id, label: f.name })) },
              {
                key: 'technician',
                label: 'Technician',
                options: (technicians.data ?? []).map((t) => ({ value: t.id, label: t.name })),
              },
            ]}
            right={<span className="text-[12.5px] text-[var(--ink-muted)]">{fmtNumber(filtered.length)} shown</span>}
          />

          <QueryState query={orders} skeleton={<TableSkeleton rows={12} cols={7} />} errorTitle="Work orders unavailable">
            {() =>
              filtered.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title={segment === 'overdue' ? 'Nothing past SLA' : 'No work orders match'}
                  description={
                    segment === 'overdue'
                      ? 'Every open job is still inside its response window. This is the state you want the queue to be in.'
                      : 'No jobs match this combination of filters. Widen the search or switch segment.'
                  }
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearch('')
                        setSegment('all')
                        setFilters({ type: 'all', priority: 'all', site: 'all', technician: 'all' })
                      }}
                    >
                      Reset filters
                    </Button>
                  }
                />
              ) : (
                <DataTable
                  rows={filtered}
                  columns={columns}
                  rowKey={(w) => w.id}
                  href={(w) => `/maintenance/${w.id}`}
                  caption="Maintenance work orders"
                  defaultSort={{ key: 'sla', dir: 'asc' }}
                  maxHeight={680}
                />
              )
            }
          </QueryState>
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView orders={scoped} loading={orders.isPending} />
        </TabsContent>

        <TabsContent value="matrix">
          <QueryState query={matrix} skeleton={<TableSkeleton rows={12} cols={6} />} errorTitle="Maintenance matrix unavailable">
            {(rows) => (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Preventive maintenance matrix</CardTitle>
                    <CardDescription>
                      Planned services per site over the next 12 weeks — darker means a heavier week
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Heatmap
                    rows={rows.map((r) => ({ label: r.siteName, values: r.weeks }))}
                    columns={Array.from({ length: 12 }, (_, i) => `W${i + 1}`)}
                    unit=" jobs"
                    rowLabelWidth={210}
                  />
                </CardContent>
              </Card>
            )}
          </QueryState>
        </TabsContent>
      </Tabs>
    </Page>
  )
}

/* --------------------------------- Calendar --------------------------------- */

function CalendarView({ orders, loading }: { orders: WorkOrder[]; loading: boolean }) {
  if (loading) return <TableSkeleton rows={8} cols={7} />

  // Four weeks from the start of the current week.
  const start = new Date(DEMO_NOW)
  start.setDate(start.getDate() - start.getDay())
  start.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 28 }, (_, i) => {
    const date = new Date(start.getTime() + i * 86_400_000)
    const dayOrders = orders.filter((w) => {
      const scheduled = new Date(w.scheduledFor)
      return (
        scheduled.getFullYear() === date.getFullYear() &&
        scheduled.getMonth() === date.getMonth() &&
        scheduled.getDate() === date.getDate()
      )
    })
    return { date, orders: dayOrders }
  })

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Service calendar</CardTitle>
          <CardDescription>Four-week view of scheduled work across the fleet</CardDescription>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--ink-muted)]">
          {[
            ['Breakdown', TONE_VAR.critical],
            ['Corrective', TONE_VAR.warning],
            ['Preventive', TONE_VAR.good],
          ].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-[2px]" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="grid grid-cols-7 border-t border-[var(--line)]">
          {weekdays.map((day) => (
            <div
              key={day}
              className="border-b border-r border-[var(--line)] px-2 py-1.5 text-center text-[10.5px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] last:border-r-0"
            >
              {day}
            </div>
          ))}
          {days.map(({ date, orders: dayOrders }, i) => {
            const isCurrent =
              date.getDate() === DEMO_NOW.getDate() &&
              date.getMonth() === DEMO_NOW.getMonth() &&
              date.getFullYear() === DEMO_NOW.getFullYear()
            return (
              <div
                key={i}
                className="min-h-[7rem] border-b border-r border-[var(--line)] p-1.5 last:border-r-0 [&:nth-child(7n+7)]:border-r-0"
                style={{ backgroundColor: isCurrent ? 'var(--brand-soft)' : undefined }}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className="tabular text-[11px] font-medium"
                    style={{ color: isCurrent ? 'var(--brand-ink)' : 'var(--ink-muted)' }}
                  >
                    {date.getDate()}
                  </span>
                  {dayOrders.length > 2 && (
                    <span className="text-[10px] text-[var(--ink-muted)]">{dayOrders.length}</span>
                  )}
                </div>
                <ul className="space-y-1">
                  {dayOrders.slice(0, 3).map((order) => (
                    <li key={order.id}>
                      <Link
                        href={`/maintenance/${order.id}`}
                        className="block truncate rounded px-1.5 py-1 text-[10.5px] font-medium transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor:
                            order.type === 'breakdown'
                              ? 'var(--status-critical-soft)'
                              : order.type === 'corrective'
                                ? 'var(--status-warning-soft)'
                                : 'var(--status-good-soft)',
                          color:
                            order.type === 'breakdown'
                              ? TONE_VAR.critical
                              : order.type === 'corrective'
                                ? TONE_VAR.warning
                                : TONE_VAR.good,
                        }}
                        title={`${order.id} · ${order.title} · ${order.turbineName}`}
                      >
                        {order.turbineName.split('-').slice(-1)[0]} {order.title.slice(0, 18)}
                      </Link>
                    </li>
                  ))}
                  {dayOrders.length > 3 && (
                    <li className="px-1.5 text-[10px] text-[var(--ink-muted)]">+{dayOrders.length - 3} more</li>
                  )}
                </ul>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
