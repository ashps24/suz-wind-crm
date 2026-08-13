import { PRODUCT_FAMILIES, TURBINE_STATUS_ORDER } from '@/lib/constants'
import { between, clamp, daysAgo, mean, seededRandom, sum } from '@/lib/utils'
import { alarms, turbines, windFarms } from './fleet'
import { workOrders } from './maintenance'
import type { FleetHealthMetrics, ProductFamily, TurbineStatus } from '@/types'

const rng = seededRandom('monitoring:v1')

const availabilitySeries = Array.from({ length: 30 }, (_, i) => ({
  t: daysAgo(29 - i),
  value: Math.round(clamp(96.4 + Math.sin(i / 4.1) * 1.3 + between(rng, -0.9, 0.7, 2), 91, 99.4) * 10) / 10,
}))

const generationSeries = Array.from({ length: 30 }, (_, i) => ({
  t: daysAgo(29 - i),
  value: Math.round(clamp(9.4 + Math.sin(i / 3.2) * 2.6 + between(rng, -1.4, 1.8, 2), 3.2, 15.8) * 100) / 100,
}))

const statusDistribution = TURBINE_STATUS_ORDER.map((status) => ({
  status,
  count: turbines.filter((t) => t.status === status).length,
})) as { status: TurbineStatus; count: number }[]

const siteComparison = windFarms
  .map((w) => ({
    siteId: w.id,
    siteName: w.name,
    availability: w.availabilityPct,
    plf: w.plfPct,
    mw: w.installedMw,
  }))
  .sort((a, b) => b.availability - a.availability)

/** Site × 14-day availability heatmap — one row per site, sequential ramp. */
const heatmap = windFarms.map((w) => {
  const r = seededRandom(`heat:${w.id}`)
  return {
    siteName: w.name,
    values: Array.from({ length: 14 }, (_, d) =>
      Math.round(clamp(w.availabilityPct + Math.sin(d / 2.6) * 2.4 + between(r, -3.2, 2.1, 1), 74, 100) * 10) / 10,
    ),
  }
})

const productComparison = PRODUCT_FAMILIES.map((product: ProductFamily) => {
  const list = turbines.filter((t) => t.product === product)
  return {
    product,
    availability: Math.round(mean(list.map((t) => t.availabilityPct)) * 10) / 10,
    plf: Math.round(mean(list.map((t) => t.capacityFactorPct)) * 10) / 10,
    turbines: list.length,
    mw: Math.round(sum(list.map((t) => t.capacityMw)) * 10) / 10,
  }
})

const downtimeHours = Math.round(sum(alarms.map((a) => a.downtimeMinutes)) / 60)

export const fleetHealth: FleetHealthMetrics = {
  availabilityPct: Math.round(mean(turbines.map((t) => t.availabilityPct)) * 10) / 10,
  downtimeHours,
  mtbfHours: Math.round((turbines.length * 720) / Math.max(alarms.length, 1)),
  mttrHours: Math.round((downtimeHours / Math.max(alarms.length, 1)) * 10) / 10,
  generationGwh: Math.round(sum(generationSeries.map((g) => g.value)) * 10) / 10,
  performanceRatioPct: Math.round(mean(turbines.map((t) => t.capacityFactorPct)) * 10) / 10,
  curtailmentPct:
    Math.round((turbines.filter((t) => t.status === 'curtailment').length / turbines.length) * 1000) / 10,
  alarmCount: alarms.length,
  availabilitySeries,
  generationSeries,
  statusDistribution,
  siteComparison,
  heatmap,
  productComparison,
}

/** Turbines producing measurably below the fleet expectation for their wind band. */
export const underperformers = turbines
  .filter((t) => t.status === 'running' || t.status === 'curtailment')
  .map((t) => {
    const expected = t.capacityMw * 1000 * clamp((t.windSpeedMs / 11) ** 3, 0, 1)
    const deficit = expected > 200 ? Math.round(((expected - t.currentPowerKw) / expected) * 1000) / 10 : 0
    return { turbine: t, expectedKw: Math.round(expected), deficitPct: deficit }
  })
  .filter((x) => x.deficitPct > 12)
  .sort((a, b) => b.deficitPct - a.deficitPct)
  .slice(0, 24)

export const alarmsByCategory = Array.from(
  alarms.reduce((acc, a) => {
    acc.set(a.category, (acc.get(a.category) ?? 0) + 1)
    return acc
  }, new Map<string, number>()),
)
  .map(([label, value]) => ({ label, value }))
  .sort((a, b) => b.value - a.value)

export const workOrdersByType = Array.from(
  workOrders.reduce((acc, w) => {
    acc.set(w.type, (acc.get(w.type) ?? 0) + 1)
    return acc
  }, new Map<string, number>()),
)
  .map(([label, value]) => ({ label, value }))
  .sort((a, b) => b.value - a.value)
