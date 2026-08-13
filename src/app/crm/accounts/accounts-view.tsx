'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Buildings, Cards, Table as TableIcon } from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/primitives'
import { HealthRing } from '@/components/charts'
import { KpiCard, TrendPill } from '@/components/cards/kpi'
import { CellTitle, DataTable, type Column } from '@/components/tables/data-table'
import { FilterBar, ViewToggle } from '@/components/tables/filter-bar'
import { CardGridSkeleton, EmptyState, KpiSkeleton, QueryState, TableSkeleton } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { TONE_VAR } from '@/lib/constants'
import { fmtCrore, fmtDate, fmtMw, fmtNumber, fmtRelative } from '@/lib/formatters'
import { sum } from '@/lib/utils'
import type { Account } from '@/types'

export function AccountsView() {
  const [view, setView] = React.useState<'cards' | 'table'>('cards')
  const [search, setSearch] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, string>>({ type: 'all', owner: 'all' })

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: api.accounts.list })

  const owners = React.useMemo(
    () => Array.from(new Set((accounts.data ?? []).map((a) => a.relationshipOwner))).map((o) => ({ value: o, label: o })),
    [accounts.data],
  )

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (accounts.data ?? []).filter((a) => {
      if (q && !`${a.name} ${a.type} ${a.headquarters} ${a.region} ${a.segments.join(' ')}`.toLowerCase().includes(q))
        return false
      if (filters.type !== 'all' && a.type !== filters.type) return false
      if (filters.owner !== 'all' && a.relationshipOwner !== filters.owner) return false
      return true
    })
  }, [accounts.data, search, filters])

  const totals = accounts.data
    ? {
        mw: Math.round(sum(accounts.data.map((a) => a.installedMw)) * 10) / 10,
        cases: sum(accounts.data.map((a) => a.openCases)),
        service: Math.round(sum(accounts.data.map((a) => a.annualServiceValueCr))),
        atRisk: accounts.data.filter((a) => a.healthScore < 75).length,
      }
    : null

  const columns: Column<Account>[] = [
    {
      key: 'name',
      header: 'Account',
      width: '26%',
      sortValue: (a) => a.name,
      render: (a) => (
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: a.logoTint }}
          />
          <CellTitle title={a.name} subtitle={`${a.type} · ${a.headquarters}`} />
        </span>
      ),
    },
    { key: 'region', header: 'Region', hideBelow: 'lg', sortValue: (a) => a.region, render: (a) => a.region },
    { key: 'mw', header: 'Installed', numeric: true, sortValue: (a) => a.installedMw, render: (a) => fmtMw(a.installedMw) },
    {
      key: 'projects',
      header: 'Projects',
      numeric: true,
      hideBelow: 'md',
      sortValue: (a) => a.activeProjects,
      render: (a) => fmtNumber(a.activeProjects),
    },
    {
      key: 'contracts',
      header: 'Contracts',
      numeric: true,
      hideBelow: 'xl',
      sortValue: (a) => a.serviceContracts,
      render: (a) => fmtNumber(a.serviceContracts),
    },
    {
      key: 'cases',
      header: 'Open cases',
      numeric: true,
      sortValue: (a) => a.openCases,
      render: (a) =>
        a.openCases > 6 ? (
          <Badge tone="serious" dot>
            {a.openCases}
          </Badge>
        ) : (
          fmtNumber(a.openCases)
        ),
    },
    { key: 'owner', header: 'Owner', hideBelow: 'lg', sortValue: (a) => a.relationshipOwner, render: (a) => a.relationshipOwner },
    {
      key: 'health',
      header: 'Health',
      numeric: true,
      sortValue: (a) => a.healthScore,
      render: (a) => (
        <span className="flex items-center justify-end gap-2">
          <span className="w-20">
            <Progress
              value={a.healthScore}
              color={a.healthScore >= 85 ? TONE_VAR.good : a.healthScore >= 72 ? TONE_VAR.warning : TONE_VAR.critical}
            />
          </span>
          <span className="tabular w-7 text-right font-medium text-[var(--ink)]">{a.healthScore}</span>
        </span>
      ),
    },
    {
      key: 'engaged',
      header: 'Last contact',
      numeric: true,
      hideBelow: 'xl',
      sortValue: (a) => a.lastEngagement,
      render: (a) => fmtRelative(a.lastEngagement),
    },
  ]

  return (
    <Page
      title="Accounts"
      description="Customer organisations, their installed base, and the operational story behind each relationship."
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
        {accounts.isPending ? (
          <KpiSkeleton />
        ) : totals ? (
          <>
            <KpiCard label="Customers" value={fmtNumber(accounts.data!.length)} icon={Buildings} />
            <KpiCard label="Installed base" value={fmtMw(totals.mw, 0)} trendLabel="Across all customers" />
            <KpiCard label="Annual service value" value={fmtCrore(totals.service)} trendLabel="Contracted O&M" />
            <KpiCard
              label="Accounts below 75 health"
              value={fmtNumber(totals.atRisk)}
              emphasis="warning"
              trendLabel={`${totals.cases} open cases`}
            />
          </>
        ) : null}
      </div>

      <FilterBar
        className="mb-4"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customer, type, region…"
        values={filters}
        onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        filters={[
          {
            key: 'type',
            label: 'Type',
            options: [
              { value: 'IPP', label: 'IPP' },
              { value: 'Utility', label: 'Utility' },
              { value: 'C&I Captive', label: 'C&I Captive' },
              { value: 'Infrastructure Fund', label: 'Infrastructure Fund' },
              { value: 'PSU', label: 'PSU' },
              { value: 'Corporate PPA', label: 'Corporate PPA' },
            ],
          },
          { key: 'owner', label: 'Owner', options: owners },
        ]}
        right={<span className="text-[12.5px] text-[var(--ink-muted)]">{filtered.length} accounts</span>}
      />

      <QueryState
        query={accounts}
        errorTitle="Accounts unavailable"
        skeleton={
          view === 'cards' ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <CardGridSkeleton count={6} height={230} />
            </div>
          ) : (
            <TableSkeleton rows={8} cols={7} />
          )
        }
      >
        {() =>
          filtered.length === 0 ? (
            <EmptyState
              icon={Buildings}
              title="No accounts match"
              description="Nothing in the customer book matches these filters."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setFilters({ type: 'all', owner: 'all' })
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : view === 'cards' ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((account, i) => (
                <AccountCard key={account.id} account={account} index={i} />
              ))}
            </div>
          ) : (
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(a) => a.id}
              href={(a) => `/crm/accounts/${a.id}`}
              caption="Customer accounts with installed base, cases and relationship health"
              defaultSort={{ key: 'mw', dir: 'desc' }}
            />
          )
        }
      </QueryState>
    </Page>
  )
}

function AccountCard({ account, index }: { account: Account; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.03, 0.24), ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/crm/accounts/${account.id}`}
        className="panel block p-4 transition-shadow hover:shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[15px] font-bold text-white"
            style={{ background: `linear-gradient(140deg, ${account.logoTint}, color-mix(in oklab, ${account.logoTint} 62%, black))` }}
            aria-hidden
          >
            {account.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-[var(--ink)]">{account.name}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--ink-muted)]">
              {account.type} · {account.headquarters}
            </p>
          </div>
          <HealthRing value={account.healthScore} size={38} thickness={3.5} label="Relationship health" />
        </div>

        <dl className="mt-3.5 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-3 text-center">
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">Installed</dt>
            <dd className="kpi-value mt-0.5 text-[15px] font-semibold text-[var(--ink)]">{fmtMw(account.installedMw, 0)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">Projects</dt>
            <dd className="kpi-value mt-0.5 text-[15px] font-semibold text-[var(--ink)]">{account.activeProjects}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">Open cases</dt>
            <dd
              className="kpi-value mt-0.5 text-[15px] font-semibold"
              style={{ color: account.openCases > 6 ? TONE_VAR.serious : 'var(--ink)' }}
            >
              {account.openCases}
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {account.segments.map((segment) => (
            <Chip key={segment}>{segment}</Chip>
          ))}
        </div>

        <p className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--ink-muted)]">
          <span className="truncate">{account.relationshipOwner}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <TrendPill trend={account.healthTrend} />
            {fmtRelative(account.lastEngagement)}
          </span>
        </p>
      </Link>
    </motion.div>
  )
}
