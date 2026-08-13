import { PRODUCT_SPECS } from '@/lib/constants'
import {
  between,
  clamp,
  daysAgo,
  daysAhead,
  hoursAgo,
  mean,
  minutesAgo,
  pick,
  seededRandom,
  sum,
} from '@/lib/utils'
import type {
  Alarm,
  ComponentHealth,
  ComponentKey,
  GeoPoint,
  IndianState,
  ProductFamily,
  RiskBand,
  Severity,
  TelemetryPoint,
  Turbine,
  TurbineDetail,
  TurbineStatus,
  WindFarm,
  WindFarmStatus,
} from '@/types'

/* ------------------------------------------------------------------ *
 * Site seeds — fictional wind farm names on real Indian wind districts.
 * ------------------------------------------------------------------ */

interface SiteSeed {
  id: string
  name: string
  code: string
  state: IndianState
  district: string
  customerId: string
  customerName: string
  position: GeoPoint
  turbineCount: number
  products: ProductFamily[]
  status: WindFarmStatus
  commissionedOn: string
  gridSubstation: string
  evacuationVoltageKv: number
  meanWindSpeedMs: number
  heroImage: string
  siteManager: string
  o_and_mContract: string
  contractExpiry: string
  /** Pushes the site toward more faults — used to create believable hot spots. */
  stress: number
  bearingDeg: number
}

const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=72`

export const SITE_SEEDS: SiteSeed[] = [
  {
    id: 'wf-kutch-horizon', name: 'Kutch Horizon Wind Park', code: 'GJ-KTC-01',
    state: 'Gujarat', district: 'Kutch', customerId: 'acc-greengrid', customerName: 'GreenGrid Power Ltd.',
    position: { lat: 23.35, lng: 69.55 }, turbineCount: 42, products: ['S144'], status: 'operational',
    commissionedOn: '2022-03-18', gridSubstation: 'Bhuj 220 kV PGCIL', evacuationVoltageKv: 220,
    meanWindSpeedMs: 7.9, heroImage: IMG('photo-1466611653911-95081537e5b7'),
    siteManager: 'Hitesh Chauhan', o_and_mContract: 'Comprehensive O&M 10yr', contractExpiry: '2032-03-17',
    stress: 0.78, bearingDeg: 246,
  },
  {
    id: 'wf-bhuj-saline', name: 'Bhuj Saline Flats Wind Farm', code: 'GJ-KTC-02',
    state: 'Gujarat', district: 'Kutch', customerId: 'acc-saurashtra', customerName: 'Saurashtra Grid Corporation',
    position: { lat: 23.05, lng: 70.15 }, turbineCount: 36, products: ['S133'], status: 'operational',
    commissionedOn: '2021-11-02', gridSubstation: 'Anjar 220 kV GETCO', evacuationVoltageKv: 220,
    meanWindSpeedMs: 7.4, heroImage: IMG('photo-1548337138-e87d889cc369'),
    siteManager: 'Nirali Vora', o_and_mContract: 'Comprehensive O&M 10yr', contractExpiry: '2031-11-01',
    stress: 0.34, bearingDeg: 238,
  },
  {
    id: 'wf-dwarka-coastal', name: 'Dwarka Coastal Wind Cluster', code: 'GJ-DWK-01',
    state: 'Gujarat', district: 'Devbhumi Dwarka', customerId: 'acc-greengrid', customerName: 'GreenGrid Power Ltd.',
    position: { lat: 22.28, lng: 69.32 }, turbineCount: 30, products: ['S120'], status: 'operational',
    commissionedOn: '2019-07-24', gridSubstation: 'Khambhalia 132 kV GETCO', evacuationVoltageKv: 132,
    meanWindSpeedMs: 7.6, heroImage: IMG('photo-1532601224476-15c79f2f7a51'),
    siteManager: 'Devang Parmar', o_and_mContract: 'Standard O&M 5yr', contractExpiry: '2027-07-23',
    stress: 0.46, bearingDeg: 252,
  },
  {
    id: 'wf-thoothukudi', name: 'Thoothukudi Coastal Wind Cluster', code: 'TN-TTK-01',
    state: 'Tamil Nadu', district: 'Thoothukudi', customerId: 'acc-southcoast', customerName: 'South Coast Utilities',
    position: { lat: 8.85, lng: 78.05 }, turbineCount: 48, products: ['S133', 'S144'], status: 'operational',
    commissionedOn: '2023-01-12', gridSubstation: 'Kayathar 400 kV TANTRANSCO', evacuationVoltageKv: 400,
    meanWindSpeedMs: 8.6, heroImage: IMG('photo-1497435334941-8c899ee9e8e9'),
    siteManager: 'Meena Rajendran', o_and_mContract: 'Full-Scope 15yr', contractExpiry: '2038-01-11',
    stress: 0.62, bearingDeg: 232,
  },
  {
    id: 'wf-kayathar', name: 'Kayathar Ridge Wind Farm', code: 'TN-TNV-01',
    state: 'Tamil Nadu', district: 'Tirunelveli', customerId: 'acc-southcoast', customerName: 'South Coast Utilities',
    position: { lat: 9.18, lng: 77.78 }, turbineCount: 34, products: ['S120'], status: 'operational',
    commissionedOn: '2018-09-05', gridSubstation: 'Kayathar 230 kV TANTRANSCO', evacuationVoltageKv: 230,
    meanWindSpeedMs: 8.9, heroImage: IMG('photo-1519750157634-b6d493a0f77c'),
    siteManager: 'Arulmozhi Pandian', o_and_mContract: 'Standard O&M 5yr', contractExpiry: '2026-09-04',
    stress: 0.41, bearingDeg: 228,
  },
  {
    id: 'wf-muppandal', name: 'Muppandal Gateway Wind Estate', code: 'TN-KNK-01',
    state: 'Tamil Nadu', district: 'Kanniyakumari', customerId: 'acc-aranya', customerName: 'Aranya Renewables',
    position: { lat: 8.26, lng: 77.56 }, turbineCount: 40, products: ['S120', 'S133'], status: 'operational',
    commissionedOn: '2020-06-30', gridSubstation: 'Nagercoil 230 kV TANTRANSCO', evacuationVoltageKv: 230,
    meanWindSpeedMs: 9.4, heroImage: IMG('photo-1473341304170-971dccb5ac1e'),
    siteManager: 'Suresh Thangaraj', o_and_mContract: 'Comprehensive O&M 10yr', contractExpiry: '2030-06-29',
    stress: 0.29, bearingDeg: 244,
  },
  {
    id: 'wf-jaisalmer-ridge', name: 'Jaisalmer Ridge Wind Farm', code: 'RJ-JSM-01',
    state: 'Rajasthan', district: 'Jaisalmer', customerId: 'acc-horizon', customerName: 'Horizon Power Ventures',
    position: { lat: 26.85, lng: 70.95 }, turbineCount: 44, products: ['S144'], status: 'operational',
    commissionedOn: '2023-08-21', gridSubstation: 'Bhadla 765 kV PGCIL', evacuationVoltageKv: 765,
    meanWindSpeedMs: 7.1, heroImage: IMG('photo-1611365892117-00ac5ef43c90'),
    siteManager: 'Mahendra Rathore', o_and_mContract: 'Full-Scope 15yr', contractExpiry: '2038-08-20',
    stress: 0.22, bearingDeg: 268,
  },
  {
    id: 'wf-barmer-desert', name: 'Barmer Desert Wind Park', code: 'RJ-BMR-01',
    state: 'Rajasthan', district: 'Barmer', customerId: 'acc-horizon', customerName: 'Horizon Power Ventures',
    position: { lat: 25.75, lng: 71.4 }, turbineCount: 38, products: ['S144'], status: 'commissioning',
    commissionedOn: '2026-06-15', gridSubstation: 'Barmer 400 kV RVPN', evacuationVoltageKv: 400,
    meanWindSpeedMs: 6.9, heroImage: IMG('photo-1591964006776-90dcd4b53a35'),
    siteManager: 'Kavita Solanki', o_and_mContract: 'Full-Scope 15yr', contractExpiry: '2041-06-14',
    stress: 0.55, bearingDeg: 274,
  },
  {
    id: 'wf-satara', name: 'Satara Highlands Wind Park', code: 'MH-STR-01',
    state: 'Maharashtra', district: 'Satara', customerId: 'acc-meridian', customerName: 'Meridian Industrial Energy',
    position: { lat: 17.65, lng: 74.05 }, turbineCount: 32, products: ['S133'], status: 'operational',
    commissionedOn: '2021-02-14', gridSubstation: 'Karad 220 kV MSETCL', evacuationVoltageKv: 220,
    meanWindSpeedMs: 8.1, heroImage: IMG('photo-1518623489648-a173ef7824f3'),
    siteManager: 'Sameer Kulkarni', o_and_mContract: 'Comprehensive O&M 10yr', contractExpiry: '2031-02-13',
    stress: 0.38, bearingDeg: 256,
  },
  {
    id: 'wf-sangli', name: 'Sangli Plateau Wind Farm', code: 'MH-SNG-01',
    state: 'Maharashtra', district: 'Sangli', customerId: 'acc-meridian', customerName: 'Meridian Industrial Energy',
    position: { lat: 16.95, lng: 74.62 }, turbineCount: 26, products: ['S120'], status: 'operational',
    commissionedOn: '2017-12-08', gridSubstation: 'Sangli 132 kV MSETCL', evacuationVoltageKv: 132,
    meanWindSpeedMs: 7.3, heroImage: IMG('photo-1509391366360-2e959784a276'),
    siteManager: 'Rutuja Patil', o_and_mContract: 'Standard O&M 5yr', contractExpiry: '2026-12-07',
    stress: 0.71, bearingDeg: 262,
  },
  {
    id: 'wf-dhule', name: 'Dhule Wind Corridor', code: 'MH-DHL-01',
    state: 'Maharashtra', district: 'Dhule', customerId: 'acc-aranya', customerName: 'Aranya Renewables',
    position: { lat: 20.85, lng: 74.42 }, turbineCount: 30, products: ['S133'], status: 'operational',
    commissionedOn: '2020-10-19', gridSubstation: 'Dhule 220 kV MSETCL', evacuationVoltageKv: 220,
    meanWindSpeedMs: 7.7, heroImage: IMG('photo-1466611653911-95081537e5b7'),
    siteManager: 'Prashant Ahire', o_and_mContract: 'Comprehensive O&M 10yr', contractExpiry: '2030-10-18',
    stress: 0.33, bearingDeg: 250,
  },
  {
    id: 'wf-chitradurga', name: 'Chitradurga Wind Estate', code: 'KA-CTD-01',
    state: 'Karnataka', district: 'Chitradurga', customerId: 'acc-deccan', customerName: 'Deccan Clean Energy Trust',
    position: { lat: 14.25, lng: 76.4 }, turbineCount: 36, products: ['S133'], status: 'operational',
    commissionedOn: '2022-08-27', gridSubstation: 'Hiriyur 220 kV KPTCL', evacuationVoltageKv: 220,
    meanWindSpeedMs: 7.8, heroImage: IMG('photo-1548337138-e87d889cc369'),
    siteManager: 'Lakshmi Gowda', o_and_mContract: 'Comprehensive O&M 10yr', contractExpiry: '2032-08-26',
    stress: 0.44, bearingDeg: 258,
  },
  {
    id: 'wf-gadag', name: 'Gadag Ridge Wind Farm', code: 'KA-GDG-01',
    state: 'Karnataka', district: 'Gadag', customerId: 'acc-deccan', customerName: 'Deccan Clean Energy Trust',
    position: { lat: 15.42, lng: 75.63 }, turbineCount: 28, products: ['S120'], status: 'operational',
    commissionedOn: '2019-03-11', gridSubstation: 'Gadag 220 kV KPTCL', evacuationVoltageKv: 220,
    meanWindSpeedMs: 7.5, heroImage: IMG('photo-1532601224476-15c79f2f7a51'),
    siteManager: 'Basavaraj Hiremath', o_and_mContract: 'Standard O&M 5yr', contractExpiry: '2027-03-10',
    stress: 0.5, bearingDeg: 254,
  },
  {
    id: 'wf-anantapur', name: 'Anantapur Hybrid Wind Park', code: 'AP-ATP-01',
    state: 'Andhra Pradesh', district: 'Anantapur', customerId: 'acc-meridian', customerName: 'Meridian Industrial Energy',
    position: { lat: 14.65, lng: 77.6 }, turbineCount: 34, products: ['S144'], status: 'construction',
    commissionedOn: '2027-03-31', gridSubstation: 'Kadapa 400 kV APTRANSCO', evacuationVoltageKv: 400,
    meanWindSpeedMs: 7.2, heroImage: IMG('photo-1497435334941-8c899ee9e8e9'),
    siteManager: 'Vasudha Reddy', o_and_mContract: 'Full-Scope 15yr', contractExpiry: '2042-03-30',
    stress: 0.6, bearingDeg: 264,
  },
  {
    id: 'wf-ratlam', name: 'Ratlam Plateau Wind Park', code: 'MP-RTL-01',
    state: 'Madhya Pradesh', district: 'Ratlam', customerId: 'acc-aranya', customerName: 'Aranya Renewables',
    position: { lat: 23.35, lng: 75.05 }, turbineCount: 24, products: ['S133'], status: 'operational',
    commissionedOn: '2021-05-26', gridSubstation: 'Ratlam 220 kV MPPTCL', evacuationVoltageKv: 220,
    meanWindSpeedMs: 6.8, heroImage: IMG('photo-1519750157634-b6d493a0f77c'),
    siteManager: 'Anup Sisodiya', o_and_mContract: 'Comprehensive O&M 10yr', contractExpiry: '2031-05-25',
    stress: 0.27, bearingDeg: 240,
  },
]

const STATE_CODE: Record<IndianState, string> = {
  Gujarat: 'GJ',
  'Tamil Nadu': 'TN',
  Rajasthan: 'RJ',
  Maharashtra: 'MH',
  Karnataka: 'KA',
  'Madhya Pradesh': 'MP',
  'Andhra Pradesh': 'AP',
}

const TOWER_TYPES = ['Tubular steel, 4-section', 'Tubular steel, 5-section', 'Hybrid concrete-steel']

/* ------------------------------- Alarm catalogue ------------------------------- */

const ALARM_CATALOGUE: {
  code: string
  title: string
  description: string
  category: Alarm['category']
  severity: Severity
}[] = [
  { code: 'DRV-2140', title: 'Gearbox oil temperature high', description: 'Gearbox HSS bearing oil temperature exceeded 78 °C for 18 consecutive minutes under partial load.', category: 'Drivetrain', severity: 'high' },
  { code: 'DRV-2318', title: 'Gearbox vibration trend rising', description: 'Intermediate shaft vibration RMS drifted 34% above the 90-day baseline.', category: 'Drivetrain', severity: 'medium' },
  { code: 'GEN-3105', title: 'Generator winding temperature high', description: 'Phase-U stator winding temperature crossed the 145 °C warning threshold.', category: 'Electrical', severity: 'high' },
  { code: 'GEN-3312', title: 'Slip-ring brush wear limit', description: 'Brush wear sensor reports remaining life below 12%.', category: 'Electrical', severity: 'medium' },
  { code: 'CNV-4022', title: 'Converter IGBT fault', description: 'Grid-side converter tripped on IGBT desaturation; turbine stopped and locked out.', category: 'Electrical', severity: 'critical' },
  { code: 'PIT-5006', title: 'Pitch battery capacity low', description: 'Blade C pitch back-up battery capacity below safe emergency-feather margin.', category: 'Control', severity: 'high' },
  { code: 'PIT-5140', title: 'Pitch angle deviation', description: 'Blade A pitch angle deviates 2.4° from the collective set point.', category: 'Control', severity: 'medium' },
  { code: 'YAW-6011', title: 'Yaw misalignment sustained', description: 'Nacelle yaw error averaged 9.6° over 6 hours, costing measurable yield.', category: 'Control', severity: 'low' },
  { code: 'BLD-7203', title: 'Blade leading-edge erosion flagged', description: 'Drone inspection classified erosion at category 3 on blade B outboard section.', category: 'Structural', severity: 'medium' },
  { code: 'TWR-7501', title: 'Tower oscillation above threshold', description: 'Fore-aft tower acceleration exceeded design envelope during a gust front.', category: 'Structural', severity: 'high' },
  { code: 'GRD-8100', title: 'Grid voltage out of band', description: 'Point-of-connection voltage sustained above 1.08 pu; turbine curtailed by controller.', category: 'Grid', severity: 'medium' },
  { code: 'GRD-8205', title: 'Grid dispatch curtailment', description: 'SLDC instruction limiting site output; turbines held at reduced set point.', category: 'Grid', severity: 'low' },
  { code: 'ENV-9004', title: 'Extreme wind shutdown', description: 'Ten-minute mean wind exceeded 25 m/s cut-out; controlled shutdown executed.', category: 'Environmental', severity: 'high' },
  { code: 'ENV-9110', title: 'Icing detection active', description: 'Blade ice-detection algorithm triggered; de-rate applied pending inspection.', category: 'Environmental', severity: 'medium' },
  { code: 'CNV-4180', title: 'Communication loss to SCADA', description: 'Turbine controller unreachable for 42 minutes; last known state was producing.', category: 'Control', severity: 'critical' },
]

/* --------------------------------- Generation --------------------------------- */

const STATUS_WEIGHTS: { status: TurbineStatus; base: number; stressed: number }[] = [
  { status: 'running', base: 0.86, stressed: 0.66 },
  { status: 'standby', base: 0.055, stressed: 0.07 },
  { status: 'curtailment', base: 0.03, stressed: 0.05 },
  { status: 'maintenance', base: 0.025, stressed: 0.07 },
  { status: 'alarm', base: 0.02, stressed: 0.09 },
  { status: 'offline', base: 0.01, stressed: 0.06 },
]

function chooseStatus(rng: () => number, stress: number, siteStatus: WindFarmStatus): TurbineStatus {
  if (siteStatus === 'construction') return 'offline'
  if (siteStatus === 'commissioning') {
    const r = rng()
    if (r < 0.42) return 'running'
    if (r < 0.6) return 'standby'
    if (r < 0.86) return 'maintenance'
    return 'offline'
  }
  const roll = rng()
  let acc = 0
  for (const w of STATUS_WEIGHTS) {
    acc += w.base + (w.stressed - w.base) * stress
    if (roll < acc) return w.status
  }
  return 'running'
}

/** Simplified power curve — cubic build-up to rated, flat to cut-out. */
function powerAt(product: ProductFamily, windMs: number) {
  const spec = PRODUCT_SPECS[product]
  const ratedKw = spec.ratedCapacityMw * 1000
  if (windMs < spec.cutInMs || windMs >= spec.cutOutMs) return 0
  if (windMs >= spec.ratedWindMs) return ratedKw
  const frac = (windMs - spec.cutInMs) / (spec.ratedWindMs - spec.cutInMs)
  return Math.round(ratedKw * frac ** 3)
}

function windAtSite(rng: () => number, meanWind: number) {
  // Weibull-ish spread around the site mean.
  const u = Math.max(rng(), 0.0001)
  const w = meanWind * Math.pow(-Math.log(u), 1 / 2.1) * 0.92
  return Math.round(clamp(w, 0.4, 26.5) * 10) / 10
}

function buildTurbinesForSite(seed: SiteSeed): Turbine[] {
  const rng = seededRandom(`turbines:${seed.id}`)
  const turbines: Turbine[] = []
  const cols = Math.ceil(Math.sqrt(seed.turbineCount * 1.6))
  const rows = Math.ceil(seed.turbineCount / cols)
  // Rows run perpendicular to the prevailing wind bearing.
  const theta = ((seed.bearingDeg + 90) * Math.PI) / 180
  const rowSpacing = 0.0125
  const colSpacing = 0.0072

  for (let i = 0; i < seed.turbineCount; i++) {
    const r = Math.floor(i / cols)
    const c = i % cols
    const jitterA = (rng() - 0.5) * 0.0022
    const jitterB = (rng() - 0.5) * 0.0022
    const dx = (c - (cols - 1) / 2) * colSpacing + jitterA
    const dy = (r - (rows - 1) / 2) * rowSpacing + jitterB
    const lng = seed.position.lng + dx * Math.cos(theta) - dy * Math.sin(theta)
    const lat = seed.position.lat + dx * Math.sin(theta) + dy * Math.cos(theta)

    const product = seed.products[i % seed.products.length] as ProductFamily
    const spec = PRODUCT_SPECS[product]
    const status = chooseStatus(rng, seed.stress, seed.status)
    const windSpeedMs = windAtSite(rng, seed.meanWindSpeedMs)

    let currentPowerKw = powerAt(product, windSpeedMs)
    if (status === 'offline' || status === 'maintenance') currentPowerKw = 0
    else if (status === 'standby') currentPowerKw = 0
    else if (status === 'curtailment') currentPowerKw = Math.round(currentPowerKw * between(rng, 0.28, 0.6, 2))
    else if (status === 'alarm') currentPowerKw = Math.round(currentPowerKw * between(rng, 0.35, 0.82, 2))

    const stressPenalty = seed.stress * between(rng, 2, 11, 1)
    const availabilityPct =
      status === 'offline'
        ? between(rng, 61, 79, 1)
        : status === 'alarm'
          ? between(rng, 82, 92, 1)
          : clamp(between(rng, 95.4, 99.6, 1) - stressPenalty * 0.25, 88, 99.8)

    const healthScore = clamp(
      Math.round(
        (status === 'offline' ? 52 : status === 'alarm' ? 66 : status === 'maintenance' ? 79 : 91) +
          between(rng, -7, 8) -
          stressPenalty * 0.6,
      ),
      31,
      99,
    )

    const needsAlarm = status === 'alarm' || status === 'offline'
    const catalogue = needsAlarm
      ? pick(
          rng,
          status === 'offline'
            ? ALARM_CATALOGUE.filter((a) => a.severity === 'critical' || a.severity === 'high')
            : ALARM_CATALOGUE.filter((a) => a.severity !== 'critical'),
        )
      : null

    const idx = String(i + 1).padStart(4, '0')
    const commissionYear = Number(seed.commissionedOn.slice(0, 4))
    const ageYears = clamp(2026 - commissionYear, 0, 12)

    const generation24h = Array.from({ length: 24 }, (_, h) => {
      const diurnal = 0.72 + 0.36 * Math.sin(((h - 4) / 24) * Math.PI * 2)
      const w = windAtSite(rng, seed.meanWindSpeedMs * diurnal)
      const p = powerAt(product, w)
      return status === 'offline' && h > 17 ? 0 : Math.round(p * between(rng, 0.9, 1.0, 3))
    })

    turbines.push({
      id: `t-${seed.code.toLowerCase()}-${idx}`,
      name: `SWT-${product}-${STATE_CODE[seed.state]}-${idx}`,
      windFarmId: seed.id,
      windFarmName: seed.name,
      state: seed.state,
      customerId: seed.customerId,
      customerName: seed.customerName,
      product,
      capacityMw: spec.ratedCapacityMw,
      status,
      currentPowerKw,
      windSpeedMs,
      windDirectionDeg: Math.round(seed.bearingDeg + between(rng, -22, 22)),
      rotorRpm:
        currentPowerKw > 0 ? between(rng, 7.4, 14.2, 1) : status === 'standby' ? between(rng, 0.4, 2.1, 1) : 0,
      availabilityPct,
      capacityFactorPct: between(rng, 21, 44, 1),
      healthScore,
      position: { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 },
      elevationM: Math.round(between(rng, 24, 940)),
      commissionedOn: seed.commissionedOn,
      warrantyUntil: `${commissionYear + 5}-${seed.commissionedOn.slice(5)}`,
      lastMaintenance: daysAgo(Math.round(between(rng, 12, 210))),
      nextMaintenance: daysAhead(Math.round(between(rng, -9, 160))),
      operatingHours: Math.round(ageYears * 8760 * between(rng, 0.82, 0.97, 3)),
      lifetimeGenerationMwh: Math.round(ageYears * spec.ratedCapacityMw * 8760 * between(rng, 0.22, 0.36, 3)),
      activeAlarm: catalogue ? `${catalogue.code} · ${catalogue.title}` : null,
      alarmSeverity: catalogue ? catalogue.severity : null,
      generation24h,
      serialNumber: `SZ${commissionYear}${STATE_CODE[seed.state]}${idx}${Math.round(between(rng, 10, 99))}`,
      towerType: pick(rng, TOWER_TYPES),
    })
  }
  return turbines
}

export const turbines: Turbine[] = SITE_SEEDS.flatMap(buildTurbinesForSite)

const turbineById = new Map(turbines.map((t) => [t.id, t]))
const turbinesBySite = new Map<string, Turbine[]>()
for (const t of turbines) {
  const list = turbinesBySite.get(t.windFarmId) ?? []
  list.push(t)
  turbinesBySite.set(t.windFarmId, list)
}

export function getTurbine(id: string) {
  return turbineById.get(id)
}
export function getTurbinesForSite(siteId: string) {
  return turbinesBySite.get(siteId) ?? []
}

/* --------------------------------- Wind farms --------------------------------- */

function riskBandFor(score: number): RiskBand {
  if (score >= 72) return 'severe'
  if (score >= 52) return 'elevated'
  if (score >= 30) return 'moderate'
  return 'low'
}

function boundaryFor(seed: SiteSeed, siteTurbines: Turbine[]): GeoPoint[] {
  const lats = siteTurbines.map((t) => t.position.lat)
  const lngs = siteTurbines.map((t) => t.position.lng)
  const pad = 0.012
  const minLat = Math.min(...lats) - pad
  const maxLat = Math.max(...lats) + pad
  const minLng = Math.min(...lngs) - pad
  const maxLng = Math.max(...lngs) + pad
  const cx = (minLng + maxLng) / 2
  const cy = (minLat + maxLat) / 2
  const rx = (maxLng - minLng) / 2
  const ry = (maxLat - minLat) / 2
  const rng = seededRandom(`boundary:${seed.id}`)
  // Softly irregular hull so site envelopes never read as plain rectangles.
  return Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2
    const wobble = 0.86 + rng() * 0.24
    return {
      lng: Math.round((cx + Math.cos(a) * rx * wobble) * 1e5) / 1e5,
      lat: Math.round((cy + Math.sin(a) * ry * wobble) * 1e5) / 1e5,
    }
  })
}

export const windFarms: WindFarm[] = SITE_SEEDS.map((seed) => {
  const rng = seededRandom(`site:${seed.id}`)
  const siteTurbines = getTurbinesForSite(seed.id)
  const installedMw = Math.round(sum(siteTurbines.map((t) => t.capacityMw)) * 10) / 10
  const currentGenerationMw = Math.round(sum(siteTurbines.map((t) => t.currentPowerKw)) / 100) / 10
  const availabilityPct = Math.round(mean(siteTurbines.map((t) => t.availabilityPct)) * 10) / 10
  const alerts = siteTurbines.filter((t) => t.status === 'alarm' || t.status === 'offline').length
  const offline = siteTurbines.filter((t) => t.status === 'offline').length

  const riskScore = Math.round(
    clamp(seed.stress * 58 + offline * 3.4 + alerts * 1.5 + between(rng, -5, 7), 6, 94),
  )

  const generation24h = Array.from({ length: 24 }, (_, h) =>
    Math.round(sum(siteTurbines.map((t) => t.generation24h[h] ?? 0)) / 100) / 10,
  )

  const availability30d = Array.from({ length: 30 }, (_, d) =>
    Math.round(clamp(availabilityPct + Math.sin(d / 3.4) * 2.1 + between(rng, -1.6, 1.4, 2), 78, 100) * 10) / 10,
  )

  return {
    id: seed.id,
    name: seed.name,
    code: seed.code,
    state: seed.state,
    district: seed.district,
    customerId: seed.customerId,
    customerName: seed.customerName,
    status: seed.status,
    position: seed.position,
    installedMw,
    turbineCount: siteTurbines.length,
    products: seed.products,
    availabilityPct,
    currentGenerationMw,
    generationTodayMwh: Math.round(sum(generation24h) * 10) / 10,
    generationMtdGwh: Math.round(sum(generation24h) * 13 * between(rng, 0.85, 1.08, 3)) / 1000,
    plfPct: Math.round((currentGenerationMw / Math.max(installedMw, 1)) * 1000) / 10,
    riskScore,
    riskBand: riskBandFor(riskScore),
    activeAlerts: alerts,
    openWorkOrders: Math.round(between(rng, 2, 14)),
    commissionedOn: seed.commissionedOn,
    gridSubstation: seed.gridSubstation,
    evacuationVoltageKv: seed.evacuationVoltageKv,
    landAreaHectares: Math.round(siteTurbines.length * between(rng, 7.2, 11.4, 1)),
    meanWindSpeedMs: seed.meanWindSpeedMs,
    heroImage: seed.heroImage,
    boundary: boundaryFor(seed, siteTurbines),
    siteManager: seed.siteManager,
    o_and_mContract: seed.o_and_mContract,
    contractExpiry: seed.contractExpiry,
    generation24h,
    availability30d,
  }
})

const windFarmById = new Map(windFarms.map((w) => [w.id, w]))
export function getWindFarm(id: string) {
  return windFarmById.get(id)
}

/* ----------------------------------- Alarms ----------------------------------- */

export const alarms: Alarm[] = turbines
  .filter((t) => t.activeAlarm)
  .map((t, i) => {
    const rng = seededRandom(`alarm:${t.id}`)
    const code = t.activeAlarm!.split(' · ')[0] as string
    const entry = ALARM_CATALOGUE.find((a) => a.code === code) ?? ALARM_CATALOGUE[0]!
    const raisedMinutes = Math.round(between(rng, 12, 3400))
    const acknowledged = rng() > 0.36
    return {
      id: `alm-${String(i + 1).padStart(4, '0')}`,
      turbineId: t.id,
      turbineName: t.name,
      windFarmId: t.windFarmId,
      code: entry.code,
      title: entry.title,
      description: entry.description,
      severity: t.status === 'offline' ? (rng() > 0.45 ? 'critical' : 'high') : entry.severity,
      raisedAt: minutesAgo(raisedMinutes),
      acknowledgedAt: acknowledged ? minutesAgo(Math.round(raisedMinutes * 0.6)) : null,
      clearedAt: null,
      category: entry.category,
      downtimeMinutes: t.status === 'offline' ? raisedMinutes : Math.round(raisedMinutes * 0.22),
    } satisfies Alarm
  })

export function getAlarmsForSite(siteId: string) {
  return alarms.filter((a) => a.windFarmId === siteId)
}

/* ------------------------------ Turbine deep detail ------------------------------ */

const COMPONENT_META: { key: ComponentKey; label: string; notes: string[] }[] = [
  { key: 'rotor', label: 'Rotor & hub', notes: ['Hub bolt torque within spec at last audit.', 'Rotor imbalance index stable across the quarter.'] },
  { key: 'blades', label: 'Blades', notes: ['Leading-edge protection intact on all three blades.', 'Category 2 erosion logged on blade B outboard.'] },
  { key: 'gearbox', label: 'Gearbox', notes: ['Oil particle count trending upward since May.', 'HSS bearing temperature within the normal band.'] },
  { key: 'generator', label: 'Generator', notes: ['Winding insulation resistance healthy.', 'Slip-ring brush wear at 34% of service life.'] },
  { key: 'bearings', label: 'Main bearing', notes: ['Grease consumption nominal.', 'Envelope-band vibration slightly elevated.'] },
  { key: 'tower', label: 'Tower & foundation', notes: ['Flange bolt tension verified at last structural inspection.', 'No grout cracking observed at the base ring.'] },
  { key: 'yaw', label: 'Yaw system', notes: ['Yaw drive current draw even across all six motors.', 'Brake pad thickness above the replacement limit.'] },
  { key: 'pitch', label: 'Pitch system', notes: ['Back-up battery capacity healthy on all axes.', 'Blade A pitch offset corrected during the last service.'] },
  { key: 'converter', label: 'Converter', notes: ['Cooling loop delta-T within design.', 'DC-link capacitor ripple nominal.'] },
  { key: 'sensors', label: 'Sensors & control', notes: ['Anemometer calibration valid for another 9 months.', 'Redundant wind vane reporting consistently.'] },
]

function buildComponents(t: Turbine): ComponentHealth[] {
  const rng = seededRandom(`components:${t.id}`)
  return COMPONENT_META.map((meta) => {
    const weak = t.activeAlarm?.toLowerCase().includes(meta.key) ?? false
    const base = clamp(t.healthScore + between(rng, -12, 12) - (weak ? 22 : 0), 24, 99)
    const history = Array.from({ length: 12 }, (_, i) =>
      Math.round(clamp(base + (11 - i) * between(rng, -0.9, 1.3, 2) + between(rng, -2, 2, 1), 20, 100)),
    ).reverse()
    const delta = (history[11] ?? base) - (history[0] ?? base)
    return {
      key: meta.key,
      label: meta.label,
      score: Math.round(base),
      trend: {
        direction: delta > 1.2 ? 'up' : delta < -1.2 ? 'down' : 'flat',
        valuePct: Math.abs(Math.round(delta * 10) / 10),
        upIsGood: true,
      },
      lastInspection: daysAgo(Math.round(between(rng, 8, 240))),
      note: pick(rng, meta.notes),
      history,
    }
  })
}

function buildTelemetry(t: Turbine): TelemetryPoint[] {
  const rng = seededRandom(`telemetry:${t.id}`)
  const points: TelemetryPoint[] = []
  for (let i = 47; i >= 0; i--) {
    const diurnal = 0.78 + 0.3 * Math.sin(((47 - i - 6) / 24) * Math.PI * 2)
    const wind = windAtSite(rng, t.windSpeedMs * diurnal + 0.6)
    const producing = t.status !== 'offline' && t.status !== 'maintenance'
    const power = producing ? powerAt(t.product, wind) : 0
    const load = power / (t.capacityMw * 1000)
    points.push({
      t: minutesAgo(i * 30),
      windSpeed: wind,
      power: Math.round(power),
      rotorRpm: producing && power > 0 ? Math.round(clamp(4 + load * 10.5, 0, 15) * 10) / 10 : 0,
      pitchAngle: Math.round(clamp(power >= t.capacityMw * 1000 ? 8 + load * 12 : 1.2, 0, 28) * 10) / 10,
      nacelleTemp: Math.round((26 + load * 18 + between(rng, -2, 2, 1)) * 10) / 10,
      gearboxTemp: Math.round((44 + load * 32 + between(rng, -3, 4, 1)) * 10) / 10,
      generatorTemp: Math.round((52 + load * 62 + between(rng, -4, 5, 1)) * 10) / 10,
      vibration: Math.round((0.9 + load * 1.6 + between(rng, -0.2, 0.35, 2)) * 100) / 100,
    })
  }
  return points
}

const MAINT_SUMMARIES: Record<string, string[]> = {
  preventive: ['6-monthly service — filters, greasing, torque audit', 'Annual service — full drivetrain and pitch inspection'],
  predictive: ['CMS-triggered gearbox borescope inspection', 'Vibration-led main bearing re-grease and re-baseline'],
  corrective: ['Pitch battery pack replacement, all three axes', 'Yaw brake pad replacement and calibration'],
  breakdown: ['Converter IGBT module replacement after trip', 'Emergency restart following controller communication loss'],
  inspection: ['Drone blade inspection — full three-blade survey', 'Post-seismic structural inspection of tower and foundation'],
}

const TECH_NAMES = [
  'Karthik Selvam', 'Imran Sheikh', 'Rohit Bansal', 'Naveen Kumar', 'Pooja Deshmukh',
  'Sathish Murugan', 'Jignesh Bhatt', 'Anil Yadav', 'Manoj Pawar', 'Deepa Krishnan',
]

export function getTurbineDetail(id: string): TurbineDetail | undefined {
  const t = turbineById.get(id)
  if (!t) return undefined
  const rng = seededRandom(`detail:${id}`)
  const spec = PRODUCT_SPECS[t.product]

  const powerCurve = Array.from({ length: 26 }, (_, i) => {
    const ws = i
    const expected = powerAt(t.product, ws)
    const measured =
      ws >= spec.cutInMs && ws <= 22 && t.status !== 'offline' && t.status !== 'maintenance'
        ? Math.round(expected * between(rng, t.healthScore > 82 ? 0.955 : 0.87, 1.02, 3))
        : null
    return { windSpeed: ws, expectedKw: expected, actualKw: measured }
  })

  const historyCount = Math.round(between(rng, 4, 9))
  const maintenanceHistory = Array.from({ length: historyCount }, (_, i) => {
    const type = pick(rng, ['preventive', 'preventive', 'predictive', 'corrective', 'breakdown', 'inspection'] as const)
    return {
      id: `mh-${t.id}-${i}`,
      date: daysAgo(Math.round(between(rng, 20, 900)) + i * 40),
      type,
      summary: pick(rng, MAINT_SUMMARIES[type]!),
      technician: pick(rng, TECH_NAMES),
      hours: between(rng, 1.5, 14, 1),
    }
  }).sort((a, b) => (a.date < b.date ? 1 : -1))

  const closedCount = Math.round(between(rng, 2, 6))
  const alarmHistory: Alarm[] = [
    ...alarms.filter((a) => a.turbineId === t.id),
    ...Array.from({ length: closedCount }, (_, i) => {
      const entry = pick(rng, ALARM_CATALOGUE)
      const raised = Math.round(between(rng, 2000, 60000)) + i * 900
      return {
        id: `alm-h-${t.id}-${i}`,
        turbineId: t.id,
        turbineName: t.name,
        windFarmId: t.windFarmId,
        code: entry.code,
        title: entry.title,
        description: entry.description,
        severity: entry.severity,
        raisedAt: minutesAgo(raised),
        acknowledgedAt: minutesAgo(raised - 30),
        clearedAt: minutesAgo(raised - Math.round(between(rng, 60, 900))),
        category: entry.category,
        downtimeMinutes: Math.round(between(rng, 20, 720)),
      } satisfies Alarm
    }),
  ].sort((a, b) => (a.raisedAt < b.raisedAt ? 1 : -1))

  const siblings = getTurbinesForSite(t.windFarmId)
    .filter((s) => s.id !== t.id)
    .slice(0, 12)
    .map((s) => ({ id: s.id, name: s.name, status: s.status, healthScore: s.healthScore }))

  return {
    ...t,
    components: buildComponents(t),
    telemetry: buildTelemetry(t),
    alarmHistory,
    maintenanceHistory,
    powerCurve,
    siblings,
  }
}

/* --------------------------------- Aggregates --------------------------------- */

export const fleetTotals = {
  installedMw: Math.round(sum(windFarms.map((w) => w.installedMw)) * 10) / 10,
  turbineCount: turbines.length,
  siteCount: windFarms.length,
  customerCount: new Set(windFarms.map((w) => w.customerId)).size,
}

export { ALARM_CATALOGUE, powerAt, STATE_CODE }
export type { SiteSeed }
