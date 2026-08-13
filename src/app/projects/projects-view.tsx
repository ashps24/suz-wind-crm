'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Cards, HardHat, Table as TableIcon } from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/primitives'
import { KpiCard } from '@/components/cards/kpi'
import { RiskBadge } from '@/components/cards/status'
import { CellTitle, DataTable, type Column } from '@/components/tables/data-table'
import { FilterBar, ViewToggle } from '@/components/tables/filter-bar'
import { CardGridSkeleton, EmptyState, KpiSkeleton, QueryState, TableSkeleton } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { PROJECT_STAGES, TONE_VAR } from '@/lib/constants'
import { fmtCrore, fmtDate, fmtMw, fmtNumber } from '@/lib/formatters'
import type { Project } from '@/types'

export function ProjectsView() {
  const [view, setView] = React.useState<'cards' | 'table'>('cards')
  const [search, setSearch] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, string>>({ type: 'all', stage: 'all', risk: 'all' })

  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects.list })
  const summary = useQuery({ queryKey: ['projects', 'summary'], queryFn: api.projects.summary })

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (projects.data ?? []).filter((p) => {
      if (q && !`${p.name} ${p.code} ${p.customerName} ${p.projectManager} ${p.state}`.toLowerCase().includes(q))
        return false
      if (filters.type !== 'all' && p.type !== filters.type) return false
      if (filters.stage !== 'all' && p.stage !== filters.stage) return false
      if (filters.risk !== 'all' && p.risk !== filters.risk) return false
      return true
    })
  }, [projects.data, search, filters])

  const columns: Column<Project>[] = [
    {
      key: 'name',
      header: 'Project',
      width: '26%',
      sortValue: (p) => p.name,
      render: (p) => <CellTitle title={p.name} subtitle={`${p.code} · ${p.type}`} />,
    },
    { key: 'customer', header: 'Customer', hideBelow: 'lg', sortValue: (p) => p.customerName, render: (p) => p.customerName },
    { key: 'state', header: 'State', hideBelow: 'xl', sortValue: (p) => p.state, render: (p) => p.state },
    { key: 'mw', header: 'Capacity', numeric: true, sortValue: (p) => p.capacityMw, render: (p) => fmtMw(p.capacityMw) },
    { key: 'stage', header: 'Stage', sortValue: (p) => PROJECT_STAGES.indexOf(p.stage), render: (p) => <Chip>{p.stage}</Chip> },
    {
      key: 'completion',
      header: 'Completion',
      numeric: true,
      sortValue: (p) => p.completionPct,
      render: (p) => (
        <span className="flex items-center justify-end gap-2">
          <span className="w-20">
            <Progress value={p.completionPct} />
          </span>
          <span className="tabular w-9 text-right">{p.completionPct}%</span>
        </span>
      ),
    },
    {
      key: 'target',
      header: 'Target',
      numeric: true,
      hideBelow: 'md',
      sortValue: (p) => p.targetCommissioning,
      render: (p) => (
        <span>
          {fmtDate(p.targetCommissioning)}
          {p.delayDays > 0 && (
            <span className="block text-[11px]" style={{ color: 'var(--delta-down)' }}>
              +{p.delayDays} d
            </span>
          )}
        </span>
      ),
    },
    { key: 'risk', header: 'Risk', sortValue: (p) => p.risk, render: (p) => <RiskBadge band={p.risk} /> },
    { key: 'pm', header: 'Manager', hideBelow: 'xl', render: (p) => p.projectManager },
  ]

  return (
    <Page
      title="Projects"
      description="Every project in delivery — EPC, repowering, hybrid and O&M transition — with milestone adherence and delay exposure."
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
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {summary.isPending ? (
          <KpiSkeleton count={5} />
        ) : summary.data ? (
          <>
            <KpiCard label="Projects in flight" value={fmtNumber(summary.data.total)} icon={HardHat} />
            <KpiCard label="Pipeline capacity" value={fmtMw(summary.data.pipelineMw, 0)} trendLabel="Under delivery" />
            <KpiCard label="Contract value" value={fmtCrore(summary.data.contractValueCr)} trendLabel="Total book" />
            <KpiCard label="At risk" value={fmtNumber(summary.data.atRisk)} emphasis="critical" trendLabel="Severe or elevated" />
            <KpiCard label="Average delay" value={`${summary.data.averageDelayDays} d`} emphasis="warning" trendLabel="Across the book" />
          </>
        ) : null}
      </div>

      <FilterBar
        className="mb-4"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search project, code, customer, manager…"
        values={filters}
        onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        filters={[
          {
            key: 'type',
            label: 'Type',
            options: [
              { value: 'EPC', label: 'EPC' },
              { value: 'Repowering', label: 'Repowering' },
              { value: 'Hybrid', label: 'Hybrid' },
              { value: 'O&M Transition', label: 'O&M Transition' },
            ],
          },
          { key: 'stage', label: 'Stage', options: PROJECT_STAGES.map((s) => ({ value: s, label: s })) },
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
        right={<span className="text-[12.5px] text-[var(--ink-muted)]">{filtered.length} projects</span>}
      />

      <QueryState
        query={projects}
        errorTitle="Projects unavailable"
        skeleton={
          view === 'cards' ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <CardGridSkeleton count={6} height={240} />
            </div>
          ) : (
            <TableSkeleton rows={10} cols={7} />
          )
        }
      >
        {() =>
          filtered.length === 0 ? (
            <EmptyState
              icon={HardHat}
              title="No projects match"
              description="Nothing in the delivery book matches these filters."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setFilters({ type: 'all', stage: 'all', risk: 'all' })
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : view === 'cards' ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
            </div>
          ) : (
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(p) => p.id}
              href={(p) => `/projects/${p.id}`}
              caption="Projects with stage, completion, target date and risk"
              defaultSort={{ key: 'risk', dir: 'desc' }}
            />
          )
        }
      </QueryState>
    </Page>
  )
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const stageIndex = PROJECT_STAGES.indexOf(project.stage)
  const spendPct = Math.round((project.spentCr / project.contractValueCr) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.03, 0.24), ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/projects/${project.id}`} className="panel block p-4 transition-shadow hover:shadow-[var(--shadow-lg)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold leading-snug text-[var(--ink)]">{project.name}</p>
            <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">
              {project.code} · {project.customerName}
            </p>
          </div>
          <RiskBadge band={project.risk} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Chip>{project.type}</Chip>
          <Chip>{project.product}</Chip>
          <Chip>{project.state}</Chip>
        </div>

        {/* Stage rail */}
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
            <span className="font-medium text-[var(--ink)]">{project.stage}</span>
            <span className="tabular text-[var(--ink-muted)]">{project.completionPct}%</span>
          </div>
          <div className="flex gap-[3px]">
            {PROJECT_STAGES.map((stage, i) => (
              <span
                key={stage}
                title={stage}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  backgroundColor:
                    i < stageIndex
                      ? TONE_VAR.good
                      : i === stageIndex
                        ? project.risk === 'severe'
                          ? TONE_VAR.critical
                          : project.risk === 'elevated'
                            ? TONE_VAR.serious
                            : TONE_VAR.info
                        : 'var(--inset)',
                }}
              />
            ))}
          </div>
        </div>

        <dl className="mt-3.5 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-3 text-[11.5px]">
          <div>
            <dt className="text-[var(--ink-muted)]">Capacity</dt>
            <dd className="mt-0.5 font-medium text-[var(--ink)]">{fmtMw(project.capacityMw, 0)}</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-muted)]">Contract</dt>
            <dd className="mt-0.5 font-medium text-[var(--ink)]">{fmtCrore(project.contractValueCr)}</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-muted)]">Spent</dt>
            <dd className="mt-0.5 font-medium text-[var(--ink)]">{spendPct}%</dd>
          </div>
        </dl>

        <p className="mt-2.5 flex items-center justify-between text-[11.5px]">
          <span className="text-[var(--ink-muted)]">Target {fmtDate(project.targetCommissioning)}</span>
          {project.delayDays > 0 ? (
            <span className="font-medium" style={{ color: 'var(--delta-down)' }}>
              {project.delayDays} days late
            </span>
          ) : (
            <span className="font-medium" style={{ color: 'var(--delta-up)' }}>
              On schedule
            </span>
          )}
        </p>
      </Link>
    </motion.div>
  )
}
