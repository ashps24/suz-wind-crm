'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle,
  CloudLightning,
  Drop,
  Info,
  Lightning,
  Tornado,
  Waves,
  Wind as WindIcon,
} from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
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
import { BarChart, LineChart } from '@/components/charts'
import { KpiCard } from '@/components/cards/kpi'
import { RiskBadge, SeverityBadge } from '@/components/cards/status'
import { CellTitle, DataTable } from '@/components/tables/data-table'
import { CardGridSkeleton, EmptyState, KpiSkeleton, QueryState, TableSkeleton } from '@/components/feedback/states'
import {
  IndiaMapCanvas,
  defaultTransform,
  type MapTransform,
} from '@/components/maps/india-map'
import {
  CycloneOverlay,
  EarthquakeOverlay,
  FloodOverlay,
  LightningOverlay,
  WindFarmMarkers,
} from '@/components/maps/overlays'
import { api } from '@/lib/api'
import { TONE_VAR } from '@/lib/constants'
import {
  fmtBearing,
  fmtDate,
  fmtDateTime,
  fmtDistance,
  fmtNumber,
  fmtRelative,
  fmtSpeed,
  fmtTemp,
} from '@/lib/formatters'
import type { Cyclone, EarthquakeEvent } from '@/types'

export function EnvironmentView() {
  const searchParams = useSearchParams()
  const focusedEvent = searchParams.get('event')
  const initialTab = searchParams.get('tab') ?? deriveTab(focusedEvent)
  const [tab, setTab] = React.useState(initialTab)

  const summary = useQuery({ queryKey: ['environment', 'summary'], queryFn: api.environment.summary })
  const cyclones = useQuery({ queryKey: ['environment', 'cyclones'], queryFn: api.environment.cyclones })
  const earthquakes = useQuery({ queryKey: ['environment', 'earthquakes'], queryFn: api.environment.earthquakes })
  const tsunami = useQuery({ queryKey: ['environment', 'tsunami'], queryFn: api.environment.tsunami })
  const lightning = useQuery({ queryKey: ['environment', 'lightning'], queryFn: api.environment.lightning })
  const floods = useQuery({ queryKey: ['environment', 'floods'], queryFn: api.environment.floods })
  const weather = useQuery({ queryKey: ['environment', 'weather'], queryFn: api.environment.weather })
  const events = useQuery({ queryKey: ['environment', 'events'], queryFn: api.environment.events })
  const farms = useQuery({ queryKey: ['wind-farms'], queryFn: api.windFarms.list })

  return (
    <Page
      title="Environmental Intelligence"
      description="Weather, seismic, cyclone, tsunami, lightning and flood exposure across the wind fleet."
      wide
    >
      <div
        className="mb-5 flex items-start gap-3 rounded-xl border px-4 py-3"
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--subtle)' }}
      >
        <Info className="mt-0.5 size-4 shrink-0 text-[var(--ink-muted)]" weight="fill" aria-hidden />
        <p className="text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">
          Environmental alerts are <strong className="text-[var(--ink)]">decision-support signals, not proof of damage</strong>.
          They exist to trigger inspection and protective action. Asset condition is confirmed by the inspection that
          follows, not by the alert itself.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        {summary.isPending ? (
          <KpiSkeleton count={8} />
        ) : summary.data ? (
          <>
            <KpiCard label="Active alerts" value={fmtNumber(summary.data.activeAlerts)} emphasis="critical" icon={CloudLightning} />
            <KpiCard label="Sites under watch" value={fmtNumber(summary.data.sitesUnderWatch)} emphasis="warning" />
            <KpiCard label="Active cyclones" value={fmtNumber(summary.data.activeCyclones)} icon={Tornado} />
            <KpiCard label="Seismic events" value={fmtNumber(summary.data.seismicEvents14d)} trendLabel="Last 14 days" />
            <KpiCard label="Tsunami advisories" value={fmtNumber(summary.data.activeTsunamiAdvisories)} icon={Waves} />
            <KpiCard label="Strikes / hour" value={fmtNumber(summary.data.strikesLastHour)} icon={Lightning} />
            <KpiCard label="Basins elevated" value={fmtNumber(summary.data.basinsElevated)} icon={Drop} />
            <KpiCard label="Inspections open" value={fmtNumber(summary.data.inspectionsOutstanding)} emphasis="warning" />
          </>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="cyclones">Cyclones</TabsTrigger>
          <TabsTrigger value="earthquakes">Earthquakes</TabsTrigger>
          <TabsTrigger value="tsunami">Tsunami</TabsTrigger>
          <TabsTrigger value="lightning">Lightning</TabsTrigger>
          <TabsTrigger value="flood">Flood risk</TabsTrigger>
        </TabsList>

        {/* ---------------------------------- Overview ---------------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-[var(--line)] px-5 py-3.5">
              <h3 className="text-[15px] font-semibold text-[var(--ink)]">National hazard picture</h3>
              <p className="mt-0.5 text-[12.5px] text-[var(--ink-muted)]">
                Cyclone tracks, seismic events, flood basins and lightning clusters against the operating fleet
              </p>
            </div>
            <div className="h-[min(58vh,30rem)]">
              <HazardMap
                cyclones={cyclones.data ?? []}
                earthquakes={earthquakes.data ?? []}
                floods={floods.data ?? []}
                lightning={lightning.data ?? []}
                farms={farms.data ?? []}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Active event feed</CardTitle>
                <CardDescription>Every environmental signal currently touching the fleet, newest first</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <QueryState query={events} skeleton={<TableSkeleton rows={8} cols={5} />} errorTitle="Event feed unavailable">
                {(rows) => (
                  <DataTable
                    className="rounded-none border-0 shadow-none"
                    rows={rows}
                    rowKey={(e) => e.id}
                    caption="Environmental events affecting the wind fleet"
                    defaultSort={{ key: 'at', dir: 'desc' }}
                    columns={[
                      {
                        key: 'title',
                        header: 'Event',
                        width: '34%',
                        sortValue: (e) => e.title,
                        render: (e) => <CellTitle title={e.title} subtitle={e.detail} />,
                      },
                      { key: 'kind', header: 'Type', sortValue: (e) => e.kind, render: (e) => <Chip>{e.kind}</Chip> },
                      { key: 'severity', header: 'Severity', render: (e) => <SeverityBadge severity={e.severity} /> },
                      {
                        key: 'sites',
                        header: 'Sites affected',
                        numeric: true,
                        sortValue: (e) => e.affectedSiteIds.length,
                        render: (e) => (e.affectedSiteIds.length ? fmtNumber(e.affectedSiteIds.length) : '—'),
                      },
                      {
                        key: 'at',
                        header: 'Detected',
                        numeric: true,
                        sortValue: (e) => e.occurredAt,
                        render: (e) => fmtRelative(e.occurredAt),
                      },
                    ]}
                  />
                )}
              </QueryState>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------- Weather ----------------------------------- */}
        <TabsContent value="weather">
          <QueryState
            query={weather}
            skeleton={
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <CardGridSkeleton count={6} height={200} />
              </div>
            }
            errorTitle="Weather feed unavailable"
          >
            {(readings) => (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {readings.map((reading) => {
                  const highWind = reading.windSpeedMs > 18
                  return (
                    <Card key={reading.windFarmId} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/wind-farms/${reading.windFarmId}?tab=environment`}
                            className="truncate text-[13.5px] font-semibold text-[var(--ink)] hover:text-[var(--brand)]"
                          >
                            {reading.windFarmName}
                          </Link>
                          <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                            Observed {fmtRelative(reading.observedAt)}
                          </p>
                        </div>
                        <Badge tone={highWind ? 'warning' : 'neutral'} dot={highWind}>
                          {reading.condition}
                        </Badge>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="kpi-value text-[24px] font-semibold leading-none text-[var(--ink)]">
                            {fmtSpeed(reading.windSpeedMs)}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                            gust {fmtSpeed(reading.windGustMs)} · {fmtBearing(reading.windDirectionDeg)}
                          </p>
                        </div>
                        <WindIcon
                          className="size-8"
                          style={{ color: highWind ? TONE_VAR.warning : 'var(--brand)' }}
                          weight="duotone"
                          aria-hidden
                        />
                      </div>

                      <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-[var(--line)] pt-2.5 text-[11px]">
                        {[
                          ['Temp', fmtTemp(reading.temperatureC)],
                          ['Humidity', `${reading.humidityPct}%`],
                          ['Rain', `${fmtNumber(reading.rainfallMm, 1)} mm`],
                          ['Vis', `${fmtNumber(reading.visibilityKm, 0)} km`],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-[var(--ink-muted)]">{label}</dt>
                            <dd className="mt-0.5 font-medium text-[var(--ink)]">{value}</dd>
                          </div>
                        ))}
                      </dl>

                      <div className="mt-3">
                        <LineChart
                          height={70}
                          unit=" m/s"
                          decimals={1}
                          yMin={0}
                          tickCount={2}
                          axis={reading.forecast.map((_, i) => `+${i * 3}h`)}
                          series={[{ label: 'Forecast wind', values: reading.forecast.map((f) => f.windSpeedMs) }]}
                        />
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </QueryState>
        </TabsContent>

        {/* ----------------------------------- Cyclones ----------------------------------- */}
        <TabsContent value="cyclones" className="space-y-4">
          <QueryState
            query={cyclones}
            skeleton={
              <div className="grid gap-3 lg:grid-cols-2">
                <CardGridSkeleton count={2} height={280} />
              </div>
            }
            errorTitle="Cyclone advisory unavailable"
          >
            {(rows) => (
              <>
                {rows.filter((c) => c.status === 'active').length === 0 && (
                  <EmptyState
                    icon={CheckCircle}
                    title="No active cyclones"
                    description="No tropical system in the Arabian Sea or Bay of Bengal currently threatens the fleet."
                  />
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  {rows.map((cyclone) => (
                    <CycloneCard
                      key={cyclone.id}
                      cyclone={cyclone}
                      farms={farms.data ?? []}
                      highlighted={focusedEvent === cyclone.id}
                    />
                  ))}
                </div>
              </>
            )}
          </QueryState>
        </TabsContent>

        {/* --------------------------------- Earthquakes --------------------------------- */}
        <TabsContent value="earthquakes" className="space-y-4">
          <QueryState query={earthquakes} skeleton={<TableSkeleton rows={6} cols={7} />} errorTitle="Seismic feed unavailable">
            {(rows) => (
              <>
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Recent seismic events</CardTitle>
                      <CardDescription>Filtered to a 300 km radius of monitored assets, last 14 days</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      height={180}
                      unit=" M"
                      decimals={1}
                      tone="serious"
                      data={rows.map((e) => ({ label: e.epicenter.split(',')[0]!, value: e.magnitude }))}
                    />
                  </CardContent>
                </Card>

                <div className="grid gap-3 lg:grid-cols-2">
                  {rows.map((quake) => (
                    <EarthquakeCard key={quake.id} quake={quake} highlighted={focusedEvent === quake.id} />
                  ))}
                </div>
              </>
            )}
          </QueryState>
        </TabsContent>

        {/* ----------------------------------- Tsunami ----------------------------------- */}
        <TabsContent value="tsunami">
          <QueryState
            query={tsunami}
            skeleton={
              <div className="grid gap-3 lg:grid-cols-2">
                <CardGridSkeleton count={2} height={240} />
              </div>
            }
            errorTitle="Tsunami advisory unavailable"
          >
            {(rows) => (
              <div className="grid gap-4 lg:grid-cols-2">
                {rows.map((alert) => {
                  const active = alert.status === 'active'
                  const tone = alert.severity === 'warning' ? 'critical' : alert.severity === 'watch' ? 'serious' : 'warning'
                  return (
                    <Card
                      key={alert.id}
                      id={alert.id}
                      style={
                        active
                          ? {
                              borderColor: `color-mix(in oklab, var(--status-${tone}) 40%, transparent)`,
                              backgroundColor: `var(--status-${tone}-soft)`,
                            }
                          : undefined
                      }
                    >
                      <CardHeader>
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2">
                            <Waves className="size-4" style={{ color: TONE_VAR[tone] }} weight="fill" aria-hidden />
                            {alert.region}
                          </CardTitle>
                          <CardDescription>Issued {fmtDateTime(alert.issuedAt)} · {alert.source}</CardDescription>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <Badge tone={tone} dot size="md">
                            {alert.severity}
                          </Badge>
                          <Badge tone={active ? 'critical' : 'neutral'}>{alert.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
                          {[
                            ['Expected arrival', fmtDateTime(alert.expectedArrival)],
                            ['Estimated wave height', `${alert.estimatedWaveHeightM} m`],
                            ['Coastal sites', String(alert.coastalSiteIds.length)],
                            ['Alert ID', alert.id],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <dt className="text-[var(--ink-muted)]">{label}</dt>
                              <dd className="mt-0.5 font-medium text-[var(--ink)]">{value}</dd>
                            </div>
                          ))}
                        </dl>
                        <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                            Recommended action
                          </p>
                          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink)]">{alert.recommendedAction}</p>
                        </div>
                        {alert.coastalSiteIds.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {alert.coastalSiteIds.map((siteId) => {
                              const farm = farms.data?.find((f) => f.id === siteId)
                              return (
                                <Link key={siteId} href={`/wind-farms/${siteId}`}>
                                  <Chip className="hover:border-[var(--brand)]">{farm?.name ?? siteId}</Chip>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </QueryState>
        </TabsContent>

        {/* ---------------------------------- Lightning ---------------------------------- */}
        <TabsContent value="lightning">
          <QueryState query={lightning} skeleton={<TableSkeleton rows={7} cols={5} />} errorTitle="Lightning feed unavailable">
            {(rows) => (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Strike clusters — last 60 minutes</CardTitle>
                      <CardDescription>
                        Work at height is suspended when activity is detected within 15 km of a site
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      horizontal
                      unit=" strikes"
                      tone="warning"
                      data={rows.map((c) => ({ label: `${fmtDistance(c.distanceKm)} away`, value: c.strikeCount }))}
                    />
                  </CardContent>
                </Card>

                <DataTable
                  rows={rows}
                  rowKey={(c) => c.id}
                  caption="Lightning strike clusters near monitored sites"
                  defaultSort={{ key: 'strikes', dir: 'desc' }}
                  columns={[
                    {
                      key: 'nearest',
                      header: 'Nearest site',
                      width: '30%',
                      render: (c) => {
                        const farm = farms.data?.find((f) => f.id === c.nearestWindFarmId)
                        return <CellTitle title={farm?.name ?? c.nearestWindFarmId} subtitle={farm?.state} />
                      },
                    },
                    {
                      key: 'strikes',
                      header: 'Strikes',
                      numeric: true,
                      sortValue: (c) => c.strikeCount,
                      render: (c) => fmtNumber(c.strikeCount),
                    },
                    {
                      key: 'intensity',
                      header: 'Intensity',
                      render: (c) => (
                        <Badge tone={c.intensity === 'high' ? 'critical' : c.intensity === 'moderate' ? 'warning' : 'neutral'} dot>
                          {c.intensity}
                        </Badge>
                      ),
                    },
                    {
                      key: 'distance',
                      header: 'Distance',
                      numeric: true,
                      sortValue: (c) => c.distanceKm,
                      render: (c) => (
                        <span style={{ color: c.distanceKm < 15 ? 'var(--delta-down)' : undefined }}>
                          {fmtDistance(c.distanceKm)}
                        </span>
                      ),
                    },
                    {
                      key: 'observed',
                      header: 'Observed',
                      numeric: true,
                      sortValue: (c) => c.observedAt,
                      render: (c) => fmtRelative(c.observedAt),
                    },
                  ]}
                />
              </div>
            )}
          </QueryState>
        </TabsContent>

        {/* ------------------------------------ Flood ------------------------------------ */}
        <TabsContent value="flood">
          <QueryState
            query={floods}
            skeleton={
              <div className="grid gap-3 lg:grid-cols-2">
                <CardGridSkeleton count={4} height={220} />
              </div>
            }
            errorTitle="Flood risk feed unavailable"
          >
            {(rows) => (
              <div className="grid gap-4 lg:grid-cols-2">
                {rows.map((zone) => (
                  <Card key={zone.id} id={zone.id}>
                    <CardHeader>
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2">
                          <Drop
                            className="size-4"
                            style={{
                              color:
                                zone.riskLevel === 'severe'
                                  ? TONE_VAR.critical
                                  : zone.riskLevel === 'elevated'
                                    ? TONE_VAR.serious
                                    : TONE_VAR.info,
                            }}
                            weight="fill"
                            aria-hidden
                          />
                          {zone.riverBasin} basin
                        </CardTitle>
                        <CardDescription>{zone.region}</CardDescription>
                      </div>
                      <RiskBadge band={zone.riskLevel} size="md" />
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3">
                        <div className="mb-1.5 flex items-center justify-between text-[12px]">
                          <span className="text-[var(--ink-muted)]">Reservoir storage</span>
                          <span className="tabular font-medium text-[var(--ink)]">{zone.reservoirLevelPct}%</span>
                        </div>
                        <Progress
                          value={zone.reservoirLevelPct}
                          color={
                            zone.reservoirLevelPct > 85
                              ? TONE_VAR.critical
                              : zone.reservoirLevelPct > 70
                                ? TONE_VAR.warning
                                : TONE_VAR.info
                          }
                        />
                      </div>
                      <dl className="grid grid-cols-3 gap-3 text-[12.5px]">
                        {[
                          ['Radius', `${zone.radiusKm} km`],
                          ['Roads impacted', String(zone.accessRoadsImpacted)],
                          ['Updated', fmtRelative(zone.updatedAt)],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-[var(--ink-muted)]">{label}</dt>
                            <dd className="mt-0.5 font-medium text-[var(--ink)]">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">{zone.advisory}</p>
                      {zone.affectedSiteIds.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {zone.affectedSiteIds.map((siteId) => {
                            const farm = farms.data?.find((f) => f.id === siteId)
                            return (
                              <Link key={siteId} href={`/wind-farms/${siteId}`}>
                                <Chip className="hover:border-[var(--brand)]">{farm?.name ?? siteId}</Chip>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </QueryState>
        </TabsContent>
      </Tabs>
    </Page>
  )
}

function deriveTab(eventId: string | null) {
  if (!eventId) return 'overview'
  if (eventId.startsWith('cyc-')) return 'cyclones'
  if (eventId.startsWith('eq-')) return 'earthquakes'
  if (eventId.startsWith('tsu-')) return 'tsunami'
  if (eventId.startsWith('fld-')) return 'flood'
  if (eventId.startsWith('lt-')) return 'lightning'
  return 'overview'
}

/* --------------------------------- Hazard map --------------------------------- */

function HazardMap({
  cyclones,
  earthquakes,
  floods,
  lightning,
  farms,
}: {
  cyclones: Cyclone[]
  earthquakes: EarthquakeEvent[]
  floods: Parameters<typeof FloodOverlay>[0]['zones']
  lightning: Parameters<typeof LightningOverlay>[0]['clusters']
  farms: Parameters<typeof WindFarmMarkers>[0]['farms']
}) {
  const [transform, setTransform] = React.useState<MapTransform>({ k: 1, x: 0, y: 0 })
  const [size, setSize] = React.useState({ width: 0, height: 0 })

  React.useEffect(() => {
    if (size.width > 0) setTransform(defaultTransform(size, { top: 16, bottom: 16, left: 16, right: 16 }))
  }, [size])

  return (
    <IndiaMapCanvas
      transform={transform}
      onTransformChange={setTransform}
      onSizeChange={setSize}
      ariaLabel="Environmental hazard map of India with cyclone tracks, seismic events, flood basins and wind farms"
    >
      {({ k, baseScale }) => (
        <>
          <FloodOverlay zones={floods} k={k} baseScale={baseScale} />
          <CycloneOverlay cyclones={cyclones} k={k} baseScale={baseScale} />
          <EarthquakeOverlay earthquakes={earthquakes} k={k} baseScale={baseScale} />
          <LightningOverlay clusters={lightning} k={k} baseScale={baseScale} />
          <WindFarmMarkers farms={farms} k={k} baseScale={baseScale} selectedId={null} onSelect={() => {}} />
        </>
      )}
    </IndiaMapCanvas>
  )
}

/* -------------------------------- Event cards -------------------------------- */

function CycloneCard({
  cyclone,
  farms,
  highlighted,
}: {
  cyclone: Cyclone
  farms: Parameters<typeof WindFarmMarkers>[0]['farms']
  highlighted: boolean
}) {
  const active = cyclone.status === 'active'
  const impacted = farms.filter((f) => cyclone.sitesInImpactZone.includes(f.id))
  const forecast = cyclone.track.filter((p) => p.forecast)

  return (
    <Card
      id={cyclone.id}
      style={
        highlighted || (active && cyclone.sitesInImpactZone.length > 0)
          ? {
              borderColor: 'color-mix(in oklab, var(--status-critical) 38%, transparent)',
              backgroundColor: 'var(--status-critical-soft)',
            }
          : undefined
      }
    >
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Tornado className="size-4" style={{ color: TONE_VAR.critical }} weight="fill" aria-hidden />
            {cyclone.name}
          </CardTitle>
          <CardDescription>
            {cyclone.category} · {cyclone.basin}
          </CardDescription>
        </div>
        <Badge tone={active ? 'critical' : cyclone.status === 'weakening' ? 'warning' : 'neutral'} dot size="md">
          {cyclone.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
          {[
            ['Max wind', `${cyclone.maxWindKmh} km/h`],
            ['Pressure', `${cyclone.pressureHpa} hPa`],
            ['Movement', `${fmtBearing(cyclone.movementDeg)} at ${cyclone.movementKmh} km/h`],
            ['Impact radius', `${cyclone.impactRadiusKm} km`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[var(--ink-muted)]">{label}</dt>
              <dd className="mt-0.5 font-medium text-[var(--ink)]">{value}</dd>
            </div>
          ))}
        </dl>

        {forecast.length > 0 && (
          <div className="mt-4">
            <LineChart
              height={130}
              unit=" km/h"
              decimals={0}
              title="Forecast intensity"
              axis={cyclone.track.map((p) => (p.forecast ? `+${cyclone.track.indexOf(p) * 6 - 24}h` : fmtDate(p.t).slice(0, 6)))}
              series={[{ label: 'Sustained wind', values: cyclone.track.map((p) => p.maxWindKmh) }]}
            />
          </div>
        )}

        <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
            Landfall {fmtRelative(cyclone.forecastLandfall)}
          </p>
          <p className="mt-1 text-[12.5px] font-medium text-[var(--ink)]">{cyclone.landfallLocation}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--ink-secondary)]">{cyclone.advisory}</p>
        </div>

        {impacted.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              Sites in the impact zone
            </p>
            <div className="flex flex-wrap gap-1.5">
              {impacted.map((farm) => (
                <Link key={farm.id} href={`/wind-farms/${farm.id}`}>
                  <Chip className="hover:border-[var(--brand)]">
                    {farm.name} · {fmtNumber(farm.installedMw, 0)} MW
                  </Chip>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EarthquakeCard({ quake, highlighted }: { quake: EarthquakeEvent; highlighted: boolean }) {
  const severity = quake.magnitude >= 5 ? 'critical' : quake.magnitude >= 4.5 ? 'high' : quake.magnitude >= 3.5 ? 'medium' : 'low'
  const needsAction = quake.inspectionStatus === 'recommended' || quake.inspectionStatus === 'scheduled'

  return (
    <Card
      id={quake.id}
      style={
        highlighted
          ? {
              borderColor: 'color-mix(in oklab, var(--status-serious) 40%, transparent)',
              backgroundColor: 'var(--status-serious-soft)',
            }
          : undefined
      }
    >
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>M {quake.magnitude.toFixed(1)} — {quake.epicenter}</CardTitle>
          <CardDescription>
            {fmtDateTime(quake.occurredAt)} · {quake.source}
          </CardDescription>
        </div>
        <SeverityBadge severity={severity} size="md" />
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
          {[
            ['Depth', `${quake.depthKm} km`],
            ['Latitude', quake.position.lat.toFixed(2)],
            ['Longitude', quake.position.lng.toFixed(2)],
            ['Nearest site', fmtDistance(quake.distanceKm)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[var(--ink-muted)]">{label}</dt>
              <dd className="mt-0.5 font-medium text-[var(--ink)]">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 text-[12px] text-[var(--ink-muted)]">
          Nearest monitored asset:{' '}
          <Link href={`/wind-farms/${quake.nearestWindFarmId}`} className="font-medium text-[var(--brand)] hover:underline">
            {quake.nearestWindFarmName}
          </Link>
        </p>

        <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              Recommended inspection
            </p>
            <Badge
              tone={
                quake.inspectionStatus === 'complete'
                  ? 'good'
                  : quake.inspectionStatus === 'in-progress'
                    ? 'info'
                    : needsAction
                      ? 'warning'
                      : 'neutral'
              }
              dot
            >
              {quake.inspectionStatus.replace('-', ' ')}
            </Badge>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink)]">{quake.recommendedInspection}</p>
        </div>

        {needsAction && (
          <Button variant="secondary" size="sm" className="mt-3 w-full" asChild>
            <Link href="/maintenance">Raise inspection work orders</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
