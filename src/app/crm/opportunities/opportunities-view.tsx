'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Kanban, Rows, Sparkle, Warning, X } from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@/components/ui/primitives'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/dialog'
import { KpiCard } from '@/components/cards/kpi'
import { CellTitle, DataTable, type Column } from '@/components/tables/data-table'
import { FilterBar, ViewToggle } from '@/components/tables/filter-bar'
import { CardGridSkeleton, EmptyState, KpiSkeleton, QueryState, TableSkeleton } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { OPPORTUNITY_STAGES, TONE_VAR } from '@/lib/constants'
import { fmtCrore, fmtDate, fmtMw, fmtNumber, fmtPct, fmtRelative, fmtSpeed } from '@/lib/formatters'
import { sum } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Opportunity } from '@/types'

const OPEN_STAGES = OPPORTUNITY_STAGES.filter((s) => s !== 'Won' && s !== 'Lost')

export function OpportunitiesView() {
  const [view, setView] = React.useState<'pipeline' | 'table'>('pipeline')
  const [search, setSearch] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, string>>({ owner: 'all', product: 'all' })
  const [selected, setSelected] = React.useState<string | null>(null)

  const opportunities = useQuery({ queryKey: ['opportunities'], queryFn: api.opportunities.list })
  const pipeline = useQuery({ queryKey: ['opportunities', 'pipeline'], queryFn: api.opportunities.pipeline })

  const owners = React.useMemo(
    () => Array.from(new Set((opportunities.data ?? []).map((o) => o.owner))).map((o) => ({ value: o, label: o })),
    [opportunities.data],
  )

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (opportunities.data ?? []).filter((o) => {
      if (q && !`${o.name} ${o.accountName} ${o.owner} ${o.state} ${o.product}`.toLowerCase().includes(q)) return false
      if (filters.owner !== 'all' && o.owner !== filters.owner) return false
      if (filters.product !== 'all' && o.product !== filters.product) return false
      return true
    })
  }, [opportunities.data, search, filters])

  const selectedOpp = filtered.find((o) => o.id === selected) ?? null

  const columns: Column<Opportunity>[] = [
    {
      key: 'name',
      header: 'Opportunity',
      width: '28%',
      sortValue: (o) => o.name,
      render: (o) => <CellTitle title={o.name} subtitle={`${o.accountName} · ${o.state}`} />,
    },
    { key: 'stage', header: 'Stage', sortValue: (o) => OPPORTUNITY_STAGES.indexOf(o.stage), render: (o) => <Chip>{o.stage}</Chip> },
    { key: 'product', header: 'Product', hideBelow: 'lg', render: (o) => <Chip>{o.product}</Chip> },
    { key: 'mw', header: 'Capacity', numeric: true, sortValue: (o) => o.capacityMw, render: (o) => fmtMw(o.capacityMw) },
    { key: 'value', header: 'Value', numeric: true, sortValue: (o) => o.valueCr, render: (o) => fmtCrore(o.valueCr) },
    {
      key: 'prob',
      header: 'Probability',
      numeric: true,
      sortValue: (o) => o.probabilityPct,
      render: (o) => (
        <span className="flex items-center justify-end gap-2">
          <span className="w-16">
            <Progress value={o.probabilityPct} />
          </span>
          <span className="tabular w-9 text-right">{o.probabilityPct}%</span>
        </span>
      ),
    },
    { key: 'close', header: 'Expected close', numeric: true, hideBelow: 'md', sortValue: (o) => o.expectedClose, render: (o) => fmtDate(o.expectedClose) },
    { key: 'owner', header: 'Owner', hideBelow: 'xl', sortValue: (o) => o.owner, render: (o) => o.owner },
  ]

  return (
    <Page
      title="Opportunities"
      description="The wind pipeline from first contact to award, with capacity, commercial value and technical risk."
      wide
      actions={
        <ViewToggle
          value={view}
          onChange={setView}
          options={[
            { value: 'pipeline', label: 'Pipeline', icon: <Kanban className="size-4" aria-hidden /> },
            { value: 'table', label: 'Table', icon: <Rows className="size-4" aria-hidden /> },
          ]}
        />
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {pipeline.isPending ? (
          <KpiSkeleton count={5} />
        ) : pipeline.data ? (
          <>
            <KpiCard label="Open pipeline" value={fmtCrore(pipeline.data.openValueCr)} icon={Sparkle} trendLabel="Unweighted" />
            <KpiCard label="Weighted" value={fmtCrore(pipeline.data.weightedValueCr)} trendLabel="Probability-adjusted" />
            <KpiCard label="Open capacity" value={fmtMw(pipeline.data.openMw, 0)} trendLabel="Across live deals" />
            <KpiCard label="Won this year" value={fmtNumber(pipeline.data.wonThisYear)} trendLabel="Closed opportunities" />
            <KpiCard label="Win rate" value={fmtPct(pipeline.data.winRatePct, 0)} trendLabel="Won versus lost" />
          </>
        ) : null}
      </div>

      <FilterBar
        className="mb-4"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search opportunity, customer, owner…"
        values={filters}
        onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        filters={[
          { key: 'owner', label: 'Owner', options: owners },
          {
            key: 'product',
            label: 'Product',
            options: [
              { value: 'S120', label: 'S120' },
              { value: 'S133', label: 'S133' },
              { value: 'S144', label: 'S144' },
            ],
          },
        ]}
        right={<span className="text-[12.5px] text-[var(--ink-muted)]">{filtered.length} opportunities</span>}
      />

      <QueryState
        query={opportunities}
        errorTitle="Pipeline unavailable"
        skeleton={
          view === 'pipeline' ? (
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
              <CardGridSkeleton count={7} height={220} />
            </div>
          ) : (
            <TableSkeleton rows={10} cols={7} />
          )
        }
      >
        {() =>
          filtered.length === 0 ? (
            <EmptyState
              icon={Kanban}
              title="No opportunities match"
              description="Nothing in the pipeline matches these filters."
            />
          ) : view === 'pipeline' ? (
            <PipelineBoard opportunities={filtered} onSelect={setSelected} />
          ) : (
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(o) => o.id}
              onRowClick={(o) => setSelected(o.id)}
              caption="Opportunity pipeline"
              defaultSort={{ key: 'value', dir: 'desc' }}
            />
          )
        }
      </QueryState>

      <Sheet open={Boolean(selectedOpp)} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-[min(94vw,32rem)] p-0">
          {selectedOpp && <OpportunityWorkspace opportunity={selectedOpp} />}
        </SheetContent>
      </Sheet>
    </Page>
  )
}

/* -------------------------------- Pipeline board -------------------------------- */

function PipelineBoard({
  opportunities,
  onSelect,
}: {
  opportunities: Opportunity[]
  onSelect: (id: string) => void
}) {
  const closed = opportunities.filter((o) => o.stage === 'Won' || o.stage === 'Lost')

  return (
    <div className="space-y-4">
      <div className="scrollbar-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {OPEN_STAGES.map((stage, stageIndex) => {
          const items = opportunities.filter((o) => o.stage === stage)
          const value = sum(items.map((o) => o.valueCr))
          const mw = sum(items.map((o) => o.capacityMw))
          return (
            <section key={stage} className="flex w-[16.5rem] shrink-0 flex-col">
              <header className="mb-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-[12.5px] font-semibold text-[var(--ink)]">{stage}</h2>
                  <Badge tone="neutral">{items.length}</Badge>
                </div>
                <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                  {fmtCrore(value)} · {fmtMw(mw, 0)}
                </p>
                {/* Stage position indicator */}
                <div className="mt-2 flex gap-[2px]">
                  {OPEN_STAGES.map((_, i) => (
                    <span
                      key={i}
                      className="h-[3px] flex-1 rounded-full"
                      style={{ backgroundColor: i <= stageIndex ? 'var(--brand)' : 'var(--inset)' }}
                    />
                  ))}
                </div>
              </header>

              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((opp) => (
                    <motion.button
                      key={opp.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => onSelect(opp.id)}
                      className="panel w-full p-3 text-left transition-shadow hover:shadow-[var(--shadow-md)]"
                    >
                      <p className="text-[12.5px] font-semibold leading-snug text-[var(--ink)]">{opp.name}</p>
                      <p className="mt-1 truncate text-[11px] text-[var(--ink-muted)]">{opp.accountName}</p>

                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="kpi-value text-[14px] font-semibold text-[var(--ink)]">{fmtCrore(opp.valueCr)}</span>
                        <Chip>{opp.product}</Chip>
                      </div>

                      <div className="mt-2.5">
                        <div className="mb-1 flex items-center justify-between text-[10.5px] text-[var(--ink-muted)]">
                          <span>{fmtMw(opp.capacityMw, 0)}</span>
                          <span className="tabular">{opp.probabilityPct}%</span>
                        </div>
                        <Progress
                          value={opp.probabilityPct}
                          color={opp.probabilityPct >= 65 ? TONE_VAR.good : opp.probabilityPct >= 40 ? TONE_VAR.warning : TONE_VAR.neutral}
                        />
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-[var(--line)] pt-2 text-[10.5px] text-[var(--ink-muted)]">
                        <span className="flex items-center gap-1.5">
                          <Avatar name={opp.owner} size={16} />
                          {opp.owner.split(' ')[0]}
                        </span>
                        <span>{fmtRelative(opp.expectedClose)}</span>
                      </div>

                      {opp.technicalRisks.length > 0 && (
                        <p className="mt-2 flex items-start gap-1.5 text-[10.5px]" style={{ color: TONE_VAR.warning }}>
                          <Warning className="mt-px size-3 shrink-0" weight="fill" aria-hidden />
                          {opp.technicalRisks.length} technical risk{opp.technicalRisks.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </motion.button>
                  ))}
                </AnimatePresence>

                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[var(--line-strong)] px-3 py-6 text-center text-[11px] text-[var(--ink-muted)]">
                    Nothing at this stage
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {closed.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Closed this period</CardTitle>
              <CardDescription>Won and lost opportunities</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {closed.map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => onSelect(opp.id)}
                  className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-3 text-left transition-colors hover:border-[var(--line-strong)]"
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: opp.stage === 'Won' ? TONE_VAR.good : TONE_VAR.critical }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-[var(--ink)]">{opp.name}</span>
                    <span className="block truncate text-[11px] text-[var(--ink-muted)]">{opp.accountName}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[12.5px] font-semibold text-[var(--ink)]">{fmtCrore(opp.valueCr)}</span>
                    <Badge tone={opp.stage === 'Won' ? 'good' : 'critical'}>{opp.stage}</Badge>
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------ Opportunity panel ------------------------------ */

function OpportunityWorkspace({ opportunity }: { opportunity: Opportunity }) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[var(--line)] px-5 pb-4 pt-4">
        <SheetTitle className="pr-8 text-[16px] font-semibold leading-snug text-[var(--ink)]">
          {opportunity.name}
        </SheetTitle>
        <Link
          href={`/crm/accounts/${opportunity.accountId}`}
          className="mt-1 inline-block text-[12.5px] font-medium text-[var(--brand)] hover:underline"
        >
          {opportunity.accountName}
        </Link>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Chip>{opportunity.stage}</Chip>
          <Chip>{opportunity.product}</Chip>
          <Chip>{opportunity.state}</Chip>
          {opportunity.competitor && (
            <Badge tone="warning" dot>
              vs {opportunity.competitor}
            </Badge>
          )}
        </div>
      </div>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
        <dl className="grid grid-cols-2 gap-3">
          {[
            ['Commercial value', fmtCrore(opportunity.valueCr)],
            ['Capacity', fmtMw(opportunity.capacityMw)],
            ['Probability', `${opportunity.probabilityPct}%`],
            ['Expected close', fmtDate(opportunity.expectedClose)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5">
              <dt className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">{label}</dt>
              <dd className="kpi-value mt-1 text-[16px] font-semibold text-[var(--ink)]">{value}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">Next step</h3>
          <p className="rounded-lg border border-[var(--line)] bg-[var(--brand-soft)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--brand-ink)]">
            {opportunity.nextStep}
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">Site study</h3>
          <div className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-[var(--ink-secondary)]">Wind resource assessment</span>
              <Badge
                tone={
                  opportunity.siteStudyStatus === 'complete'
                    ? 'good'
                    : opportunity.siteStudyStatus === 'in-progress'
                      ? 'info'
                      : 'neutral'
                }
                dot
              >
                {opportunity.siteStudyStatus.replace('-', ' ')}
              </Badge>
            </div>
            {opportunity.meanWindSpeedMs !== null && (
              <p className="mt-2 text-[12.5px] text-[var(--ink-muted)]">
                Measured mean wind speed{' '}
                <strong className="text-[var(--ink)]">{fmtSpeed(opportunity.meanWindSpeedMs)}</strong> at hub height
              </p>
            )}
          </div>
        </section>

        {opportunity.technicalRisks.length > 0 && (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">
              Technical risks
            </h3>
            <ul className="space-y-2">
              {opportunity.technicalRisks.map((risk, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 rounded-lg border px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--ink-secondary)]"
                  style={{
                    borderColor: 'color-mix(in oklab, var(--status-warning) 30%, transparent)',
                    backgroundColor: 'var(--status-warning-soft)',
                  }}
                >
                  <Warning className="mt-0.5 size-4 shrink-0" style={{ color: TONE_VAR.warning }} aria-hidden />
                  {risk}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">Stakeholders</h3>
          <ul className="space-y-1.5">
            {opportunity.stakeholders.map((person) => (
              <li key={person.name} className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2">
                <Avatar name={person.name} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-[var(--ink)]">{person.name}</span>
                  <span className="block truncate text-[11px] text-[var(--ink-muted)]">{person.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">
            Activity timeline
          </h3>
          <ol className="relative space-y-3.5 border-l border-[var(--line)] pl-4">
            {opportunity.activities.map((activity) => (
              <li key={activity.id} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[21px] top-1 size-2 rounded-full bg-[var(--brand)] ring-4 ring-[var(--surface)]"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Chip>{activity.type}</Chip>
                  <time className="text-[11px] text-[var(--ink-muted)]">{fmtRelative(activity.at)}</time>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">{activity.summary}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="shrink-0 border-t border-[var(--line)] p-3">
        <Button variant="primary" className="w-full" asChild>
          <Link href="/crm/quotes">Open related quote</Link>
        </Button>
      </div>
    </div>
  )
}
