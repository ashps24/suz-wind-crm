import { PROJECT_STAGES } from '@/lib/constants'
import { between, clamp, daysAgo, daysAhead, pick, seededRandom } from '@/lib/utils'
import type {
  Contractor,
  IndianState,
  Milestone,
  Project,
  ProjectRisk,
  ProjectStage,
  ProjectType,
  ProductFamily,
  RiskBand,
  SiteReadinessItem,
} from '@/types'

interface ProjectSeed {
  id: string
  name: string
  code: string
  type: ProjectType
  customerId: string
  customerName: string
  windFarmId: string | null
  state: IndianState
  capacityMw: number
  turbineCount: number
  product: ProductFamily
  stage: ProjectStage
  startedOn: string
  targetCommissioning: string
  delayDays: number
  projectManager: string
  contractValueCr: number
  spentPct: number
}

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    id: 'prj-barmer-ph2', name: 'Barmer Desert Wind Park — Phase 2', code: 'PRJ-RJ-2401', type: 'EPC',
    customerId: 'acc-horizon', customerName: 'Horizon Power Ventures', windFarmId: 'wf-barmer-desert',
    state: 'Rajasthan', capacityMw: 119.7, turbineCount: 38, product: 'S144', stage: 'Testing',
    startedOn: '2025-02-10', targetCommissioning: '2026-06-15', delayDays: 62,
    projectManager: 'Arun Bhatt', contractValueCr: 742, spentPct: 0.88,
  },
  {
    id: 'prj-anantapur-hybrid', name: 'Anantapur Hybrid Wind Park', code: 'PRJ-AP-2502', type: 'Hybrid',
    customerId: 'acc-meridian', customerName: 'Meridian Industrial Energy', windFarmId: 'wf-anantapur',
    state: 'Andhra Pradesh', capacityMw: 107.1, turbineCount: 34, product: 'S144', stage: 'Tower',
    startedOn: '2025-09-01', targetCommissioning: '2027-03-31', delayDays: 0,
    projectManager: 'Vasudha Reddy', contractValueCr: 688, spentPct: 0.41,
  },
  {
    id: 'prj-kutch-repower', name: 'Kutch Horizon Repowering Programme', code: 'PRJ-GJ-2503', type: 'Repowering',
    customerId: 'acc-greengrid', customerName: 'GreenGrid Power Ltd.', windFarmId: 'wf-kutch-horizon',
    state: 'Gujarat', capacityMw: 63.0, turbineCount: 20, product: 'S144', stage: 'Land',
    startedOn: '2026-01-20', targetCommissioning: '2027-09-30', delayDays: 24,
    projectManager: 'Hitesh Chauhan', contractValueCr: 398, spentPct: 0.16,
  },
  {
    id: 'prj-thoothukudi-ext', name: 'Thoothukudi Coastal Extension', code: 'PRJ-TN-2504', type: 'EPC',
    customerId: 'acc-southcoast', customerName: 'South Coast Utilities', windFarmId: 'wf-thoothukudi',
    state: 'Tamil Nadu', capacityMw: 88.2, turbineCount: 28, product: 'S144', stage: 'Foundation',
    startedOn: '2026-03-05', targetCommissioning: '2027-06-30', delayDays: 11,
    projectManager: 'Meena Rajendran', contractValueCr: 561, spentPct: 0.28,
  },
  {
    id: 'prj-satara-om', name: 'Satara Highlands O&M Transition', code: 'PRJ-MH-2505', type: 'O&M Transition',
    customerId: 'acc-meridian', customerName: 'Meridian Industrial Energy', windFarmId: 'wf-satara',
    state: 'Maharashtra', capacityMw: 96.0, turbineCount: 32, product: 'S133', stage: 'Commissioning',
    startedOn: '2026-05-18', targetCommissioning: '2026-09-15', delayDays: 0,
    projectManager: 'Sameer Kulkarni', contractValueCr: 124, spentPct: 0.72,
  },
  {
    id: 'prj-gadag-repower', name: 'Gadag Ridge Repowering', code: 'PRJ-KA-2506', type: 'Repowering',
    customerId: 'acc-deccan', customerName: 'Deccan Clean Energy Trust', windFarmId: 'wf-gadag',
    state: 'Karnataka', capacityMw: 54.0, turbineCount: 18, product: 'S133', stage: 'Survey',
    startedOn: '2026-06-02', targetCommissioning: '2028-01-31', delayDays: 0,
    projectManager: 'Lakshmi Gowda', contractValueCr: 341, spentPct: 0.07,
  },
  {
    id: 'prj-dhule-ph3', name: 'Dhule Wind Corridor — Phase 3', code: 'PRJ-MH-2507', type: 'EPC',
    customerId: 'acc-aranya', customerName: 'Aranya Renewables', windFarmId: 'wf-dhule',
    state: 'Maharashtra', capacityMw: 75.0, turbineCount: 25, product: 'S133', stage: 'Electrical',
    startedOn: '2025-07-14', targetCommissioning: '2026-10-31', delayDays: 38,
    projectManager: 'Prashant Ahire', contractValueCr: 472, spentPct: 0.79,
  },
  {
    id: 'prj-jaisalmer-ph2', name: 'Jaisalmer Ridge — Phase 2', code: 'PRJ-RJ-2508', type: 'EPC',
    customerId: 'acc-horizon', customerName: 'Horizon Power Ventures', windFarmId: 'wf-jaisalmer-ridge',
    state: 'Rajasthan', capacityMw: 100.8, turbineCount: 32, product: 'S144', stage: 'Nacelle',
    startedOn: '2025-11-08', targetCommissioning: '2027-02-28', delayDays: 5,
    projectManager: 'Mahendra Rathore', contractValueCr: 634, spentPct: 0.52,
  },
  {
    id: 'prj-ratlam-ph2', name: 'Ratlam Plateau — Phase 2', code: 'PRJ-MP-2509', type: 'EPC',
    customerId: 'acc-aranya', customerName: 'Aranya Renewables', windFarmId: 'wf-ratlam',
    state: 'Madhya Pradesh', capacityMw: 45.0, turbineCount: 15, product: 'S133', stage: 'Planning',
    startedOn: '2026-07-21', targetCommissioning: '2028-03-31', delayDays: 0,
    projectManager: 'Anup Sisodiya', contractValueCr: 289, spentPct: 0.03,
  },
  {
    id: 'prj-muppandal-blade', name: 'Muppandal Blade Upgrade Programme', code: 'PRJ-TN-2510', type: 'Repowering',
    customerId: 'acc-aranya', customerName: 'Aranya Renewables', windFarmId: 'wf-muppandal',
    state: 'Tamil Nadu', capacityMw: 32.0, turbineCount: 16, product: 'S120', stage: 'Blade',
    startedOn: '2026-04-12', targetCommissioning: '2026-12-20', delayDays: 17,
    projectManager: 'Suresh Thangaraj', contractValueCr: 96, spentPct: 0.58,
  },
]

const MILESTONE_LABELS: Record<ProjectStage, { label: string; owner: string; note: string }> = {
  Planning: { label: 'Concept, feasibility & award', owner: 'Project Development', note: 'Micro-siting frozen and internal investment approval obtained.' },
  Survey: { label: 'Topographic & geotechnical survey', owner: 'Survey & Design', note: 'Soil bearing capacity confirmed for all foundation locations.' },
  Land: { label: 'Land acquisition & right of way', owner: 'Land & Legal', note: 'Lease deeds registered and access corridors secured.' },
  Foundation: { label: 'Foundation casting & curing', owner: 'Civil Contractor', note: 'Anchor cages set, pours completed to the 28-day strength gate.' },
  Tower: { label: 'Tower section erection', owner: 'Erection Contractor', note: 'Sections lifted and flange bolts torqued to specification.' },
  Nacelle: { label: 'Nacelle & drivetrain lift', owner: 'Erection Contractor', note: 'Main crane campaign sequenced against the wind window.' },
  Blade: { label: 'Rotor assembly & blade lift', owner: 'Erection Contractor', note: 'Blades received, inspected and lifted as a single rotor star.' },
  Electrical: { label: 'Internal grid, ICR & substation', owner: 'Electrical Contractor', note: 'Cable pulling, ring main units and pooling substation energisation.' },
  Testing: { label: 'Pre-commissioning & grid compliance', owner: 'Commissioning', note: 'Protection coordination, LVRT and grid-code compliance testing.' },
  Commissioning: { label: 'Commissioning & handover', owner: 'Commissioning', note: 'Reliability run, punch-list closure and provisional acceptance.' },
}

const RISK_TEMPLATES: { title: string; category: ProjectRisk['category']; mitigation: string }[] = [
  { title: 'Right-of-way dispute on the northern access corridor', category: 'Land', mitigation: 'Parallel negotiation with two parcel owners; alternate alignment surveyed as a fallback.' },
  { title: 'Evacuation bay availability at the pooling substation', category: 'Grid', mitigation: 'Weekly coordination with the transmission utility; bay energisation tracked as a hard gate.' },
  { title: 'Over-dimensional cargo permits pending for blade movement', category: 'Logistics', mitigation: 'Permits filed 45 days ahead; escorted night convoys planned around the festival calendar.' },
  { title: 'Monsoon window compresses the crane campaign', category: 'Weather', mitigation: 'Crane campaign resequenced to complete high lifts before the onset window.' },
  { title: 'Forest clearance amendment for two turbine positions', category: 'Regulatory', mitigation: 'Amendment filed with the state authority; positions removed from the critical path.' },
  { title: 'Gearbox delivery slot slipping at the supplier', category: 'Supply', mitigation: 'Two units expedited from the service pool; supplier on weekly escalation.' },
  { title: 'Escalation clause exposure on steel pricing', category: 'Commercial', mitigation: 'Index-linked clause capped; hedge reviewed at the monthly commercial gate.' },
  { title: 'Crane mobilisation clashes with a neighbouring project', category: 'Logistics', mitigation: 'Second crane contracted for the overlap period at a negotiated day rate.' },
]

const CONTRACTOR_POOL: { name: string; scope: Contractor['scope']; contact: string }[] = [
  { name: 'Sanghvi Infra Projects', scope: 'Civil', contact: 'Rakesh Sanghvi' },
  { name: 'Meghdoot Civil Works', scope: 'Civil', contact: 'Bharat Chavda' },
  { name: 'Voltek Power Systems', scope: 'Electrical', contact: 'S. Ravichandran' },
  { name: 'Anand Grid Services', scope: 'Electrical', contact: 'Anand Kulkarni' },
  { name: 'Sarvodaya Heavy Lift', scope: 'Crane & Logistics', contact: 'Jaswant Singh' },
  { name: 'Coastal Cranes & Rigging', scope: 'Crane & Logistics', contact: 'P. Muthukumar' },
  { name: 'Girinath Erectors', scope: 'Erection', contact: 'Sunil Girinath' },
  { name: 'Terra Survey Associates', scope: 'Survey', contact: 'Nandini Rao' },
]

const READINESS_LABELS = [
  'Access road & internal tracks',
  'Foundation locations released',
  'Crane pad preparation',
  'Water & power at site',
  'Site security & fencing',
  'Laydown yard & stores',
  'Grid bay availability',
  'Environmental clearances',
]

function stageProgress(stage: ProjectStage, index: number, currentIndex: number, rng: () => number): number {
  if (index < currentIndex) return 100
  if (index > currentIndex) return 0
  return Math.round(between(rng, 22, 88))
}

function buildProject(seed: ProjectSeed): Project {
  const rng = seededRandom(`project:${seed.id}`)
  const currentIndex = PROJECT_STAGES.indexOf(seed.stage)
  const start = new Date(seed.startedOn)
  const target = new Date(seed.targetCommissioning)
  const totalDays = Math.max(90, (target.getTime() - start.getTime()) / 86_400_000)
  const perStage = totalDays / PROJECT_STAGES.length

  const milestones: Milestone[] = PROJECT_STAGES.map((stage, i) => {
    const meta = MILESTONE_LABELS[stage]
    const plannedStart = new Date(start.getTime() + i * perStage * 86_400_000)
    const plannedEnd = new Date(start.getTime() + (i + 1) * perStage * 86_400_000)
    const progressPct = stageProgress(stage, i, currentIndex, rng)
    const slip = i <= currentIndex ? Math.round(between(rng, -3, seed.delayDays > 0 ? 26 : 6)) : 0
    const actualStart =
      i <= currentIndex ? new Date(plannedStart.getTime() + slip * 86_400_000).toISOString() : null
    const actualEnd =
      i < currentIndex ? new Date(plannedEnd.getTime() + slip * 86_400_000).toISOString() : null

    const risk: RiskBand = slip > 18 ? 'severe' : slip > 8 ? 'elevated' : slip > 2 ? 'moderate' : 'low'

    return {
      id: `${seed.id}-ms-${i}`,
      stage,
      label: meta.label,
      plannedStart: plannedStart.toISOString(),
      plannedEnd: plannedEnd.toISOString(),
      actualStart,
      actualEnd,
      progressPct,
      owner: meta.owner,
      dependencies: i > 0 ? [`${seed.id}-ms-${i - 1}`] : [],
      risk,
      note: meta.note,
    }
  })

  const riskCount = seed.delayDays > 30 ? 5 : seed.delayDays > 0 ? 3 : 2
  const risks: ProjectRisk[] = Array.from({ length: riskCount }, (_, i) => {
    const tpl = RISK_TEMPLATES[(i * 3 + currentIndex) % RISK_TEMPLATES.length]!
    const severity = i === 0 && seed.delayDays > 30 ? 'critical' : i === 0 ? 'high' : i === 1 ? 'medium' : 'low'
    return {
      id: `${seed.id}-risk-${i}`,
      title: tpl.title,
      category: tpl.category,
      severity,
      likelihood: pick(rng, ['possible', 'likely', 'almost-certain', 'rare'] as const),
      impactDays: Math.round(between(rng, 3, 45)),
      owner: seed.projectManager,
      mitigation: tpl.mitigation,
      status: i === 0 ? 'mitigating' : pick(rng, ['open', 'mitigating', 'closed'] as const),
      raisedAt: daysAgo(Math.round(between(rng, 5, 180))),
    }
  })

  const contractors: Contractor[] = CONTRACTOR_POOL.filter(
    (_, i) => i % 2 === (currentIndex % 2) || i < 3,
  )
    .slice(0, 4)
    .map((c, i) => ({
      id: `${seed.id}-ctr-${i}`,
      name: c.name,
      scope: c.scope,
      contact: c.contact,
      performanceScore: Math.round(between(rng, 68, 97)),
      onSiteCrew: Math.round(between(rng, 0, 120)),
      status: currentIndex < 2 ? 'pending' : currentIndex > 7 ? 'demobilised' : pick(rng, ['mobilised', 'mobilised', 'partial'] as const),
    }))

  const siteReadiness: SiteReadinessItem[] = READINESS_LABELS.map((label, i) => {
    const status: SiteReadinessItem['status'] =
      currentIndex >= 6 ? 'complete' : i < currentIndex ? 'complete' : i === currentIndex ? 'in-progress' : i === currentIndex + 1 && seed.delayDays > 20 ? 'blocked' : 'not-started'
    return {
      label,
      status,
      detail:
        status === 'complete'
          ? 'Signed off by the site engineer.'
          : status === 'in-progress'
            ? 'Work under way, tracked at the daily site meeting.'
            : status === 'blocked'
              ? 'Held pending third-party clearance — on the critical path.'
              : 'Scheduled against the mobilisation plan.',
    }
  })

  const completionPct = Math.round(
    clamp((currentIndex / PROJECT_STAGES.length) * 100 + (milestones[currentIndex]?.progressPct ?? 0) / PROJECT_STAGES.length, 2, 99),
  )

  const risk: RiskBand =
    seed.delayDays > 50 ? 'severe' : seed.delayDays > 20 ? 'elevated' : seed.delayDays > 0 ? 'moderate' : 'low'

  return {
    id: seed.id,
    name: seed.name,
    code: seed.code,
    type: seed.type,
    customerId: seed.customerId,
    customerName: seed.customerName,
    windFarmId: seed.windFarmId,
    state: seed.state,
    capacityMw: seed.capacityMw,
    turbineCount: seed.turbineCount,
    product: seed.product,
    stage: seed.stage,
    completionPct,
    startedOn: seed.startedOn,
    targetCommissioning: seed.targetCommissioning,
    forecastCommissioning: new Date(target.getTime() + seed.delayDays * 86_400_000).toISOString(),
    delayDays: seed.delayDays,
    risk,
    projectManager: seed.projectManager,
    contractValueCr: seed.contractValueCr,
    spentCr: Math.round(seed.contractValueCr * seed.spentPct * 10) / 10,
    milestones,
    risks,
    contractors,
    siteReadiness,
    turbinesErected: Math.round(seed.turbineCount * clamp(currentIndex / 7, 0, 1)),
    turbinesCommissioned: currentIndex >= 9 ? Math.round(seed.turbineCount * 0.6) : 0,
  }
}

export const projects: Project[] = PROJECT_SEEDS.map(buildProject)

const projectById = new Map(projects.map((p) => [p.id, p]))
export function getProject(id: string) {
  return projectById.get(id)
}
export function getProjectsForSite(siteId: string) {
  return projects.filter((p) => p.windFarmId === siteId)
}
export function getProjectsForAccount(accountId: string) {
  return projects.filter((p) => p.customerId === accountId)
}

export const projectSummary = {
  total: projects.length,
  atRisk: projects.filter((p) => p.risk === 'severe' || p.risk === 'elevated').length,
  pipelineMw: Math.round(projects.reduce((a, p) => a + p.capacityMw, 0) * 10) / 10,
  contractValueCr: Math.round(projects.reduce((a, p) => a + p.contractValueCr, 0)),
  commissioningThisYear: projects.filter((p) => p.targetCommissioning.startsWith('2026')).length,
  averageDelayDays: Math.round(projects.reduce((a, p) => a + p.delayDays, 0) / projects.length),
}
