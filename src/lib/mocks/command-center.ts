import { DEMO_NOW, hoursAgo, mean, minutesAgo, sum } from '@/lib/utils'
import { accounts } from './crm'
import { alarms, onFleetRebuild, turbines, windFarms } from './fleet'
import { cyclones, earthquakes, environmentEvents, floodZones, tsunamiAlerts } from './environment'
import { maintenanceSummary, technicians, workOrders } from './maintenance'
import { projects } from './projects'
import type { AiPriority, FleetKpis, OperationalEvent } from '@/types'

/* ----------------------------------- KPIs ----------------------------------- */

const producing = turbines.filter((t) => t.currentPowerKw > 0)
const offline = turbines.filter((t) => t.status === 'offline')
const critical = alarms.filter((a) => a.severity === 'critical' || a.severity === 'high')
const impactedSiteIds = new Set([
  ...critical.map((a) => a.windFarmId),
  ...cyclones.filter((c) => c.status === 'active').flatMap((c) => c.sitesInImpactZone),
])
const impactedCustomers = new Set(
  windFarms.filter((w) => impactedSiteIds.has(w.id)).map((w) => w.customerId),
)

const installedMw = Math.round(sum(windFarms.map((w) => w.installedMw)) * 10) / 10
const onlineMw = Math.round(sum(turbines.map((t) => t.currentPowerKw)) / 100) / 10
const generationTodayGwh = Math.round(sum(windFarms.map((w) => w.generationTodayMwh)) / 100) / 10

export const fleetKpis: FleetKpis = {
  installedMw,
  onlineMw,
  availabilityPct: Math.round(mean(turbines.map((t) => t.availabilityPct)) * 10) / 10,
  availabilityTrend: { direction: 'down', valuePct: 0.6, upIsGood: true },
  activeTurbines: producing.length,
  offlineTurbines: offline.length,
  criticalIncidents: critical.length,
  maintenanceDueToday: maintenanceSummary.dueToday + maintenanceSummary.overdue,
  projectsAtRisk: projects.filter((p) => p.risk === 'severe' || p.risk === 'elevated').length,
  customersImpacted: impactedCustomers.size,
  generationTodayGwh,
  generationTrend: { direction: 'up', valuePct: 4.2, upIsGood: true },
  // Grid emission factor for the Indian grid, applied to today's generation.
  co2AvoidedTonnes: Math.round(generationTodayGwh * 1000 * 0.71),
  totalTurbines: turbines.length,
}

// The KPI object above is a load-time snapshot. When the fleet is rebuilt from
// live site records, recompute the fleet-derived figures in place — the summary
// object references this same instance, so every reader sees the new numbers.
onFleetRebuild(() => {
  const nowProducing = turbines.filter((t) => t.currentPowerKw > 0)
  const nowOffline = turbines.filter((t) => t.status === 'offline')
  const nowCritical = alarms.filter((a) => a.severity === 'critical' || a.severity === 'high')
  const gwhToday = Math.round(sum(windFarms.map((w) => w.generationTodayMwh)) / 100) / 10

  fleetKpis.installedMw = Math.round(sum(windFarms.map((w) => w.installedMw)) * 10) / 10
  fleetKpis.onlineMw = Math.round(sum(turbines.map((t) => t.currentPowerKw)) / 100) / 10
  fleetKpis.availabilityPct = Math.round(mean(turbines.map((t) => t.availabilityPct)) * 10) / 10
  fleetKpis.activeTurbines = nowProducing.length
  fleetKpis.offlineTurbines = nowOffline.length
  fleetKpis.criticalIncidents = nowCritical.length
  fleetKpis.generationTodayGwh = gwhToday
  fleetKpis.co2AvoidedTonnes = Math.round(gwhToday * 1000 * 0.71)
  fleetKpis.totalTurbines = turbines.length
})

/* -------------------------------- AI priorities -------------------------------- */

const mandara = cyclones.find((c) => c.id === 'cyc-mandara')!
const rehani = cyclones.find((c) => c.id === 'cyc-rehani')!
const bigQuake = earthquakes.find((e) => e.id === 'eq-2026-0812-01')!
const kutch = windFarms.find((w) => w.id === 'wf-kutch-horizon')!
const sangli = windFarms.find((w) => w.id === 'wf-sangli')!
const barmerProject = projects.find((p) => p.id === 'prj-barmer-ph2')!
const krishnaFlood = floodZones.find((f) => f.id === 'fld-krishna')!
const activeTsunami = tsunamiAlerts.find((t) => t.status === 'active')!

const mandaraMw = Math.round(
  sum(windFarms.filter((w) => mandara.sitesInImpactZone.includes(w.id)).map((w) => w.installedMw)) * 10,
) / 10

const kutchGearboxTurbines = turbines
  .filter((t) => t.windFarmId === kutch.id && (t.status === 'alarm' || t.healthScore < 72))
  .slice(0, 5)

const quakeSites = windFarms.filter((w) => bigQuake.affectedSiteIds.includes(w.id))
const quakeTurbineCount = turbines.filter((t) => bigQuake.affectedSiteIds.includes(t.windFarmId)).length

const overdueOrders = workOrders.filter(
  (w) => w.status !== 'completed' && w.status !== 'cancelled' && new Date(w.slaDueAt) < DEMO_NOW,
)

const curtailed = turbines.filter((t) => t.status === 'curtailment')
const curtailedMw = Math.round(sum(curtailed.map((t) => t.capacityMw)) * 10) / 10

export const aiPriorities: AiPriority[] = [
  {
    id: 'pri-001',
    severity: 'critical',
    headline: `${mandara.name} track intersects ${mandara.sitesInImpactZone.length} Gujarat sites within 18 hours`,
    whatHappened: `${mandara.name} is tracking north-north-east at ${mandara.movementKmh} km/h with sustained winds of ${mandara.maxWindKmh} km/h. Forecast landfall is ${mandara.landfallLocation}, placing ${mandara.sitesInImpactZone.length} sites inside the ${mandara.impactRadiusKm} km impact radius.`,
    whyItMatters:
      'Gusts above the 25 m/s cut-out will force uncontrolled shutdowns. A planned, staged shutdown with rotor lock protects the drivetrain and preserves the availability guarantee, an unplanned one does not.',
    businessImpact: `${mandaraMw} MW at risk · approximately 1.9 GWh of production over the shutdown window · 3 customer availability guarantees exposed`,
    recommendedAction:
      'Approve a staged controlled shutdown starting 6 hours before forecast landfall. Confirm rotor lock, secure the laydown yards and move field crews off all coastal sites.',
    affectedSiteIds: mandara.sitesInImpactZone,
    affectedSiteNames: windFarms.filter((w) => mandara.sitesInImpactZone.includes(w.id)).map((w) => w.name),
    affectedMw: mandaraMw,
    affectedCustomers: Array.from(
      new Set(windFarms.filter((w) => mandara.sitesInImpactZone.includes(w.id)).map((w) => w.customerName)),
    ),
    confidencePct: 91,
    detectedAt: minutesAgo(34),
    cta: { label: 'Open cyclone response', href: '/environment?event=cyc-mandara' },
    category: 'Environmental',
  },
  {
    id: 'pri-002',
    severity: 'high',
    headline: `${kutchGearboxTurbines.length} turbines at ${kutch.name} show rising gearbox temperature trends`,
    whatHappened: `Condition monitoring flagged an upward drift in high-speed-shaft oil temperature and vibration RMS across ${kutchGearboxTurbines.length} machines at ${kutch.name} over the last 21 days. Two have already crossed the DRV-2140 warning threshold.`,
    whyItMatters:
      'This pattern historically precedes a bearing failure by 6–10 weeks. Intervening now converts an unplanned gearbox exchange into a planned borescope and oil change during a low-wind window.',
    businessImpact: `Avoids an estimated ₹2.4 Cr in unplanned exchange cost and roughly 340 MWh of lost production per affected machine`,
    recommendedAction:
      'Raise predictive work orders for a borescope inspection and oil particle count on all flagged machines. Schedule against the post-cyclone low-wind window.',
    affectedSiteIds: [kutch.id],
    affectedSiteNames: [kutch.name],
    affectedMw: Math.round(sum(kutchGearboxTurbines.map((t) => t.capacityMw)) * 10) / 10,
    affectedCustomers: [kutch.customerName],
    confidencePct: 84,
    detectedAt: hoursAgo(3),
    cta: { label: 'Review affected turbines', href: `/wind-farms/${kutch.id}?tab=turbines` },
    category: 'Asset Health',
  },
  {
    id: 'pri-003',
    severity: 'high',
    headline: `M ${bigQuake.magnitude.toFixed(1)} earthquake ${bigQuake.distanceKm} km from ${bigQuake.nearestWindFarmName} — inspection recommended`,
    whatHappened: `A magnitude ${bigQuake.magnitude.toFixed(1)} event was recorded at ${bigQuake.epicenter} at a depth of ${bigQuake.depthKm} km. ${quakeSites.length} monitored sites fall inside the structural review radius.`,
    whyItMatters:
      'Ground motion at this magnitude and depth can loosen tower flange bolt tension and crack foundation grout without any visible surface indication. A seismic alert is a decision-support signal, not evidence of damage.',
    businessImpact: `${quakeTurbineCount} turbines require a Level 1 structural walk-down · estimated 3 crew-days`,
    recommendedAction:
      'Raise post-seismic inspection work orders for the affected sites. Prioritise turbines commissioned before 2020 and any with a prior foundation observation.',
    affectedSiteIds: bigQuake.affectedSiteIds,
    affectedSiteNames: quakeSites.map((s) => s.name),
    affectedMw: Math.round(sum(quakeSites.map((s) => s.installedMw)) * 10) / 10,
    affectedCustomers: Array.from(new Set(quakeSites.map((s) => s.customerName))),
    confidencePct: 76,
    detectedAt: hoursAgo(19),
    cta: { label: 'Open seismic event', href: `/environment?event=${bigQuake.id}` },
    category: 'Environmental',
  },
  {
    id: 'pri-004',
    severity: 'high',
    headline: `${barmerProject.name} forecast to miss commissioning by ${barmerProject.delayDays} days`,
    whatHappened: `Grid compliance testing at ${barmerProject.name} is held pending evacuation bay energisation. The critical path has absorbed all float and the forecast commissioning date has moved out by ${barmerProject.delayDays} days.`,
    whyItMatters:
      'The delay crosses the contractual commissioning date, triggering liquidated damages exposure and pushing revenue recognition into the next financial quarter.',
    businessImpact: `${barmerProject.capacityMw} MW delayed · ₹${barmerProject.contractValueCr} Cr contract with LD exposure from the contractual date`,
    recommendedAction:
      'Escalate bay energisation with the transmission utility at the weekly grid coordination forum and re-sequence the reliability run to start the moment the bay is available.',
    affectedSiteIds: barmerProject.windFarmId ? [barmerProject.windFarmId] : [],
    affectedSiteNames: ['Barmer Desert Wind Park'],
    affectedMw: barmerProject.capacityMw,
    affectedCustomers: [barmerProject.customerName],
    confidencePct: 88,
    detectedAt: hoursAgo(6),
    cta: { label: 'Open project', href: `/projects/${barmerProject.id}` },
    category: 'Project',
  },
  {
    id: 'pri-005',
    severity: 'medium',
    headline: `${overdueOrders.length} maintenance jobs are past their SLA window`,
    whatHappened: `${overdueOrders.length} open work orders have passed their SLA due time, concentrated in the Maharashtra and Gujarat clusters. ${maintenanceSummary.awaitingParts} are blocked awaiting parts.`,
    whyItMatters:
      'Preventive slippage compounds: every deferred service raises the probability of a corrective intervention, which costs roughly four times as much and takes the turbine offline.',
    businessImpact: `${maintenanceSummary.open} open jobs across the fleet · availability guarantee headroom narrowing on 2 contracts`,
    recommendedAction:
      'Re-plan the overdue queue against technician availability and expedite the blocked spares from the regional store.',
    affectedSiteIds: Array.from(new Set(overdueOrders.map((w) => w.windFarmId))).slice(0, 5),
    affectedSiteNames: Array.from(new Set(overdueOrders.map((w) => w.windFarmName))).slice(0, 5),
    affectedMw: 0,
    affectedCustomers: Array.from(new Set(overdueOrders.map((w) => w.customerName))).slice(0, 4),
    confidencePct: 96,
    detectedAt: hoursAgo(1),
    cta: { label: 'Open maintenance queue', href: '/maintenance?filter=overdue' },
    category: 'Maintenance',
  },
  {
    id: 'pri-006',
    severity: 'medium',
    headline: `${curtailed.length} turbines held under grid curtailment — ${curtailedMw} MW constrained`,
    whatHappened: `State load dispatch instructions are limiting output across ${new Set(curtailed.map((t) => t.windFarmId)).size} sites. Affected machines are running at 28–60% of the available power curve.`,
    whyItMatters:
      'Curtailment is recoverable revenue if it is evidenced. Deemed-generation claims depend on time-stamped SCADA records matched to the dispatch instruction.',
    businessImpact: `${curtailedMw} MW constrained · estimated 0.6 GWh deemed generation claimable this month`,
    recommendedAction:
      'Export the curtailment evidence pack for the affected window and submit the deemed-generation claim with the monthly energy accounting.',
    affectedSiteIds: Array.from(new Set(curtailed.map((t) => t.windFarmId))),
    affectedSiteNames: Array.from(new Set(curtailed.map((t) => t.windFarmName))),
    affectedMw: curtailedMw,
    affectedCustomers: Array.from(new Set(curtailed.map((t) => t.customerName))),
    confidencePct: 82,
    detectedAt: hoursAgo(4),
    cta: { label: 'Open asset monitoring', href: '/asset-monitoring' },
    category: 'Grid',
  },
  {
    id: 'pri-007',
    severity: 'medium',
    headline: `Tsunami watch active for ${activeTsunami.coastalSiteIds.length} coastal sites`,
    whatHappened: `A tsunami ${activeTsunami.severity} is in force for the ${activeTsunami.region}, with an estimated wave height of ${activeTsunami.estimatedWaveHeightM} m and expected arrival in approximately 4 hours.`,
    whyItMatters:
      'Coastal turbine positions themselves sit above the inundation line, but jetty logistics, shoreline substations and crew access routes do not.',
    businessImpact: `${activeTsunami.coastalSiteIds.length} coastal sites · shoreline crane and jetty operations to be suspended`,
    recommendedAction: activeTsunami.recommendedAction,
    affectedSiteIds: activeTsunami.coastalSiteIds,
    affectedSiteNames: windFarms.filter((w) => activeTsunami.coastalSiteIds.includes(w.id)).map((w) => w.name),
    affectedMw: Math.round(
      sum(windFarms.filter((w) => activeTsunami.coastalSiteIds.includes(w.id)).map((w) => w.installedMw)) * 10,
    ) / 10,
    affectedCustomers: Array.from(
      new Set(windFarms.filter((w) => activeTsunami.coastalSiteIds.includes(w.id)).map((w) => w.customerName)),
    ),
    confidencePct: 68,
    detectedAt: hoursAgo(7),
    cta: { label: 'Open tsunami advisory', href: `/environment?event=${activeTsunami.id}` },
    category: 'Environmental',
  },
  {
    id: 'pri-008',
    severity: 'low',
    headline: `${krishnaFlood.riverBasin} basin storage at ${krishnaFlood.reservoirLevelPct}% — site access under watch`,
    whatHappened: krishnaFlood.advisory,
    whyItMatters:
      'Access restrictions do not stop generation, but they do stop crews. Any breakdown at Sangli or Satara during a release window would extend mean time to repair significantly.',
    businessImpact: `${krishnaFlood.accessRoadsImpacted} access roads affected · MTTR exposure on ${sangli.turbineCount + 32} turbines`,
    recommendedAction:
      'Pre-position critical spares at the Sangli store and confirm the alternate approach route with the district administration.',
    affectedSiteIds: krishnaFlood.affectedSiteIds,
    affectedSiteNames: windFarms.filter((w) => krishnaFlood.affectedSiteIds.includes(w.id)).map((w) => w.name),
    affectedMw: 0,
    affectedCustomers: Array.from(
      new Set(windFarms.filter((w) => krishnaFlood.affectedSiteIds.includes(w.id)).map((w) => w.customerName)),
    ),
    confidencePct: 74,
    detectedAt: hoursAgo(2),
    cta: { label: 'Open flood risk', href: `/environment?event=${krishnaFlood.id}` },
    category: 'Environmental',
  },
]

/* -------------------------------- Event timeline -------------------------------- */

function buildTimeline(): OperationalEvent[] {
  const events: OperationalEvent[] = []

  for (const alarm of alarms.slice(0, 14)) {
    const farm = windFarms.find((w) => w.id === alarm.windFarmId)
    events.push({
      id: `evt-alm-${alarm.id}`,
      at: alarm.raisedAt,
      kind: 'alarm',
      severity: alarm.severity,
      title: `${alarm.code} — ${alarm.title}`,
      detail: `${alarm.turbineName} · ${alarm.description}`,
      siteId: alarm.windFarmId,
      siteName: farm?.name ?? null,
      actor: 'SCADA',
    })
  }

  for (const wo of workOrders.filter((w) => w.status === 'in-progress' || w.status === 'dispatched').slice(0, 10)) {
    events.push({
      id: `evt-wo-${wo.id}`,
      at: wo.startedAt ?? wo.createdAt,
      kind: 'work-order',
      severity: wo.priority,
      title: `${wo.id} ${wo.status === 'dispatched' ? 'dispatched' : 'started'} — ${wo.title}`,
      detail: `${wo.turbineName} · ${wo.technicianName} · crew of ${wo.crewSize}`,
      siteId: wo.windFarmId,
      siteName: wo.windFarmName,
      actor: wo.technicianName,
    })
  }

  for (const env of environmentEvents.slice(0, 8)) {
    events.push({
      id: `evt-env-${env.id}`,
      at: env.occurredAt,
      kind: 'environment',
      severity: env.severity,
      title: env.title,
      detail: env.detail,
      siteId: env.affectedSiteIds[0] ?? null,
      siteName: windFarms.find((w) => w.id === env.affectedSiteIds[0])?.name ?? null,
      actor: 'Environmental Intelligence',
    })
  }

  for (const priority of aiPriorities.slice(0, 4)) {
    events.push({
      id: `evt-ai-${priority.id}`,
      at: priority.detectedAt,
      kind: 'ai',
      severity: priority.severity,
      title: priority.headline,
      detail: priority.recommendedAction,
      siteId: priority.affectedSiteIds[0] ?? null,
      siteName: priority.affectedSiteNames[0] ?? null,
      actor: 'Wind Intelligence',
    })
  }

  events.push(
    {
      id: 'evt-grid-01',
      at: hoursAgo(4),
      kind: 'grid',
      severity: 'medium',
      title: 'SLDC curtailment instruction received — Tamil Nadu cluster',
      detail: 'Site output capped at 62% of available capacity until further notice.',
      siteId: 'wf-thoothukudi',
      siteName: 'Thoothukudi Coastal Wind Cluster',
      actor: 'Grid Interface',
    },
    {
      id: 'evt-comm-01',
      at: hoursAgo(9),
      kind: 'commissioning',
      severity: 'low',
      title: '4 turbines completed the 240-hour reliability run',
      detail: 'Barmer Desert Wind Park — provisional acceptance documentation raised for customer review.',
      siteId: 'wf-barmer-desert',
      siteName: 'Barmer Desert Wind Park',
      actor: 'Rohit Bansal',
    },
    {
      id: 'evt-prj-01',
      at: hoursAgo(11),
      kind: 'project',
      severity: 'medium',
      title: 'Crane campaign re-sequenced ahead of Cyclone Mandara',
      detail: 'Anantapur Hybrid Wind Park — high lifts paused, crane boomed down and secured.',
      siteId: 'wf-anantapur',
      siteName: 'Anantapur Hybrid Wind Park',
      actor: 'Vasudha Reddy',
    },
    {
      id: 'evt-prj-02',
      at: hoursAgo(22),
      kind: 'project',
      severity: 'low',
      title: 'Foundation pour completed for 6 positions',
      detail: 'Thoothukudi Coastal Extension — 28-day strength gate scheduled for 10 September.',
      siteId: 'wf-thoothukudi',
      siteName: 'Thoothukudi Coastal Wind Cluster',
      actor: 'Meena Rajendran',
    },
  )

  return events.sort((a, b) => (a.at < b.at ? 1 : -1))
}

export const operationalTimeline: OperationalEvent[] = buildTimeline()

export const commandCenterSummary = {
  kpis: fleetKpis,
  priorities: aiPriorities,
  activeAlerts: alarms,
  windFarms,
  fieldTeams: technicians,
  environmentalEvents: environmentEvents,
  timeline: operationalTimeline,
  generatedAt: DEMO_NOW.toISOString(),
}

export const impactedAccounts = accounts.filter((a) =>
  a.windFarmIds.some((id) => impactedSiteIds.has(id)),
)
