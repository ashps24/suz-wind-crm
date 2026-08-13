'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { DownloadSimple, Presentation } from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Select } from '@/components/ui/primitives'
import { BarChart, LineChart, seriesColor } from '@/components/charts'
import { CardGridSkeleton, QueryState } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { PRODUCT_FAMILIES } from '@/lib/constants'
import { fmtRelative } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { ReportDefinition } from '@/types'

const DATE_RANGES = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'fy', label: 'Financial year to date' },
]

const REGIONS = ['All regions', 'Gujarat', 'Tamil Nadu', 'Rajasthan', 'Maharashtra', 'Karnataka', 'Madhya Pradesh', 'Andhra Pradesh']

export function ReportsView() {
  const reports = useQuery({ queryKey: ['reports'], queryFn: api.reports.list })
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [dateRange, setDateRange] = React.useState('12m')
  const [region, setRegion] = React.useState('All regions')
  const [product, setProduct] = React.useState('All products')

  const selected = reports.data?.find((r) => r.id === selectedId) ?? reports.data?.[0] ?? null

  return (
    <Page
      title="Reports"
      description="Operational, commercial and sustainability reporting across the fleet."
      wide
      actions={
        <Button variant="secondary" size="sm">
          <DownloadSimple aria-hidden />
          Export all
        </Button>
      }
    >
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <Label htmlFor="date-range">Date range</Label>
            <Select id="date-range" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              {DATE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <Label htmlFor="region">Region</Label>
            <Select id="region" value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <Label htmlFor="product">Product family</Label>
            <Select id="product" value={product} onChange={(e) => setProduct(e.target.value)}>
              <option>All products</option>
              {PRODUCT_FAMILIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-[11.5px] text-[var(--ink-muted)]">
            Filters are illustrative in this prototype — figures reflect the full fleet.
          </p>
        </div>
      </Card>

      <QueryState
        query={reports}
        errorTitle="Reports unavailable"
        skeleton={
          <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <CardGridSkeleton count={2} height={300} />
          </div>
        }
      >
        {(rows) => (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)]">
            <nav className="space-y-2" aria-label="Report list">
              {(['Operations', 'Service', 'Commercial', 'Sustainability'] as const).map((category) => {
                const items = rows.filter((r) => r.category === category)
                if (!items.length) return null
                return (
                  <div key={category}>
                    <p className="px-1 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">
                      {category}
                    </p>
                    <div className="space-y-1.5">
                      {items.map((report) => {
                        const active = selected?.id === report.id
                        return (
                          <button
                            key={report.id}
                            onClick={() => setSelectedId(report.id)}
                            aria-current={active ? 'true' : undefined}
                            className={cn(
                              'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                              active
                                ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
                                : 'border-[var(--line)] bg-[var(--elevated)] hover:border-[var(--line-strong)]',
                            )}
                          >
                            <p
                              className="text-[12.5px] font-medium"
                              style={{ color: active ? 'var(--brand-ink)' : 'var(--ink)' }}
                            >
                              {report.name}
                            </p>
                            <p className="mt-0.5 text-[10.5px] text-[var(--ink-muted)]">
                              Run {fmtRelative(report.lastRun)} · {report.owner}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </nav>

            {selected && <ReportDetail key={selected.id} report={selected} />}
          </div>
        )}
      </QueryState>
    </Page>
  )
}

function ReportDetail({ report }: { report: ReportDefinition }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>{report.name}</CardTitle>
            <CardDescription>{report.description}</CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {report.formats.map((format) => (
              <Button key={format} variant="secondary" size="xs">
                <DownloadSimple aria-hidden />
                {format}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {report.metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3.5 py-3">
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">
                  {metric.label}
                </dt>
                <dd className="kpi-value mt-1.5 text-[19px] font-semibold leading-none text-[var(--ink)]">
                  {metric.value}
                </dd>
                {metric.delta && (
                  <dd
                    className="mt-1.5 text-[11.5px] font-medium"
                    style={{ color: metric.deltaGood ? 'var(--delta-up)' : 'var(--delta-down)' }}
                  >
                    {metric.delta}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Trend</CardTitle>
            <CardDescription>Trailing twelve months</CardDescription>
          </div>
          <Chip>{report.category}</Chip>
        </CardHeader>
        <CardContent>
          <LineChart
            height={280}
            decimals={1}
            showArea={report.series.length === 1}
            axis={report.axis}
            series={report.series.map((s, i) => ({
              label: s.label,
              values: s.values,
              color: s.label.toLowerCase().includes('threshold') || s.label.toLowerCase().includes('guarantee')
                ? 'var(--axis)'
                : seriesColor(i),
              dashed: s.label.toLowerCase().includes('threshold') || s.label.toLowerCase().includes('guarantee'),
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Monthly detail</CardTitle>
            <CardDescription>{report.series[0]?.label} by month</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <BarChart
            height={220}
            decimals={1}
            data={report.axis.map((label, i) => ({ label, value: report.series[0]?.values[i] ?? 0 }))}
            color={seriesColor(0)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Data table</CardTitle>
            <CardDescription>Text equivalent of the charts above</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-max text-left">
              <caption className="sr-only">{report.name} monthly values</caption>
              <thead>
                <tr className="border-y border-[var(--line)]">
                  <th className="px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--ink-muted)]">
                    Series
                  </th>
                  {report.axis.map((label) => (
                    <th
                      key={label}
                      className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--ink-muted)]"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.series.map((series, i) => (
                  <tr key={series.label} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-3.5 py-2.5 text-[12.5px] font-medium text-[var(--ink)]">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="size-2 rounded-[2px]" style={{ backgroundColor: seriesColor(i) }} />
                        {series.label}
                      </span>
                    </td>
                    {series.values.map((value, j) => (
                      <td key={j} className="tabular px-3 py-2.5 text-right text-[12.5px] text-[var(--ink-secondary)]">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
