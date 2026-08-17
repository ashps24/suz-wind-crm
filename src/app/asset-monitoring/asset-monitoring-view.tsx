'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Gauge, TrendDown, Warning } from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Badge, Chip } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Progress, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/primitives'
import { BarChart, DonutChart, Heatmap, LineChart, seriesColor } from '@/components/charts'
import { KpiCard } from '@/components/cards/kpi'
import { TurbineStatusBadge } from '@/components/cards/status'
import { CellTitle, DataTable } from '@/components/tables/data-table'
import { ChartSkeleton, EmptyState, KpiSkeleton, QueryState, TableSkeleton } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { TONE_VAR, TURBINE_STATUS } from '@/lib/constants'
import { fmtDateShort, fmtGwh, fmtKw, fmtNumber, fmtPct } from '@/lib/formatters'
import { daysAgo } from '@/lib/utils'
import { turbineHref, windFarmHref } from '@/lib/routing'

export function AssetMonitoringView() {
  const health = useQuery({ queryKey: ['monitoring', 'fleet-health'], queryFn: api.monitoring.fleetHealth })
  const underperformers = useQuery({ queryKey: ['monitoring', 'underperformers'], queryFn: api.monitoring.underperformers })
  const alarmsByCategory = useQuery({ queryKey: ['monitoring', 'alarm-categories'], queryFn: api.monitoring.alarmsByCategory })

  return (
    <Page
      title="Asset Monitoring"
      description="Fleet-level condition and performance — how the installed base is actually behaving, and where it is drifting."
      wide
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        {health.isPending ? (
          <KpiSkeleton count={8} />
        ) : health.data ? (
          <>
            <KpiCard
              label="Availability"
              value={fmtPct(health.data.availabilityPct)}
              trend={{ direction: 'down', valuePct: 0.6, upIsGood: true }}
              trendLabel="vs last month"
            />
            <KpiCard label="Downtime" value={fmtNumber(health.data.downtimeHours)} unit="h" trendLabel="Trailing 30 days" />
            <KpiCard label="MTBF" value={fmtNumber(health.data.mtbfHours)} unit="h" trendLabel="Mean time between failures" />
            <KpiCard label="MTTR" value={fmtNumber(health.data.mttrHours, 1)} unit="h" trendLabel="Mean time to repair" />
            <KpiCard label="Generation" value={fmtGwh(health.data.generationGwh, 1)} trendLabel="Trailing 30 days" />
            <KpiCard label="Performance ratio" value={fmtPct(health.data.performanceRatioPct)} trendLabel="Capacity factor" />
            <KpiCard label="Curtailment" value={fmtPct(health.data.curtailmentPct)} emphasis="warning" trendLabel="Turbines constrained" />
            <KpiCard label="Alarms" value={fmtNumber(health.data.alarmCount)} emphasis="critical" icon={Warning} trendLabel="Currently active" />
          </>
        ) : null}
      </div>

      <Tabs defaultValue="trends">
        <TabsList className="mb-5">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="sites">Site comparison</TabsTrigger>
          <TabsTrigger value="products">Product families</TabsTrigger>
          <TabsTrigger value="underperformance">Underperformance</TabsTrigger>
          <TabsTrigger value="alarms">Alarm profile</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <QueryState query={health} skeleton={<ChartSkeleton height={240} />} errorTitle="Fleet health unavailable">
            {(data) => (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <div>
                        <CardTitle>Fleet availability</CardTitle>
                        <CardDescription>Time-based availability against the 97% contractual floor</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <LineChart
                        height={230}
                        unit="%"
                        decimals={1}
                        yMin={88}
                        yMax={100}
                        axis={data.availabilitySeries.map((p) => fmtDateShort(p.t))}
                        series={[
                          { label: 'Fleet availability', values: data.availabilitySeries.map((p) => p.value) },
                          {
                            label: 'Contractual floor',
                            values: data.availabilitySeries.map(() => 97),
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
                        <CardTitle>Daily generation</CardTitle>
                        <CardDescription>Delivered energy across the operating fleet</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <LineChart
                        showArea
                        height={230}
                        unit=" GWh"
                        decimals={1}
                        axis={data.generationSeries.map((p) => fmtDateShort(p.t))}
                        series={[{ label: 'Generation', values: data.generationSeries.map((p) => p.value) }]}
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                  <Card>
                    <CardHeader>
                      <div>
                        <CardTitle>Status distribution</CardTitle>
                        <CardDescription>Current state of every turbine</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <DonutChart
                        size={128}
                        data={data.statusDistribution.map((s) => ({
                          label: TURBINE_STATUS[s.status].label,
                          value: s.count,
                          color: TONE_VAR[TURBINE_STATUS[s.status].tone],
                        }))}
                        centerValue={fmtNumber(data.statusDistribution.reduce((a, s) => a + s.count, 0))}
                        centerLabel="turbines"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div>
                        <CardTitle>Availability heatmap</CardTitle>
                        <CardDescription>Site by day, last 14 days — darker is higher availability</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Heatmap
                        rows={data.heatmap.map((row) => ({ label: row.siteName, values: row.values }))}
                        columns={Array.from({ length: 14 }, (_, i) => fmtDateShort(daysAgo(13 - i)).split(' ')[0]!)}
                        unit="%"
                      />
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </QueryState>
        </TabsContent>

        <TabsContent value="sites">
          <QueryState query={health} skeleton={<TableSkeleton rows={10} cols={5} />} errorTitle="Site comparison unavailable">
            {(data) => (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Availability by site</CardTitle>
                      <CardDescription>Ranked highest to lowest across the operating portfolio</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      height={260}
                      unit="%"
                      decimals={1}
                      maxValue={100}
                      color={seriesColor(0)}
                      data={data.siteComparison.map((s) => ({ label: s.siteName.split(' ')[0]!, value: s.availability }))}
                    />
                  </CardContent>
                </Card>

                <DataTable
                  rows={data.siteComparison}
                  rowKey={(s) => s.siteId}
                  href={(s) => windFarmHref(s.siteId)}
                  caption="Availability, plant load factor and capacity by site"
                  defaultSort={{ key: 'availability', dir: 'desc' }}
                  columns={[
                    {
                      key: 'site',
                      header: 'Site',
                      width: '34%',
                      sortValue: (s) => s.siteName,
                      render: (s) => <CellTitle title={s.siteName} />,
                    },
                    { key: 'mw', header: 'Installed', numeric: true, sortValue: (s) => s.mw, render: (s) => `${fmtNumber(s.mw, 1)} MW` },
                    {
                      key: 'availability',
                      header: 'Availability',
                      numeric: true,
                      sortValue: (s) => s.availability,
                      render: (s) => (
                        <span className="inline-flex items-center justify-end gap-2">
                          <span className="w-20">
                            <Progress
                              value={s.availability}
                              color={s.availability >= 97 ? TONE_VAR.good : s.availability >= 94 ? TONE_VAR.warning : TONE_VAR.critical}
                            />
                          </span>
                          {fmtPct(s.availability)}
                        </span>
                      ),
                    },
                    { key: 'plf', header: 'PLF', numeric: true, sortValue: (s) => s.plf, render: (s) => fmtPct(s.plf) },
                  ]}
                />
              </div>
            )}
          </QueryState>
        </TabsContent>

        <TabsContent value="products">
          <QueryState query={health} skeleton={<ChartSkeleton height={240} />} errorTitle="Product comparison unavailable">
            {(data) => (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {data.productComparison.map((product, i) => (
                    <Card key={product.product} className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[15px] font-semibold text-[var(--ink)]">{product.product}</p>
                        <span
                          aria-hidden
                          className="size-2.5 rounded-[3px]"
                          style={{ backgroundColor: seriesColor(i) }}
                        />
                      </div>
                      <dl className="mt-3 space-y-2 text-[12.5px]">
                        <div className="flex justify-between">
                          <dt className="text-[var(--ink-muted)]">Availability</dt>
                          <dd className="tabular font-medium text-[var(--ink)]">{fmtPct(product.availability)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--ink-muted)]">Capacity factor</dt>
                          <dd className="tabular font-medium text-[var(--ink)]">{fmtPct(product.plf)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--ink-muted)]">Turbines</dt>
                          <dd className="tabular font-medium text-[var(--ink)]">{fmtNumber(product.turbines)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--ink-muted)]">Installed</dt>
                          <dd className="tabular font-medium text-[var(--ink)]">{fmtNumber(product.mw, 1)} MW</dd>
                        </div>
                      </dl>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Availability by product family</CardTitle>
                      <CardDescription>
                        Fleet age differs between platforms — normalise before drawing commercial conclusions
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      height={220}
                      unit="%"
                      decimals={1}
                      maxValue={100}
                      data={data.productComparison.map((p, i) => ({
                        label: p.product,
                        value: p.availability,
                        color: seriesColor(i),
                      }))}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </QueryState>
        </TabsContent>

        <TabsContent value="underperformance">
          <QueryState
            query={underperformers}
            skeleton={<TableSkeleton rows={10} cols={6} />}
            errorTitle="Underperformance analysis unavailable"
            isEmpty={(rows) => rows.length === 0}
            empty={
              <EmptyState
                icon={Gauge}
                title="No turbines below expectation"
                description="Every producing turbine is within 12% of its expected output for the current wind band."
              />
            }
          >
            {(rows) => (
              <>
                <p className="mb-4 text-[12.5px] text-[var(--ink-muted)]">
                  Turbines producing more than 12% below the expected output for their measured wind band. Deficits in
                  the 12–20% range usually indicate yaw misalignment or blade soiling rather than drivetrain damage.
                </p>
                <DataTable
                  rows={rows}
                  rowKey={(r) => r.turbine.id}
                  href={(r) => turbineHref(r.turbine.id, { tab: 'performance' })}
                  caption="Turbines producing below their expected power curve"
                  defaultSort={{ key: 'deficit', dir: 'desc' }}
                  columns={[
                    {
                      key: 'turbine',
                      header: 'Turbine',
                      width: '24%',
                      sortValue: (r) => r.turbine.name,
                      render: (r) => <CellTitle title={r.turbine.name} subtitle={r.turbine.windFarmName} />,
                    },
                    { key: 'product', header: 'Product', render: (r) => <Chip>{r.turbine.product}</Chip> },
                    { key: 'status', header: 'Status', render: (r) => <TurbineStatusBadge status={r.turbine.status} /> },
                    {
                      key: 'expected',
                      header: 'Expected',
                      numeric: true,
                      sortValue: (r) => r.expectedKw,
                      render: (r) => fmtKw(r.expectedKw),
                    },
                    {
                      key: 'actual',
                      header: 'Actual',
                      numeric: true,
                      sortValue: (r) => r.turbine.currentPowerKw,
                      render: (r) => fmtKw(r.turbine.currentPowerKw),
                    },
                    {
                      key: 'deficit',
                      header: 'Deficit',
                      numeric: true,
                      sortValue: (r) => r.deficitPct,
                      render: (r) => (
                        <span className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--delta-down)' }}>
                          <TrendDown className="size-3.5" weight="bold" aria-hidden />
                          {fmtPct(r.deficitPct)}
                        </span>
                      ),
                    },
                  ]}
                />
              </>
            )}
          </QueryState>
        </TabsContent>

        <TabsContent value="alarms">
          <QueryState query={alarmsByCategory} skeleton={<ChartSkeleton height={240} />} errorTitle="Alarm profile unavailable">
            {(rows) => (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Active alarms by system</CardTitle>
                      <CardDescription>Where faults are concentrating right now</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <BarChart horizontal data={rows.map((r) => ({ label: r.label, value: r.value }))} color={seriesColor(1)} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Interpretation</CardTitle>
                      <CardDescription>What the distribution is telling you</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">
                      <li className="flex gap-2.5">
                        <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                        Drivetrain faults dominate the active set. That is a condition-monitoring story, not a control
                        story — the right response is predictive inspection, not a controller reset.
                      </li>
                      <li className="flex gap-2.5">
                        <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                        Grid-category alarms track dispatch instructions rather than asset condition. They should be
                        evidenced for deemed-generation claims, not dispatched to a crew.
                      </li>
                      <li className="flex gap-2.5">
                        <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                        Environmental alarms cluster around active weather. Expect them to clear without intervention
                        once the system passes.
                      </li>
                    </ul>
                    <Link
                      href="/maintenance"
                      className="mt-4 inline-flex text-[12.5px] font-semibold text-[var(--brand)] hover:underline"
                    >
                      Open the maintenance queue →
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}
          </QueryState>
        </TabsContent>
      </Tabs>
    </Page>
  )
}
