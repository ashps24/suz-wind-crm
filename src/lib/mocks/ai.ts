import { fmtMw, fmtPct } from '@/lib/formatters'
import { mean, sum } from '@/lib/utils'
import { alarms, turbines, windFarms } from './fleet'
import { cyclones, earthquakes } from './environment'
import { maintenanceSummary, workOrders } from './maintenance'
import { fleetHealth, underperformers } from './monitoring'
import { projects } from './projects'
import { accounts } from './crm'
import { aiPriorities, fleetKpis } from './command-center'
import type { AiResponseCard, Severity } from '@/types'

export const SUGGESTED_PROMPTS = [
  'Which turbines are at risk today?',
  'Show S144 turbines operating below expected output.',
  'Which sites may be impacted by the cyclone?',
  'Which maintenance jobs are overdue?',
  'Summarise operations for Gujarat.',
  'Compare S120 and S144 fleet availability.',
  'Which customers are affected by current alarms?',
  'Show turbines awaiting inspection after the recent earthquake.',
]

function sev(score: number): Severity {
  if (score < 55) return 'critical'
  if (score < 70) return 'high'
  if (score < 82) return 'medium'
  return 'low'
}

/* ------------------------------ Response builders ------------------------------ */

function atRiskToday(): AiResponseCard {
  const risky = turbines
    .filter((t) => t.status === 'offline' || t.status === 'alarm' || t.healthScore < 68)
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 8)
  const mw = Math.round(sum(risky.map((t) => t.capacityMw)) * 10) / 10

  return {
    summary: `${risky.length} turbines carry elevated risk right now — ${fleetKpis.offlineTurbines} offline, ${fleetKpis.criticalIncidents} with critical or high-severity alarms, and the rest flagged by declining health scores.`,
    insight:
      'Risk is concentrated rather than spread: Kutch Horizon and Sangli Plateau account for most of the degraded machines, and both sit under an active environmental watch. Treating them as two site-level interventions is cheaper than eight turbine-level ones.',
    affectedAssets: risky.map((t) => ({
      id: t.id,
      label: t.name,
      detail: `${t.windFarmName} · health ${t.healthScore} · ${t.activeAlarm ?? 'no active alarm'}`,
      severity: sev(t.healthScore),
    })),
    recommendedAction: `Raise a combined intervention plan for the two hot-spot sites covering ${mw} MW, and schedule it against the post-cyclone low-wind window.`,
    relatedRecords: [
      ...risky.slice(0, 4).map((t) => ({
        kind: 'turbine' as const,
        id: t.id,
        label: t.name,
        meta: `${t.product} · ${t.windFarmName}`,
        href: `/turbines/${t.id}`,
      })),
      { kind: 'wind-farm' as const, id: 'wf-kutch-horizon', label: 'Kutch Horizon Wind Park', meta: 'Gujarat · 42 turbines', href: '/wind-farms/wf-kutch-horizon' },
    ],
    cta: { label: 'Open Command Center', href: '/command-center' },
    chart: {
      kind: 'bar',
      title: 'Health score — most at-risk turbines',
      unit: 'score',
      data: risky.slice(0, 6).map((t) => ({ label: t.name.split('-').slice(-1)[0]!, value: t.healthScore })),
    },
  }
}

function underperformingProduct(product: string): AiResponseCard {
  const matches = underperformers.filter((u) => u.turbine.product === product).slice(0, 8)
  const list = matches.length ? matches : underperformers.slice(0, 6)
  return {
    summary: `${list.length} ${product} turbines are producing measurably below the expected power curve for their current wind band, with deficits between ${Math.min(...list.map((l) => l.deficitPct))}% and ${Math.max(...list.map((l) => l.deficitPct))}%.`,
    insight:
      'Deficits clustering in the 12–20% band usually point to yaw misalignment or blade soiling rather than drivetrain faults. Both are recoverable without taking the turbine out of service for long.',
    affectedAssets: list.map((u) => ({
      id: u.turbine.id,
      label: u.turbine.name,
      detail: `${u.turbine.windFarmName} · expected ${u.expectedKw} kW · actual ${u.turbine.currentPowerKw} kW`,
      severity: u.deficitPct > 25 ? 'high' : u.deficitPct > 18 ? 'medium' : 'low',
    })),
    recommendedAction:
      'Run a yaw-alignment check from the nacelle anemometer data before dispatching crews, then batch any confirmed cases into a single site visit.',
    relatedRecords: list.slice(0, 5).map((u) => ({
      kind: 'turbine' as const,
      id: u.turbine.id,
      label: u.turbine.name,
      meta: `${u.deficitPct}% below expected`,
      href: `/turbines/${u.turbine.id}`,
    })),
    cta: { label: 'Open asset monitoring', href: '/asset-monitoring' },
    chart: {
      kind: 'bar',
      title: 'Output deficit versus expected power curve',
      unit: '%',
      data: list.slice(0, 6).map((u) => ({ label: u.turbine.name.split('-').slice(-1)[0]!, value: u.deficitPct })),
    },
  }
}

function cycloneImpact(): AiResponseCard {
  const active = cyclones.filter((c) => c.status === 'active')
  const sites = windFarms.filter((w) => active.some((c) => c.sitesInImpactZone.includes(w.id)))
  const mw = Math.round(sum(sites.map((s) => s.installedMw)) * 10) / 10

  return {
    summary: `${active.length} active systems place ${sites.length} sites and ${fmtMw(mw)} inside a forecast impact radius. ${active[0]!.name} is the immediate concern, with landfall expected in about 18 hours.`,
    insight:
      'The Arabian Sea system is the one that matters operationally. The Bay of Bengal depression will bring rain and 55–70 km/h gusts to the Tamil Nadu cluster, which affects crane work and crew movement but not turbine survival.',
    affectedAssets: sites.map((s) => ({
      id: s.id,
      label: s.name,
      detail: `${s.state} · ${fmtMw(s.installedMw)} · ${s.turbineCount} turbines · ${s.customerName}`,
      severity: active.some((c) => c.id === 'cyc-mandara' && c.sitesInImpactZone.includes(s.id)) ? 'critical' : 'medium',
    })),
    recommendedAction:
      'Approve a staged controlled shutdown for the Gujarat cluster beginning 6 hours before landfall, and re-plan the Tamil Nadu crane campaign around the depression window.',
    relatedRecords: [
      ...sites.slice(0, 4).map((s) => ({
        kind: 'wind-farm' as const,
        id: s.id,
        label: s.name,
        meta: `${s.state} · ${fmtMw(s.installedMw)}`,
        href: `/wind-farms/${s.id}`,
      })),
    ],
    cta: { label: 'Open cyclone tracking', href: '/environment?event=cyc-mandara' },
    chart: {
      kind: 'bar',
      title: 'Capacity inside the forecast impact radius',
      unit: 'MW',
      data: sites.map((s) => ({ label: s.name.split(' ')[0]!, value: s.installedMw })),
    },
  }
}

function overdueMaintenance(): AiResponseCard {
  const overdue = workOrders
    .filter((w) => w.status !== 'completed' && w.status !== 'cancelled' && new Date(w.slaDueAt) < new Date('2026-08-13T09:42:00+05:30'))
    .slice(0, 10)

  return {
    summary: `${maintenanceSummary.overdue} work orders are past their SLA window, of which ${maintenanceSummary.awaitingParts} are blocked on spares and ${maintenanceSummary.breakdowns} are open breakdowns.`,
    insight:
      'The overdue queue is not a resourcing problem — technician utilisation is at 78%. It is a parts problem: the blocked jobs share three SKUs, all of which sit at the same regional store.',
    affectedAssets: overdue.map((w) => ({
      id: w.id,
      label: `${w.id} · ${w.title}`,
      detail: `${w.turbineName} · ${w.windFarmName} · ${w.technicianName}`,
      severity: w.priority,
    })),
    recommendedAction:
      'Expedite the three blocked SKUs from the regional store and re-slot the released jobs against the next available technician window.',
    relatedRecords: overdue.slice(0, 5).map((w) => ({
      kind: 'work-order' as const,
      id: w.id,
      label: w.id,
      meta: `${w.title} · ${w.windFarmName}`,
      href: `/maintenance/${w.id}`,
    })),
    cta: { label: 'Open maintenance queue', href: '/maintenance?filter=overdue' },
  }
}

function regionSummary(state: string): AiResponseCard {
  const sites = windFarms.filter((w) => w.state.toLowerCase() === state.toLowerCase())
  const stateTurbines = turbines.filter((t) => t.state.toLowerCase() === state.toLowerCase())
  const mw = Math.round(sum(sites.map((s) => s.installedMw)) * 10) / 10
  const gen = Math.round(sum(sites.map((s) => s.currentGenerationMw)) * 10) / 10
  const avail = Math.round(mean(stateTurbines.map((t) => t.availabilityPct)) * 10) / 10
  const off = stateTurbines.filter((t) => t.status === 'offline').length
  const stateOrders = workOrders.filter((w) => w.state.toLowerCase() === state.toLowerCase() && w.status !== 'completed')

  return {
    summary: `${state} runs ${sites.length} sites, ${fmtMw(mw)} installed across ${stateTurbines.length} turbines. Current output is ${fmtMw(gen)} at ${fmtPct(avail)} availability, with ${off} turbines offline and ${stateOrders.length} open work orders.`,
    insight:
      state === 'Gujarat'
        ? 'Gujarat is the region under most pressure today: an active cyclone track, a recent seismic event inside the inspection radius, and the fleet’s largest concentration of gearbox-trend flags all land on the same three sites.'
        : `Operations across ${state} are within normal parameters. The main watch item is the open work-order queue rather than asset condition.`,
    affectedAssets: sites.map((s) => ({
      id: s.id,
      label: s.name,
      detail: `${fmtMw(s.installedMw)} · ${fmtPct(s.availabilityPct)} availability · ${s.activeAlerts} active alerts`,
      severity: s.riskBand === 'severe' ? 'critical' : s.riskBand === 'elevated' ? 'high' : s.riskBand === 'moderate' ? 'medium' : 'low',
    })),
    recommendedAction:
      state === 'Gujarat'
        ? 'Treat Gujarat as a single incident: one shutdown decision, one inspection campaign, one customer communication covering all three sites.'
        : 'No escalation required. Keep the preventive queue on schedule and re-review at the next shift handover.',
    relatedRecords: sites.map((s) => ({
      kind: 'wind-farm' as const,
      id: s.id,
      label: s.name,
      meta: `${s.district} · ${s.turbineCount} turbines`,
      href: `/wind-farms/${s.id}`,
    })),
    cta: { label: 'Open Command Center', href: '/command-center' },
    chart: {
      kind: 'bar',
      title: `${state} — availability by site`,
      unit: '%',
      data: sites.map((s) => ({ label: s.name.split(' ')[0]!, value: s.availabilityPct })),
    },
  }
}

function compareProducts(): AiResponseCard {
  const rows = fleetHealth.productComparison
  const best = [...rows].sort((a, b) => b.availability - a.availability)[0]!

  return {
    summary: rows
      .map((r) => `${r.product}: ${fmtPct(r.availability)} availability across ${r.turbines} turbines (${fmtMw(r.mw)})`)
      .join(' · '),
    insight: `${best.product} leads on availability, which is expected given the younger installed base — most of that fleet was commissioned after 2022 and is still inside its first major service interval. Comparing raw availability across product families without normalising for fleet age overstates the difference.`,
    affectedAssets: rows.map((r) => ({
      id: r.product,
      label: `${r.product} fleet`,
      detail: `${r.turbines} turbines · ${fmtMw(r.mw)} · PLF ${fmtPct(r.plf)}`,
      severity: r.availability > 96 ? 'low' : r.availability > 94 ? 'medium' : 'high',
    })),
    recommendedAction:
      'Re-run the comparison on an age-normalised basis before it goes into the customer performance review, so the conclusion holds up under scrutiny.',
    relatedRecords: rows.map((r) => ({
      kind: 'turbine' as const,
      id: r.product,
      label: `${r.product} fleet view`,
      meta: `${r.turbines} turbines`,
      href: `/turbines?product=${r.product}`,
    })),
    cta: { label: 'Open fleet comparison', href: '/asset-monitoring' },
    chart: {
      kind: 'bar',
      title: 'Fleet availability by product family',
      unit: '%',
      data: rows.map((r) => ({ label: r.product, value: r.availability })),
    },
  }
}

function affectedCustomers(): AiResponseCard {
  const criticalAlarms = alarms.filter((a) => a.severity === 'critical' || a.severity === 'high')
  const siteIds = new Set(criticalAlarms.map((a) => a.windFarmId))
  const affected = accounts.filter((a) => a.windFarmIds.some((id) => siteIds.has(id)))

  return {
    summary: `${affected.length} customers have assets carrying critical or high-severity alarms right now, covering ${criticalAlarms.length} active alarms across ${siteIds.size} sites.`,
    insight:
      'Two of these customers are inside an active commercial cycle — one in negotiation on a service renewal, one in technical evaluation. Availability performance in the next fortnight will be read commercially, not just operationally.',
    affectedAssets: affected.map((a) => ({
      id: a.id,
      label: a.name,
      detail: `${fmtMw(a.installedMw)} installed · ${a.openCases} open cases · health ${a.healthScore}`,
      severity: a.healthScore < 70 ? 'high' : a.healthScore < 82 ? 'medium' : 'low',
    })),
    recommendedAction:
      'Issue a proactive status note to the two customers in an active commercial cycle before they raise it themselves.',
    relatedRecords: affected.map((a) => ({
      kind: 'account' as const,
      id: a.id,
      label: a.name,
      meta: `${a.type} · ${a.relationshipOwner}`,
      href: `/crm/accounts/${a.id}`,
    })),
    cta: { label: 'Open accounts', href: '/crm/accounts' },
  }
}

function seismicInspections(): AiResponseCard {
  const pending = earthquakes.filter(
    (e) => e.inspectionStatus === 'recommended' || e.inspectionStatus === 'scheduled' || e.inspectionStatus === 'in-progress',
  )
  const siteIds = new Set(pending.flatMap((e) => e.affectedSiteIds))
  const affectedTurbines = turbines.filter((t) => siteIds.has(t.windFarmId))

  return {
    summary: `${pending.length} seismic events have inspections outstanding, covering ${siteIds.size} sites and ${affectedTurbines.length} turbines. The driving event is the M ${pending[0]?.magnitude.toFixed(1) ?? '4.8'} near ${pending[0]?.epicenter ?? 'Kutch'}.`,
    insight:
      'An environmental alert is a decision-support signal, not proof of damage. None of these turbines has reported a structural anomaly — the inspection exists to rule out flange-tension loss that would not otherwise be visible.',
    affectedAssets: Array.from(siteIds).map((id) => {
      const site = windFarms.find((w) => w.id === id)!
      return {
        id: site.id,
        label: site.name,
        detail: `${site.turbineCount} turbines · commissioned ${site.commissionedOn.slice(0, 4)} · ${site.state}`,
        severity: 'medium' as Severity,
      }
    }),
    recommendedAction:
      'Raise Level 1 structural walk-down work orders, prioritising turbines commissioned before 2020 and any with a prior foundation observation on record.',
    relatedRecords: [
      ...Array.from(siteIds).map((id) => {
        const site = windFarms.find((w) => w.id === id)!
        return { kind: 'wind-farm' as const, id: site.id, label: site.name, meta: `${site.turbineCount} turbines`, href: `/wind-farms/${site.id}` }
      }),
      { kind: 'document' as const, id: 'doc-seismic', label: 'Post-Seismic Structural Walk-down procedure', meta: 'Inspection Reports', href: '/documents?category=Inspection%20Reports' },
    ],
    cta: { label: 'Open seismic feed', href: '/environment?tab=earthquakes' },
  }
}

function fallback(query: string): AiResponseCard {
  const top = aiPriorities.slice(0, 4)
  return {
    summary: `I could not match "${query}" to a specific dataset, so here is where the fleet stands right now: ${fmtMw(fleetKpis.onlineMw)} online of ${fmtMw(fleetKpis.installedMw)} installed, ${fmtPct(fleetKpis.availabilityPct)} availability, ${fleetKpis.criticalIncidents} critical or high-severity incidents open.`,
    insight:
      'Try naming an asset, a site, a state or a product family — for example “Kutch Horizon”, “S144”, “Gujarat”, or “overdue maintenance”. I can also compare fleets and summarise environmental exposure.',
    affectedAssets: top.map((p) => ({
      id: p.id,
      label: p.headline,
      detail: p.businessImpact,
      severity: p.severity,
    })),
    recommendedAction: top[0]!.recommendedAction,
    relatedRecords: [
      { kind: 'wind-farm', id: 'all', label: 'All wind farms', meta: `${windFarms.length} sites`, href: '/wind-farms' },
      { kind: 'turbine', id: 'all', label: 'Turbine fleet', meta: `${turbines.length} turbines`, href: '/turbines' },
      { kind: 'project', id: 'all', label: 'Projects', meta: `${projects.length} active`, href: '/projects' },
    ],
    cta: { label: 'Open Command Center', href: '/command-center' },
  }
}

/* --------------------------------- Dispatcher --------------------------------- */

export function answerQuery(query: string): AiResponseCard {
  const q = query.toLowerCase()

  if (/(cyclone|storm|mandara|rehani|landfall)/.test(q)) return cycloneImpact()
  if (/(earthquake|seismic|magnitude|tremor|inspection after)/.test(q)) return seismicInspections()
  if (/(overdue|sla|late|backlog).*(maintenance|job|work order)|maintenance.*(overdue|late)/.test(q)) return overdueMaintenance()
  if (/(compare|versus|vs\.?)\s*(s120|s133|s144)|availability.*(s120|s133|s144).*(s120|s133|s144)/.test(q)) return compareProducts()
  if (/(below expected|underperform|under-perform|low output|deficit)/.test(q)) {
    const product = /s144/.test(q) ? 'S144' : /s133/.test(q) ? 'S133' : /s120/.test(q) ? 'S120' : 'S144'
    return underperformingProduct(product)
  }
  if (/(customer|account).*(affect|impact|alarm)|which customers/.test(q)) return affectedCustomers()
  if (/(at risk|risk today|risky|attention)/.test(q)) return atRiskToday()

  const stateMatch = ['Gujarat', 'Tamil Nadu', 'Rajasthan', 'Maharashtra', 'Karnataka', 'Madhya Pradesh', 'Andhra Pradesh'].find(
    (s) => q.includes(s.toLowerCase()),
  )
  if (stateMatch) return regionSummary(stateMatch)

  if (/(compare|comparison)/.test(q)) return compareProducts()
  if (/(maintenance|work order|service)/.test(q)) return overdueMaintenance()
  if (/(s120|s133|s144)/.test(q)) {
    const product = /s144/.test(q) ? 'S144' : /s133/.test(q) ? 'S133' : 'S120'
    return underperformingProduct(product)
  }

  return fallback(query)
}
