'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Buildings,
  Envelope,
  FileText,
  Globe,
  MapPin,
  Phone,
  Sparkle,
  Wind,
} from '@phosphor-icons/react/dist/ssr'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Avatar,
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
import { BarChart, HealthRing, Sparkline } from '@/components/charts'
import { TrendPill } from '@/components/cards/kpi'
import { RiskBadge, SiteStatusBadge } from '@/components/cards/status'
import { DetailHeader, StatStrip } from '@/components/layout/detail-header'
import { CellTitle, DataTable } from '@/components/tables/data-table'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { OPPORTUNITY_STAGES, TONE_VAR } from '@/lib/constants'
import { fmtCrore, fmtDate, fmtMw, fmtNumber, fmtPct, fmtRelative } from '@/lib/formatters'
import { sum } from '@/lib/utils'
import { turbineHref, windFarmHref } from '@/lib/routing'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'projects', label: 'Projects' },
  { value: 'wind-farms', label: 'Wind Farms' },
  { value: 'turbines', label: 'Turbines' },
  { value: 'opportunities', label: 'Opportunities' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'service', label: 'Service' },
  { value: 'documents', label: 'Documents' },
  { value: 'activity', label: 'Activity' },
]

export function AccountWorkspace({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initial = searchParams.get('tab') ?? 'overview'
  const [tab, setTab] = React.useState(TABS.some((t) => t.value === initial) ? initial : 'overview')

  const account = useQuery({ queryKey: ['accounts', id], queryFn: () => api.accounts.detail(id) })
  const contacts = useQuery({ queryKey: ['accounts', id, 'contacts'], queryFn: () => api.accounts.contacts(id) })
  const opportunities = useQuery({ queryKey: ['accounts', id, 'opps'], queryFn: () => api.accounts.opportunities(id) })
  const projects = useQuery({ queryKey: ['accounts', id, 'projects'], queryFn: () => api.accounts.projects(id) })
  const documents = useQuery({ queryKey: ['accounts', id, 'docs'], queryFn: () => api.accounts.documents(id) })
  const farms = useQuery({ queryKey: ['wind-farms'], queryFn: api.windFarms.list })
  const turbines = useQuery({ queryKey: ['turbines'], queryFn: api.turbines.list })
  const orders = useQuery({ queryKey: ['work-orders'], queryFn: api.workOrders.list })

  if (account.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Account not found"
          description={account.error instanceof Error ? account.error.message : undefined}
          onRetry={() => account.refetch()}
        />
      </div>
    )
  }

  if (account.isPending || !account.data) {
    return (
      <div className="mx-auto w-full max-w-[100rem] px-4 pb-16 pt-5 md:px-6">
        <div className="grid gap-3 md:grid-cols-2">
          <CardGridSkeleton count={4} height={220} />
        </div>
      </div>
    )
  }

  const a = account.data
  const accountFarms = (farms.data ?? []).filter((f) => f.customerId === id)
  const accountTurbines = (turbines.data ?? []).filter((t) => t.customerId === id)
  const accountOrders = (orders.data ?? []).filter((w) => accountFarms.some((f) => f.id === w.windFarmId))
  const openOrders = accountOrders.filter((w) => w.status !== 'completed' && w.status !== 'cancelled')
  const avgAvailability = accountFarms.length
    ? Math.round((sum(accountFarms.map((f) => f.availabilityPct)) / accountFarms.length) * 10) / 10
    : 0
  const generating = Math.round(sum(accountFarms.map((f) => f.currentGenerationMw)) * 10) / 10
  const openPipeline = (opportunities.data ?? []).filter((o) => o.stage !== 'Won' && o.stage !== 'Lost')

  function changeTab(value: string) {
    setTab(value)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    router.replace(`${url.pathname}${url.search}`, { scroll: false })
  }

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 pb-16 pt-5 md:px-6">
      <DetailHeader
        backHref="/crm/accounts"
        backLabel="All accounts"
        eyebrow={a.type}
        title={a.name}
        media={
          <span
            className="flex size-16 shrink-0 items-center justify-center rounded-xl text-[22px] font-bold text-white"
            style={{ background: `linear-gradient(140deg, ${a.logoTint}, color-mix(in oklab, ${a.logoTint} 62%, black))` }}
            aria-hidden
          >
            {a.name.slice(0, 2).toUpperCase()}
          </span>
        }
        meta={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {a.headquarters}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Globe className="size-3.5" aria-hidden />
              {a.website}
            </span>
            <span aria-hidden>·</span>
            <span>Customer since {fmtDate(a.since)}</span>
          </span>
        }
        badges={
          <>
            <Badge tone={a.healthScore >= 85 ? 'good' : a.healthScore >= 72 ? 'warning' : 'critical'} dot size="md">
              Health {a.healthScore}
            </Badge>
            {a.segments.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
            <Chip>Owner: {a.relationshipOwner}</Chip>
          </>
        }
        actions={
          <Button variant="primary" size="sm" asChild>
            <Link href={`/ai-copilot?q=${encodeURIComponent(`Summarise operations for ${a.name}`)}`}>
              <Sparkle aria-hidden />
              Ask Copilot
            </Link>
          </Button>
        }
      />

      <StatStrip
        className="mb-5"
        items={[
          { label: 'Installed base', value: fmtMw(a.installedMw), sub: `${accountTurbines.length} turbines` },
          { label: 'Generating now', value: fmtMw(generating), sub: `${accountFarms.length} sites` },
          {
            label: 'Availability',
            value: fmtPct(avgAvailability),
            sub: 'Portfolio average',
            tone: avgAvailability >= 97 ? 'good' : avgAvailability >= 94 ? 'warning' : 'critical',
          },
          { label: 'Active projects', value: fmtNumber(a.activeProjects), sub: `${a.serviceContracts} service contracts` },
          {
            label: 'Open cases',
            value: fmtNumber(a.openCases),
            sub: `${openOrders.length} open work orders`,
            tone: a.openCases > 6 ? 'serious' : 'good',
          },
          { label: 'Annual service value', value: fmtCrore(a.annualServiceValueCr), sub: 'Contracted O&M' },
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

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Portfolio availability by site</CardTitle>
                  <CardDescription>Measured against the 97% contractual floor</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {accountFarms.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Wind}
                    title="No operating sites"
                    description="This account has no commissioned wind farms yet."
                  />
                ) : (
                  <BarChart
                    height={220}
                    unit="%"
                    decimals={1}
                    maxValue={100}
                    data={accountFarms.map((f) => ({
                      label: f.name.split(' ')[0]!,
                      value: f.availabilityPct,
                      color: f.availabilityPct >= 97 ? TONE_VAR.good : f.availabilityPct >= 94 ? TONE_VAR.warning : TONE_VAR.critical,
                    }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Relationship health</CardTitle>
                  <CardDescription>Composite of performance, service and commercial signals</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <HealthRing value={a.healthScore} size={80} thickness={7} />
                  <div className="min-w-0 space-y-1">
                    <p className="flex items-center gap-1.5 text-[12.5px] text-[var(--ink-secondary)]">
                      <TrendPill trend={a.healthTrend} /> over the last quarter
                    </p>
                    <p className="text-[11.5px] text-[var(--ink-muted)]">
                      Last engagement {fmtRelative(a.lastEngagement)} by {a.relationshipOwner}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 space-y-2 border-t border-[var(--line)] pt-3 text-[12.5px]">
                  {[
                    ['Open pipeline', `${openPipeline.length} opportunities`],
                    ['Pipeline value', fmtCrore(sum(openPipeline.map((o) => o.valueCr)))],
                    ['Region', a.region],
                    ['Contacts', String((contacts.data ?? []).length)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <dt className="text-[var(--ink-muted)]">{label}</dt>
                      <dd className="font-medium text-[var(--ink)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Key contacts</CardTitle>
                <CardDescription>Decision makers and day-to-day relationships</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/crm/contacts">All contacts</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(contacts.data ?? []).map((contact) => (
                  <div key={contact.id} className="flex items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-3">
                    <Avatar name={contact.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[var(--ink)]">{contact.name}</p>
                      <p className="truncate text-[11.5px] text-[var(--ink-muted)]">{contact.title}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Chip>{contact.influence.replace('-', ' ')}</Chip>
                      </div>
                      <div className="mt-2 flex flex-col gap-0.5 text-[11px] text-[var(--ink-muted)]">
                        <span className="flex items-center gap-1.5 truncate">
                          <Envelope className="size-3 shrink-0" aria-hidden />
                          {contact.email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3 shrink-0" aria-hidden />
                          {contact.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          {(projects.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Buildings} title="No projects" description="No project is currently in delivery for this customer." />
          ) : (
            <DataTable
              rows={projects.data!}
              rowKey={(p) => p.id}
              href={(p) => `/projects/${p.id}`}
              caption="Projects for this customer"
              defaultSort={{ key: 'target', dir: 'asc' }}
              columns={[
                { key: 'name', header: 'Project', width: '30%', render: (p) => <CellTitle title={p.name} subtitle={`${p.code} · ${p.type}`} /> },
                { key: 'mw', header: 'Capacity', numeric: true, sortValue: (p) => p.capacityMw, render: (p) => fmtMw(p.capacityMw) },
                { key: 'stage', header: 'Stage', render: (p) => <Chip>{p.stage}</Chip> },
                {
                  key: 'completion',
                  header: 'Completion',
                  numeric: true,
                  sortValue: (p) => p.completionPct,
                  render: (p) => (
                    <span className="flex items-center justify-end gap-2">
                      <span className="w-16">
                        <Progress value={p.completionPct} />
                      </span>
                      <span className="tabular w-9 text-right">{p.completionPct}%</span>
                    </span>
                  ),
                },
                { key: 'target', header: 'Target', numeric: true, sortValue: (p) => p.targetCommissioning, render: (p) => fmtDate(p.targetCommissioning) },
                { key: 'risk', header: 'Risk', render: (p) => <RiskBadge band={p.risk} /> },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="wind-farms">
          {accountFarms.length === 0 ? (
            <EmptyState icon={Wind} title="No wind farms" description="This customer has no commissioned sites in the portfolio." />
          ) : (
            <DataTable
              rows={accountFarms}
              rowKey={(f) => f.id}
              href={(f) => windFarmHref(f.id)}
              caption="Wind farms owned by this customer"
              defaultSort={{ key: 'mw', dir: 'desc' }}
              columns={[
                { key: 'name', header: 'Site', width: '28%', render: (f) => <CellTitle title={f.name} subtitle={`${f.district}, ${f.state}`} /> },
                { key: 'status', header: 'Status', render: (f) => <SiteStatusBadge status={f.status} /> },
                { key: 'mw', header: 'Installed', numeric: true, sortValue: (f) => f.installedMw, render: (f) => fmtMw(f.installedMw) },
                { key: 'turbines', header: 'Turbines', numeric: true, hideBelow: 'md', sortValue: (f) => f.turbineCount, render: (f) => fmtNumber(f.turbineCount) },
                { key: 'avail', header: 'Availability', numeric: true, sortValue: (f) => f.availabilityPct, render: (f) => fmtPct(f.availabilityPct) },
                { key: 'trend', header: '24 h', hideBelow: 'lg', render: (f) => <Sparkline values={f.generation24h} width={64} height={22} tone="info" /> },
                { key: 'risk', header: 'Risk', render: (f) => <RiskBadge band={f.riskBand} /> },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="turbines">
          {accountTurbines.length === 0 ? (
            <EmptyState icon={Wind} title="No turbines" description="No assets are recorded against this customer." />
          ) : (
            <DataTable
              rows={accountTurbines}
              rowKey={(t) => t.id}
              href={(t) => turbineHref(t.id)}
              caption="Turbines owned by this customer"
              maxHeight={620}
              defaultSort={{ key: 'health', dir: 'asc' }}
              columns={[
                { key: 'name', header: 'Turbine', width: '24%', render: (t) => <CellTitle title={t.name} subtitle={t.windFarmName} /> },
                { key: 'product', header: 'Product', render: (t) => <Chip>{t.product}</Chip> },
                { key: 'status', header: 'Status', sortValue: (t) => t.status, render: (t) => <Chip>{t.status}</Chip> },
                { key: 'avail', header: 'Availability', numeric: true, sortValue: (t) => t.availabilityPct, render: (t) => fmtPct(t.availabilityPct) },
                { key: 'health', header: 'Health', numeric: true, sortValue: (t) => t.healthScore, render: (t) => t.healthScore },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="opportunities">
          {(opportunities.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Sparkle} title="No opportunities" description="No pipeline is currently open with this customer." />
          ) : (
            <DataTable
              rows={opportunities.data!}
              rowKey={(o) => o.id}
              href={(o) => `/crm/opportunities?opp=${o.id}`}
              caption="Opportunities with this customer"
              defaultSort={{ key: 'value', dir: 'desc' }}
              columns={[
                { key: 'name', header: 'Opportunity', width: '32%', render: (o) => <CellTitle title={o.name} subtitle={`${o.state} · ${o.product}`} /> },
                { key: 'stage', header: 'Stage', sortValue: (o) => OPPORTUNITY_STAGES.indexOf(o.stage), render: (o) => <Chip>{o.stage}</Chip> },
                { key: 'mw', header: 'Capacity', numeric: true, sortValue: (o) => o.capacityMw, render: (o) => fmtMw(o.capacityMw) },
                { key: 'value', header: 'Value', numeric: true, sortValue: (o) => o.valueCr, render: (o) => fmtCrore(o.valueCr) },
                { key: 'prob', header: 'Probability', numeric: true, sortValue: (o) => o.probabilityPct, render: (o) => `${o.probabilityPct}%` },
                { key: 'close', header: 'Expected close', numeric: true, hideBelow: 'md', sortValue: (o) => o.expectedClose, render: (o) => fmtDate(o.expectedClose) },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="contracts">
          <div className="grid gap-3 md:grid-cols-2">
            {accountFarms.map((farm) => (
              <Card key={farm.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-[var(--ink)]">{farm.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">
                      {farm.district}, {farm.state}
                    </p>
                  </div>
                  <Chip>{farm.o_and_mContract}</Chip>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-3 text-[12px]">
                  {[
                    ['Commissioned', fmtDate(farm.commissionedOn)],
                    ['Contract expiry', fmtDate(farm.contractExpiry)],
                    ['Capacity', fmtMw(farm.installedMw)],
                    ['Availability guarantee', farm.o_and_mContract === 'Full-Scope 15yr' ? '98.0%' : '97.0%'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[var(--ink-muted)]">{label}</dt>
                      <dd className="mt-0.5 font-medium text-[var(--ink)]">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                    <span className="text-[var(--ink-muted)]">Delivered availability</span>
                    <span className="tabular font-medium text-[var(--ink)]">{fmtPct(farm.availabilityPct)}</span>
                  </div>
                  <Progress
                    value={farm.availabilityPct}
                    color={farm.availabilityPct >= 97 ? TONE_VAR.good : TONE_VAR.critical}
                  />
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="service">
          {accountOrders.length === 0 ? (
            <EmptyState icon={Wind} title="No service activity" description="No work orders have been raised against this customer’s assets." />
          ) : (
            <DataTable
              rows={accountOrders}
              rowKey={(w) => w.id}
              href={(w) => `/maintenance/${w.id}`}
              caption="Service activity for this customer"
              maxHeight={620}
              defaultSort={{ key: 'scheduled', dir: 'desc' }}
              columns={[
                { key: 'title', header: 'Work order', width: '30%', render: (w) => <CellTitle title={w.title} subtitle={`${w.id} · ${w.turbineName}`} /> },
                { key: 'site', header: 'Site', hideBelow: 'lg', render: (w) => w.windFarmName },
                { key: 'type', header: 'Type', render: (w) => <Chip>{w.type}</Chip> },
                { key: 'status', header: 'Status', sortValue: (w) => w.status, render: (w) => <Chip>{w.status}</Chip> },
                { key: 'scheduled', header: 'Scheduled', numeric: true, sortValue: (w) => w.scheduledFor, render: (w) => fmtDate(w.scheduledFor) },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="documents">
          {(documents.data?.length ?? 0) === 0 ? (
            <EmptyState icon={FileText} title="No documents" description="Contracts and commercial documents for this customer will appear here." />
          ) : (
            <DataTable
              rows={documents.data!}
              rowKey={(d) => d.id}
              caption="Documents for this account"
              defaultSort={{ key: 'at', dir: 'desc' }}
              columns={[
                { key: 'name', header: 'Document', width: '46%', render: (d) => <CellTitle title={d.name} subtitle={`${d.category} · ${d.version}`} /> },
                {
                  key: 'conf',
                  header: 'Access',
                  render: (d) =>
                    d.confidential ? (
                      <Badge tone="warning" dot>
                        Confidential
                      </Badge>
                    ) : (
                      <Chip>Internal</Chip>
                    ),
                },
                { key: 'by', header: 'Uploaded by', hideBelow: 'md', render: (d) => d.uploadedBy },
                { key: 'at', header: 'Uploaded', numeric: true, sortValue: (d) => d.uploadedAt, render: (d) => fmtRelative(d.uploadedAt) },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Relationship activity</CardTitle>
                <CardDescription>Commercial engagement across all open opportunities</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-[var(--line)] pl-5">
                {(opportunities.data ?? [])
                  .flatMap((o) => o.activities.map((act) => ({ ...act, opportunity: o.name })))
                  .sort((x, y) => (x.at < y.at ? 1 : -1))
                  .slice(0, 20)
                  .map((entry) => (
                    <li key={entry.id} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[26px] top-1 size-2.5 rounded-full bg-[var(--brand)] ring-4 ring-[var(--surface)]"
                      />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[13px] font-medium text-[var(--ink)]">
                          <Chip className="mr-1.5">{entry.type}</Chip>
                          {entry.opportunity}
                        </p>
                        <time className="text-[11px] text-[var(--ink-muted)]">{fmtRelative(entry.at)}</time>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-secondary)]">{entry.summary}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">{entry.author}</p>
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
