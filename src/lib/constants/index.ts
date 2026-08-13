import type {
  ProductFamily,
  ProductSpec,
  RiskBand,
  RoleDefinition,
  Severity,
  TurbineStatus,
  WindFarmStatus,
  WorkOrderStatus,
  WorkOrderType,
  OpportunityStage,
  ProjectStage,
} from '@/types'

/* ------------------------------ Product families ------------------------------ */

export const PRODUCT_SPECS: Record<ProductFamily, ProductSpec> = {
  S120: {
    family: 'S120',
    ratedCapacityMw: 2.1,
    rotorDiameterM: 120,
    hubHeightM: 120,
    sweptAreaM2: 11310,
    cutInMs: 3,
    ratedWindMs: 11,
    cutOutMs: 25,
    bladeLengthM: 58.6,
    generatorType: 'DFIG, 690 V',
    gridClass: 'IEC S / IIIA',
    positioning: 'Proven workhorse for medium wind regimes and brownfield density.',
  },
  S133: {
    family: 'S133',
    ratedCapacityMw: 3.0,
    rotorDiameterM: 133,
    hubHeightM: 140,
    sweptAreaM2: 13893,
    cutInMs: 3,
    ratedWindMs: 10.5,
    cutOutMs: 25,
    bladeLengthM: 65.5,
    generatorType: 'DFIG, 690 V',
    gridClass: 'IEC S / IIIA',
    positioning: 'Balanced yield-per-hectare for inland ridge and plateau sites.',
  },
  S144: {
    family: 'S144',
    ratedCapacityMw: 3.15,
    rotorDiameterM: 144,
    hubHeightM: 160,
    sweptAreaM2: 16286,
    cutInMs: 2.8,
    ratedWindMs: 10.2,
    cutOutMs: 25,
    bladeLengthM: 71,
    generatorType: 'DFIG, 690 V',
    gridClass: 'IEC S / IIIB',
    positioning: 'Highest swept area per MW — flagship for low-to-medium wind sites.',
  },
}

export const PRODUCT_FAMILIES: ProductFamily[] = ['S120', 'S133', 'S144']

/* --------------------------------- Statuses --------------------------------- */

interface StatusToken {
  label: string
  /** Reserved status role — always paired with a dot, icon or label. */
  tone: 'good' | 'warning' | 'serious' | 'critical' | 'neutral' | 'info'
  description: string
}

export const TURBINE_STATUS: Record<TurbineStatus, StatusToken> = {
  running: { label: 'Running', tone: 'good', description: 'Producing within expected power curve' },
  standby: { label: 'Standby', tone: 'neutral', description: 'Available but wind below cut-in' },
  maintenance: { label: 'Maintenance', tone: 'info', description: 'Planned service in progress' },
  curtailment: { label: 'Curtailment', tone: 'warning', description: 'Output limited by grid instruction' },
  alarm: { label: 'Alarm', tone: 'serious', description: 'Active fault, production degraded' },
  offline: { label: 'Offline', tone: 'critical', description: 'Not producing — intervention required' },
}

export const TURBINE_STATUS_ORDER: TurbineStatus[] = [
  'running',
  'standby',
  'curtailment',
  'maintenance',
  'alarm',
  'offline',
]

export const SEVERITY: Record<Severity, StatusToken> = {
  critical: { label: 'Critical', tone: 'critical', description: 'Immediate response required' },
  high: { label: 'High', tone: 'serious', description: 'Action required within the shift' },
  medium: { label: 'Medium', tone: 'warning', description: 'Schedule within the week' },
  low: { label: 'Low', tone: 'info', description: 'Monitor and review' },
}

export const RISK_BAND: Record<RiskBand, StatusToken> = {
  severe: { label: 'Severe', tone: 'critical', description: 'Active threat to assets or schedule' },
  elevated: { label: 'Elevated', tone: 'serious', description: 'Credible threat under watch' },
  moderate: { label: 'Moderate', tone: 'warning', description: 'Monitor, no action yet' },
  low: { label: 'Low', tone: 'good', description: 'Within normal operating envelope' },
}

export const WIND_FARM_STATUS: Record<WindFarmStatus, StatusToken> = {
  operational: { label: 'Operational', tone: 'good', description: 'Handed over and generating' },
  commissioning: { label: 'Commissioning', tone: 'info', description: 'Testing and grid synchronisation' },
  construction: { label: 'Under construction', tone: 'warning', description: 'Erection in progress' },
  planned: { label: 'Planned', tone: 'neutral', description: 'Awarded, pre-mobilisation' },
}

export const WORK_ORDER_STATUS: Record<WorkOrderStatus, StatusToken> = {
  draft: { label: 'Draft', tone: 'neutral', description: 'Not yet released to planning' },
  scheduled: { label: 'Scheduled', tone: 'info', description: 'Slotted against a technician' },
  dispatched: { label: 'Dispatched', tone: 'info', description: 'Crew en route to site' },
  'in-progress': { label: 'In progress', tone: 'warning', description: 'Work underway at the turbine' },
  'awaiting-parts': { label: 'Awaiting parts', tone: 'serious', description: 'Blocked on spares' },
  completed: { label: 'Completed', tone: 'good', description: 'Signed off and closed' },
  cancelled: { label: 'Cancelled', tone: 'neutral', description: 'Withdrawn before execution' },
}

export const WORK_ORDER_TYPE: Record<WorkOrderType, { label: string; description: string }> = {
  preventive: { label: 'Preventive', description: 'Calendar or hour-based scheduled service' },
  predictive: { label: 'Predictive', description: 'Triggered by condition-monitoring trend' },
  corrective: { label: 'Corrective', description: 'Planned repair of a known defect' },
  breakdown: { label: 'Breakdown', description: 'Unplanned response to a stopped turbine' },
  inspection: { label: 'Inspection', description: 'Structural, blade or post-event survey' },
}

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  'Lead',
  'Qualified',
  'Site Study',
  'Proposal',
  'Technical Evaluation',
  'Commercial',
  'Negotiation',
  'Won',
  'Lost',
]

export const PROJECT_STAGES: ProjectStage[] = [
  'Planning',
  'Survey',
  'Land',
  'Foundation',
  'Tower',
  'Nacelle',
  'Blade',
  'Electrical',
  'Testing',
  'Commissioning',
]

/* ------------------------------- Data-viz slots ------------------------------- */

/**
 * Categorical series slots, assigned in fixed order and never cycled.
 * Values live in globals.css so light/dark step from the same eight hues.
 */
export const SERIES_VARS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
  'var(--series-6)',
  'var(--series-7)',
  'var(--series-8)',
] as const

/** Sequential blue ramp, near-zero → maximum. */
export const SEQUENTIAL_VARS = [
  'var(--seq-100)',
  'var(--seq-200)',
  'var(--seq-300)',
  'var(--seq-400)',
  'var(--seq-500)',
  'var(--seq-600)',
  'var(--seq-700)',
] as const

export const TONE_VAR: Record<StatusToken['tone'], string> = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
  neutral: 'var(--status-neutral)',
  info: 'var(--status-info)',
}

export const TONE_SOFT_VAR: Record<StatusToken['tone'], string> = {
  good: 'var(--status-good-soft)',
  warning: 'var(--status-warning-soft)',
  serious: 'var(--status-serious-soft)',
  critical: 'var(--status-critical-soft)',
  neutral: 'var(--status-neutral-soft)',
  info: 'var(--status-info-soft)',
}

/* ---------------------------------- Roles ---------------------------------- */

const ALL_NAV = [
  'command-center',
  'crm',
  'wind-farms',
  'turbines',
  'projects',
  'maintenance',
  'field-service',
  'asset-monitoring',
  'environment',
  'documents',
  'ai-copilot',
  'reports',
  'admin',
]

export const ROLES: RoleDefinition[] = [
  {
    id: 'executive',
    label: 'Executive Leadership',
    group: 'Internal',
    persona: 'Anjali Raghunathan',
    description: 'Fleet health, MW availability, execution and customer exposure at a glance.',
    landing: '/command-center',
    nav: ALL_NAV,
    headlineMetrics: ['installedMw', 'availabilityPct', 'projectsAtRisk', 'customersImpacted'],
  },
  {
    id: 'operations-manager',
    label: 'Operations Manager',
    group: 'Internal',
    persona: 'Vikram Deshpande',
    description: 'Prioritise incidents, coordinate crews and respond to environmental risk.',
    landing: '/command-center',
    nav: ALL_NAV.filter((n) => n !== 'admin'),
    headlineMetrics: ['offlineTurbines', 'criticalIncidents', 'maintenanceDueToday', 'availabilityPct'],
  },
  {
    id: 'scada-analyst',
    label: 'SCADA Analyst',
    group: 'Internal',
    persona: 'Sneha Iyer',
    description: 'Alarm triage, underperformance detection and telemetry inspection.',
    landing: '/asset-monitoring',
    nav: ['command-center', 'turbines', 'wind-farms', 'asset-monitoring', 'environment', 'maintenance', 'ai-copilot', 'reports'],
    headlineMetrics: ['criticalIncidents', 'offlineTurbines', 'availabilityPct', 'generationTodayGwh'],
  },
  {
    id: 'om-engineer',
    label: 'O&M Engineer',
    group: 'Internal',
    persona: 'Rahul Menon',
    description: 'Plan preventive work, resolve breakdowns and review AI recommendations.',
    landing: '/maintenance',
    nav: ['command-center', 'wind-farms', 'turbines', 'maintenance', 'field-service', 'asset-monitoring', 'environment', 'documents', 'ai-copilot'],
    headlineMetrics: ['maintenanceDueToday', 'offlineTurbines', 'criticalIncidents', 'availabilityPct'],
  },
  {
    id: 'field-technician',
    label: 'Field Technician',
    group: 'Internal',
    persona: 'Karthik Selvam',
    description: 'Today’s assigned jobs, turbine context, checklists and evidence capture.',
    landing: '/field-service',
    nav: ['field-service', 'maintenance', 'turbines', 'wind-farms', 'documents', 'environment'],
    headlineMetrics: ['maintenanceDueToday', 'offlineTurbines'],
  },
  {
    id: 'sales',
    label: 'Sales & BD',
    group: 'Internal',
    persona: 'Priya Nair',
    description: 'Accounts, pipeline and the operational story behind every relationship.',
    landing: '/crm/opportunities',
    nav: ['command-center', 'crm', 'wind-farms', 'projects', 'documents', 'ai-copilot', 'reports'],
    headlineMetrics: ['customersImpacted', 'installedMw', 'availabilityPct'],
  },
  {
    id: 'project-manager',
    label: 'Project Manager',
    group: 'Internal',
    persona: 'Arun Bhatt',
    description: 'Milestones, delays, site readiness, contractors and project risk.',
    landing: '/projects',
    nav: ['command-center', 'projects', 'wind-farms', 'documents', 'crm', 'environment', 'ai-copilot', 'reports'],
    headlineMetrics: ['projectsAtRisk', 'installedMw'],
  },
  {
    id: 'customer',
    label: 'Customer Portal',
    group: 'External',
    persona: 'GreenGrid Power Ltd.',
    description: 'Portfolio performance, service activity and contractual commitments.',
    landing: '/wind-farms',
    nav: ['wind-farms', 'turbines', 'asset-monitoring', 'maintenance', 'documents', 'reports'],
    headlineMetrics: ['installedMw', 'availabilityPct', 'generationTodayGwh'],
  },
  {
    id: 'contractor',
    label: 'EPC Contractor',
    group: 'External',
    persona: 'Sanghvi Infra Projects',
    description: 'Assigned project scope, milestones, site readiness and documents.',
    landing: '/projects',
    nav: ['projects', 'documents', 'field-service', 'environment'],
    headlineMetrics: ['projectsAtRisk'],
  },
  {
    id: 'landowner',
    label: 'Landowner',
    group: 'External',
    persona: 'Bhavnagar Land Consortium',
    description: 'Parcel status, access agreements and site activity notices.',
    landing: '/projects',
    nav: ['projects', 'documents'],
    headlineMetrics: [],
  },
  {
    id: 'supplier',
    label: 'Component Supplier',
    group: 'External',
    persona: 'Aditya Composites',
    description: 'Demand signals, component dependencies and service part consumption.',
    landing: '/maintenance',
    nav: ['maintenance', 'projects', 'documents', 'reports'],
    headlineMetrics: ['maintenanceDueToday'],
  },
]

export const ROLE_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<
  RoleDefinition['id'],
  RoleDefinition
>

/* --------------------------------- Map layers --------------------------------- */

export interface MapLayerDefinition {
  id: string
  label: string
  group: 'Assets' | 'Environment' | 'Operations'
  description: string
  defaultOn: boolean
}

export const MAP_LAYERS: MapLayerDefinition[] = [
  { id: 'wind-farms', label: 'Wind farms', group: 'Assets', description: 'Site markers sized by installed capacity', defaultOn: true },
  { id: 'turbines', label: 'Turbines', group: 'Assets', description: 'Individual turbine positions at close zoom', defaultOn: false },
  { id: 'projects', label: 'Projects', group: 'Assets', description: 'Sites under construction or commissioning', defaultOn: true },
  { id: 'grid', label: 'Grid & evacuation', group: 'Assets', description: 'Substations and evacuation corridors', defaultOn: false },
  { id: 'weather', label: 'Weather', group: 'Environment', description: 'Current conditions per site', defaultOn: false },
  { id: 'wind-speed', label: 'Wind speed field', group: 'Environment', description: 'Interpolated wind speed overlay', defaultOn: true },
  { id: 'rain', label: 'Rain', group: 'Environment', description: 'Precipitation cells', defaultOn: false },
  { id: 'lightning', label: 'Lightning', group: 'Environment', description: 'Strike clusters, last 60 minutes', defaultOn: false },
  { id: 'cyclones', label: 'Cyclones', group: 'Environment', description: 'Track, forecast cone and impact radius', defaultOn: true },
  { id: 'earthquakes', label: 'Earthquakes', group: 'Environment', description: 'Seismic events, last 14 days', defaultOn: true },
  { id: 'tsunami', label: 'Tsunami', group: 'Environment', description: 'Coastal advisories and watch zones', defaultOn: false },
  { id: 'flood', label: 'Flood risk', group: 'Environment', description: 'Basin-level flood risk zones', defaultOn: false },
  { id: 'field-teams', label: 'Field teams', group: 'Operations', description: 'Technician positions and status', defaultOn: true },
  { id: 'incidents', label: 'Active incidents', group: 'Operations', description: 'Open critical and high alarms', defaultOn: true },
]

export const DEFAULT_LAYERS = MAP_LAYERS.filter((l) => l.defaultOn).map((l) => l.id)

/* --------------------------------- Geography --------------------------------- */

export const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  Gujarat: { lat: 22.6, lng: 71.2 },
  'Tamil Nadu': { lat: 10.9, lng: 78.2 },
  Rajasthan: { lat: 26.6, lng: 73.4 },
  Maharashtra: { lat: 19.2, lng: 75.3 },
  Karnataka: { lat: 14.5, lng: 75.9 },
  'Madhya Pradesh': { lat: 23.4, lng: 78.0 },
  'Andhra Pradesh': { lat: 15.6, lng: 79.4 },
}

export const APP_NAME = 'Suzlon Wind CRM'
export const APP_TAGLINE = 'Renewable Energy Operations Platform'
