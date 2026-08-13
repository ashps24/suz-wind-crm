'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Buildings,
  CloudSun,
  FileText,
  Gauge,
  MapPin,
  ShieldCheck,
  Warning,
  Wrench,
} from '@phosphor-icons/react/dist/ssr'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/primitives'
import { HealthRing, LineChart, PowerCurveChart, Sparkline } from '@/components/charts'
import { SeverityBadge, TurbineStatusBadge } from '@/components/cards/status'
import { TurbineVisual } from '@/components/cards/turbine-visual'
import { DetailHeader, StatStrip } from '@/components/layout/detail-header'
import { CellTitle, DataTable } from '@/components/tables/data-table'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { PRODUCT_SPECS, TONE_VAR } from '@/lib/constants'
import {
  fmtBearing,
  fmtDate,
  fmtDuration,
  fmtKw,
  fmtMw,
  fmtMwh,
  fmtNumber,
  fmtPct,
  fmtRelative,
  fmtSpeed,
  fmtTemp,
  fmtTime,
} from '@/lib/formatters'
import type { ComponentHealth } from '@/types'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'performance', label: 'Performance' },
  { value: 'telemetry', label: 'Telemetry' },
  { value: 'alarms', label: 'Alarms' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'components', label: 'Components' },
  { value: 'documents', label: 'Documents' },
  { value: 'environment', label: 'Environment' },
]

export function TurbineTwin({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initial = searchParams.get('tab') ?? 'overview'
  const [tab, setTab] = React.useState(TABS.some((t) => t.value === initial) ? initial : 'overview')

  const turbine = useQuery({ queryKey: ['turbines', id], queryFn: () => api.turbines.detail(id) })
  const orders = useQuery({ queryKey: ['turbines', id, 'orders'], queryFn: () => api.turbines.workOrders(id) })
  const documents = useQuery({ queryKey: ['turbines', id, 'docs'], queryFn: () => api.turbines.documents(id) })
  const weather = useQuery({ queryKey: ['environment', 'weather'], queryFn: api.environment.weather })

  if (turbine.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="This turbine could not be loaded"
          description={turbine.error instanceof Error ? turbine.error.message : undefined}
          onRetry={() => turbine.refetch()}
        />
      </div>
    )
  }

  if (turbine.isPending || !turbine.data) {
    return (
      <div className="mx-auto w-full max-w-[100rem] px-4 pb-16 pt-5 md:px-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <CardGridSkeleton count={6} height={200} />
        </div>
      </div>
    )
  }

  const t = turbine.data
  const spec = PRODUCT_SPECS[t.product]
  const siteWeather = weather.data?.find((w) => w.windFarmId === t.windFarmId)
  const telemetryAxis = t.telemetry.map((p) => fmtTime(p.t))
  const openOrders = (orders.data ?? []).filter((o) => o.status !== 'completed' && o.status !== 'cancelled')

  function changeTab(value: string) {
    setTab(value)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    router.replace(`${url.pathname}${url.search}`, { scroll: false })
  }

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 pb-16 pt-5 md:px-6">
      <DetailHeader
        backHref="/turbines"
        backLabel="Turbine fleet"
        eyebrow={`${t.product} · ${spec.ratedCapacityMw} MW`}
        title={t.name}
        meta={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/wind-farms/${t.windFarmId}`} className="inline-flex items-center gap-1 hover:text-[var(--brand)]">
              <MapPin className="size-3.5" aria-hidden />
              {t.windFarmName}
            </Link>
            <span aria-hidden>·</span>
            <Link href={`/crm/accounts/${t.customerId}`} className="inline-flex items-center gap-1 hover:text-[var(--brand)]">
              <Buildings className="size-3.5" aria-hidden />
              {t.customerName}
            </Link>
            <span aria-hidden>·</span>
            <span>Serial {t.serialNumber}</span>
          </span>
        }
        badges={
          <>
            <TurbineStatusBadge status={t.status} size="md" />
            {t.activeAlarm && t.alarmSeverity && <SeverityBadge severity={t.alarmSeverity} size="md" />}
            <Chip>Commissioned {fmtDate(t.commissionedOn)}</Chip>
            <Chip>Warranty to {fmtDate(t.warrantyUntil)}</Chip>
          </>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/maintenance?turbine=${t.id}`}>
                <Wrench aria-hidden />
                Work orders
                <Badge tone="neutral">{openOrders.length}</Badge>
              </Link>
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link href={`/wind-farms/${t.windFarmId}?tab=map`}>View in site twin</Link>
            </Button>
          </>
        }
      />

      {t.activeAlarm && (
        <div
          className="mb-5 flex items-start gap-3 rounded-xl border px-4 py-3"
          style={{
            borderColor: 'color-mix(in oklab, var(--status-serious) 38%, transparent)',
            backgroundColor: 'var(--status-serious-soft)',
          }}
          role="status"
        >
          <Warning className="mt-0.5 size-5 shrink-0" style={{ color: TONE_VAR.serious }} weight="fill" aria-hidden />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--ink)]">Active alarm — {t.activeAlarm}</p>
            <p className="mt-0.5 text-[12px] text-[var(--ink-secondary)]">
              {t.alarmHistory[0]?.description ?? 'Fault reported by the turbine controller.'}
            </p>
          </div>
        </div>
      )}

      <StatStrip
        className="mb-5"
        items={[
          { label: 'Current power', value: fmtKw(t.currentPowerKw), sub: `of ${fmtMw(t.capacityMw, 2)} rated` },
          { label: 'Wind speed', value: fmtSpeed(t.windSpeedMs), sub: fmtBearing(t.windDirectionDeg) },
          { label: 'Rotor speed', value: `${fmtNumber(t.rotorRpm, 1)} rpm`, sub: 'Nacelle sensor' },
          {
            label: 'Availability',
            value: fmtPct(t.availabilityPct),
            sub: 'Trailing 30 days',
            tone: t.availabilityPct >= 97 ? 'good' : t.availabilityPct >= 92 ? 'warning' : 'critical',
          },
          {
            label: 'AI health score',
            value: String(t.healthScore),
            sub: 'Condition-weighted',
            tone: t.healthScore >= 85 ? 'good' : t.healthScore >= 70 ? 'warning' : t.healthScore >= 55 ? 'serious' : 'critical',
          },
          { label: 'Lifetime output', value: fmtMwh(t.lifetimeGenerationMwh, 0), sub: `${fmtNumber(t.operatingHours)} operating hours` },
        ]}
      />

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="mb-5">
          {TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ---------------------------------- Overview ---------------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
            <Card className="flex flex-col">
              <CardHeader>
                <div>
                  <CardTitle>{t.product}</CardTitle>
                  <CardDescription>{spec.positioning}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="h-[260px]">
                  <TurbineVisual
                    hubHeightM={spec.hubHeightM}
                    rotorDiameterM={spec.rotorDiameterM}
                    status={t.status}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Generation — last 24 hours</CardTitle>
                    <CardDescription>Hourly output in kilowatts</CardDescription>
                  </div>
                  <span className="kpi-value text-[18px] font-semibold text-[var(--ink)]">{fmtKw(t.currentPowerKw)}</span>
                </CardHeader>
                <CardContent>
                  <LineChart
                    showArea
                    height={172}
                    unit=" kW"
                    decimals={0}
                    axis={Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)}
                    series={[{ label: 'Output', values: t.generation24h }]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Specification</CardTitle>
                    <CardDescription>Certified product data for the {t.product} platform</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[12.5px] sm:grid-cols-3">
                    {[
                      ['Rated capacity', fmtMw(spec.ratedCapacityMw)],
                      ['Rotor diameter', `${spec.rotorDiameterM} m`],
                      ['Hub height', `${spec.hubHeightM} m`],
                      ['Blade length', `${spec.bladeLengthM} m`],
                      ['Swept area', `${fmtNumber(spec.sweptAreaM2)} m²`],
                      ['Cut-in / rated / cut-out', `${spec.cutInMs} / ${spec.ratedWindMs} / ${spec.cutOutMs} m/s`],
                      ['Generator', spec.generatorType],
                      ['Grid class', spec.gridClass],
                      ['Tower', t.towerType],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-[var(--ink-muted)]">{label}</dt>
                        <dd className="mt-0.5 font-medium text-[var(--ink)]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Component health</CardTitle>
                <CardDescription>Condition scores weighted by inspection findings and sensor trends</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => changeTab('components')}>
                Full breakdown
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {t.components.slice(0, 5).map((component) => (
                  <ComponentTile key={component.key} component={component} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------- Performance -------------------------------- */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Power curve</CardTitle>
                <CardDescription>
                  Measured output against the certified {t.product} curve — the primary underperformance signal
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <PowerCurveChart data={t.powerCurve} height={280} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Capacity factor</CardTitle>
                  <CardDescription>Delivered energy as a share of rated capacity</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-5">
                  <HealthRing value={t.capacityFactorPct} size={92} thickness={8} tone="info" />
                  <div className="min-w-0 space-y-1.5 text-[12.5px]">
                    <p className="text-[var(--ink-secondary)]">
                      This turbine converted <strong className="text-[var(--ink)]">{fmtPct(t.capacityFactorPct)}</strong>{' '}
                      of its rated capacity into delivered energy over the trailing month.
                    </p>
                    <p className="text-[var(--ink-muted)]">
                      Site mean wind {fmtSpeed(siteWeather?.windSpeedMs ?? t.windSpeedMs)} · {fmtNumber(t.operatingHours)} operating hours to date
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Sibling comparison</CardTitle>
                  <CardDescription>Health scores of neighbouring turbines at {t.windFarmName}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {t.siblings.slice(0, 8).map((sibling) => (
                    <li key={sibling.id}>
                      <Link
                        href={`/turbines/${sibling.id}`}
                        className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--subtle)]"
                      >
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--ink-secondary)]">
                          {sibling.name}
                        </span>
                        <TurbineStatusBadge status={sibling.status} />
                        <span className="w-20">
                          <Progress
                            value={sibling.healthScore}
                            color={
                              sibling.healthScore >= 85
                                ? TONE_VAR.good
                                : sibling.healthScore >= 70
                                  ? TONE_VAR.warning
                                  : TONE_VAR.critical
                            }
                          />
                        </span>
                        <span className="tabular w-7 text-right text-[12px] font-medium text-[var(--ink)]">
                          {sibling.healthScore}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --------------------------------- Telemetry --------------------------------- */}
        <TabsContent value="telemetry" className="space-y-4">
          <p className="text-[12.5px] text-[var(--ink-muted)]">
            Thirty-minute resolution over the last 24 hours, as reported by the turbine controller.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Wind and power</CardTitle>
                  <CardDescription>Two measures, two charts — never a shared axis</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <LineChart
                  height={150}
                  unit=" m/s"
                  decimals={1}
                  title="Wind speed"
                  axis={telemetryAxis}
                  series={[{ label: 'Wind speed', values: t.telemetry.map((p) => p.windSpeed) }]}
                />
                <LineChart
                  height={150}
                  unit=" kW"
                  decimals={0}
                  title="Active power"
                  showArea
                  axis={telemetryAxis}
                  series={[{ label: 'Active power', values: t.telemetry.map((p) => p.power) }]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Drivetrain temperatures</CardTitle>
                  <CardDescription>Gearbox, generator and nacelle, degrees Celsius</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <LineChart
                  height={330}
                  unit=" °C"
                  decimals={1}
                  axis={telemetryAxis}
                  series={[
                    { label: 'Gearbox', values: t.telemetry.map((p) => p.gearboxTemp) },
                    { label: 'Generator', values: t.telemetry.map((p) => p.generatorTemp) },
                    { label: 'Nacelle', values: t.telemetry.map((p) => p.nacelleTemp) },
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Rotor speed</CardTitle>
                  <CardDescription>Revolutions per minute</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <LineChart
                  height={150}
                  unit=" rpm"
                  decimals={1}
                  axis={telemetryAxis}
                  series={[{ label: 'Rotor speed', values: t.telemetry.map((p) => p.rotorRpm) }]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Pitch angle</CardTitle>
                  <CardDescription>Collective blade pitch, degrees</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <LineChart
                  height={150}
                  unit="°"
                  decimals={1}
                  axis={telemetryAxis}
                  series={[{ label: 'Pitch angle', values: t.telemetry.map((p) => p.pitchAngle) }]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Vibration</CardTitle>
                  <CardDescription>Drivetrain RMS, mm/s</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <LineChart
                  height={150}
                  unit=" mm/s"
                  decimals={2}
                  axis={telemetryAxis}
                  series={[{ label: 'Vibration RMS', values: t.telemetry.map((p) => p.vibration) }]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ----------------------------------- Alarms ----------------------------------- */}
        <TabsContent value="alarms">
          {t.alarmHistory.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No alarms on record"
              description="This turbine has not raised a controller alarm in the retained history window."
            />
          ) : (
            <DataTable
              rows={t.alarmHistory}
              rowKey={(a) => a.id}
              caption="Alarm history for this turbine"
              defaultSort={{ key: 'raised', dir: 'desc' }}
              columns={[
                {
                  key: 'title',
                  header: 'Alarm',
                  width: '34%',
                  sortValue: (a) => a.title,
                  render: (a) => <CellTitle title={a.title} subtitle={`${a.code} · ${a.category}`} />,
                },
                { key: 'severity', header: 'Severity', render: (a) => <SeverityBadge severity={a.severity} /> },
                {
                  key: 'state',
                  header: 'State',
                  render: (a) =>
                    a.clearedAt ? (
                      <Badge tone="good" dot>
                        Cleared
                      </Badge>
                    ) : a.acknowledgedAt ? (
                      <Badge tone="warning" dot>
                        Acknowledged
                      </Badge>
                    ) : (
                      <Badge tone="critical" dot>
                        Unacknowledged
                      </Badge>
                    ),
                },
                {
                  key: 'raised',
                  header: 'Raised',
                  numeric: true,
                  sortValue: (a) => a.raisedAt,
                  render: (a) => fmtRelative(a.raisedAt),
                },
                {
                  key: 'downtime',
                  header: 'Downtime',
                  numeric: true,
                  hideBelow: 'md',
                  sortValue: (a) => a.downtimeMinutes,
                  render: (a) => fmtDuration(a.downtimeMinutes / 60),
                },
              ]}
            />
          )}
        </TabsContent>

        {/* -------------------------------- Maintenance -------------------------------- */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">Last service</p>
              <p className="kpi-value mt-1.5 text-[18px] font-semibold text-[var(--ink)]">{fmtDate(t.lastMaintenance)}</p>
              <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">{fmtRelative(t.lastMaintenance)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">Next service</p>
              <p className="kpi-value mt-1.5 text-[18px] font-semibold text-[var(--ink)]">{fmtDate(t.nextMaintenance)}</p>
              <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">{fmtRelative(t.nextMaintenance)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">Open work orders</p>
              <p className="kpi-value mt-1.5 text-[18px] font-semibold text-[var(--ink)]">{openOrders.length}</p>
              <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">
                {(orders.data ?? []).length} in total against this asset
              </p>
            </Card>
          </div>

          {(orders.data ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Work orders</CardTitle>
                  <CardDescription>Jobs raised against this turbine</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <DataTable
                  className="rounded-none border-0 shadow-none"
                  rows={orders.data!}
                  rowKey={(w) => w.id}
                  href={(w) => `/maintenance/${w.id}`}
                  caption="Work orders for this turbine"
                  columns={[
                    {
                      key: 'title',
                      header: 'Work order',
                      width: '38%',
                      render: (w) => <CellTitle title={w.title} subtitle={w.id} />,
                    },
                    { key: 'type', header: 'Type', render: (w) => <Chip>{w.type}</Chip> },
                    { key: 'priority', header: 'Priority', render: (w) => <SeverityBadge severity={w.priority} /> },
                    { key: 'tech', header: 'Technician', hideBelow: 'md', render: (w) => w.technicianName },
                    {
                      key: 'scheduled',
                      header: 'Scheduled',
                      numeric: true,
                      sortValue: (w) => w.scheduledFor,
                      render: (w) => fmtDate(w.scheduledFor),
                    },
                  ]}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Service history</CardTitle>
                <CardDescription>Completed interventions on this asset</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-[var(--line)] pl-5">
                {t.maintenanceHistory.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[26px] top-1 size-2.5 rounded-full ring-4 ring-[var(--surface)]"
                      style={{
                        backgroundColor:
                          entry.type === 'breakdown'
                            ? TONE_VAR.critical
                            : entry.type === 'corrective'
                              ? TONE_VAR.warning
                              : TONE_VAR.good,
                      }}
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13px] font-medium text-[var(--ink)]">{entry.summary}</p>
                      <time className="text-[11px] text-[var(--ink-muted)]">{fmtDate(entry.date)}</time>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">
                      <Chip className="mr-1.5">{entry.type}</Chip>
                      {entry.technician} · {fmtDuration(entry.hours)}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------------- Components --------------------------------- */}
        <TabsContent value="components">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {t.components.map((component) => (
              <ComponentTile key={component.key} component={component} expanded />
            ))}
          </div>
        </TabsContent>

        {/* --------------------------------- Documents --------------------------------- */}
        <TabsContent value="documents">
          {(documents.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents linked"
              description="Warranty certificates, inspection reports and drawings attached to this asset will appear here."
            />
          ) : (
            <DataTable
              rows={documents.data!}
              rowKey={(d) => d.id}
              caption="Documents linked to this turbine"
              defaultSort={{ key: 'at', dir: 'desc' }}
              columns={[
                {
                  key: 'name',
                  header: 'Document',
                  width: '48%',
                  render: (d) => <CellTitle title={d.name} subtitle={`${d.category} · ${d.version}`} />,
                },
                { key: 'type', header: 'Type', render: (d) => <Chip>{d.fileType.toUpperCase()}</Chip> },
                { key: 'by', header: 'Uploaded by', hideBelow: 'md', render: (d) => d.uploadedBy },
                {
                  key: 'at',
                  header: 'Uploaded',
                  numeric: true,
                  sortValue: (d) => d.uploadedAt,
                  render: (d) => fmtRelative(d.uploadedAt),
                },
              ]}
            />
          )}
        </TabsContent>

        {/* -------------------------------- Environment -------------------------------- */}
        <TabsContent value="environment">
          {siteWeather ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Conditions at {t.windFarmName}</CardTitle>
                    <CardDescription>Observed {fmtRelative(siteWeather.observedAt)}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12.5px]">
                    {[
                      ['Wind speed', fmtSpeed(siteWeather.windSpeedMs)],
                      ['Gust', fmtSpeed(siteWeather.windGustMs)],
                      ['Direction', fmtBearing(siteWeather.windDirectionDeg)],
                      ['Temperature', fmtTemp(siteWeather.temperatureC)],
                      ['Humidity', `${siteWeather.humidityPct}%`],
                      ['Rainfall', `${fmtNumber(siteWeather.rainfallMm, 1)} mm`],
                      ['Visibility', `${fmtNumber(siteWeather.visibilityKm, 1)} km`],
                      ['Pressure', `${fmtNumber(siteWeather.pressureHpa, 1)} hPa`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-[var(--ink-muted)]">{label}</dt>
                        <dd className="mt-0.5 font-medium text-[var(--ink)]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Wind forecast</CardTitle>
                    <CardDescription>Next 36 hours against the {spec.cutOutMs} m/s cut-out</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <LineChart
                    height={220}
                    unit=" m/s"
                    decimals={1}
                    yMin={0}
                    axis={siteWeather.forecast.map((_, i) => `+${i * 3} h`)}
                    series={[
                      { label: 'Mean wind', values: siteWeather.forecast.map((f) => f.windSpeedMs) },
                      { label: 'Gust', values: siteWeather.forecast.map((f) => f.gustMs) },
                      {
                        label: 'Cut-out',
                        values: siteWeather.forecast.map(() => spec.cutOutMs),
                        color: 'var(--status-critical)',
                        dashed: true,
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <EmptyState
              icon={CloudSun}
              title="No weather observation"
              description="The meteorological feed has not returned a current observation for this site."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ComponentTile({ component, expanded }: { component: ComponentHealth; expanded?: boolean }) {
  const tone =
    component.score >= 85 ? 'good' : component.score >= 70 ? 'warning' : component.score >= 55 ? 'serious' : 'critical'

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--elevated)] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-medium text-[var(--ink)]">{component.label}</p>
        <HealthRing value={component.score} size={34} thickness={3.5} label={component.label} />
      </div>
      <div className="mt-2.5">
        <Sparkline values={component.history} width={expanded ? 150 : 120} height={26} tone={tone} />
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
        <span
          style={{
            color:
              component.trend.direction === 'up'
                ? 'var(--delta-up)'
                : component.trend.direction === 'down'
                  ? 'var(--delta-down)'
                  : undefined,
          }}
        >
          {component.trend.direction === 'up' ? '↑' : component.trend.direction === 'down' ? '↓' : '→'}{' '}
          {component.trend.valuePct}
        </span>
        over 12 months
      </p>
      {expanded && (
        <>
          <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--ink-secondary)]">{component.note}</p>
          <p className="mt-1.5 text-[10.5px] text-[var(--ink-muted)]">
            Last inspected {fmtRelative(component.lastInspection)}
          </p>
        </>
      )}
    </div>
  )
}
