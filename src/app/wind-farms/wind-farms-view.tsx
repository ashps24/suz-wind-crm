'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Cards, MapTrifold, Table as TableIcon, Warning, Wind } from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HealthRing, Sparkline } from '@/components/charts'
import { KpiCard } from '@/components/cards/kpi'
import { RiskBadge, SiteStatusBadge } from '@/components/cards/status'
import { SiteImage } from '@/components/cards/site-image'
import { CardGridSkeleton, EmptyState, KpiSkeleton, QueryState, TableSkeleton } from '@/components/feedback/states'
import { CellTitle, DataTable, type Column } from '@/components/tables/data-table'
import { FilterBar, ViewToggle } from '@/components/tables/filter-bar'
import { api } from '@/lib/api'
import { fmtMw, fmtMwh, fmtNumber, fmtPct, fmtSpeed } from '@/lib/formatters'
import { sum } from '@/lib/utils'
import type { WindFarm } from '@/types'

const STATE_OPTIONS = [
  'Gujarat', 'Tamil Nadu', 'Rajasthan', 'Maharashtra', 'Karnataka', 'Madhya Pradesh', 'Andhra Pradesh',
].map((s) => ({ value: s, label: s }))

export function WindFarmsView() {
  const [view, setView] = React.useState<'cards' | 'table'>('cards')
  const [search, setSearch] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, string>>({ state: 'all', status: 'all', risk: 'all' })

  const query = useQuery({ queryKey: ['wind-farms'], queryFn: api.windFarms.list })

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (query.data ?? []).filter((farm) => {
      if (q && !`${farm.name} ${farm.customerName} ${farm.district} ${farm.code}`.toLowerCase().includes(q)) return false
      if (filters.state !== 'all' && farm.state !== filters.state) return false
      if (filters.status !== 'all' && farm.status !== filters.status) return false
      if (filters.risk !== 'all' && farm.riskBand !== filters.risk) return false
      return true
    })
  }, [query.data, search, filters])

  const columns: Column<WindFarm>[] = [
    {
      key: 'name',
      header: 'Site',
      width: '22%',
      sortValue: (r) => r.name,
      render: (r) => <CellTitle title={r.name} subtitle={`${r.district}, ${r.state} · ${r.code}`} />,
    },
    {
      key: 'customer',
      header: 'Customer',
      hideBelow: 'lg',
      sortValue: (r) => r.customerName,
      render: (r) => r.customerName,
    },
    {
      key: 'capacity',
      header: 'Installed',
      numeric: true,
      sortValue: (r) => r.installedMw,
      render: (r) => fmtMw(r.installedMw),
    },
    {
      key: 'turbines',
      header: 'Turbines',
      numeric: true,
      hideBelow: 'sm',
      sortValue: (r) => r.turbineCount,
      render: (r) => fmtNumber(r.turbineCount),
    },
    {
      key: 'availability',
      header: 'Availability',
      numeric: true,
      sortValue: (r) => r.availabilityPct,
      render: (r) => (
        <span
          className="font-medium"
          style={{
            color:
              r.availabilityPct >= 97
                ? 'var(--delta-up)'
                : r.availabilityPct >= 94
                  ? 'var(--ink)'
                  : 'var(--delta-down)',
          }}
        >
          {fmtPct(r.availabilityPct)}
        </span>
      ),
    },
    {
      key: 'generation',
      header: 'Today',
      numeric: true,
      hideBelow: 'md',
      sortValue: (r) => r.generationTodayMwh,
      render: (r) => fmtMwh(r.generationTodayMwh, 0),
    },
    {
      key: 'trend',
      header: '24 h',
      hideBelow: 'xl',
      render: (r) => <Sparkline values={r.generation24h} width={68} height={22} tone="info" />,
    },
    {
      key: 'risk',
      header: 'Risk',
      sortValue: (r) => r.riskScore,
      render: (r) => <RiskBadge band={r.riskBand} />,
    },
    {
      key: 'alerts',
      header: 'Alerts',
      numeric: true,
      sortValue: (r) => r.activeAlerts,
      render: (r) =>
        r.activeAlerts > 0 ? (
          <Badge tone="critical" dot>
            {r.activeAlerts}
          </Badge>
        ) : (
          <span className="text-[var(--ink-muted)]">—</span>
        ),
    },
  ]

  const totals = query.data
    ? {
        mw: Math.round(sum(query.data.map((f) => f.installedMw)) * 10) / 10,
        turbines: sum(query.data.map((f) => f.turbineCount)),
        generating: Math.round(sum(query.data.map((f) => f.currentGenerationMw)) * 10) / 10,
        alerts: sum(query.data.map((f) => f.activeAlerts)),
      }
    : null

  return (
    <Page
      title="Wind Farms"
      description="Every site Suzlon operates or is building, with live generation, availability and risk posture."
      wide
      actions={
        <ViewToggle
          value={view}
          onChange={setView}
          options={[
            { value: 'cards', label: 'Cards', icon: <Cards className="size-4" aria-hidden /> },
            { value: 'table', label: 'Table', icon: <TableIcon className="size-4" aria-hidden /> },
          ]}
        />
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {query.isPending ? (
          <KpiSkeleton />
        ) : totals ? (
          <>
            <KpiCard label="Installed capacity" value={fmtMw(totals.mw, 0)} icon={Wind} trendLabel={`${query.data!.length} sites`} />
            <KpiCard label="Generating now" value={fmtMw(totals.generating, 0)} trendLabel={`${fmtPct((totals.generating / totals.mw) * 100)} of capacity`} />
            <KpiCard label="Turbines" value={fmtNumber(totals.turbines)} trendLabel="Across all sites" />
            <KpiCard
              label="Active alerts"
              value={fmtNumber(totals.alerts)}
              emphasis={totals.alerts > 0 ? 'critical' : undefined}
              icon={Warning}
              trendLabel="Critical and high severity"
            />
          </>
        ) : null}
      </div>

      <FilterBar
        className="mb-4"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sites, customers, districts…"
        values={filters}
        onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        filters={[
          { key: 'state', label: 'State', options: STATE_OPTIONS },
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'operational', label: 'Operational' },
              { value: 'commissioning', label: 'Commissioning' },
              { value: 'construction', label: 'Under construction' },
              { value: 'planned', label: 'Planned' },
            ],
          },
          {
            key: 'risk',
            label: 'Risk',
            options: [
              { value: 'severe', label: 'Severe' },
              { value: 'elevated', label: 'Elevated' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'low', label: 'Low' },
            ],
          },
        ]}
        right={<span className="text-[12.5px] text-[var(--ink-muted)]">{filtered.length} sites</span>}
      />

      <QueryState
        query={query}
        errorTitle="Wind farm data unavailable"
        skeleton={
          view === 'cards' ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <CardGridSkeleton count={6} height={280} />
            </div>
          ) : (
            <TableSkeleton rows={10} cols={7} />
          )
        }
      >
        {() =>
          filtered.length === 0 ? (
            <EmptyState
              icon={MapTrifold}
              title="No sites match these filters"
              description="Adjust the search or clear the filters to see the full portfolio of 15 operating and under-construction sites."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setFilters({ state: 'all', status: 'all', risk: 'all' })
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : view === 'cards' ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((farm, i) => (
                <WindFarmCard key={farm.id} farm={farm} index={i} />
              ))}
            </div>
          ) : (
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(r) => r.id}
              href={(r) => `/wind-farms/${r.id}`}
              caption="Wind farms with capacity, availability, generation and risk"
              defaultSort={{ key: 'risk', dir: 'desc' }}
            />
          )
        }
      </QueryState>
    </Page>
  )
}

function WindFarmCard({ farm, index }: { farm: WindFarm; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.03, 0.24), ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/wind-farms/${farm.id}`}
        className="panel group block overflow-hidden transition-shadow hover:shadow-[var(--shadow-lg)]"
      >
        <div className="relative h-32">
          <SiteImage src={farm.heroImage} alt={`${farm.name} wind farm`} seed={index} className="size-full" />
          <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold leading-tight text-white drop-shadow">{farm.name}</p>
              <p className="truncate text-[11.5px] text-white/80">
                {farm.district}, {farm.state}
              </p>
            </div>
            <HealthRing value={100 - farm.riskScore} size={38} thickness={3.5} label="Risk headroom" />
          </div>
          <div className="absolute left-3 top-3 flex gap-1.5">
            <SiteStatusBadge status={farm.status} />
            {farm.activeAlerts > 0 && (
              <Badge tone="critical" dot variant="solid">
                {farm.activeAlerts}
              </Badge>
            )}
          </div>
        </div>

        <div className="p-3.5">
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">Installed</dt>
              <dd className="kpi-value mt-0.5 text-[15px] font-semibold text-[var(--ink)]">{fmtMw(farm.installedMw, 0)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">Generating</dt>
              <dd className="kpi-value mt-0.5 text-[15px] font-semibold text-[var(--ink)]">{fmtMw(farm.currentGenerationMw, 0)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">Availability</dt>
              <dd
                className="kpi-value mt-0.5 text-[15px] font-semibold"
                style={{ color: farm.availabilityPct >= 97 ? 'var(--delta-up)' : farm.availabilityPct >= 94 ? 'var(--ink)' : 'var(--delta-down)' }}
              >
                {fmtPct(farm.availabilityPct)}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <RiskBadge band={farm.riskBand} />
              {farm.products.map((product) => (
                <Chip key={product}>{product}</Chip>
              ))}
            </div>
            <Sparkline values={farm.generation24h} width={62} height={24} tone="info" />
          </div>

          <p className="mt-2.5 flex items-center justify-between text-[11.5px] text-[var(--ink-muted)]">
            <span className="truncate">{farm.customerName}</span>
            <span className="shrink-0">{fmtSpeed(farm.meanWindSpeedMs)} mean</span>
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
