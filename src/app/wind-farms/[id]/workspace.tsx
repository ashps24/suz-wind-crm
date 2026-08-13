'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowSquareOut,
  Buildings,
  CalendarBlank,
  CloudSun,
  FileText,
  Gauge,
  HardHat,
  MapPin,
  Sparkle,
  Warning,
  Wind,
  Wrench,
} from '@phosphor-icons/react/dist/ssr'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Progress, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives'
import { BarChart, DonutChart, HealthRing, Heatmap, LineChart, Sparkline, StackedBar } from '@/components/charts'
import { RiskBadge, SeverityBadge, SiteStatusBadge, TurbineStatusBadge, WorkOrderStatusBadge } from '@/components/cards/status'
import { SiteImage } from '@/components/cards/site-image'
import { DetailHeader, StatStrip } from '@/components/layout/detail-header'
import { SiteDigitalTwin } from '@/components/maps/site-twin'
import { CellTitle, DataTable, type Column } from '@/components/tables/data-table'
import { CardGridSkeleton, ChartSkeleton, EmptyState, ErrorState, TableSkeleton } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { PRODUCT_SPECS, TONE_VAR, TURBINE_STATUS, TURBINE_STATUS_ORDER } from '@/lib/constants'
import {
  fmtBearing,
  fmtDate,
  fmtDateShort,
  fmtGwh,
  fmtKw,
  fmtMw,
  fmtMwh,
  fmtNumber,
  fmtPct,
  fmtRelative,
  fmtSpeed,
  fmtTemp,
} from '@/lib/formatters'
import { daysAgo } from '@/lib/utils'
import type { Turbine, WorkOrder } from '@/types'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'map', label: 'Digital twin' },
  { value: 'turbines', label: 'Turbines' },
  { value: 'generation', label: 'Generation' },
  { value: 'environment', label: 'Environment' },
  { value: 'projects', label: 'Projects' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'documents', label: 'Documents' },
  { value: 'activity', label: 'Activity' },
]

export function WindFarmWorkspace({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') ?? 'overview'
  const [tab, setTab] = React.useState(TABS.some((t) => t.value === initialTab) ? initialTab : 'overview')

  const farm = useQuery({ queryKey: ['wind-farms', id], queryFn: () => api.windFarms.detail(id) })
  const turbines = useQuery({ queryKey: ['wind-farms', id, 'turbines'], queryFn: () => api.windFarms.turbines(id) })
  const alarms = useQuery({ queryKey: ['wind-farms', id, 'alarms'], queryFn: () => api.windFarms.alarms(id) })
  const workOrders = useQuery({ queryKey: ['wind-farms', id, 'orders'], queryFn: () => api.windFarms.workOrders(id) })
  const projects = useQuery({ queryKey: ['wind-farms', id, 'projects'], queryFn: () => api.windFarms.projects(id) })
  const documents = useQuery({ queryKey: ['wind-farms', id, 'docs'], queryFn: () => api.windFarms.documents(id) })
  const weather = useQuery({ queryKey: ['environment', 'weather'], queryFn: api.environment.weather })
  const technicians = useQuery({ queryKey: ['technicians'], queryFn: api.technicians.list })
  const events = useQuery({ queryKey: ['environment', 'events'], queryFn: api.environment.events })

  if (farm.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="This wind farm could not be loaded"
          description={farm.error instanceof Error ? farm.error.message : undefined}
          onRetry={() => farm.refetch()}
        />
      </div>
    )
  }

  if (farm.isPending || !farm.data) {
    return (
      <div className="mx-auto w-full max-w-[110rem] px-4 pb-16 pt-5 md:px-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <CardGridSkeleton count={6} height={200} />
        </div>
      </div>
    )
  }

  const site = farm.data
  const siteTurbines = turbines.data ?? []
  const siteWeather = weather.data?.find((w) => w.windFarmId === id)
  const siteTechs = (technicians.data ?? []).filter((t) => t.state === site.state)
  const openOrders = (workOrders.data ?? []).filter((w) => w.status !== 'completed' && w.status !== 'cancelled')
  const siteEvents = (events.data ?? []).filter((e) => e.affectedSiteIds.includes(id))

  const statusSegments = TURBINE_STATUS_ORDER.map((status) => ({
    label: TURBINE_STATUS[status].label,
    value: siteTurbines.filter((t) => t.status === status).length,
    color: TONE_VAR[TURBINE_STATUS[status].tone],
  })).filter((s) => s.value > 0)

  function changeTab(value: string) {
    setTab(value)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    router.replace(`${url.pathname}${url.search}`, { scroll: false })
  }

  return (
    <div className="mx-auto w-full max-w-[110rem] px-4 pb-16 pt-5 md:px-6">
      <DetailHeader
        backHref="/wind-farms"
        backLabel="All wind farms"
        eyebrow={site.code}
        title={site.name}
        media={
          <SiteImage
            src={site.heroImage}
            alt={`${site.name}`}
            className="h-24 w-40 shrink-0 rounded-xl"
            overlay={false}
          />
        }
        meta={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {site.district}, {site.state}
            </span>
            <span aria-hidden>·</span>
            <Link href={`/crm/accounts/${site.customerId}`} className="inline-flex items-center gap-1 hover:text-[var(--brand)]">
              <Buildings className="size-3.5" aria-hidden />
              {site.customerName}
            </Link>
            <span aria-hidden>·</span>
            <span>Commissioned {fmtDate(site.commissionedOn)}</span>
          </span>
        }
        badges={
          <>
            <SiteStatusBadge status={site.status} />
            <RiskBadge band={site.riskBand} prefix="Risk: " />
            {site.products.map((p) => (
              <Chip key={p}>{p}</Chip>
            ))}
            <Chip>{site.o_and_mContract}</Chip>
          </>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/maintenance?site=${site.id}`}>
                <Wrench aria-hidden />
                Work orders
                <Badge tone="neutral">{openOrders.length}</Badge>
              </Link>
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link href="/command-center">
                <Sparkle aria-hidden />
                Command Center
              </Link>
            </Button>
          </>
        }
      />

      <StatStrip
        className="mb-5"
        items={[
          { label: 'Installed', value: fmtMw(site.installedMw), sub: `${site.turbineCount} turbines` },
          {
            label: 'Generating',
            value: fmtMw(site.currentGenerationMw),
            sub: `PLF ${fmtPct(site.plfPct)}`,
            tone: site.plfPct > 30 ? 'good' : site.plfPct > 15 ? 'warning' : 'serious',
          },
          {
            label: 'Availability',
            value: fmtPct(site.availabilityPct),
            sub: 'Time-based, 30 d',
            tone: site.availabilityPct >= 97 ? 'good' : site.availabilityPct >= 94 ? 'warning' : 'critical',
          },
          { label: 'Today', value: fmtMwh(site.generationTodayMwh, 0), sub: 'Delivered energy' },
          { label: 'Month to date', value: fmtGwh(site.generationMtdGwh), sub: 'Delivered energy' },
          {
            label: 'Active alerts',
            value: fmtNumber(site.activeAlerts),
            sub: `${openOrders.length} open work orders`,
            tone: site.activeAlerts > 0 ? 'critical' : 'good',
          },
        ]}
      />

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="mb-5">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ---------------------------------- Overview ---------------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Generation — last 24 hours</CardTitle>
                  <CardDescription>Site output in megawatts, hour by hour</CardDescription>
                </div>
                <span className="kpi-value text-[20px] font-semibold text-[var(--ink)]">
                  {fmtMw(site.currentGenerationMw)}
                </span>
              </CardHeader>
              <CardContent>
                <LineChart
                  showArea
                  height={200}
                  unit=" MW"
                  decimals={1}
                  axis={Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)}
                  series={[{ label: 'Site output', values: site.generation24h }]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Fleet status</CardTitle>
                  <CardDescription>{site.turbineCount} turbines</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={statusSegments}
                  size={132}
                  centerValue={fmtPct(site.availabilityPct, 0)}
                  centerLabel="availability"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Availability — last 30 days</CardTitle>
                  <CardDescription>Measured against the {site.o_and_mContract} guarantee</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <LineChart
                  height={190}
                  unit="%"
                  decimals={1}
                  yMin={Math.min(...site.availability30d) - 2}
                  yMax={100}
                  axis={Array.from({ length: 30 }, (_, i) => fmtDateShort(daysAgo(29 - i)))}
                  series={[
                    { label: 'Actual', values: site.availability30d },
                    {
                      label: 'Guarantee',
                      values: Array.from({ length: 30 }, () => (site.o_and_mContract === 'Full-Scope 15yr' ? 98 : 97)),
                      color: 'var(--axis)',
                      dashed: true,
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Site profile</CardTitle>
                  <CardDescription>Engineering and commercial reference</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2.5 text-[12.5px]">
                  {[
                    ['Mean wind speed', fmtSpeed(site.meanWindSpeedMs)],
                    ['Grid substation', site.gridSubstation],
                    ['Evacuation', `${site.evacuationVoltageKv} kV`],
                    ['Land area', `${fmtNumber(site.landAreaHectares)} ha`],
                    ['Site manager', site.siteManager],
                    ['O&M contract', site.o_and_mContract],
                    ['Contract expiry', fmtDate(site.contractExpiry)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-4">
                      <dt className="text-[var(--ink-muted)]">{label}</dt>
                      <dd className="text-right font-medium text-[var(--ink)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Active alarms</CardTitle>
                  <CardDescription>Open faults across the site</CardDescription>
                </div>
                {(alarms.data?.length ?? 0) > 0 && <Badge tone="critical" dot>{alarms.data!.length}</Badge>}
              </CardHeader>
              <CardContent>
                {alarms.isPending ? (
                  <ChartSkeleton height={120} />
                ) : (alarms.data?.length ?? 0) === 0 ? (
                  <EmptyState
                    compact
                    icon={Gauge}
                    title="No active alarms"
                    description="Every turbine at this site is reporting a clean control status."
                  />
                ) : (
                  <ul className="space-y-2">
                    {alarms.data!.slice(0, 6).map((alarm) => (
                      <li key={alarm.id}>
                        <Link
                          href={`/turbines/${alarm.turbineId}?tab=alarms`}
                          className="flex items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5 transition-colors hover:border-[var(--line-strong)]"
                        >
                          <Warning className="mt-0.5 size-4 shrink-0" style={{ color: TONE_VAR.serious }} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] font-medium text-[var(--ink)]">{alarm.title}</span>
                            <span className="block truncate text-[11px] text-[var(--ink-muted)]">
                              {alarm.turbineName} · {alarm.code} · {fmtRelative(alarm.raisedAt)}
                            </span>
                          </span>
                          <SeverityBadge severity={alarm.severity} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Environmental exposure</CardTitle>
                  <CardDescription>Events with this site in scope</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {siteEvents.length === 0 ? (
                  <EmptyState
                    compact
                    icon={CloudSun}
                    title="No active environmental events"
                    description="No cyclone, seismic, flood or lightning activity currently places this site under watch."
                  />
                ) : (
                  <ul className="space-y-2">
                    {siteEvents.map((event) => (
                      <li
                        key={event.id}
                        className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12.5px] font-medium text-[var(--ink)]">{event.title}</p>
                          <SeverityBadge severity={event.severity} />
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                          {event.detail} · {fmtRelative(event.occurredAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 rounded-lg bg-[var(--subtle)] px-3 py-2 text-[11px] leading-relaxed text-[var(--ink-muted)]">
                  Environmental alerts are decision-support signals, not evidence of damage. Inspections confirm asset condition.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -------------------------------- Digital twin -------------------------------- */}
        <TabsContent value="map" className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3.5">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--ink)]">Site digital twin</h3>
                <p className="mt-0.5 text-[12.5px] text-[var(--ink-muted)]">
                  Real micro-siting geometry · turbine status, open work orders and crew positions
                </p>
              </div>
              <StackedBar segments={statusSegments} height={8} showLegend={false} className="w-40" />
            </div>
            <div className="h-[min(62vh,34rem)]">
              {turbines.isPending ? (
                <div className="flex h-full items-center justify-center bg-[var(--map-water)]">
                  <p className="text-[13px] text-[var(--ink-muted)]">Loading site geometry…</p>
                </div>
              ) : (
                <SiteDigitalTwin
                  farm={site}
                  turbines={siteTurbines}
                  workOrders={workOrders.data ?? []}
                  technicians={siteTechs.filter((t) => t.status === 'on-site')}
                  weather={siteWeather}
                  onSelectTurbine={(tid) => router.push(`/turbines/${tid}`)}
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Turbine positions</CardTitle>
                <CardDescription>Text equivalent of the site plan</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <TurbineTable turbines={siteTurbines} loading={turbines.isPending} maxHeight={340} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------- Turbines ---------------------------------- */}
        <TabsContent value="turbines">
          <TurbineTable turbines={siteTurbines} loading={turbines.isPending} />
        </TabsContent>

        {/* --------------------------------- Generation --------------------------------- */}
        <TabsContent value="generation" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Hourly output</CardTitle>
                  <CardDescription>Last 24 hours, megawatts</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <BarChart
                  height={220}
                  unit=" MW"
                  decimals={1}
                  color="var(--series-1)"
                  data={site.generation24h.map((v, i) => ({ label: `${String(i).padStart(2, '0')}:00`, value: v }))}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Output by turbine</CardTitle>
                  <CardDescription>Current power, top 12 producers</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <BarChart
                  horizontal
                  unit=" kW"
                  color="var(--series-3)"
                  data={[...siteTurbines]
                    .sort((a, b) => b.currentPowerKw - a.currentPowerKw)
                    .slice(0, 12)
                    .map((t) => ({ label: t.name.split('-').slice(-1)[0]!, value: t.currentPowerKw }))}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Capacity factor by turbine</CardTitle>
                <CardDescription>Percent of rated capacity delivered over the trailing month</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <BarChart
                height={200}
                unit="%"
                decimals={0}
                color="var(--series-1)"
                data={siteTurbines.slice(0, 30).map((t) => ({
                  label: t.name.split('-').slice(-1)[0]!,
                  value: t.capacityFactorPct,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------- Environment -------------------------------- */}
        <TabsContent value="environment" className="space-y-4">
          {siteWeather ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Wind speed', value: fmtSpeed(siteWeather.windSpeedMs), sub: `gusting ${fmtSpeed(siteWeather.windGustMs)}` },
                  { label: 'Direction', value: fmtBearing(siteWeather.windDirectionDeg), sub: 'Ten-minute mean' },
                  { label: 'Temperature', value: fmtTemp(siteWeather.temperatureC), sub: `${siteWeather.humidityPct}% humidity` },
                  { label: 'Conditions', value: siteWeather.condition, sub: `${fmtNumber(siteWeather.rainfallMm, 1)} mm rain · ${fmtNumber(siteWeather.visibilityKm, 1)} km visibility` },
                ].map((item) => (
                  <Card key={item.label} className="p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">
                      {item.label}
                    </p>
                    <p className="kpi-value mt-1.5 text-[20px] font-semibold leading-none text-[var(--ink)]">
                      {item.value}
                    </p>
                    <p className="mt-1.5 text-[11.5px] text-[var(--ink-muted)]">{item.sub}</p>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>36-hour wind forecast</CardTitle>
                    <CardDescription>Three-hourly mean and gust, against the 25 m/s cut-out</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <LineChart
                    height={220}
                    unit=" m/s"
                    decimals={1}
                    yMin={0}
                    axis={siteWeather.forecast.map((f) => `+${siteWeather.forecast.indexOf(f) * 3} h`)}
                    series={[
                      { label: 'Mean wind', values: siteWeather.forecast.map((f) => f.windSpeedMs) },
                      { label: 'Gust', values: siteWeather.forecast.map((f) => f.gustMs) },
                      {
                        label: 'Cut-out',
                        values: siteWeather.forecast.map(() => 25),
                        color: 'var(--status-critical)',
                        dashed: true,
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              icon={CloudSun}
              title="Weather feed unavailable"
              description="The meteorological source has not returned an observation for this site in the current window."
            />
          )}

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Environmental events in scope</CardTitle>
                <CardDescription>Decision-support signals, not evidence of damage</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/environment">
                  Open Environment
                  <ArrowSquareOut aria-hidden />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {siteEvents.length === 0 ? (
                <EmptyState
                  compact
                  icon={CloudSun}
                  title="No active events"
                  description="Nothing currently places this site inside a cyclone, seismic, flood or lightning watch area."
                />
              ) : (
                <ul className="space-y-2">
                  {siteEvents.map((event) => (
                    <li key={event.id} className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3.5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-medium text-[var(--ink)]">{event.title}</p>
                          <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">{event.detail}</p>
                        </div>
                        <SeverityBadge severity={event.severity} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------- Projects ---------------------------------- */}
        <TabsContent value="projects">
          {(projects.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={HardHat}
              title="No projects at this site"
              description="No EPC, repowering or O&M transition project is currently linked to this wind farm."
              action={
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/projects">Browse all projects</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {projects.data!.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="panel block p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--ink)]">{project.name}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--ink-muted)]">
                        {project.code} · {project.type} · {fmtMw(project.capacityMw)}
                      </p>
                    </div>
                    <RiskBadge band={project.risk} />
                  </div>
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                      <span className="text-[var(--ink-muted)]">{project.stage}</span>
                      <span className="tabular font-medium text-[var(--ink)]">{project.completionPct}%</span>
                    </div>
                    <Progress value={project.completionPct} />
                  </div>
                  <p className="mt-2.5 text-[11.5px] text-[var(--ink-muted)]">
                    Target {fmtDate(project.targetCommissioning)}
                    {project.delayDays > 0 && (
                      <span style={{ color: 'var(--delta-down)' }}> · {project.delayDays} days late</span>
                    )}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* -------------------------------- Maintenance -------------------------------- */}
        <TabsContent value="maintenance">
          <WorkOrderTable orders={workOrders.data ?? []} loading={workOrders.isPending} />
        </TabsContent>

        {/* --------------------------------- Documents --------------------------------- */}
        <TabsContent value="documents">
          {documents.isPending ? (
            <TableSkeleton rows={6} cols={4} />
          ) : (documents.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents linked"
              description="Contracts, drawings, wind reports and inspection records attached to this site will appear here."
            />
          ) : (
            <DataTable
              rows={documents.data!}
              rowKey={(d) => d.id}
              caption="Documents linked to this wind farm"
              columns={[
                {
                  key: 'name',
                  header: 'Document',
                  width: '46%',
                  sortValue: (d) => d.name,
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
              defaultSort={{ key: 'at', dir: 'desc' }}
            />
          )}
        </TabsContent>

        {/* ---------------------------------- Activity ---------------------------------- */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Site activity</CardTitle>
                <CardDescription>Alarms, work orders and environmental events in chronological order</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-[var(--line)] pl-5">
                {[
                  ...(alarms.data ?? []).map((a) => ({
                    at: a.raisedAt,
                    title: `${a.code} — ${a.title}`,
                    detail: `${a.turbineName} · ${a.description}`,
                    tone: 'serious' as const,
                    actor: 'SCADA',
                  })),
                  ...(workOrders.data ?? []).slice(0, 10).map((w) => ({
                    at: w.createdAt,
                    title: `${w.id} — ${w.title}`,
                    detail: `${w.turbineName} · assigned to ${w.technicianName}`,
                    tone: 'info' as const,
                    actor: w.technicianName,
                  })),
                  ...siteEvents.map((e) => ({
                    at: e.occurredAt,
                    title: e.title,
                    detail: e.detail,
                    tone: 'warning' as const,
                    actor: 'Environmental Intelligence',
                  })),
                ]
                  .sort((a, b) => (a.at < b.at ? 1 : -1))
                  .slice(0, 18)
                  .map((entry, i) => (
                    <li key={i} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[26px] top-1 size-2.5 rounded-full ring-4 ring-[var(--surface)]"
                        style={{ backgroundColor: `var(--status-${entry.tone})` }}
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[13px] font-medium text-[var(--ink)]">{entry.title}</p>
                        <time className="text-[11px] text-[var(--ink-muted)]">{fmtRelative(entry.at)}</time>
                      </div>
                      <p className="mt-0.5 text-[12px] text-[var(--ink-muted)]">{entry.detail}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">{entry.actor}</p>
                    </li>
                  ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* --------------------------------- Sub-tables --------------------------------- */

function TurbineTable({
  turbines,
  loading,
  maxHeight,
}: {
  turbines: Turbine[]
  loading: boolean
  maxHeight?: number
}) {
  if (loading) return <TableSkeleton rows={10} cols={7} />
  if (turbines.length === 0) {
    return (
      <EmptyState
        icon={Wind}
        title="No turbines recorded"
        description="Turbine records appear here once micro-siting is frozen and assets are created."
      />
    )
  }

  const columns: Column<Turbine>[] = [
    {
      key: 'name',
      header: 'Turbine',
      width: '22%',
      sortValue: (t) => t.name,
      render: (t) => <CellTitle title={t.name} subtitle={`${t.product} · ${PRODUCT_SPECS[t.product].ratedCapacityMw} MW`} />,
    },
    { key: 'status', header: 'Status', sortValue: (t) => t.status, render: (t) => <TurbineStatusBadge status={t.status} /> },
    { key: 'power', header: 'Power', numeric: true, sortValue: (t) => t.currentPowerKw, render: (t) => fmtKw(t.currentPowerKw) },
    { key: 'wind', header: 'Wind', numeric: true, hideBelow: 'md', sortValue: (t) => t.windSpeedMs, render: (t) => fmtSpeed(t.windSpeedMs) },
    {
      key: 'avail',
      header: 'Availability',
      numeric: true,
      sortValue: (t) => t.availabilityPct,
      render: (t) => fmtPct(t.availabilityPct),
    },
    {
      key: 'health',
      header: 'Health',
      sortValue: (t) => t.healthScore,
      render: (t) => (
        <span className="flex items-center justify-end gap-2">
          <HealthRing value={t.healthScore} size={26} thickness={3} showValue={false} />
          <span className="tabular text-[12.5px] font-medium text-[var(--ink)]">{t.healthScore}</span>
        </span>
      ),
      numeric: true,
    },
    {
      key: 'alarm',
      header: 'Active alarm',
      hideBelow: 'lg',
      render: (t) =>
        t.activeAlarm ? (
          <span className="text-[12px]" style={{ color: TONE_VAR.serious }}>
            {t.activeAlarm}
          </span>
        ) : (
          <span className="text-[var(--ink-muted)]">—</span>
        ),
    },
  ]

  return (
    <DataTable
      rows={turbines}
      columns={columns}
      rowKey={(t) => t.id}
      href={(t) => `/turbines/${t.id}`}
      caption="Turbines at this wind farm"
      defaultSort={{ key: 'health', dir: 'asc' }}
      maxHeight={maxHeight}
      className={maxHeight ? 'rounded-none border-0 shadow-none' : undefined}
    />
  )
}

function WorkOrderTable({ orders, loading }: { orders: WorkOrder[]; loading: boolean }) {
  if (loading) return <TableSkeleton rows={8} cols={6} />
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={CalendarBlank}
        title="No work orders at this site"
        description="Preventive, predictive and corrective jobs raised against this site will appear here."
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/maintenance">Open maintenance queue</Link>
          </Button>
        }
      />
    )
  }

  return (
    <DataTable
      rows={orders}
      rowKey={(w) => w.id}
      href={(w) => `/maintenance/${w.id}`}
      caption="Work orders at this wind farm"
      defaultSort={{ key: 'scheduled', dir: 'asc' }}
      columns={[
        {
          key: 'id',
          header: 'Work order',
          width: '26%',
          sortValue: (w) => w.id,
          render: (w) => <CellTitle title={w.title} subtitle={`${w.id} · ${w.turbineName}`} />,
        },
        { key: 'type', header: 'Type', sortValue: (w) => w.type, render: (w) => <Chip>{w.type}</Chip> },
        { key: 'priority', header: 'Priority', render: (w) => <SeverityBadge severity={w.priority} /> },
        { key: 'status', header: 'Status', sortValue: (w) => w.status, render: (w) => <WorkOrderStatusBadge status={w.status} /> },
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
  )
}
