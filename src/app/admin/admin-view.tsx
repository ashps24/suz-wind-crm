'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { useQuery } from '@tanstack/react-query'
import { Bell, Database, Palette, PlugsConnected, ShieldCheck, UserPlus, Users } from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Avatar,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/primitives'
import { CellTitle, DataTable } from '@/components/tables/data-table'
import { QueryState, TableSkeleton } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { ROLES } from '@/lib/constants'
import { fmtNumber, fmtRelative } from '@/lib/formatters'
import { useMounted } from '@/hooks'
import { useUiStore } from '@/stores/ui-store'

const PERMISSIONS = [
  { key: 'view-fleet', label: 'View fleet and asset data', roles: ['All internal roles', 'Customer (own assets)'] },
  { key: 'edit-work-orders', label: 'Create and edit work orders', roles: ['Operations Manager', 'O&M Engineer', 'Field Technician'] },
  { key: 'close-work-orders', label: 'Close and sign off work orders', roles: ['O&M Engineer', 'Field Technician'] },
  { key: 'approve-shutdown', label: 'Approve controlled shutdowns', roles: ['Operations Manager', 'Executive Leadership'] },
  { key: 'edit-commercial', label: 'Edit opportunities and quotes', roles: ['Sales & BD'] },
  { key: 'view-confidential', label: 'View confidential documents', roles: ['Executive Leadership', 'Sales & BD', 'Project Manager'] },
  { key: 'manage-users', label: 'Manage users and roles', roles: ['Administrator'] },
  { key: 'configure-integrations', label: 'Configure integrations', roles: ['Administrator'] },
]

const NOTIFICATION_RULES = [
  { key: 'critical-alarm', label: 'Critical turbine alarm', description: 'Any alarm classified critical on a producing asset', channels: ['In-app', 'Email', 'SMS'] },
  { key: 'turbine-offline', label: 'Turbine offline beyond 30 minutes', description: 'Sustained loss of production without an active work order', channels: ['In-app', 'Email'] },
  { key: 'cyclone-watch', label: 'Cyclone impact radius intersects a site', description: 'Any active system with a site inside the forecast radius', channels: ['In-app', 'Email', 'SMS'] },
  { key: 'seismic', label: 'Seismic event above M 4.0 near an asset', description: 'Triggers the structural inspection recommendation', channels: ['In-app', 'Email'] },
  { key: 'sla-breach', label: 'Work order approaching SLA', description: 'Two hours before the response window closes', channels: ['In-app'] },
  { key: 'availability', label: 'Site availability below guarantee', description: 'Rolling 30-day availability crosses the contractual floor', channels: ['Email'] },
  { key: 'project-delay', label: 'Project milestone slips beyond tolerance', description: 'Critical-path milestone moves by more than 7 days', channels: ['In-app', 'Email'] },
]

export function AdminView() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()
  const density = useUiStore((s) => s.density)
  const setDensity = useUiStore((s) => s.setDensity)
  const faultInjection = useUiStore((s) => s.faultInjection)
  const setFaultInjection = useUiStore((s) => s.setFaultInjection)

  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: api.admin.users })
  const integrations = useQuery({ queryKey: ['admin', 'integrations'], queryFn: api.admin.integrations })

  const [enabledRules, setEnabledRules] = React.useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_RULES.map((r) => [r.key, true])),
  )

  return (
    <Page
      title="Administration"
      description="Users, roles, permissions, notification rules, integrations and display preferences."
      wide
    >
      <Tabs defaultValue="users">
        <TabsList className="mb-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="data-sources">Environment data</TabsTrigger>
          <TabsTrigger value="preferences">Display</TabsTrigger>
        </TabsList>

        {/* ------------------------------------ Users ------------------------------------ */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12.5px] text-[var(--ink-muted)]">
              {fmtNumber(users.data?.length ?? 0)} users · {users.data?.filter((u) => u.mfa).length ?? 0} with MFA enabled
            </p>
            <Button variant="primary" size="sm">
              <UserPlus aria-hidden />
              Invite user
            </Button>
          </div>
          <QueryState query={users} skeleton={<TableSkeleton rows={10} cols={6} />} errorTitle="User list unavailable">
            {(rows) => (
              <DataTable
                rows={rows}
                rowKey={(u) => u.id}
                caption="Platform users"
                defaultSort={{ key: 'name', dir: 'asc' }}
                columns={[
                  {
                    key: 'name',
                    header: 'User',
                    width: '26%',
                    sortValue: (u) => u.name,
                    render: (u) => (
                      <span className="flex items-center gap-2.5">
                        <Avatar name={u.name} size={30} />
                        <CellTitle title={u.name} subtitle={u.email} />
                      </span>
                    ),
                  },
                  { key: 'role', header: 'Role', sortValue: (u) => u.role, render: (u) => <Chip>{u.role}</Chip> },
                  { key: 'dept', header: 'Department', hideBelow: 'lg', sortValue: (u) => u.department, render: (u) => u.department },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (u) => (
                      <Badge tone={u.status === 'active' ? 'good' : u.status === 'invited' ? 'info' : 'critical'} dot>
                        {u.status}
                      </Badge>
                    ),
                  },
                  {
                    key: 'mfa',
                    header: 'MFA',
                    render: (u) =>
                      u.mfa ? (
                        <Badge tone="good" dot>
                          Enabled
                        </Badge>
                      ) : (
                        <Badge tone="warning" dot>
                          Not set
                        </Badge>
                      ),
                  },
                  { key: 'sites', header: 'Site access', numeric: true, hideBelow: 'md', sortValue: (u) => u.sites, render: (u) => fmtNumber(u.sites) },
                  {
                    key: 'active',
                    header: 'Last active',
                    numeric: true,
                    sortValue: (u) => u.lastActive,
                    render: (u) => fmtRelative(u.lastActive),
                  },
                ]}
              />
            )}
          </QueryState>
        </TabsContent>

        {/* ------------------------------------ Roles ------------------------------------ */}
        <TabsContent value="roles">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ROLES.map((role) => (
              <Card key={role.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-[var(--ink)]">{role.label}</p>
                    <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">{role.persona}</p>
                  </div>
                  <Badge tone={role.group === 'Internal' ? 'info' : 'neutral'}>{role.group}</Badge>
                </div>
                <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--ink-secondary)]">{role.description}</p>
                <div className="mt-3 border-t border-[var(--line)] pt-2.5">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    Modules ({role.nav.length})
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {role.nav.slice(0, 6).map((key) => (
                      <Chip key={key}>{key.replace(/-/g, ' ')}</Chip>
                    ))}
                    {role.nav.length > 6 && <Chip>+{role.nav.length - 6}</Chip>}
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-[var(--ink-muted)]">Lands on {role.landing}</p>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* --------------------------------- Permissions --------------------------------- */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Permission matrix</CardTitle>
                <CardDescription>Which roles can perform each action</CardDescription>
              </div>
              <ShieldCheck className="size-5 text-[var(--ink-muted)]" aria-hidden />
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-[var(--line)]">
                {PERMISSIONS.map((permission) => (
                  <li key={permission.key} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="min-w-0 flex-1 text-[13px] text-[var(--ink)]">{permission.label}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {permission.roles.map((role) => (
                        <Chip key={role}>{role}</Chip>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------- Notifications -------------------------------- */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Notification rules</CardTitle>
                <CardDescription>What triggers an alert, and where it is delivered</CardDescription>
              </div>
              <Bell className="size-5 text-[var(--ink-muted)]" aria-hidden />
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-[var(--line)]">
                {NOTIFICATION_RULES.map((rule) => (
                  <li key={rule.key} className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[var(--ink)]">{rule.label}</p>
                      <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">{rule.description}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {rule.channels.map((channel) => (
                          <Chip key={channel}>{channel}</Chip>
                        ))}
                      </div>
                    </div>
                    <Switch
                      checked={enabledRules[rule.key] ?? false}
                      onCheckedChange={(value) => setEnabledRules((r) => ({ ...r, [rule.key]: value }))}
                      aria-label={`Toggle ${rule.label}`}
                      className="mt-1"
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------------- Integrations --------------------------------- */}
        <TabsContent value="integrations">
          <QueryState query={integrations} skeleton={<TableSkeleton rows={10} cols={5} />} errorTitle="Integrations unavailable">
            {(rows) => (
              <div className="grid gap-3 md:grid-cols-2">
                {rows.map((integration) => (
                  <Card key={integration.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor:
                              integration.status === 'connected'
                                ? 'var(--status-good-soft)'
                                : integration.status === 'degraded'
                                  ? 'var(--status-warning-soft)'
                                  : 'var(--status-neutral-soft)',
                            color:
                              integration.status === 'connected'
                                ? 'var(--status-good)'
                                : integration.status === 'degraded'
                                  ? 'var(--status-warning)'
                                  : 'var(--status-neutral)',
                          }}
                        >
                          <PlugsConnected className="size-[18px]" weight="fill" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-[var(--ink)]">{integration.name}</p>
                          <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">{integration.category}</p>
                        </div>
                      </div>
                      <Badge
                        tone={
                          integration.status === 'connected'
                            ? 'good'
                            : integration.status === 'degraded'
                              ? 'warning'
                              : integration.status === 'disconnected'
                                ? 'critical'
                                : 'neutral'
                        }
                        dot
                      >
                        {integration.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--ink-secondary)]">
                      {integration.description}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-2.5 text-[11.5px]">
                      <div>
                        <dt className="text-[var(--ink-muted)]">Records / day</dt>
                        <dd className="mt-0.5 font-medium text-[var(--ink)]">
                          {integration.recordsPerDay ? fmtNumber(integration.recordsPerDay) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--ink-muted)]">Last sync</dt>
                        <dd className="mt-0.5 font-medium text-[var(--ink)]">
                          {integration.lastSync ? fmtRelative(integration.lastSync) : 'Never'}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-2.5 truncate font-mono text-[10.5px] text-[var(--ink-muted)]">{integration.endpoint}</p>
                  </Card>
                ))}
              </div>
            )}
          </QueryState>
        </TabsContent>

        {/* -------------------------------- Data sources -------------------------------- */}
        <TabsContent value="data-sources">
          <QueryState query={integrations} skeleton={<TableSkeleton rows={8} cols={5} />} errorTitle="Data sources unavailable">
            {(rows) => (
              <>
                <Card className="mb-4 p-4">
                  <div className="flex items-start gap-3">
                    <Database className="mt-0.5 size-5 shrink-0 text-[var(--ink-muted)]" aria-hidden />
                    <p className="text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">
                      Environmental sources feed the alerts that drive inspection and shutdown decisions. In this
                      prototype all sources are simulated; in production each would carry its own refresh cadence,
                      retention and provenance record.
                    </p>
                  </div>
                </Card>
                <DataTable
                  rows={rows.filter((r) => r.category === 'Environmental')}
                  rowKey={(r) => r.id}
                  caption="Environmental data sources"
                  columns={[
                    {
                      key: 'name',
                      header: 'Source',
                      width: '26%',
                      render: (r) => <CellTitle title={r.name} subtitle={r.description} />,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (r) => (
                        <Badge
                          tone={
                            r.status === 'connected'
                              ? 'good'
                              : r.status === 'degraded'
                                ? 'warning'
                                : r.status === 'disconnected'
                                  ? 'critical'
                                  : 'neutral'
                          }
                          dot
                        >
                          {r.status.replace('-', ' ')}
                        </Badge>
                      ),
                    },
                    {
                      key: 'records',
                      header: 'Records / day',
                      numeric: true,
                      sortValue: (r) => r.recordsPerDay,
                      render: (r) => (r.recordsPerDay ? fmtNumber(r.recordsPerDay) : '—'),
                    },
                    {
                      key: 'sync',
                      header: 'Last sync',
                      numeric: true,
                      render: (r) => (r.lastSync ? fmtRelative(r.lastSync) : 'Never'),
                    },
                    {
                      key: 'endpoint',
                      header: 'Endpoint',
                      hideBelow: 'lg',
                      render: (r) => <span className="font-mono text-[11px]">{r.endpoint}</span>,
                    },
                  ]}
                />
              </>
            )}
          </QueryState>
        </TabsContent>

        {/* --------------------------------- Preferences --------------------------------- */}
        <TabsContent value="preferences">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Applies to this browser only</CardDescription>
                </div>
                <Palette className="size-5 text-[var(--ink-muted)]" aria-hidden />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="theme">Theme</Label>
                  <Select id="theme" value={mounted ? (theme ?? 'system') : 'system'} onChange={(e) => setTheme(e.target.value)}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">Match system</option>
                  </Select>
                  <p className="text-[11.5px] text-[var(--ink-muted)]">
                    Dark mode is tuned for control-room use, not derived by inverting the light palette.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="density">Table density</Label>
                  <Select
                    id="density"
                    value={density}
                    onChange={(e) => setDensity(e.target.value as 'comfortable' | 'compact')}
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Prototype controls</CardTitle>
                  <CardDescription>Demonstration behaviour, not production settings</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-start justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-[var(--ink)]">Fault injection</span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
                      Fails roughly one in seven mock requests so the error and retry states are reachable on demand.
                    </span>
                  </span>
                  <Switch
                    checked={faultInjection}
                    onCheckedChange={setFaultInjection}
                    aria-label="Toggle fault injection"
                    className="mt-1"
                  />
                </label>

                <div className="rounded-lg border border-[var(--line)] bg-[var(--subtle)] px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    Phase 1 scope
                  </p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--ink-secondary)]">
                    This build is frontend-only. There is no backend, database, authentication or real SCADA, GIS,
                    weather, seismic or grid integration. All data is generated locally from deterministic seeds.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>API configuration</CardTitle>
                  <CardDescription>Endpoints the platform would call in production</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ['Command Center', '/api/command-center/summary'],
                  ['Wind farms', '/api/wind-farms'],
                  ['Turbines', '/api/turbines'],
                  ['Work orders', '/api/work-orders'],
                  ['Environment', '/api/environment/*'],
                  ['AI query', 'POST /api/ai/query'],
                ].map(([label, endpoint]) => (
                  <div key={label} className="space-y-1.5">
                    <Label htmlFor={`api-${label}`}>{label}</Label>
                    <Input id={`api-${label}`} defaultValue={endpoint} readOnly className="font-mono text-[12px]" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Session</CardTitle>
                  <CardDescription>Demo identity — no real authentication</CardDescription>
                </div>
                <Users className="size-5 text-[var(--ink-muted)]" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">
                  Role switching is a presentation-layer state. It changes navigation, the landing screen and headline
                  metrics, but does not enforce access control. Authentication and authorisation arrive in a later phase.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </Page>
  )
}
