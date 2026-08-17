'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Buildings,
  CheckCircle,
  Circle,
  ClockCounterClockwise,
  CurrencyInr,
  FileText,
  MapPin,
  Prohibit,
  Users,
  Warning,
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
import { BarChart, StackedBar } from '@/components/charts'
import { MilestoneTimeline } from '@/components/charts/milestone-timeline'
import { RiskBadge, SeverityBadge } from '@/components/cards/status'
import { DetailHeader, StatStrip } from '@/components/layout/detail-header'
import { CellTitle, DataTable } from '@/components/tables/data-table'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { PROJECT_STAGES, TONE_VAR } from '@/lib/constants'
import { fmtCrore, fmtDate, fmtMw, fmtNumber, fmtPct, fmtRelative } from '@/lib/formatters'
import type { SiteReadinessItem } from '@/types'
import { windFarmHref } from '@/lib/routing'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'readiness', label: 'Site readiness' },
  { value: 'contractors', label: 'Contractors' },
  { value: 'risks', label: 'Risks' },
  { value: 'documents', label: 'Documents' },
  { value: 'financial', label: 'Financial' },
  { value: 'activity', label: 'Activity' },
]

const READINESS_TONE: Record<SiteReadinessItem['status'], { tone: string; icon: typeof CheckCircle }> = {
  complete: { tone: 'good', icon: CheckCircle },
  'in-progress': { tone: 'warning', icon: ClockCounterClockwise },
  blocked: { tone: 'critical', icon: Prohibit },
  'not-started': { tone: 'neutral', icon: Circle },
}

export function ProjectWorkspace({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initial = searchParams.get('tab') ?? 'overview'
  const [tab, setTab] = React.useState(TABS.some((t) => t.value === initial) ? initial : 'overview')
  const [selectedMilestone, setSelectedMilestone] = React.useState<string | null>(null)

  const project = useQuery({ queryKey: ['projects', id], queryFn: () => api.projects.detail(id) })
  const documents = useQuery({ queryKey: ['projects', id, 'docs'], queryFn: () => api.projects.documents(id) })

  if (project.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Project not found"
          description={project.error instanceof Error ? project.error.message : undefined}
          onRetry={() => project.refetch()}
        />
      </div>
    )
  }

  if (project.isPending || !project.data) {
    return (
      <div className="mx-auto w-full max-w-[100rem] px-4 pb-16 pt-5 md:px-6">
        <div className="grid gap-3 md:grid-cols-2">
          <CardGridSkeleton count={4} height={220} />
        </div>
      </div>
    )
  }

  const p = project.data
  const stageIndex = PROJECT_STAGES.indexOf(p.stage)
  const openRisks = p.risks.filter((r) => r.status !== 'closed')
  const blocked = p.siteReadiness.filter((s) => s.status === 'blocked')
  const milestone = p.milestones.find((m) => m.id === selectedMilestone)

  function changeTab(value: string) {
    setTab(value)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    router.replace(`${url.pathname}${url.search}`, { scroll: false })
  }

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 pb-16 pt-5 md:px-6">
      <DetailHeader
        backHref="/projects"
        backLabel="All projects"
        eyebrow={`${p.code} · ${p.type}`}
        title={p.name}
        meta={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/crm/accounts/${p.customerId}`} className="inline-flex items-center gap-1 hover:text-[var(--brand)]">
              <Buildings className="size-3.5" aria-hidden />
              {p.customerName}
            </Link>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {p.state}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {p.projectManager}
            </span>
          </span>
        }
        badges={
          <>
            <RiskBadge band={p.risk} prefix="Risk: " size="md" />
            <Chip>{p.stage}</Chip>
            <Chip>{p.product}</Chip>
            <Chip>
              {p.turbineCount} turbines · {fmtMw(p.capacityMw)}
            </Chip>
          </>
        }
        actions={
          p.windFarmId ? (
            <Button variant="secondary" size="sm" asChild>
              <Link href={windFarmHref(p.windFarmId)}>Open site workspace</Link>
            </Button>
          ) : undefined
        }
      />

      {p.delayDays > 0 && (
        <div
          className="mb-5 flex items-start gap-3 rounded-xl border px-4 py-3"
          style={{
            borderColor: 'color-mix(in oklab, var(--status-serious) 38%, transparent)',
            backgroundColor: 'var(--status-serious-soft)',
          }}
          role="status"
        >
          <Warning className="mt-0.5 size-5 shrink-0" style={{ color: TONE_VAR.serious }} weight="fill" aria-hidden />
          <div>
            <p className="text-[13px] font-semibold text-[var(--ink)]">
              Forecast to miss the contractual commissioning date by {p.delayDays} days
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--ink-secondary)]">
              Target {fmtDate(p.targetCommissioning)} · forecast {fmtDate(p.forecastCommissioning)}
              {blocked.length > 0 && ` · ${blocked.length} site-readiness item${blocked.length > 1 ? 's' : ''} blocked`}
            </p>
          </div>
        </div>
      )}

      <StatStrip
        className="mb-5"
        items={[
          { label: 'Completion', value: `${p.completionPct}%`, sub: p.stage },
          { label: 'Capacity', value: fmtMw(p.capacityMw), sub: `${p.turbineCount} × ${p.product}` },
          { label: 'Contract value', value: fmtCrore(p.contractValueCr), sub: `${fmtCrore(p.spentCr)} spent` },
          {
            label: 'Target',
            value: fmtDate(p.targetCommissioning),
            sub: p.delayDays > 0 ? `${p.delayDays} days late` : 'On schedule',
            tone: p.delayDays > 30 ? 'critical' : p.delayDays > 0 ? 'warning' : 'good',
          },
          { label: 'Turbines erected', value: `${p.turbinesErected}/${p.turbineCount}`, sub: 'Erection progress' },
          {
            label: 'Open risks',
            value: fmtNumber(openRisks.length),
            sub: `${p.risks.length} logged in total`,
            tone: openRisks.some((r) => r.severity === 'critical') ? 'critical' : 'warning',
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
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Delivery stages</CardTitle>
                <CardDescription>Planning through commissioning — current position highlighted</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-10">
                {PROJECT_STAGES.map((stage, i) => {
                  const state = i < stageIndex ? 'done' : i === stageIndex ? 'current' : 'todo'
                  return (
                    <li key={stage} className="min-w-0">
                      <div
                        className="h-1.5 w-full rounded-full"
                        style={{
                          backgroundColor:
                            state === 'done' ? TONE_VAR.good : state === 'current' ? 'var(--brand)' : 'var(--inset)',
                        }}
                      />
                      <p
                        className="mt-1.5 truncate text-[11.5px] font-medium"
                        style={{
                          color:
                            state === 'todo' ? 'var(--ink-muted)' : state === 'current' ? 'var(--brand-ink)' : 'var(--ink)',
                        }}
                      >
                        {stage}
                      </p>
                      <p className="text-[10px] text-[var(--ink-muted)]">
                        {state === 'done' ? 'Complete' : state === 'current' ? `${p.milestones[i]?.progressPct ?? 0}%` : 'Pending'}
                      </p>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Milestone timeline</CardTitle>
                  <CardDescription>Planned against actual — slip shows as an offset</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <MilestoneTimeline
                  milestones={p.milestones}
                  selectedId={selectedMilestone}
                  onSelect={setSelectedMilestone}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Site readiness</CardTitle>
                  <CardDescription>
                    {p.siteReadiness.filter((s) => s.status === 'complete').length} of {p.siteReadiness.length} complete
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <StackedBar
                  height={9}
                  segments={[
                    { label: 'Complete', value: p.siteReadiness.filter((s) => s.status === 'complete').length, color: TONE_VAR.good },
                    { label: 'In progress', value: p.siteReadiness.filter((s) => s.status === 'in-progress').length, color: TONE_VAR.warning },
                    { label: 'Blocked', value: p.siteReadiness.filter((s) => s.status === 'blocked').length, color: TONE_VAR.critical },
                    { label: 'Not started', value: p.siteReadiness.filter((s) => s.status === 'not-started').length, color: 'var(--axis)' },
                  ].filter((s) => s.value > 0)}
                />
                <ul className="mt-4 space-y-1.5">
                  {p.siteReadiness.slice(0, 5).map((item) => {
                    const meta = READINESS_TONE[item.status]
                    const Icon = meta.icon
                    return (
                      <li key={item.label} className="flex items-center gap-2.5 text-[12px]">
                        <Icon
                          className="size-4 shrink-0"
                          style={{ color: `var(--status-${meta.tone})` }}
                          weight={item.status === 'complete' ? 'fill' : 'regular'}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-[var(--ink-secondary)]">{item.label}</span>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>

          {openRisks.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Top risks</CardTitle>
                  <CardDescription>Open items with schedule impact</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => changeTab('risks')}>
                  All risks
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {openRisks.slice(0, 3).map((risk) => (
                    <li key={risk.id} className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3.5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[var(--ink)]">{risk.title}</p>
                          <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-muted)]">{risk.mitigation}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <SeverityBadge severity={risk.severity} />
                          <span className="text-[11px] text-[var(--ink-muted)]">+{risk.impactDays} d impact</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------------------------------- Timeline ---------------------------------- */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Project timeline</CardTitle>
                <CardDescription>Select a stage to see dependencies, owner and current note</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <MilestoneTimeline
                milestones={p.milestones}
                selectedId={selectedMilestone}
                onSelect={setSelectedMilestone}
              />
            </CardContent>
          </Card>

          {milestone && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>
                    {milestone.stage} — {milestone.label}
                  </CardTitle>
                  <CardDescription>Owned by {milestone.owner}</CardDescription>
                </div>
                <RiskBadge band={milestone.risk} />
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-[12.5px] sm:grid-cols-4">
                  {[
                    ['Planned start', fmtDate(milestone.plannedStart)],
                    ['Planned end', fmtDate(milestone.plannedEnd)],
                    ['Actual start', milestone.actualStart ? fmtDate(milestone.actualStart) : 'Not started'],
                    ['Actual end', milestone.actualEnd ? fmtDate(milestone.actualEnd) : 'In progress'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[var(--ink-muted)]">{label}</dt>
                      <dd className="mt-0.5 font-medium text-[var(--ink)]">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span className="text-[var(--ink-muted)]">Progress</span>
                    <span className="tabular font-medium text-[var(--ink)]">{milestone.progressPct}%</span>
                  </div>
                  <Progress value={milestone.progressPct} />
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">{milestone.note}</p>
                {milestone.dependencies.length > 0 && (
                  <p className="mt-2 text-[11.5px] text-[var(--ink-muted)]">
                    Depends on:{' '}
                    {milestone.dependencies
                      .map((depId) => p.milestones.find((m) => m.id === depId)?.stage ?? depId)
                      .join(', ')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* --------------------------------- Milestones --------------------------------- */}
        <TabsContent value="milestones">
          <DataTable
            rows={p.milestones}
            rowKey={(m) => m.id}
            onRowClick={(m) => setSelectedMilestone(m.id)}
            caption="Project milestones with planned and actual dates"
            columns={[
              {
                key: 'stage',
                header: 'Stage',
                width: '26%',
                render: (m) => <CellTitle title={m.stage} subtitle={m.label} />,
              },
              { key: 'owner', header: 'Owner', hideBelow: 'md', render: (m) => m.owner },
              { key: 'plannedStart', header: 'Planned start', numeric: true, sortValue: (m) => m.plannedStart, render: (m) => fmtDate(m.plannedStart) },
              { key: 'plannedEnd', header: 'Planned end', numeric: true, sortValue: (m) => m.plannedEnd, render: (m) => fmtDate(m.plannedEnd) },
              {
                key: 'actual',
                header: 'Actual',
                numeric: true,
                hideBelow: 'lg',
                render: (m) => (m.actualStart ? fmtDate(m.actualStart) : '—'),
              },
              {
                key: 'progress',
                header: 'Progress',
                numeric: true,
                sortValue: (m) => m.progressPct,
                render: (m) => (
                  <span className="flex items-center justify-end gap-2">
                    <span className="w-16">
                      <Progress value={m.progressPct} />
                    </span>
                    <span className="tabular w-9 text-right">{m.progressPct}%</span>
                  </span>
                ),
              },
              { key: 'risk', header: 'Risk', render: (m) => <RiskBadge band={m.risk} /> },
            ]}
          />
        </TabsContent>

        {/* -------------------------------- Site readiness -------------------------------- */}
        <TabsContent value="readiness">
          <div className="grid gap-3 md:grid-cols-2">
            {p.siteReadiness.map((item) => {
              const meta = READINESS_TONE[item.status]
              const Icon = meta.icon
              return (
                <Card key={item.label} className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `var(--status-${meta.tone}-soft)`,
                        color: `var(--status-${meta.tone})`,
                      }}
                    >
                      <Icon className="size-[18px]" weight={item.status === 'complete' ? 'fill' : 'regular'} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium text-[var(--ink)]">{item.label}</p>
                        <Badge tone={meta.tone as 'good'} dot>
                          {item.status.replace('-', ' ')}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-muted)]">{item.detail}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* --------------------------------- Contractors --------------------------------- */}
        <TabsContent value="contractors" className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Contractor performance</CardTitle>
                <CardDescription>Scored on schedule adherence, quality and safety</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <BarChart
                horizontal
                unit=" / 100"
                data={p.contractors.map((c) => ({ label: c.name, value: c.performanceScore }))}
                maxValue={100}
              />
            </CardContent>
          </Card>

          <DataTable
            rows={p.contractors}
            rowKey={(c) => c.id}
            caption="Contractors engaged on this project"
            columns={[
              {
                key: 'name',
                header: 'Contractor',
                width: '32%',
                sortValue: (c) => c.name,
                render: (c) => <CellTitle title={c.name} subtitle={c.contact} />,
              },
              { key: 'scope', header: 'Scope', sortValue: (c) => c.scope, render: (c) => <Chip>{c.scope}</Chip> },
              {
                key: 'status',
                header: 'Status',
                render: (c) => (
                  <Badge
                    tone={c.status === 'mobilised' ? 'good' : c.status === 'partial' ? 'warning' : c.status === 'pending' ? 'neutral' : 'info'}
                    dot
                  >
                    {c.status}
                  </Badge>
                ),
              },
              { key: 'crew', header: 'On-site crew', numeric: true, sortValue: (c) => c.onSiteCrew, render: (c) => fmtNumber(c.onSiteCrew) },
              {
                key: 'score',
                header: 'Performance',
                numeric: true,
                sortValue: (c) => c.performanceScore,
                render: (c) => (
                  <span className="flex items-center justify-end gap-2">
                    <span className="w-20">
                      <Progress
                        value={c.performanceScore}
                        color={c.performanceScore >= 85 ? TONE_VAR.good : c.performanceScore >= 72 ? TONE_VAR.warning : TONE_VAR.critical}
                      />
                    </span>
                    <span className="tabular w-7 text-right font-medium text-[var(--ink)]">{c.performanceScore}</span>
                  </span>
                ),
              },
            ]}
          />
        </TabsContent>

        {/* ------------------------------------ Risks ------------------------------------ */}
        <TabsContent value="risks">
          {p.risks.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No risks logged"
              description="Nothing has been raised against this project in the risk register."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {p.risks.map((risk) => (
                <Card key={risk.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium leading-snug text-[var(--ink)]">{risk.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Chip>{risk.category}</Chip>
                        <Chip>{risk.likelihood.replace('-', ' ')}</Chip>
                        <Badge tone={risk.status === 'closed' ? 'good' : risk.status === 'mitigating' ? 'info' : 'warning'} dot>
                          {risk.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <SeverityBadge severity={risk.severity} />
                      <span className="text-[11px] text-[var(--ink-muted)]">+{risk.impactDays} d</span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-[var(--subtle)] px-3 py-2.5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">Mitigation</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">{risk.mitigation}</p>
                  </div>
                  <p className="mt-2.5 text-[11px] text-[var(--ink-muted)]">
                    Owner {risk.owner} · raised {fmtRelative(risk.raisedAt)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* --------------------------------- Documents --------------------------------- */}
        <TabsContent value="documents">
          {(documents.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents linked"
              description="Scope matrices, design basis reports and method statements attached to this project will appear here."
            />
          ) : (
            <DataTable
              rows={documents.data!}
              rowKey={(d) => d.id}
              caption="Documents linked to this project"
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

        {/* --------------------------------- Financial --------------------------------- */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Contract value', value: fmtCrore(p.contractValueCr) },
              { label: 'Spent to date', value: fmtCrore(p.spentCr) },
              { label: 'Remaining', value: fmtCrore(p.contractValueCr - p.spentCr) },
              { label: 'Cost per MW', value: fmtCrore(p.contractValueCr / p.capacityMw) },
            ].map((item) => (
              <Card key={item.label} className="p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">{item.label}</p>
                <p className="kpi-value mt-1.5 text-[20px] font-semibold leading-none text-[var(--ink)]">{item.value}</p>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Spend against completion</CardTitle>
                <CardDescription>
                  Cost incurred versus physical progress — a widening gap signals commercial exposure
                </CardDescription>
              </div>
              <CurrencyInr className="size-5 text-[var(--ink-muted)]" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                    <span className="text-[var(--ink-muted)]">Physical completion</span>
                    <span className="tabular font-medium text-[var(--ink)]">{p.completionPct}%</span>
                  </div>
                  <Progress value={p.completionPct} color={TONE_VAR.good} />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                    <span className="text-[var(--ink-muted)]">Contract value spent</span>
                    <span className="tabular font-medium text-[var(--ink)]">
                      {fmtPct((p.spentCr / p.contractValueCr) * 100, 0)}
                    </span>
                  </div>
                  <Progress
                    value={(p.spentCr / p.contractValueCr) * 100}
                    color={
                      (p.spentCr / p.contractValueCr) * 100 > p.completionPct + 10 ? TONE_VAR.critical : TONE_VAR.info
                    }
                  />
                </div>
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">
                {(p.spentCr / p.contractValueCr) * 100 > p.completionPct + 8
                  ? 'Spend is running ahead of physical progress. Review the earned-value position at the next commercial gate before releasing further milestone payments.'
                  : 'Spend is tracking physical progress within tolerance. No commercial escalation required at this point.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------- Activity ---------------------------------- */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Project activity</CardTitle>
                <CardDescription>Milestone movements and risk register entries</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-[var(--line)] pl-5">
                {[
                  ...p.milestones
                    .filter((m) => m.actualStart)
                    .map((m) => ({
                      at: m.actualStart!,
                      title: `${m.stage} started`,
                      detail: `${m.label} · owned by ${m.owner}`,
                      tone: 'good' as const,
                    })),
                  ...p.risks.map((r) => ({
                    at: r.raisedAt,
                    title: `Risk raised — ${r.title}`,
                    detail: r.mitigation,
                    tone: r.severity === 'critical' ? ('critical' as const) : ('warning' as const),
                  })),
                ]
                  .sort((a, b) => (a.at < b.at ? 1 : -1))
                  .map((entry, i) => (
                    <li key={i} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[26px] top-1 size-2.5 rounded-full ring-4 ring-[var(--surface)]"
                        style={{ backgroundColor: `var(--status-${entry.tone})` }}
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[13px] font-medium text-[var(--ink)]">{entry.title}</p>
                        <time className="text-[11px] text-[var(--ink-muted)]">{fmtDate(entry.at)}</time>
                      </div>
                      <p className="mt-0.5 text-[12px] text-[var(--ink-muted)]">{entry.detail}</p>
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
