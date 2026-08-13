'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { KpiTile } from '@/components/cards/kpi'
import { TrendPill } from '@/components/cards/kpi'
import { fmtGwh, fmtMw, fmtNumber, fmtPct } from '@/lib/formatters'
import type { FleetKpis } from '@/types'

export function KpiRail({ kpis }: { kpis: FleetKpis }) {
  const router = useRouter()

  return (
    <div
      className="glass no-scrollbar pointer-events-auto flex items-stretch gap-0.5 overflow-x-auto rounded-xl px-1.5 py-1 shadow-[var(--shadow-md)]"
      role="group"
      aria-label="Fleet key performance indicators"
      // Soft right edge signals that the rail scrolls when metrics overflow.
      style={{
        maskImage: 'linear-gradient(to right, black calc(100% - 28px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 28px), transparent 100%)',
      }}
    >
      <KpiTile label="Installed" value={fmtMw(kpis.installedMw, 0)} />
      <KpiTile label="Online now" value={fmtMw(kpis.onlineMw, 0)} tone="good" />
      <div className="flex min-w-0 shrink-0 flex-col gap-0.5 rounded-lg px-3 py-1.5">
        <span className="whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">
          Availability
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="kpi-value text-[17px] font-semibold leading-tight text-[var(--ink)]">
            {fmtPct(kpis.availabilityPct)}
          </span>
          <TrendPill trend={kpis.availabilityTrend} suffix=" pp" />
        </span>
      </div>
      <KpiTile
        label="Turbines up"
        value={`${fmtNumber(kpis.activeTurbines)} / ${fmtNumber(kpis.totalTurbines)}`}
      />
      <KpiTile
        label="Offline"
        value={fmtNumber(kpis.offlineTurbines)}
        tone={kpis.offlineTurbines > 0 ? 'critical' : 'good'}
        onClick={() => router.push('/turbines?status=offline')}
      />
      <KpiTile
        label="Critical incidents"
        value={fmtNumber(kpis.criticalIncidents)}
        tone={kpis.criticalIncidents > 0 ? 'serious' : 'good'}
        onClick={() => router.push('/asset-monitoring')}
      />
      <KpiTile
        label="Maintenance due"
        value={fmtNumber(kpis.maintenanceDueToday)}
        tone="warning"
        onClick={() => router.push('/maintenance?filter=overdue')}
      />
      <KpiTile
        label="Projects at risk"
        value={fmtNumber(kpis.projectsAtRisk)}
        tone={kpis.projectsAtRisk > 0 ? 'serious' : 'good'}
        onClick={() => router.push('/projects')}
      />
      <KpiTile
        label="Customers impacted"
        value={fmtNumber(kpis.customersImpacted)}
        tone={kpis.customersImpacted > 0 ? 'warning' : 'good'}
        onClick={() => router.push('/crm/accounts')}
      />
      <KpiTile label="Generation today" value={fmtGwh(kpis.generationTodayGwh)} />
    </div>
  )
}
