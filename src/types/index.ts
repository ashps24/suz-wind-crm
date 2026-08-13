/* ------------------------------------------------------------------ *
 * Suzlon Wind CRM — shared domain types
 * Every mock endpoint, store and view reads from these definitions.
 * ------------------------------------------------------------------ */

export type ISODate = string

export interface GeoPoint {
  lat: number
  lng: number
}

/* ---------------------------------- Common ---------------------------------- */

export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type RiskBand = 'severe' | 'elevated' | 'moderate' | 'low'
export type IndianState =
  | 'Gujarat'
  | 'Tamil Nadu'
  | 'Rajasthan'
  | 'Maharashtra'
  | 'Karnataka'
  | 'Madhya Pradesh'
  | 'Andhra Pradesh'

export type ProductFamily = 'S120' | 'S133' | 'S144'

export interface ProductSpec {
  family: ProductFamily
  ratedCapacityMw: number
  rotorDiameterM: number
  hubHeightM: number
  sweptAreaM2: number
  cutInMs: number
  ratedWindMs: number
  cutOutMs: number
  bladeLengthM: number
  generatorType: string
  gridClass: string
  positioning: string
}

export interface Trend {
  direction: 'up' | 'down' | 'flat'
  valuePct: number
  /** Whether an upward movement is a good thing for this metric. */
  upIsGood: boolean
}

/* --------------------------------- Turbines --------------------------------- */

export type TurbineStatus =
  | 'running'
  | 'standby'
  | 'maintenance'
  | 'curtailment'
  | 'alarm'
  | 'offline'

export type ComponentKey =
  | 'rotor'
  | 'blades'
  | 'gearbox'
  | 'generator'
  | 'bearings'
  | 'tower'
  | 'yaw'
  | 'pitch'
  | 'converter'
  | 'sensors'

export interface ComponentHealth {
  key: ComponentKey
  label: string
  score: number
  trend: Trend
  lastInspection: ISODate
  note: string
  /** Rolling 12-point health history, oldest first. */
  history: number[]
}

export interface TelemetryPoint {
  t: string
  windSpeed: number
  power: number
  rotorRpm: number
  pitchAngle: number
  nacelleTemp: number
  gearboxTemp: number
  generatorTemp: number
  vibration: number
}

export interface Turbine {
  id: string
  name: string
  windFarmId: string
  windFarmName: string
  state: IndianState
  customerId: string
  customerName: string
  product: ProductFamily
  capacityMw: number
  status: TurbineStatus
  currentPowerKw: number
  windSpeedMs: number
  windDirectionDeg: number
  rotorRpm: number
  availabilityPct: number
  capacityFactorPct: number
  healthScore: number
  position: GeoPoint
  elevationM: number
  commissionedOn: ISODate
  warrantyUntil: ISODate
  lastMaintenance: ISODate
  nextMaintenance: ISODate
  operatingHours: number
  lifetimeGenerationMwh: number
  activeAlarm: string | null
  alarmSeverity: Severity | null
  /** 24 hourly generation values in kW, oldest first. */
  generation24h: number[]
  serialNumber: string
  towerType: string
}

/**
 * Heavy per-turbine detail. Built on demand by the mock API rather than held
 * for all 500+ turbines, so fleet lists stay cheap.
 */
export interface TurbineDetail extends Turbine {
  components: ComponentHealth[]
  telemetry: TelemetryPoint[]
  alarmHistory: Alarm[]
  maintenanceHistory: {
    id: string
    date: ISODate
    type: WorkOrderType
    summary: string
    technician: string
    hours: number
  }[]
  powerCurve: { windSpeed: number; expectedKw: number; actualKw: number | null }[]
  siblings: { id: string; name: string; status: TurbineStatus; healthScore: number }[]
}

export interface Alarm {
  id: string
  turbineId: string
  turbineName: string
  windFarmId: string
  code: string
  title: string
  description: string
  severity: Severity
  raisedAt: ISODate
  acknowledgedAt: ISODate | null
  clearedAt: ISODate | null
  category: 'Drivetrain' | 'Electrical' | 'Control' | 'Structural' | 'Grid' | 'Environmental'
  downtimeMinutes: number
}

/* -------------------------------- Wind farms -------------------------------- */

export type WindFarmStatus = 'operational' | 'commissioning' | 'construction' | 'planned'

export interface WindFarm {
  id: string
  name: string
  code: string
  state: IndianState
  district: string
  customerId: string
  customerName: string
  status: WindFarmStatus
  position: GeoPoint
  installedMw: number
  turbineCount: number
  products: ProductFamily[]
  availabilityPct: number
  currentGenerationMw: number
  generationTodayMwh: number
  generationMtdGwh: number
  plfPct: number
  riskScore: number
  riskBand: RiskBand
  activeAlerts: number
  openWorkOrders: number
  commissionedOn: ISODate
  gridSubstation: string
  evacuationVoltageKv: number
  landAreaHectares: number
  meanWindSpeedMs: number
  heroImage: string
  /** Bounding polygon for the site envelope, in lat/lng. */
  boundary: GeoPoint[]
  siteManager: string
  o_and_mContract: string
  contractExpiry: ISODate
  /** 24 hourly site generation values in MW, oldest first. */
  generation24h: number[]
  /** 30 daily availability values in %, oldest first. */
  availability30d: number[]
}

/* -------------------------------- Environment -------------------------------- */

export interface WeatherReading {
  windFarmId: string
  windFarmName: string
  observedAt: ISODate
  windSpeedMs: number
  windGustMs: number
  windDirectionDeg: number
  temperatureC: number
  humidityPct: number
  rainfallMm: number
  visibilityKm: number
  pressureHpa: number
  condition: 'Clear' | 'Partly cloudy' | 'Overcast' | 'Rain' | 'Thunderstorm' | 'Haze' | 'Squall'
  forecast: { t: string; windSpeedMs: number; gustMs: number; temperatureC: number; rainProbPct: number }[]
}

export interface EarthquakeEvent {
  id: string
  magnitude: number
  epicenter: string
  position: GeoPoint
  depthKm: number
  occurredAt: ISODate
  nearestWindFarmId: string
  nearestWindFarmName: string
  distanceKm: number
  affectedSiteIds: string[]
  recommendedInspection: string
  inspectionStatus: 'not-required' | 'recommended' | 'scheduled' | 'in-progress' | 'complete'
  source: string
}

export interface TsunamiAlert {
  id: string
  region: string
  severity: 'advisory' | 'watch' | 'warning'
  issuedAt: ISODate
  expectedArrival: ISODate
  estimatedWaveHeightM: number
  coastalSiteIds: string[]
  recommendedAction: string
  status: 'active' | 'cancelled' | 'expired'
  source: string
}

export interface CycloneTrackPoint extends GeoPoint {
  t: ISODate
  maxWindKmh: number
  forecast: boolean
}

export interface Cyclone {
  id: string
  name: string
  category: string
  basin: string
  position: GeoPoint
  maxWindKmh: number
  pressureHpa: number
  movementDeg: number
  movementKmh: number
  forecastLandfall: ISODate
  landfallLocation: string
  track: CycloneTrackPoint[]
  impactRadiusKm: number
  sitesInImpactZone: string[]
  status: 'active' | 'weakening' | 'dissipated'
  advisory: string
}

export interface LightningCluster {
  id: string
  position: GeoPoint
  strikeCount: number
  windowMinutes: number
  intensity: 'low' | 'moderate' | 'high'
  nearestWindFarmId: string
  distanceKm: number
  observedAt: ISODate
}

export interface FloodRiskZone {
  id: string
  region: string
  position: GeoPoint
  radiusKm: number
  riskLevel: RiskBand
  riverBasin: string
  reservoirLevelPct: number
  affectedSiteIds: string[]
  accessRoadsImpacted: number
  updatedAt: ISODate
  advisory: string
}

export type EnvironmentEventKind =
  | 'earthquake'
  | 'tsunami'
  | 'cyclone'
  | 'lightning'
  | 'flood'
  | 'weather'

export interface EnvironmentEventSummary {
  id: string
  kind: EnvironmentEventKind
  title: string
  severity: Severity
  position: GeoPoint
  occurredAt: ISODate
  affectedSiteIds: string[]
  detail: string
}

/* -------------------------------- Maintenance -------------------------------- */

export type WorkOrderType = 'preventive' | 'predictive' | 'corrective' | 'breakdown' | 'inspection'
export type WorkOrderStatus =
  | 'draft'
  | 'scheduled'
  | 'dispatched'
  | 'in-progress'
  | 'awaiting-parts'
  | 'completed'
  | 'cancelled'

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
  required: boolean
  note?: string
}

export interface PartLine {
  sku: string
  name: string
  quantity: number
  unit: string
  available: boolean
  leadTimeDays: number
}

export interface WorkOrder {
  id: string
  title: string
  turbineId: string
  turbineName: string
  windFarmId: string
  windFarmName: string
  state: IndianState
  customerName: string
  type: WorkOrderType
  priority: Severity
  status: WorkOrderStatus
  technicianId: string
  technicianName: string
  crewSize: number
  createdAt: ISODate
  scheduledFor: ISODate
  slaDueAt: ISODate
  startedAt: ISODate | null
  completedAt: ISODate | null
  estimatedHours: number
  actualHours: number | null
  description: string
  safetyNotes: string[]
  parts: PartLine[]
  checklist: ChecklistItem[]
  evidenceCount: number
  notes: { author: string; at: ISODate; text: string }[]
  linkedAlarmId: string | null
  downtimeAvoidedMwh: number
}

export interface Technician {
  id: string
  name: string
  role: string
  avatar: string
  phone: string
  certification: string[]
  homeBase: string
  state: IndianState
  status: 'available' | 'travelling' | 'on-site' | 'off-shift'
  position: GeoPoint
  currentWorkOrderId: string | null
  jobsToday: number
  jobsCompletedToday: number
  utilisationPct: number
  yearsExperience: number
}

/* --------------------------------- Projects --------------------------------- */

export type ProjectType = 'EPC' | 'Repowering' | 'O&M Transition' | 'Hybrid'
export type ProjectStage =
  | 'Planning'
  | 'Survey'
  | 'Land'
  | 'Foundation'
  | 'Tower'
  | 'Nacelle'
  | 'Blade'
  | 'Electrical'
  | 'Testing'
  | 'Commissioning'

export interface Milestone {
  id: string
  stage: ProjectStage
  label: string
  plannedStart: ISODate
  plannedEnd: ISODate
  actualStart: ISODate | null
  actualEnd: ISODate | null
  progressPct: number
  owner: string
  dependencies: string[]
  risk: RiskBand
  note: string
}

export interface ProjectRisk {
  id: string
  title: string
  category: 'Land' | 'Grid' | 'Logistics' | 'Weather' | 'Regulatory' | 'Supply' | 'Commercial'
  severity: Severity
  likelihood: 'rare' | 'possible' | 'likely' | 'almost-certain'
  impactDays: number
  owner: string
  mitigation: string
  status: 'open' | 'mitigating' | 'closed'
  raisedAt: ISODate
}

export interface Contractor {
  id: string
  name: string
  scope: 'Civil' | 'Electrical' | 'Crane & Logistics' | 'Erection' | 'Survey'
  contact: string
  performanceScore: number
  onSiteCrew: number
  status: 'mobilised' | 'partial' | 'demobilised' | 'pending'
}

export interface SiteReadinessItem {
  label: string
  status: 'complete' | 'in-progress' | 'blocked' | 'not-started'
  detail: string
}

export interface Project {
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
  completionPct: number
  startedOn: ISODate
  targetCommissioning: ISODate
  forecastCommissioning: ISODate
  delayDays: number
  risk: RiskBand
  projectManager: string
  contractValueCr: number
  spentCr: number
  milestones: Milestone[]
  risks: ProjectRisk[]
  contractors: Contractor[]
  siteReadiness: SiteReadinessItem[]
  turbinesErected: number
  turbinesCommissioned: number
}

/* ----------------------------------- CRM ----------------------------------- */

export type AccountType =
  | 'IPP'
  | 'Utility'
  | 'C&I Captive'
  | 'Infrastructure Fund'
  | 'PSU'
  | 'Corporate PPA'

export interface Account {
  id: string
  name: string
  type: AccountType
  logoTint: string
  region: string
  headquarters: string
  installedMw: number
  activeProjects: number
  serviceContracts: number
  openCases: number
  relationshipOwner: string
  healthScore: number
  healthTrend: Trend
  lastEngagement: ISODate
  since: ISODate
  annualServiceValueCr: number
  website: string
  segments: string[]
  windFarmIds: string[]
  contactIds: string[]
}

export interface Contact {
  id: string
  name: string
  title: string
  accountId: string
  accountName: string
  email: string
  phone: string
  avatar: string
  relationshipOwner: string
  lastContact: ISODate
  location: string
  influence: 'economic-buyer' | 'technical-buyer' | 'champion' | 'user' | 'gatekeeper'
  relatedProjectIds: string[]
  relatedWindFarmIds: string[]
}

export type OpportunityStage =
  | 'Lead'
  | 'Qualified'
  | 'Site Study'
  | 'Proposal'
  | 'Technical Evaluation'
  | 'Commercial'
  | 'Negotiation'
  | 'Won'
  | 'Lost'

export interface OpportunityActivity {
  id: string
  at: ISODate
  type: 'call' | 'meeting' | 'email' | 'site-visit' | 'proposal' | 'note'
  author: string
  summary: string
}

export interface Opportunity {
  id: string
  name: string
  accountId: string
  accountName: string
  stage: OpportunityStage
  capacityMw: number
  state: IndianState
  product: ProductFamily
  valueCr: number
  probabilityPct: number
  expectedClose: ISODate
  owner: string
  createdAt: ISODate
  siteStudyStatus: 'not-started' | 'in-progress' | 'complete'
  meanWindSpeedMs: number | null
  technicalRisks: string[]
  stakeholders: { name: string; role: string; avatar: string }[]
  activities: OpportunityActivity[]
  nextStep: string
  competitor: string | null
}

export interface QuoteLine {
  id: string
  category: 'Turbine Supply' | 'EPC' | 'Logistics' | 'Installation' | 'Service' | 'Grid'
  description: string
  quantity: number
  unit: string
  unitRateLakh: number
}

export interface Quote {
  id: string
  number: string
  opportunityId: string
  accountId: string
  accountName: string
  projectName: string
  product: ProductFamily
  capacityMw: number
  turbineCount: number
  status: 'draft' | 'internal-review' | 'sent' | 'accepted' | 'expired'
  validUntil: ISODate
  createdAt: ISODate
  owner: string
  lines: QuoteLine[]
  servicePackage: 'Standard O&M 5yr' | 'Comprehensive O&M 10yr' | 'Full-Scope 15yr'
  assumptions: string[]
  discountPct: number
}

/* -------------------------------- Documents -------------------------------- */

export type DocumentCategory =
  | 'Contracts'
  | 'EPC Documents'
  | 'Drawings'
  | 'Wind Reports'
  | 'Inspection Reports'
  | 'Commissioning Certificates'
  | 'Warranty'
  | 'Safety Documents'
  | 'Drone Imagery'

export interface DocumentRecord {
  id: string
  name: string
  category: DocumentCategory
  fileType: 'pdf' | 'dwg' | 'xlsx' | 'docx' | 'jpg' | 'zip'
  sizeMb: number
  uploadedBy: string
  uploadedAt: ISODate
  version: string
  relatedTo: { kind: 'wind-farm' | 'turbine' | 'project' | 'account'; id: string; label: string }
  tags: string[]
  confidential: boolean
  thumbnail?: string
}

/* ------------------------------ Command Center ------------------------------ */

export interface FleetKpis {
  installedMw: number
  onlineMw: number
  availabilityPct: number
  availabilityTrend: Trend
  activeTurbines: number
  offlineTurbines: number
  criticalIncidents: number
  maintenanceDueToday: number
  projectsAtRisk: number
  customersImpacted: number
  generationTodayGwh: number
  generationTrend: Trend
  co2AvoidedTonnes: number
  totalTurbines: number
}

export interface AiPriority {
  id: string
  severity: Severity
  headline: string
  whatHappened: string
  whyItMatters: string
  businessImpact: string
  recommendedAction: string
  affectedSiteIds: string[]
  affectedSiteNames: string[]
  affectedMw: number
  affectedCustomers: string[]
  confidencePct: number
  detectedAt: ISODate
  cta: { label: string; href: string }
  category: 'Environmental' | 'Asset Health' | 'Maintenance' | 'Grid' | 'Project' | 'Commercial'
}

export interface OperationalEvent {
  id: string
  at: ISODate
  kind: 'alarm' | 'work-order' | 'environment' | 'grid' | 'project' | 'commissioning' | 'ai'
  severity: Severity
  title: string
  detail: string
  siteId: string | null
  siteName: string | null
  actor: string
}

export interface CommandCenterSummary {
  kpis: FleetKpis
  priorities: AiPriority[]
  activeAlerts: Alarm[]
  windFarms: WindFarm[]
  fieldTeams: Technician[]
  environmentalEvents: EnvironmentEventSummary[]
  timeline: OperationalEvent[]
  generatedAt: ISODate
}

/* -------------------------------- Monitoring -------------------------------- */

export interface FleetHealthMetrics {
  availabilityPct: number
  downtimeHours: number
  mtbfHours: number
  mttrHours: number
  generationGwh: number
  performanceRatioPct: number
  curtailmentPct: number
  alarmCount: number
  availabilitySeries: { t: string; value: number }[]
  generationSeries: { t: string; value: number }[]
  statusDistribution: { status: TurbineStatus; count: number }[]
  siteComparison: { siteId: string; siteName: string; availability: number; plf: number; mw: number }[]
  heatmap: { siteName: string; values: number[] }[]
  productComparison: { product: ProductFamily; availability: number; plf: number; turbines: number; mw: number }[]
}

/* ----------------------------------- AI ----------------------------------- */

export interface AiRelatedRecord {
  kind: 'turbine' | 'wind-farm' | 'work-order' | 'project' | 'account' | 'document'
  id: string
  label: string
  meta: string
  href: string
}

export interface AiResponseCard {
  summary: string
  insight: string
  affectedAssets: { id: string; label: string; detail: string; severity: Severity }[]
  recommendedAction: string
  relatedRecords: AiRelatedRecord[]
  cta: { label: string; href: string } | null
  chart?: {
    kind: 'bar' | 'line'
    title: string
    unit: string
    data: { label: string; value: number }[]
  }
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: ISODate
  card?: AiResponseCard
  pending?: boolean
}

/* ---------------------------------- Roles ---------------------------------- */

export type RoleId =
  | 'executive'
  | 'operations-manager'
  | 'scada-analyst'
  | 'om-engineer'
  | 'field-technician'
  | 'sales'
  | 'project-manager'
  | 'customer'
  | 'contractor'
  | 'landowner'
  | 'supplier'

export interface RoleDefinition {
  id: RoleId
  label: string
  group: 'Internal' | 'External'
  persona: string
  description: string
  landing: string
  /** Navigation keys this role can reach. */
  nav: string[]
  headlineMetrics: string[]
}

/* --------------------------------- Search --------------------------------- */

export interface SearchResult {
  id: string
  kind: 'account' | 'wind-farm' | 'turbine' | 'project' | 'work-order' | 'document' | 'contact'
  title: string
  subtitle: string
  meta: string
  href: string
  status?: string
}

/* -------------------------------- Reports -------------------------------- */

export interface ReportDefinition {
  id: string
  name: string
  description: string
  category: 'Operations' | 'Commercial' | 'Sustainability' | 'Service'
  lastRun: ISODate
  owner: string
  formats: ('PDF' | 'XLSX' | 'CSV')[]
  metrics: { label: string; value: string; delta?: string; deltaGood?: boolean }[]
  series: { label: string; values: number[] }[]
  axis: string[]
}

/* ----------------------------------- Admin ----------------------------------- */

export interface AdminUser {
  id: string
  name: string
  email: string
  avatar: string
  role: string
  department: string
  status: 'active' | 'invited' | 'suspended'
  lastActive: ISODate
  mfa: boolean
  sites: number
}

export interface IntegrationConfig {
  id: string
  name: string
  category: 'SCADA' | 'Environmental' | 'ERP' | 'GIS' | 'Communications' | 'Grid'
  description: string
  status: 'connected' | 'degraded' | 'disconnected' | 'not-configured'
  lastSync: ISODate | null
  recordsPerDay: number
  endpoint: string
}
