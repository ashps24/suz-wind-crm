'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Wind } from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HealthRing, Sparkline, StackedBar } from '@/components/charts'
import { TurbineStatusBadge } from '@/components/cards/status'
import { EmptyState, QueryState, TableSkeleton } from '@/components/feedback/states'
import { CellTitle, DataTable, type Column } from '@/components/tables/data-table'
import { FilterBar, QuickFilters } from '@/components/tables/filter-bar'
import { api } from '@/lib/api'
import { PRODUCT_FAMILIES, TONE_VAR, TURBINE_STATUS, TURBINE_STATUS_ORDER } from '@/lib/constants'
import { fmtDate, fmtKw, fmtNumber, fmtPct, fmtRelative, fmtSpeed } from '@/lib/formatters'
import { isOverdue } from '@/lib/formatters'
import type { Turbine, TurbineStatus } from '@/types'

const STATE_OPTIONS = [
  'Gujarat', 'Tamil Nadu', 'Rajasthan', 'Maharashtra', 'Karnataka', 'Madhya Pradesh', 'Andhra Pradesh',
].map((s) => ({ value: s, label: s }))

export function TurbinesView() {
  const searchParams = useSearchParams()
  const [search, setSearch] = React.useState('')
  const [segment, setSegment] = React.useState<string>(searchParams.get('status') ?? 'all')
  const [filters, setFilters] = React.useState<Record<string, string>>({
    product: searchParams.get('product') ?? 'all',
    state: 'all',
    site: 'all',
    health: 'all',
  })

  const turbines = useQuery({ queryKey: ['turbines'], queryFn: api.turbines.list })
  const farms = useQuery({ queryKey: ['wind-farms'], queryFn: api.windFarms.list })

  const siteOptions = React.useMemo(
    () => (farms.data ?? []).map((f) => ({ value: f.id, label: f.name })),
    [farms.data],
  )

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (turbines.data ?? []).filter((t) => {
      if (q && !`${t.name} ${t.serialNumber} ${t.windFarmName} ${t.customerName} ${t.activeAlarm ?? ''}`.toLowerCase().includes(q))
        return false
      if (segment === 'maintenance-due' ? !isOverdue(t.nextMaintenance) : false) return false
      if (segment !== 'all' && segment !== 'maintenance-due' && t.status !== segment) return false
      if (filters.product !== 'all' && t.product !== filters.product) return false
      if (filters.state !== 'all' && t.state !== filters.state) return false
      if (filters.site !== 'all' && t.windFarmId !== filters.site) return false
      if (filters.health === 'critical' && t.healthScore >= 60) return false
      if (filters.health === 'watch' && (t.healthScore < 60 || t.healthScore >= 80)) return false
      if (filters.health === 'healthy' && t.healthScore < 80) return false
      return true
    })
  }, [turbines.data, search, segment, filters])

  const counts = React.useMemo(() => {
    const list = turbines.data ?? []
    return {
      all: list.length,
      ...Object.fromEntries(TURBINE_STATUS_ORDER.map((s) => [s, list.filter((t) => t.status === s).length])),
      'maintenance-due': list.filter((t) => isOverdue(t.nextMaintenance)).length,
    } as Record<string, number>
  }, [turbines.data])

  const statusSegments = TURBINE_STATUS_ORDER.map((status) => ({
    label: TURBINE_STATUS[status].label,
    value: counts[status] ?? 0,
    color: TONE_VAR[TURBINE_STATUS[status].tone],
  })).filter((s) => s.value > 0)

  const columns: Column<Turbine>[] = [
    {
      key: 'name',
      header: 'Turbine ID',
      width: '20%',
      sortValue: (t) => t.name,
      render: (t) => <CellTitle title={t.name} subtitle={t.serialNumber} />,
    },
    {
      key: 'site',
      header: 'Site',
      hideBelow: 'md',
      sortValue: (t) => t.windFarmName,
      render: (t) => <CellTitle title={t.windFarmName} subtitle={t.state} />,
    },
    { key: 'product', header: 'Product', sortValue: (t) => t.product, render: (t) => <Chip>{t.product}</Chip> },
    { key: 'status', header: 'Status', sortValue: (t) => t.status, render: (t) => <TurbineStatusBadge status={t.status} /> },
    {
      key: 'power',
      header: 'Current power',
      numeric: true,
      sortValue: (t) => t.currentPowerKw,
      render: (t) => (
        <span className="inline-flex items-center justify-end gap-2">
          <Sparkline values={t.generation24h} width={48} height={18} tone="info" area={false} />
          {fmtKw(t.currentPowerKw)}
        </span>
      ),
    },
    {
      key: 'wind',
      header: 'Wind',
      numeric: true,
      hideBelow: 'xl',
      sortValue: (t) => t.windSpeedMs,
      render: (t) => fmtSpeed(t.windSpeedMs),
    },
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
      numeric: true,
      sortValue: (t) => t.healthScore,
      render: (t) => (
        <span className="flex items-center justify-end gap-2">
          <HealthRing value={t.healthScore} size={24} thickness={3} showValue={false} />
          <span className="tabular font-medium text-[var(--ink)]">{t.healthScore}</span>
        </span>
      ),
    },
    {
      key: 'lastMaint',
      header: 'Last service',
      numeric: true,
      hideBelow: 'xl',
      sortValue: (t) => t.lastMaintenance,
      render: (t) => fmtRelative(t.lastMaintenance),
    },
    {
      key: 'nextMaint',
      header: 'Next service',
      numeric: true,
      hideBelow: 'lg',
      sortValue: (t) => t.nextMaintenance,
      render: (t) => (
        <span style={{ color: isOverdue(t.nextMaintenance) ? 'var(--delta-down)' : undefined }}>
          {fmtDate(t.nextMaintenance)}
        </span>
      ),
    },
    {
      key: 'alarm',
      header: 'Active alarm',
      hideBelow: 'xl',
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
    <Page
      title="Turbine fleet"
      description={`${fmtNumber(counts.all ?? 0)} turbines across 15 sites — status, output, availability and condition in one list.`}
      wide
    >
      {statusSegments.length > 0 && (
        <div className="panel mb-4 p-4">
          <StackedBar segments={statusSegments} height={10} />
        </div>
      )}

      <QuickFilters
        className="mb-3"
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'all', label: 'All turbines', count: counts.all },
          ...TURBINE_STATUS_ORDER.map((status) => ({
            value: status,
            label: TURBINE_STATUS[status].label,
            count: counts[status],
            tone: TURBINE_STATUS[status].tone,
          })),
          { value: 'maintenance-due', label: 'Maintenance due', count: counts['maintenance-due'], tone: 'warning' },
        ]}
      />

      <FilterBar
        className="mb-4"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search turbine ID, serial, site, alarm…"
        values={filters}
        onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        filters={[
          { key: 'product', label: 'Product', options: PRODUCT_FAMILIES.map((p) => ({ value: p, label: p })) },
          { key: 'state', label: 'Region', options: STATE_OPTIONS },
          { key: 'site', label: 'Site', options: siteOptions },
          {
            key: 'health',
            label: 'Health',
            options: [
              { value: 'critical', label: 'Below 60' },
              { value: 'watch', label: '60 – 79' },
              { value: 'healthy', label: '80 and above' },
            ],
          },
        ]}
        right={<span className="text-[12.5px] text-[var(--ink-muted)]">{fmtNumber(filtered.length)} shown</span>}
      />

      <QueryState
        query={turbines}
        errorTitle="Turbine fleet unavailable"
        skeleton={<TableSkeleton rows={12} cols={8} />}
      >
        {() =>
          filtered.length === 0 ? (
            <EmptyState
              icon={Wind}
              title="No turbines match"
              description="Nothing in the fleet matches this combination of filters. Widen the search or reset to see all turbines."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setSegment('all')
                    setFilters({ product: 'all', state: 'all', site: 'all', health: 'all' })
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
              rowKey={(t) => t.id}
              href={(t) => `/turbines/${t.id}`}
              caption="Turbine fleet with status, output, availability, health and service dates"
              defaultSort={{ key: 'health', dir: 'asc' }}
              maxHeight={720}
            />
          )
        }
      </QueryState>
    </Page>
  )
}
