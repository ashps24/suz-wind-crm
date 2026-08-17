'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowSquareOut,
  Buildings,
  CloudRain,
  Drop,
  Gauge,
  HardHat,
  Lightning,
  Thermometer,
  Wind as WindIcon,
  Wrench,
  X,
} from '@phosphor-icons/react/dist/ssr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HealthRing, Sparkline, StackedBar } from '@/components/charts'
import { RiskBadge, SeverityBadge, SiteStatusBadge, TurbineStatusBadge } from '@/components/cards/status'
import { TONE_VAR, TURBINE_STATUS, TURBINE_STATUS_ORDER } from '@/lib/constants'
import {
  fmtBearing,
  fmtMw,
  fmtMwh,
  fmtNumber,
  fmtPct,
  fmtRelative,
  fmtSpeed,
  fmtTemp,
} from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Alarm, Project, Technician, Turbine, WeatherReading, WindFarm, WorkOrder } from '@/types'
import { windFarmHref } from '@/lib/routing'

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'good' | 'warning' | 'serious' | 'critical'
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">{label}</p>
      <p
        className="kpi-value mt-1 text-[17px] font-semibold leading-none"
        style={{ color: tone ? TONE_VAR[tone] : 'var(--ink)' }}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[10.5px] text-[var(--ink-muted)]">{sub}</p>}
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] px-4 py-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function SiteDrawer({
  farm,
  turbines,
  alarms,
  workOrders,
  weather,
  projects,
  technicians,
  onClose,
  onSelectTurbine,
}: {
  farm: WindFarm
  turbines: Turbine[]
  alarms: Alarm[]
  workOrders: WorkOrder[]
  weather?: WeatherReading
  projects: Project[]
  technicians: Technician[]
  onClose: () => void
  onSelectTurbine?: (id: string) => void
}) {
  const statusCounts = TURBINE_STATUS_ORDER.map((status) => ({
    label: TURBINE_STATUS[status].label,
    value: turbines.filter((t) => t.status === status).length,
    color: TONE_VAR[TURBINE_STATUS[status].tone],
  })).filter((s) => s.value > 0)

  const openOrders = workOrders.filter((w) => w.status !== 'completed' && w.status !== 'cancelled')
  const criticalAlarms = alarms.filter((a) => a.severity === 'critical' || a.severity === 'high')
  const onSiteCrew = technicians.filter(
    (t) => t.state === farm.state && (t.status === 'on-site' || t.status === 'travelling'),
  )
  const degraded = turbines
    .filter((t) => t.status === 'offline' || t.status === 'alarm')
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 5)

  return (
    <motion.aside
      initial={{ x: 32, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 32, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className="pointer-events-auto flex h-full w-[min(94vw,23rem)] flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-xl)]"
      aria-label={`${farm.name} site summary`}
    >
      {/* Header */}
      <header className="relative shrink-0 border-b border-[var(--line)] px-4 pb-3.5 pt-4">
        <button
          onClick={onClose}
          aria-label="Close site panel"
          className="absolute right-3 top-3 rounded-md p-1 text-[var(--ink-muted)] transition-colors hover:bg-[var(--subtle)] hover:text-[var(--ink)]"
        >
          <X className="size-4" aria-hidden />
        </button>
        <div className="flex items-start gap-3 pr-7">
          <HealthRing value={100 - farm.riskScore} size={44} thickness={4} label="Site risk headroom" />
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold leading-tight text-[var(--ink)]">{farm.name}</h2>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--ink-muted)]">
              {farm.district}, {farm.state} · {farm.code}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <SiteStatusBadge status={farm.status} />
          <RiskBadge band={farm.riskBand} prefix="Risk: " />
          <Link
            href={`/crm/accounts/${farm.customerId}`}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--subtle)] px-2 py-[3px] text-[11px] font-medium text-[var(--ink-secondary)] transition-colors hover:text-[var(--brand-ink)]"
          >
            <Buildings className="size-3" aria-hidden />
            {farm.customerName}
          </Link>
        </div>
      </header>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {/* Live metrics */}
        <div className="grid grid-cols-2 gap-2 px-4 py-3.5">
          <Metric label="Installed" value={fmtMw(farm.installedMw)} sub={`${farm.turbineCount} turbines`} />
          <Metric
            label="Generating"
            value={fmtMw(farm.currentGenerationMw)}
            sub={`PLF ${fmtPct(farm.plfPct)}`}
            tone={farm.plfPct > 30 ? 'good' : farm.plfPct > 15 ? 'warning' : 'serious'}
          />
          <Metric
            label="Availability"
            value={fmtPct(farm.availabilityPct)}
            sub="Time-based, 30 days"
            tone={farm.availabilityPct >= 97 ? 'good' : farm.availabilityPct >= 94 ? 'warning' : 'serious'}
          />
          <Metric label="Today" value={fmtMwh(farm.generationTodayMwh, 0)} sub="Delivered energy" />
        </div>

        {/* Generation trace */}
        <Section title="Generation — last 24 hours">
          <div className="flex items-end gap-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5">
            <Sparkline values={farm.generation24h} width={196} height={44} tone="info" label={`${farm.name} generation over the last 24 hours`} />
            <div className="pb-0.5">
              <p className="kpi-value text-[15px] font-semibold text-[var(--ink)]">{fmtMw(farm.currentGenerationMw)}</p>
              <p className="text-[10.5px] text-[var(--ink-muted)]">now</p>
            </div>
          </div>
        </Section>

        {/* Asset health */}
        <Section
          title="Asset health"
          action={
            <Link
              href={windFarmHref(farm.id, { tab: 'turbines' })}
              className="text-[11px] font-medium text-[var(--brand)] hover:underline"
            >
              All turbines
            </Link>
          }
        >
          <StackedBar segments={statusCounts} height={9} />
          {degraded.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {degraded.map((turbine) => (
                <li key={turbine.id}>
                  <button
                    onClick={() => onSelectTurbine?.(turbine.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-2.5 py-2 text-left transition-colors hover:border-[var(--line-strong)]"
                  >
                    <HealthRing value={turbine.healthScore} size={28} thickness={3} showValue={false} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-[var(--ink)]">{turbine.name}</span>
                      <span className="block truncate text-[10.5px] text-[var(--ink-muted)]">
                        {turbine.activeAlarm ?? 'No active alarm'}
                      </span>
                    </span>
                    <TurbineStatusBadge status={turbine.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Weather */}
        {weather && (
          <Section title="Current conditions">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <WindIcon className="size-5 text-[var(--brand)]" weight="duotone" aria-hidden />
                  <div>
                    <p className="kpi-value text-[17px] font-semibold leading-none text-[var(--ink)]">
                      {fmtSpeed(weather.windSpeedMs)}
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-[var(--ink-muted)]">
                      gusting {fmtSpeed(weather.windGustMs)} · {fmtBearing(weather.windDirectionDeg)}
                    </p>
                  </div>
                </div>
                <Badge tone="neutral">{weather.condition}</Badge>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-2.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="size-3.5 text-[var(--ink-muted)]" aria-hidden />
                  <dd className="text-[var(--ink-secondary)]">{fmtTemp(weather.temperatureC)}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Drop className="size-3.5 text-[var(--ink-muted)]" aria-hidden />
                  <dd className="text-[var(--ink-secondary)]">{weather.humidityPct}%</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <CloudRain className="size-3.5 text-[var(--ink-muted)]" aria-hidden />
                  <dd className="text-[var(--ink-secondary)]">{fmtNumber(weather.rainfallMm, 1)} mm</dd>
                </div>
              </dl>
            </div>
          </Section>
        )}

        {/* Active incidents */}
        <Section
          title={`Active incidents (${alarms.length})`}
          action={
            criticalAlarms.length > 0 ? <Badge tone="critical" dot>{criticalAlarms.length} critical/high</Badge> : null
          }
        >
          {alarms.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--line-strong)] px-3 py-4 text-center text-[11.5px] text-[var(--ink-muted)]">
              No active alarms at this site.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {alarms.slice(0, 4).map((alarm) => (
                <li
                  key={alarm.id}
                  className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium leading-snug text-[var(--ink)]">{alarm.title}</p>
                    <SeverityBadge severity={alarm.severity} />
                  </div>
                  <p className="mt-1 text-[10.5px] text-[var(--ink-muted)]">
                    {alarm.turbineName} · {alarm.code} · raised {fmtRelative(alarm.raisedAt)}
                  </p>
                </li>
              ))}
              {alarms.length > 4 && (
                <li className="pt-0.5 text-center text-[11px] text-[var(--ink-muted)]">
                  +{alarms.length - 4} more active alarms
                </li>
              )}
            </ul>
          )}
        </Section>

        {/* Work + crew */}
        <Section title="Service activity">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/maintenance?site=${farm.id}`}
              className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5 transition-colors hover:border-[var(--line-strong)]"
            >
              <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">
                <Wrench className="size-3" aria-hidden />
                Open orders
              </p>
              <p className="kpi-value mt-1 text-[17px] font-semibold leading-none text-[var(--ink)]">
                {openOrders.length}
              </p>
            </Link>
            <div className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">
                <HardHat className="size-3" aria-hidden />
                Crew in region
              </p>
              <p className="kpi-value mt-1 text-[17px] font-semibold leading-none text-[var(--ink)]">
                {onSiteCrew.length}
              </p>
            </div>
          </div>
          {onSiteCrew.length > 0 && (
            <ul className="mt-2 space-y-1">
              {onSiteCrew.slice(0, 3).map((tech) => (
                <li key={tech.id} className="flex items-center justify-between gap-2 px-0.5 text-[11.5px]">
                  <span className="truncate text-[var(--ink-secondary)]">{tech.name}</span>
                  <Badge tone={tech.status === 'on-site' ? 'good' : 'info'} dot>
                    {tech.status === 'on-site' ? 'On site' : 'Travelling'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Projects */}
        {projects.length > 0 && (
          <Section title="Projects at this site">
            <ul className="space-y-1.5">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="block rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-2.5 py-2 transition-colors hover:border-[var(--line-strong)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-medium leading-snug text-[var(--ink)]">{project.name}</p>
                      <RiskBadge band={project.risk} />
                    </div>
                    <p className="mt-1 text-[10.5px] text-[var(--ink-muted)]">
                      {project.stage} · {project.completionPct}% complete
                      {project.delayDays > 0 && ` · ${project.delayDays} days late`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Contract */}
        <Section title="Commercial">
          <dl className="space-y-1.5 text-[11.5px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--ink-muted)]">O&amp;M contract</dt>
              <dd className="font-medium text-[var(--ink)]">{farm.o_and_mContract}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--ink-muted)]">Evacuation</dt>
              <dd className="font-medium text-[var(--ink)]">
                {farm.evacuationVoltageKv} kV · {farm.gridSubstation}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--ink-muted)]">Site manager</dt>
              <dd className="font-medium text-[var(--ink)]">{farm.siteManager}</dd>
            </div>
          </dl>
        </Section>
      </div>

      <footer className="shrink-0 border-t border-[var(--line)] p-3">
        <Button asChild variant="primary" className="w-full">
          <Link href={windFarmHref(farm.id)}>
            Open site workspace
            <ArrowSquareOut aria-hidden />
          </Link>
        </Button>
      </footer>
    </motion.aside>
  )
}
