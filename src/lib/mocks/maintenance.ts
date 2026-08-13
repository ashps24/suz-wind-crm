import { between, clamp, daysAgo, daysAhead, hoursAgo, hoursAhead, minutesAgo, pick, seededRandom } from '@/lib/utils'
import { alarms, getTurbinesForSite, turbines, windFarms } from './fleet'
import type {
  ChecklistItem,
  IndianState,
  PartLine,
  Severity,
  Technician,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderType,
} from '@/types'

/* -------------------------------- Technicians -------------------------------- */

interface TechSeed {
  id: string
  name: string
  role: string
  homeBase: string
  state: IndianState
  siteId: string
  certification: string[]
  years: number
}

const TECH_SEEDS: TechSeed[] = [
  { id: 'tech-01', name: 'Karthik Selvam', role: 'Senior Service Technician', homeBase: 'Thoothukudi Service Hub', state: 'Tamil Nadu', siteId: 'wf-thoothukudi', certification: ['GWO BST', 'GWO BTT', 'Blade Repair L2'], years: 9 },
  { id: 'tech-02', name: 'Imran Sheikh', role: 'Drivetrain Specialist', homeBase: 'Bhuj Service Hub', state: 'Gujarat', siteId: 'wf-kutch-horizon', certification: ['GWO BST', 'Gearbox Endoscopy', 'LOTO Authorised'], years: 12 },
  { id: 'tech-03', name: 'Pooja Deshmukh', role: 'Electrical Technician', homeBase: 'Satara Service Hub', state: 'Maharashtra', siteId: 'wf-satara', certification: ['GWO BST', 'HV Switching', 'Converter L3'], years: 6 },
  { id: 'tech-04', name: 'Naveen Kumar', role: 'Service Technician', homeBase: 'Chitradurga Service Hub', state: 'Karnataka', siteId: 'wf-chitradurga', certification: ['GWO BST', 'GWO ART'], years: 4 },
  { id: 'tech-05', name: 'Jignesh Bhatt', role: 'Lead Technician', homeBase: 'Bhuj Service Hub', state: 'Gujarat', siteId: 'wf-bhuj-saline', certification: ['GWO BST', 'GWO BTT', 'LOTO Authorised'], years: 11 },
  { id: 'tech-06', name: 'Sathish Murugan', role: 'Blade Inspector', homeBase: 'Nagercoil Service Hub', state: 'Tamil Nadu', siteId: 'wf-muppandal', certification: ['GWO BST', 'Rope Access L2', 'Drone Pilot'], years: 8 },
  { id: 'tech-07', name: 'Anil Yadav', role: 'Service Technician', homeBase: 'Jaisalmer Service Hub', state: 'Rajasthan', siteId: 'wf-jaisalmer-ridge', certification: ['GWO BST', 'GWO ART'], years: 5 },
  { id: 'tech-08', name: 'Deepa Krishnan', role: 'Condition Monitoring Engineer', homeBase: 'Coimbatore ROCC', state: 'Tamil Nadu', siteId: 'wf-kayathar', certification: ['CAT-II Vibration', 'GWO BST'], years: 7 },
  { id: 'tech-09', name: 'Manoj Pawar', role: 'Senior Service Technician', homeBase: 'Sangli Service Hub', state: 'Maharashtra', siteId: 'wf-sangli', certification: ['GWO BST', 'GWO BTT', 'Hydraulics L2'], years: 10 },
  { id: 'tech-10', name: 'Rohit Bansal', role: 'Commissioning Engineer', homeBase: 'Barmer Project Office', state: 'Rajasthan', siteId: 'wf-barmer-desert', certification: ['GWO BST', 'HV Switching', 'Grid Compliance'], years: 9 },
  { id: 'tech-11', name: 'Basavaraj Hiremath', role: 'Service Technician', homeBase: 'Gadag Service Hub', state: 'Karnataka', siteId: 'wf-gadag', certification: ['GWO BST'], years: 3 },
  { id: 'tech-12', name: 'Prashant Ahire', role: 'Lead Technician', homeBase: 'Dhule Service Hub', state: 'Maharashtra', siteId: 'wf-dhule', certification: ['GWO BST', 'GWO BTT', 'LOTO Authorised'], years: 13 },
  { id: 'tech-13', name: 'Devang Parmar', role: 'Service Technician', homeBase: 'Khambhalia Service Hub', state: 'Gujarat', siteId: 'wf-dwarka-coastal', certification: ['GWO BST', 'GWO ART'], years: 6 },
  { id: 'tech-14', name: 'Anup Sisodiya', role: 'Service Technician', homeBase: 'Ratlam Service Hub', state: 'Madhya Pradesh', siteId: 'wf-ratlam', certification: ['GWO BST'], years: 4 },
  { id: 'tech-15', name: 'Vasudha Reddy', role: 'Erection Supervisor', homeBase: 'Anantapur Project Office', state: 'Andhra Pradesh', siteId: 'wf-anantapur', certification: ['GWO BST', 'Crane Signalling', 'Rigging L3'], years: 14 },
]

const TECH_STATUSES: Technician['status'][] = ['on-site', 'travelling', 'available', 'on-site', 'available', 'off-shift']

export const technicians: Technician[] = TECH_SEEDS.map((seed, i) => {
  const rng = seededRandom(`tech:${seed.id}`)
  const site = windFarms.find((w) => w.id === seed.siteId)!
  const status = TECH_STATUSES[i % TECH_STATUSES.length]!
  const spread = status === 'on-site' ? 0.03 : status === 'travelling' ? 0.45 : 0.22
  return {
    id: seed.id,
    name: seed.name,
    role: seed.role,
    avatar: '',
    phone: `+91 ${Math.round(between(rng, 70, 99))}${Math.round(between(rng, 10000000, 99999999))}`,
    certification: seed.certification,
    homeBase: seed.homeBase,
    state: seed.state,
    status,
    position: {
      lat: Math.round((site.position.lat + between(rng, -spread, spread, 4)) * 1e4) / 1e4,
      lng: Math.round((site.position.lng + between(rng, -spread, spread, 4)) * 1e4) / 1e4,
    },
    currentWorkOrderId: null,
    jobsToday: Math.round(between(rng, 1, 5)),
    jobsCompletedToday: 0,
    utilisationPct: Math.round(between(rng, 62, 96)),
    yearsExperience: seed.years,
  }
})

/* -------------------------------- Work orders -------------------------------- */

const SAFETY_NOTES: Record<string, string[]> = {
  base: [
    'Confirm LOTO applied at the tower base panel before ascent.',
    'Two-person rule in force — no solo nacelle entry.',
    'Verify rescue kit and evacuation device are within inspection date.',
  ],
  hv: [
    'HV switching authorisation required — coordinate with the substation operator.',
    'Prove dead and apply earths before opening the converter cabinet.',
  ],
  weather: [
    'Do not ascend if 10-minute mean wind exceeds 18 m/s at hub height.',
    'Suspend work on lightning warning within 15 km of the site.',
  ],
  crane: [
    'Exclusion zone of 1.5 × tower height for all lifting operations.',
    'Confirm ground bearing pressure certificate before crane set-up.',
  ],
}

const WO_TEMPLATES: {
  type: WorkOrderType
  title: string
  description: string
  hours: number
  checklist: string[]
  parts: { sku: string; name: string; qty: number; unit: string }[]
  safety: (keyof typeof SAFETY_NOTES)[]
}[] = [
  {
    type: 'preventive',
    title: '6-monthly scheduled service',
    description:
      'Routine half-yearly service: lubrication circuit check, bolt torque audit on the tower flanges, filter replacement and control-cabinet inspection.',
    hours: 6,
    checklist: [
      'Isolate turbine and apply LOTO',
      'Inspect and top up gearbox oil level',
      'Replace offline filtration cartridge',
      'Torque-audit tower flange bolt sample (10%)',
      'Grease main bearing and yaw ring',
      'Inspect pitch battery packs on all three axes',
      'Verify emergency-stop circuit function',
      'Clean and inspect control cabinet, log cabinet temperature',
      'Restore turbine and confirm grid synchronisation',
    ],
    parts: [
      { sku: 'FLT-GX-0032', name: 'Gearbox offline filter cartridge', qty: 1, unit: 'ea' },
      { sku: 'LUB-EP2-05', name: 'EP2 lithium grease cartridge', qty: 6, unit: 'ea' },
      { sku: 'SEA-KIT-118', name: 'Service seal kit', qty: 1, unit: 'kit' },
    ],
    safety: ['base', 'weather'],
  },
  {
    type: 'predictive',
    title: 'CMS-triggered gearbox borescope inspection',
    description:
      'Condition-monitoring flagged a rising intermediate-shaft vibration signature. Borescope the HSS and IMS stages, sample oil for particle count and re-baseline the CMS channel.',
    hours: 5,
    checklist: [
      'Isolate turbine and apply LOTO',
      'Draw oil sample for laboratory particle analysis',
      'Borescope HSS bearing races and gear flanks',
      'Photograph all findings for the asset record',
      'Re-baseline CMS envelope channel',
      'Upload inspection report and close the CMS trigger',
    ],
    parts: [
      { sku: 'OIL-SMP-KIT', name: 'Oil sampling kit', qty: 2, unit: 'ea' },
      { sku: 'BOR-CONSUM', name: 'Borescope consumable set', qty: 1, unit: 'kit' },
    ],
    safety: ['base'],
  },
  {
    type: 'corrective',
    title: 'Pitch battery pack replacement',
    description:
      'Blade C pitch back-up battery capacity has fallen below the emergency-feather margin. Replace all three packs as a set and run an emergency-feather validation.',
    hours: 7,
    checklist: [
      'Isolate turbine and apply LOTO',
      'Discharge and remove existing pitch battery packs',
      'Install replacement packs and torque terminals to spec',
      'Run emergency-feather validation on all three axes',
      'Record capacity test results against the asset record',
      'Dispose of removed packs per hazardous-waste procedure',
    ],
    parts: [
      { sku: 'BAT-PCH-24V', name: 'Pitch back-up battery pack 24 V', qty: 3, unit: 'ea' },
      { sku: 'TRM-KIT-09', name: 'Terminal hardware kit', qty: 1, unit: 'kit' },
    ],
    safety: ['base', 'hv'],
  },
  {
    type: 'breakdown',
    title: 'Converter IGBT module replacement',
    description:
      'Grid-side converter tripped on IGBT desaturation and locked out. Replace the affected module, verify the DC-link and gate-driver circuits, then restore to service.',
    hours: 9,
    checklist: [
      'Isolate turbine, prove dead and apply earths',
      'Download converter fault log',
      'Replace faulted IGBT module and gate driver',
      'Measure DC-link capacitance and insulation resistance',
      'Perform staged restart and monitor for 60 minutes',
      'Confirm grid-code compliance on reconnection',
    ],
    parts: [
      { sku: 'IGB-MOD-1700', name: 'IGBT module 1700 V', qty: 1, unit: 'ea' },
      { sku: 'GDR-BRD-04', name: 'Gate driver board', qty: 1, unit: 'ea' },
      { sku: 'THM-PST-25', name: 'Thermal compound', qty: 1, unit: 'tube' },
    ],
    safety: ['base', 'hv'],
  },
  {
    type: 'inspection',
    title: 'Drone blade inspection — full survey',
    description:
      'Automated three-blade drone survey at 12 MP per section. Classify leading-edge erosion, lightning-receptor condition and any surface defects against the blade standard.',
    hours: 3,
    checklist: [
      'Confirm airspace clearance and rotor lock',
      'Fly automated survey pattern on all three blades',
      'Classify defects against the blade inspection standard',
      'Flag any category 3+ finding for repair planning',
      'Upload imagery set to the document library',
    ],
    parts: [],
    safety: ['weather'],
  },
  {
    type: 'inspection',
    title: 'Post-seismic structural walk-down',
    description:
      'Structural inspection triggered by a nearby seismic event. Inspect foundation grout, base ring, tower flange bolt tension and the anchor cage for any displacement.',
    hours: 4,
    checklist: [
      'Visual inspection of foundation grout and pedestal',
      'Torque-check tower flange bolt sample (20%)',
      'Verify tower verticality against the commissioning record',
      'Inspect anchor cage and base ring for displacement',
      'Photograph and log findings against the seismic event ID',
      'Clear turbine for return to service or escalate',
    ],
    parts: [{ sku: 'TRQ-CAL-01', name: 'Calibrated torque wrench (tool)', qty: 1, unit: 'ea' }],
    safety: ['base', 'weather'],
  },
  {
    type: 'corrective',
    title: 'Yaw brake pad replacement',
    description:
      'Yaw brake pad thickness has reached the replacement limit on four callipers. Replace pads as a set, verify residual braking torque and re-calibrate the yaw counter.',
    hours: 6,
    checklist: [
      'Isolate turbine and apply LOTO',
      'Replace yaw brake pads on all callipers',
      'Verify residual braking torque against spec',
      'Re-calibrate yaw position counter',
      'Function-test yaw in both directions',
    ],
    parts: [
      { sku: 'YAW-PAD-SET', name: 'Yaw brake pad set', qty: 4, unit: 'set' },
      { sku: 'HYD-OIL-46', name: 'Hydraulic oil ISO VG46', qty: 20, unit: 'L' },
    ],
    safety: ['base'],
  },
  {
    type: 'preventive',
    title: 'Annual comprehensive service',
    description:
      'Full annual service across drivetrain, pitch, yaw, converter and structural systems, including a complete torque audit and a functional safety-chain test.',
    hours: 12,
    checklist: [
      'Isolate turbine and apply LOTO',
      'Complete drivetrain inspection and oil change',
      'Full tower flange torque audit',
      'Pitch and yaw system function tests',
      'Converter cabinet thermal inspection',
      'Safety-chain and emergency-stop validation',
      'Lightning-protection continuity test',
      'Update asset record and close annual service',
    ],
    parts: [
      { sku: 'OIL-GX-320', name: 'Gearbox oil ISO VG320', qty: 400, unit: 'L' },
      { sku: 'FLT-GX-0032', name: 'Gearbox offline filter cartridge', qty: 2, unit: 'ea' },
      { sku: 'LUB-EP2-05', name: 'EP2 lithium grease cartridge', qty: 12, unit: 'ea' },
    ],
    safety: ['base', 'hv', 'weather'],
  },
]

const NOTE_AUTHORS = ['Vikram Deshpande', 'Rahul Menon', 'Sneha Iyer', 'Meena Rajendran', 'Hitesh Chauhan']
const NOTE_TEXTS = [
  'Crew briefed at the site gate. Weather window confirmed until 16:00.',
  'Spares confirmed at the regional store — no lead-time exposure on this job.',
  'Customer notified of the expected production impact for the shift.',
  'Access track is soft after overnight rain; heavier vehicles rerouted via the south gate.',
  'Escalated to engineering — findings need a design review before sign-off.',
  'Awaiting SLDC clearance before the turbine can be returned to service.',
]

function buildWorkOrders(): WorkOrder[] {
  const orders: WorkOrder[] = []
  const rng = seededRandom('work-orders:v1')
  let counter = 1

  // 1. One breakdown order per offline turbine, tied to its live alarm.
  const offline = turbines.filter((t) => t.status === 'offline')
  const alarmed = turbines.filter((t) => t.status === 'alarm')
  const maintenance = turbines.filter((t) => t.status === 'maintenance')

  const targets: { turbine: (typeof turbines)[number]; template: (typeof WO_TEMPLATES)[number]; status: WorkOrderStatus; priority: Severity }[] = []

  for (const t of offline) {
    targets.push({
      turbine: t,
      template: pick(rng, WO_TEMPLATES.filter((w) => w.type === 'breakdown' || w.type === 'corrective')),
      status: pick(rng, ['dispatched', 'in-progress', 'awaiting-parts', 'scheduled'] as const),
      priority: 'critical',
    })
  }
  for (const t of alarmed) {
    targets.push({
      turbine: t,
      template: pick(rng, WO_TEMPLATES.filter((w) => w.type === 'predictive' || w.type === 'corrective')),
      status: pick(rng, ['scheduled', 'in-progress', 'dispatched', 'draft'] as const),
      priority: 'high',
    })
  }
  for (const t of maintenance) {
    targets.push({
      turbine: t,
      template: pick(rng, WO_TEMPLATES.filter((w) => w.type === 'preventive')),
      status: 'in-progress',
      priority: 'medium',
    })
  }

  // 2. Scheduled preventive and inspection work across the healthy fleet.
  const healthy = turbines.filter((t) => t.status === 'running' || t.status === 'standby')
  for (let i = 0; i < healthy.length; i += 6) {
    const t = healthy[i]!
    targets.push({
      turbine: t,
      template: pick(rng, WO_TEMPLATES.filter((w) => w.type === 'preventive' || w.type === 'inspection')),
      status: pick(rng, ['scheduled', 'scheduled', 'completed', 'completed', 'draft'] as const),
      priority: pick(rng, ['medium', 'low', 'low'] as const),
    })
  }

  for (const target of targets) {
    const { turbine: t, template } = target
    const woRng = seededRandom(`wo:${t.id}:${template.title}`)
    const tech = technicians.find((x) => x.state === t.state) ?? technicians[counter % technicians.length]!
    const isDone = target.status === 'completed'
    const isActive = target.status === 'in-progress' || target.status === 'dispatched'

    const scheduledOffsetDays = isDone
      ? -Math.round(between(woRng, 1, 26))
      : target.status === 'scheduled'
        ? Math.round(between(woRng, -2, 22))
        : 0
    const scheduledFor = scheduledOffsetDays === 0 ? hoursAhead(Math.round(between(woRng, -6, 8))) : daysAhead(scheduledOffsetDays)

    const checklist: ChecklistItem[] = template.checklist.map((label, idx) => ({
      id: `cl-${idx}`,
      label,
      required: idx < template.checklist.length - 1,
      done: isDone ? true : isActive ? idx < Math.floor(template.checklist.length * between(woRng, 0.2, 0.7, 2)) : false,
    }))

    const parts: PartLine[] = template.parts.map((p) => {
      const available = target.status === 'awaiting-parts' ? false : woRng() > 0.12
      return {
        sku: p.sku,
        name: p.name,
        quantity: p.qty,
        unit: p.unit,
        available,
        leadTimeDays: available ? 0 : Math.round(between(woRng, 3, 21)),
      }
    })

    const noteCount = Math.round(between(woRng, 0, 3))
    const slaHours = target.priority === 'critical' ? 8 : target.priority === 'high' ? 24 : target.priority === 'medium' ? 96 : 240

    orders.push({
      id: `WO-2026-${String(counter).padStart(5, '0')}`,
      title: template.title,
      turbineId: t.id,
      turbineName: t.name,
      windFarmId: t.windFarmId,
      windFarmName: t.windFarmName,
      state: t.state,
      customerName: t.customerName,
      type: template.type,
      priority: target.priority,
      status: target.status,
      technicianId: tech.id,
      technicianName: tech.name,
      crewSize: template.hours > 8 ? 3 : 2,
      createdAt: daysAgo(Math.round(between(woRng, 1, 30))),
      scheduledFor,
      slaDueAt: isDone ? daysAgo(Math.round(between(woRng, 1, 24))) : hoursAhead(Math.round(between(woRng, -14, slaHours))),
      startedAt: isDone || isActive ? hoursAgo(Math.round(between(woRng, 2, 40))) : null,
      completedAt: isDone ? daysAgo(Math.round(between(woRng, 1, 25))) : null,
      estimatedHours: template.hours,
      actualHours: isDone ? Math.round(template.hours * between(woRng, 0.75, 1.5, 2) * 10) / 10 : null,
      description: template.description,
      safetyNotes: template.safety.flatMap((k) => SAFETY_NOTES[k]!),
      parts,
      checklist,
      evidenceCount: isDone ? Math.round(between(woRng, 3, 14)) : isActive ? Math.round(between(woRng, 0, 6)) : 0,
      notes: Array.from({ length: noteCount }, (_, i) => ({
        author: pick(woRng, NOTE_AUTHORS),
        at: hoursAgo(Math.round(between(woRng, 1, 120)) + i * 9),
        text: pick(woRng, NOTE_TEXTS),
      })),
      linkedAlarmId: alarms.find((a) => a.turbineId === t.id)?.id ?? null,
      downtimeAvoidedMwh: Math.round(between(woRng, 4, 92, 1) * 10) / 10,
    })
    counter++
  }

  return orders.sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : 1))
}

export const workOrders: WorkOrder[] = buildWorkOrders()

const workOrderById = new Map(workOrders.map((w) => [w.id, w]))
export function getWorkOrder(id: string) {
  return workOrderById.get(id)
}

// Wire each technician to the job they are actually on.
for (const tech of technicians) {
  const active = workOrders.find(
    (w) => w.technicianId === tech.id && (w.status === 'in-progress' || w.status === 'dispatched'),
  )
  tech.currentWorkOrderId = active?.id ?? null
  tech.jobsCompletedToday = workOrders.filter(
    (w) => w.technicianId === tech.id && w.status === 'completed',
  ).length % 4
}

export function getWorkOrdersForSite(siteId: string) {
  return workOrders.filter((w) => w.windFarmId === siteId)
}
export function getWorkOrdersForTurbine(turbineId: string) {
  return workOrders.filter((w) => w.turbineId === turbineId)
}
export function getWorkOrdersForTechnician(techId: string) {
  return workOrders.filter((w) => w.technicianId === techId)
}

export const maintenanceSummary = {
  total: workOrders.length,
  open: workOrders.filter((w) => w.status !== 'completed' && w.status !== 'cancelled').length,
  overdue: workOrders.filter(
    (w) => w.status !== 'completed' && w.status !== 'cancelled' && new Date(w.slaDueAt) < new Date('2026-08-13T09:42:00+05:30'),
  ).length,
  dueToday: workOrders.filter((w) => {
    const d = new Date(w.scheduledFor)
    return d.getFullYear() === 2026 && d.getMonth() === 7 && d.getDate() === 13 && w.status !== 'completed'
  }).length,
  breakdowns: workOrders.filter((w) => w.type === 'breakdown' && w.status !== 'completed').length,
  awaitingParts: workOrders.filter((w) => w.status === 'awaiting-parts').length,
  completedThisMonth: workOrders.filter((w) => w.status === 'completed').length,
}

/** Site × week preventive-maintenance matrix used by the maintenance planner. */
export const maintenanceMatrix = windFarms.map((farm) => {
  const rng = seededRandom(`matrix:${farm.id}`)
  const siteTurbines = getTurbinesForSite(farm.id)
  return {
    siteId: farm.id,
    siteName: farm.name,
    state: farm.state,
    turbineCount: siteTurbines.length,
    weeks: Array.from({ length: 12 }, () => Math.round(between(rng, 0, Math.max(2, siteTurbines.length / 8)))),
  }
})
