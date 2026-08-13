import { between, daysAgo, haversineKm, hoursAgo, hoursAhead, minutesAgo, pick, seededRandom } from '@/lib/utils'
import { windFarms } from './fleet'
import type {
  Cyclone,
  CycloneTrackPoint,
  EarthquakeEvent,
  EnvironmentEventSummary,
  FloodRiskZone,
  LightningCluster,
  Severity,
  TsunamiAlert,
  WeatherReading,
} from '@/types'

/* ---------------------------------- Weather ---------------------------------- */

const CONDITIONS: WeatherReading['condition'][] = [
  'Clear', 'Partly cloudy', 'Overcast', 'Rain', 'Thunderstorm', 'Haze', 'Squall',
]

export const weatherReadings: WeatherReading[] = windFarms.map((farm) => {
  const rng = seededRandom(`weather:${farm.id}`)
  const monsoonBelt = ['Maharashtra', 'Karnataka', 'Madhya Pradesh'].includes(farm.state)
  const coastal = ['wf-dwarka-coastal', 'wf-thoothukudi', 'wf-muppandal', 'wf-kutch-horizon'].includes(farm.id)

  const condition: WeatherReading['condition'] = monsoonBelt
    ? pick(rng, ['Overcast', 'Rain', 'Thunderstorm', 'Rain'] as const)
    : coastal
      ? pick(rng, ['Partly cloudy', 'Squall', 'Overcast', 'Clear'] as const)
      : pick(rng, CONDITIONS)

  const windSpeedMs = Math.round(clampWind(farm.meanWindSpeedMs + between(rng, -2.4, 3.8, 1)) * 10) / 10

  return {
    windFarmId: farm.id,
    windFarmName: farm.name,
    observedAt: minutesAgo(Math.round(between(rng, 3, 22))),
    windSpeedMs,
    windGustMs: Math.round((windSpeedMs * between(rng, 1.22, 1.62, 2)) * 10) / 10,
    windDirectionDeg: Math.round(between(rng, 200, 290)),
    temperatureC: Math.round(between(rng, monsoonBelt ? 22 : 27, monsoonBelt ? 31 : 42, 1) * 10) / 10,
    humidityPct: Math.round(between(rng, coastal ? 62 : monsoonBelt ? 74 : 21, coastal ? 89 : monsoonBelt ? 95 : 48)),
    rainfallMm: condition === 'Rain' || condition === 'Thunderstorm' ? between(rng, 2, 68, 1) : between(rng, 0, 1.2, 1),
    visibilityKm: condition === 'Haze' ? between(rng, 1.4, 4, 1) : between(rng, 6, 20, 1),
    pressureHpa: Math.round(between(rng, 996, 1014, 1) * 10) / 10,
    condition,
    forecast: Array.from({ length: 12 }, (_, i) => {
      const drift = Math.sin((i / 12) * Math.PI * 1.6)
      const ws = Math.round(clampWind(windSpeedMs + drift * 2.6 + between(rng, -1.1, 1.4, 1)) * 10) / 10
      return {
        t: hoursAhead(i * 3),
        windSpeedMs: ws,
        gustMs: Math.round(ws * between(rng, 1.2, 1.55, 2) * 10) / 10,
        temperatureC: Math.round(between(rng, 21, 40, 1) * 10) / 10,
        rainProbPct: Math.round(between(rng, monsoonBelt ? 35 : 2, monsoonBelt ? 92 : 30)),
      }
    }),
  }
})

function clampWind(v: number) {
  return Math.min(28, Math.max(0.4, v))
}

const weatherBySite = new Map(weatherReadings.map((w) => [w.windFarmId, w]))
export function getWeather(siteId: string) {
  return weatherBySite.get(siteId)
}

/* -------------------------------- Earthquakes -------------------------------- */

interface QuakeSeed {
  id: string
  magnitude: number
  epicenter: string
  lat: number
  lng: number
  depthKm: number
  hoursAgo: number
  source: string
}

const QUAKE_SEEDS: QuakeSeed[] = [
  { id: 'eq-2026-0812-01', magnitude: 4.8, epicenter: 'Rapar, Kutch district', lat: 23.58, lng: 70.68, depthKm: 11, hoursAgo: 19, source: 'National Seismology Network (simulated)' },
  { id: 'eq-2026-0810-04', magnitude: 3.4, epicenter: 'Bhachau, Kutch district', lat: 23.29, lng: 70.34, depthKm: 8, hoursAgo: 66, source: 'National Seismology Network (simulated)' },
  { id: 'eq-2026-0808-02', magnitude: 4.1, epicenter: 'Koyna reservoir region', lat: 17.41, lng: 73.75, depthKm: 6, hoursAgo: 118, source: 'National Seismology Network (simulated)' },
  { id: 'eq-2026-0806-11', magnitude: 2.9, epicenter: 'Palghat gap, Kerala–TN border', lat: 10.78, lng: 76.65, depthKm: 14, hoursAgo: 176, source: 'National Seismology Network (simulated)' },
  { id: 'eq-2026-0803-07', magnitude: 5.2, epicenter: 'Andaman Sea, 210 km SSE of Port Blair', lat: 9.92, lng: 93.44, depthKm: 32, hoursAgo: 248, source: 'Regional Tsunami Advisory Centre (simulated)' },
  { id: 'eq-2026-0801-03', magnitude: 3.7, epicenter: 'Latur, Marathwada', lat: 18.41, lng: 76.57, depthKm: 9, hoursAgo: 302, source: 'National Seismology Network (simulated)' },
]

export const earthquakes: EarthquakeEvent[] = QUAKE_SEEDS.map((seed) => {
  const position = { lat: seed.lat, lng: seed.lng }
  const ranked = windFarms
    .map((f) => ({ farm: f, km: haversineKm(position, f.position) }))
    .sort((a, b) => a.km - b.km)
  const nearest = ranked[0]!
  // Inspection radius scales with released energy.
  const radius = seed.magnitude >= 5 ? 260 : seed.magnitude >= 4.5 ? 180 : seed.magnitude >= 4 ? 120 : 60
  const affected = ranked.filter((r) => r.km <= radius).map((r) => r.farm.id)

  const needsInspection = seed.magnitude >= 4.0 && affected.length > 0
  return {
    id: seed.id,
    magnitude: seed.magnitude,
    epicenter: seed.epicenter,
    position,
    depthKm: seed.depthKm,
    occurredAt: hoursAgo(seed.hoursAgo),
    nearestWindFarmId: nearest.farm.id,
    nearestWindFarmName: nearest.farm.name,
    distanceKm: nearest.km,
    affectedSiteIds: affected,
    recommendedInspection: needsInspection
      ? `Level ${seed.magnitude >= 4.5 ? '2' : '1'} structural walk-down of tower base, foundation grout and flange bolt tension on ${affected.length} site${affected.length > 1 ? 's' : ''}.`
      : 'No inspection triggered — ground motion below the structural review threshold.',
    inspectionStatus: needsInspection
      ? seed.hoursAgo > 96
        ? 'complete'
        : seed.hoursAgo > 40
          ? 'in-progress'
          : 'recommended'
      : 'not-required',
    source: seed.source,
  }
})

/* ---------------------------------- Tsunami ---------------------------------- */

export const tsunamiAlerts: TsunamiAlert[] = [
  {
    id: 'tsu-2026-0803-01',
    region: 'Andaman Sea & east Tamil Nadu coast',
    severity: 'advisory',
    issuedAt: hoursAgo(246),
    expectedArrival: hoursAgo(243),
    estimatedWaveHeightM: 0.4,
    coastalSiteIds: ['wf-thoothukudi'],
    recommendedAction:
      'No evacuation required. Confirm coastal substation bunding is clear and hold non-essential jetty movements until the advisory is withdrawn.',
    status: 'expired',
    source: 'Regional Tsunami Advisory Centre (simulated)',
  },
  {
    id: 'tsu-2026-0812-02',
    region: 'Gulf of Mannar & Gulf of Khambhat watch zones',
    severity: 'watch',
    issuedAt: hoursAgo(7),
    expectedArrival: hoursAhead(4),
    estimatedWaveHeightM: 0.9,
    coastalSiteIds: ['wf-thoothukudi', 'wf-muppandal', 'wf-dwarka-coastal'],
    recommendedAction:
      'Suspend shoreline crane and jetty operations. Move field crews above the 6 m contour and confirm roll-call for all coastal sites within 60 minutes.',
    status: 'active',
    source: 'Regional Tsunami Advisory Centre (simulated)',
  },
]

/* ---------------------------------- Cyclones ---------------------------------- */

function buildTrack(
  points: [number, number, number, number][],
  startHoursAgo: number,
  stepHours: number,
  forecastFrom: number,
): CycloneTrackPoint[] {
  return points.map(([lng, lat, wind, _p], i) => ({
    lat,
    lng,
    t: minutesAgo((startHoursAgo - i * stepHours) * 60),
    maxWindKmh: wind,
    forecast: i >= forecastFrom,
  }))
}

export const cyclones: Cyclone[] = [
  {
    id: 'cyc-mandara',
    name: 'Cyclone Mandara',
    category: 'Severe Cyclonic Storm',
    basin: 'Arabian Sea',
    position: { lat: 20.4, lng: 68.1 },
    maxWindKmh: 128,
    pressureHpa: 972,
    movementDeg: 22,
    movementKmh: 17,
    forecastLandfall: hoursAhead(18),
    landfallLocation: 'Between Porbandar and Dwarka, Saurashtra coast',
    impactRadiusKm: 210,
    status: 'active',
    advisory:
      'Sustained winds of 110–130 km/h with gusts to 145 km/h expected along the Saurashtra and Kutch coast. Turbines within the impact radius should be reviewed for controlled shutdown and rotor lock before landfall.',
    sitesInImpactZone: ['wf-dwarka-coastal', 'wf-kutch-horizon', 'wf-bhuj-saline'],
    track: buildTrack(
      [
        [66.2, 14.8, 65, 998],
        [66.6, 16.3, 84, 990],
        [67.1, 17.9, 102, 982],
        [67.6, 19.2, 118, 976],
        [68.1, 20.4, 128, 972],
        [68.7, 21.6, 132, 968],
        [69.3, 22.6, 118, 976],
        [69.9, 23.4, 92, 986],
        [70.6, 24.1, 68, 994],
      ],
      48,
      6,
      5,
    ),
  },
  {
    id: 'cyc-rehani',
    name: 'Cyclone Rehani',
    category: 'Deep Depression',
    basin: 'Bay of Bengal',
    position: { lat: 10.6, lng: 84.2 },
    maxWindKmh: 62,
    pressureHpa: 998,
    movementDeg: 288,
    movementKmh: 12,
    forecastLandfall: hoursAhead(44),
    landfallLocation: 'North Tamil Nadu coast near Cuddalore',
    impactRadiusKm: 160,
    status: 'active',
    advisory:
      'System expected to remain a deep depression. Heavy rainfall and 55–70 km/h gusts likely across the southern Tamil Nadu cluster; crane and blade-handling operations should be re-planned.',
    sitesInImpactZone: ['wf-thoothukudi', 'wf-kayathar'],
    track: buildTrack(
      [
        [88.4, 9.2, 38, 1004],
        [87.1, 9.6, 46, 1002],
        [85.8, 10.1, 54, 1000],
        [84.2, 10.6, 62, 998],
        [82.6, 11.2, 68, 996],
        [81.1, 11.6, 72, 994],
        [79.8, 11.9, 66, 997],
      ],
      36,
      6,
      4,
    ),
  },
  {
    id: 'cyc-tarang',
    name: 'Cyclone Tarang',
    category: 'Cyclonic Storm',
    basin: 'Arabian Sea',
    position: { lat: 17.2, lng: 64.8 },
    maxWindKmh: 34,
    pressureHpa: 1006,
    movementDeg: 305,
    movementKmh: 9,
    forecastLandfall: hoursAhead(96),
    landfallLocation: 'Expected to dissipate over open sea',
    impactRadiusKm: 90,
    status: 'dissipated',
    advisory: 'System has weakened over open water. No impact expected on Indian assets.',
    sitesInImpactZone: [],
    track: buildTrack(
      [
        [68.9, 14.2, 88, 986],
        [67.4, 15.4, 72, 992],
        [66.1, 16.4, 52, 1000],
        [64.8, 17.2, 34, 1006],
      ],
      54,
      8,
      4,
    ),
  },
]

/* ---------------------------------- Lightning ---------------------------------- */

const LIGHTNING_SEEDS: [string, number, number, number][] = [
  ['lt-01', 17.72, 74.18, 412],
  ['lt-02', 17.05, 74.51, 268],
  ['lt-03', 14.36, 76.28, 194],
  ['lt-04', 20.94, 74.55, 121],
  ['lt-05', 23.42, 75.18, 88],
  ['lt-06', 9.05, 77.94, 57],
  ['lt-07', 15.55, 75.49, 143],
]

export const lightningClusters: LightningCluster[] = LIGHTNING_SEEDS.map(([id, lat, lng, strikes]) => {
  const rng = seededRandom(`lightning:${id}`)
  const position = { lat, lng }
  const nearest = windFarms
    .map((f) => ({ farm: f, km: haversineKm(position, f.position) }))
    .sort((a, b) => a.km - b.km)[0]!
  return {
    id,
    position,
    strikeCount: strikes,
    windowMinutes: 60,
    intensity: strikes > 300 ? 'high' : strikes > 130 ? 'moderate' : 'low',
    nearestWindFarmId: nearest.farm.id,
    distanceKm: nearest.km,
    observedAt: minutesAgo(Math.round(between(rng, 4, 55))),
  }
})

/* ------------------------------------ Flood ------------------------------------ */

export const floodZones: FloodRiskZone[] = [
  {
    id: 'fld-krishna',
    region: 'Krishna basin — Sangli & Satara districts',
    position: { lat: 17.15, lng: 74.4 },
    radiusKm: 95,
    riskLevel: 'elevated',
    riverBasin: 'Krishna',
    reservoirLevelPct: 88,
    affectedSiteIds: ['wf-sangli', 'wf-satara'],
    accessRoadsImpacted: 4,
    updatedAt: hoursAgo(2),
    advisory:
      'Koyna and Warna reservoirs above 85% storage with continued upstream rainfall. Two approach roads to Sangli Plateau are single-lane; plan crane movements around the release window.',
  },
  {
    id: 'fld-tapi',
    region: 'Tapi basin — Dhule & Nandurbar districts',
    position: { lat: 21.1, lng: 74.6 },
    radiusKm: 70,
    riskLevel: 'moderate',
    riverBasin: 'Tapi',
    reservoirLevelPct: 71,
    affectedSiteIds: ['wf-dhule'],
    accessRoadsImpacted: 1,
    updatedAt: hoursAgo(5),
    advisory: 'Local nallah crossings may become impassable during high-intensity spells. Site access otherwise unaffected.',
  },
  {
    id: 'fld-tambraparni',
    region: 'Thamirabarani basin — Tirunelveli & Thoothukudi',
    position: { lat: 8.72, lng: 77.9 },
    radiusKm: 60,
    riskLevel: 'moderate',
    riverBasin: 'Thamirabarani',
    reservoirLevelPct: 64,
    affectedSiteIds: ['wf-thoothukudi', 'wf-kayathar'],
    accessRoadsImpacted: 2,
    updatedAt: hoursAgo(3),
    advisory:
      'Risk rises if Cyclone Rehani tracks further south than forecast. Pre-position spares at the Kayathar store before the system approaches.',
  },
  {
    id: 'fld-narmada',
    region: 'Narmada basin — Ratlam & Dhar districts',
    position: { lat: 22.9, lng: 75.2 },
    radiusKm: 80,
    riskLevel: 'low',
    riverBasin: 'Narmada',
    reservoirLevelPct: 52,
    affectedSiteIds: ['wf-ratlam'],
    accessRoadsImpacted: 0,
    updatedAt: hoursAgo(6),
    advisory: 'Storage within seasonal norms. No operational impact expected.',
  },
]

/* ------------------------------ Unified event feed ------------------------------ */

function sevFromMagnitude(m: number): Severity {
  if (m >= 5) return 'critical'
  if (m >= 4.5) return 'high'
  if (m >= 3.5) return 'medium'
  return 'low'
}

export const environmentEvents: EnvironmentEventSummary[] = [
  ...cyclones
    .filter((c) => c.status !== 'dissipated')
    .map<EnvironmentEventSummary>((c) => ({
      id: c.id,
      kind: 'cyclone',
      title: `${c.name} — ${c.category}`,
      severity: c.sitesInImpactZone.length > 2 ? 'critical' : c.sitesInImpactZone.length ? 'high' : 'low',
      position: c.position,
      occurredAt: minutesAgo(35),
      affectedSiteIds: c.sitesInImpactZone,
      detail: `${c.maxWindKmh} km/h sustained · landfall ${c.landfallLocation}`,
    })),
  ...earthquakes.map<EnvironmentEventSummary>((e) => ({
    id: e.id,
    kind: 'earthquake',
    title: `M ${e.magnitude.toFixed(1)} — ${e.epicenter}`,
    severity: sevFromMagnitude(e.magnitude),
    position: e.position,
    occurredAt: e.occurredAt,
    affectedSiteIds: e.affectedSiteIds,
    detail: `${e.depthKm} km depth · ${e.distanceKm} km from ${e.nearestWindFarmName}`,
  })),
  ...tsunamiAlerts
    .filter((t) => t.status === 'active')
    .map<EnvironmentEventSummary>((t) => ({
      id: t.id,
      kind: 'tsunami',
      title: `Tsunami ${t.severity} — ${t.region}`,
      severity: t.severity === 'warning' ? 'critical' : t.severity === 'watch' ? 'high' : 'medium',
      position: { lat: 9.4, lng: 79.2 },
      occurredAt: t.issuedAt,
      affectedSiteIds: t.coastalSiteIds,
      detail: `Estimated wave height ${t.estimatedWaveHeightM} m`,
    })),
  ...floodZones
    .filter((f) => f.riskLevel !== 'low')
    .map<EnvironmentEventSummary>((f) => ({
      id: f.id,
      kind: 'flood',
      title: `Flood risk — ${f.riverBasin} basin`,
      severity: f.riskLevel === 'severe' ? 'critical' : f.riskLevel === 'elevated' ? 'high' : 'medium',
      position: f.position,
      occurredAt: f.updatedAt,
      affectedSiteIds: f.affectedSiteIds,
      detail: `Reservoir storage ${f.reservoirLevelPct}% · ${f.accessRoadsImpacted} access road(s) impacted`,
    })),
  ...lightningClusters
    .filter((l) => l.intensity !== 'low')
    .map<EnvironmentEventSummary>((l) => ({
      id: l.id,
      kind: 'lightning',
      title: `${l.strikeCount} strikes in 60 min`,
      severity: l.intensity === 'high' ? 'high' : 'medium',
      position: l.position,
      occurredAt: l.observedAt,
      affectedSiteIds: l.distanceKm < 40 ? [l.nearestWindFarmId] : [],
      detail: `${l.distanceKm} km from nearest site`,
    })),
].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))

export const environmentSummary = {
  activeAlerts: environmentEvents.filter((e) => e.severity === 'critical' || e.severity === 'high').length,
  sitesUnderWatch: new Set(environmentEvents.flatMap((e) => e.affectedSiteIds)).size,
  activeCyclones: cyclones.filter((c) => c.status === 'active').length,
  seismicEvents14d: earthquakes.length,
  activeTsunamiAdvisories: tsunamiAlerts.filter((t) => t.status === 'active').length,
  strikesLastHour: lightningClusters.reduce((a, b) => a + b.strikeCount, 0),
  basinsElevated: floodZones.filter((f) => f.riskLevel === 'elevated' || f.riskLevel === 'severe').length,
  inspectionsOutstanding: earthquakes.filter(
    (e) => e.inspectionStatus === 'recommended' || e.inspectionStatus === 'scheduled' || e.inspectionStatus === 'in-progress',
  ).length,
}
