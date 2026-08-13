import { fmtGwh, fmtMw, fmtPct } from '@/lib/formatters'
import { between, daysAgo, seededRandom } from '@/lib/utils'
import { fleetKpis } from './command-center'
import { fleetHealth } from './monitoring'
import { maintenanceSummary } from './maintenance'
import { pipelineSummary } from './crm'
import { projectSummary } from './projects'
import { environmentSummary } from './environment'
import type { AdminUser, IntegrationConfig, ReportDefinition } from '@/types'

const rng = seededRandom('reports:v1')
const MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']

function series(base: number, spread: number, drift = 0) {
  return MONTHS.map((_, i) => Math.round((base + drift * i + Math.sin(i / 2.2) * spread + between(rng, -spread / 2, spread / 2, 2)) * 10) / 10)
}

export const reports: ReportDefinition[] = [
  {
    id: 'rep-fleet-availability',
    name: 'Fleet Availability',
    description: 'Time-based availability across the operating fleet, split by region and product family.',
    category: 'Operations',
    lastRun: daysAgo(1),
    owner: 'Vikram Deshpande',
    formats: ['PDF', 'XLSX', 'CSV'],
    metrics: [
      { label: 'Fleet availability', value: fmtPct(fleetHealth.availabilityPct), delta: '−0.6 pp', deltaGood: false },
      { label: 'Contractual threshold', value: '97.0%' },
      { label: 'Sites below threshold', value: '3', delta: '+1', deltaGood: false },
      { label: 'Downtime hours', value: `${fleetHealth.downtimeHours} h`, delta: '+142 h', deltaGood: false },
    ],
    series: [
      { label: 'Actual availability', values: series(96.4, 1.4) },
      { label: 'Contractual threshold', values: MONTHS.map(() => 97) },
    ],
    axis: MONTHS,
  },
  {
    id: 'rep-generation',
    name: 'Energy Generation',
    description: 'Gross and net generation with plant load factor, reconciled against the P50 yield estimate.',
    category: 'Operations',
    lastRun: daysAgo(1),
    owner: 'Sneha Iyer',
    formats: ['PDF', 'XLSX', 'CSV'],
    metrics: [
      { label: 'Generation (12 mo)', value: fmtGwh(3184, 0), delta: '+4.2%', deltaGood: true },
      { label: 'Plant load factor', value: fmtPct(fleetHealth.performanceRatioPct), delta: '+0.8 pp', deltaGood: true },
      { label: 'Against P50', value: '102.1%', delta: '+2.1 pp', deltaGood: true },
      { label: 'Curtailment loss', value: fmtPct(fleetHealth.curtailmentPct), delta: '+0.4 pp', deltaGood: false },
    ],
    series: [
      { label: 'Actual generation', values: series(268, 44, 1.2) },
      { label: 'P50 estimate', values: series(262, 38, 0.9) },
    ],
    axis: MONTHS,
  },
  {
    id: 'rep-maintenance',
    name: 'Maintenance Performance',
    description: 'Work-order throughput, SLA adherence, and the preventive-to-corrective mix.',
    category: 'Service',
    lastRun: daysAgo(2),
    owner: 'Rahul Menon',
    formats: ['PDF', 'XLSX'],
    metrics: [
      { label: 'Orders completed', value: String(maintenanceSummary.completedThisMonth), delta: '+18', deltaGood: true },
      { label: 'SLA adherence', value: '91.4%', delta: '−2.1 pp', deltaGood: false },
      { label: 'Mean time to repair', value: `${fleetHealth.mttrHours} h`, delta: '−1.4 h', deltaGood: true },
      { label: 'Preventive share', value: '63%', delta: '+4 pp', deltaGood: true },
    ],
    series: [
      { label: 'Preventive', values: series(48, 12, 0.6) },
      { label: 'Corrective', values: series(26, 9) },
      { label: 'Breakdown', values: series(11, 5, -0.2) },
    ],
    axis: MONTHS,
  },
  {
    id: 'rep-projects',
    name: 'Project Execution',
    description: 'Milestone adherence, forecast commissioning dates and delay exposure across the project book.',
    category: 'Operations',
    lastRun: daysAgo(3),
    owner: 'Arun Bhatt',
    formats: ['PDF', 'XLSX'],
    metrics: [
      { label: 'Projects in flight', value: String(projectSummary.total) },
      { label: 'Pipeline capacity', value: fmtMw(projectSummary.pipelineMw, 0) },
      { label: 'At risk', value: String(projectSummary.atRisk), delta: '+1', deltaGood: false },
      { label: 'Average delay', value: `${projectSummary.averageDelayDays} days`, delta: '+4 days', deltaGood: false },
    ],
    series: [
      { label: 'Planned MW commissioned', values: series(42, 22, 2.1) },
      { label: 'Actual MW commissioned', values: series(36, 24, 1.7) },
    ],
    axis: MONTHS,
  },
  {
    id: 'rep-customer',
    name: 'Customer Performance',
    description: 'Availability, generation and service responsiveness presented per customer portfolio.',
    category: 'Commercial',
    lastRun: daysAgo(4),
    owner: 'Priya Nair',
    formats: ['PDF', 'XLSX', 'CSV'],
    metrics: [
      { label: 'Customers', value: '8' },
      { label: 'Guarantees met', value: '6 of 8', delta: '−1', deltaGood: false },
      { label: 'Open cases', value: '44', delta: '+6', deltaGood: false },
      { label: 'Service value', value: '₹186 Cr', delta: '+9.2%', deltaGood: true },
    ],
    series: [
      { label: 'Portfolio availability', values: series(96.8, 1.1) },
      { label: 'Guarantee threshold', values: MONTHS.map(() => 97) },
    ],
    axis: MONTHS,
  },
  {
    id: 'rep-environment',
    name: 'Environmental Risk',
    description: 'Exposure to cyclone, seismic, flood and lightning events, with inspection follow-through.',
    category: 'Operations',
    lastRun: daysAgo(1),
    owner: 'Vikram Deshpande',
    formats: ['PDF'],
    metrics: [
      { label: 'Active alerts', value: String(environmentSummary.activeAlerts) },
      { label: 'Sites under watch', value: String(environmentSummary.sitesUnderWatch) },
      { label: 'Seismic events (14 d)', value: String(environmentSummary.seismicEvents14d) },
      { label: 'Inspections outstanding', value: String(environmentSummary.inspectionsOutstanding) },
    ],
    series: [
      { label: 'Weather-driven downtime (h)', values: series(64, 34, 1.4) },
      { label: 'Environmental inspections', values: series(9, 6) },
    ],
    axis: MONTHS,
  },
  {
    id: 'rep-esg',
    name: 'ESG & Safety',
    description: 'Safety observations, lost-time incidents, training compliance and community engagement.',
    category: 'Sustainability',
    lastRun: daysAgo(9),
    owner: 'Anjali Raghunathan',
    formats: ['PDF', 'XLSX'],
    metrics: [
      { label: 'Lost-time incidents', value: '0', delta: '0', deltaGood: true },
      { label: 'Safety observations', value: '412', delta: '+64', deltaGood: true },
      { label: 'GWO compliance', value: '98.6%', delta: '+1.2 pp', deltaGood: true },
      { label: 'Community programmes', value: '11' },
    ],
    series: [
      { label: 'Safety observations logged', values: series(34, 11, 0.8) },
      { label: 'Near-miss reports', values: series(9, 4) },
    ],
    axis: MONTHS,
  },
  {
    id: 'rep-carbon',
    name: 'Carbon Impact',
    description: 'Avoided emissions derived from delivered generation, using the published grid emission factor.',
    category: 'Sustainability',
    lastRun: daysAgo(2),
    owner: 'Anjali Raghunathan',
    formats: ['PDF', 'CSV'],
    metrics: [
      { label: 'CO₂ avoided (12 mo)', value: '2.26 Mt', delta: '+4.2%', deltaGood: true },
      { label: 'Today', value: `${fleetKpis.co2AvoidedTonnes} t` },
      { label: 'Emission factor', value: '0.71 tCO₂/MWh' },
      { label: 'Equivalent households', value: '1.9 M' },
    ],
    series: [{ label: 'CO₂ avoided (kt)', values: series(190, 32, 0.9) }],
    axis: MONTHS,
  },
  {
    id: 'rep-service',
    name: 'Service Performance',
    description: 'Technician utilisation, first-time-fix rate and spare-part availability by region.',
    category: 'Service',
    lastRun: daysAgo(5),
    owner: 'Rahul Menon',
    formats: ['PDF', 'XLSX'],
    metrics: [
      { label: 'Technician utilisation', value: '78.4%', delta: '+2.6 pp', deltaGood: true },
      { label: 'First-time fix', value: '86.1%', delta: '−1.3 pp', deltaGood: false },
      { label: 'Parts availability', value: '92.7%', delta: '−3.4 pp', deltaGood: false },
      { label: 'Jobs per technician', value: '4.2' },
    ],
    series: [
      { label: 'Utilisation %', values: series(76, 6, 0.3) },
      { label: 'First-time fix %', values: series(86, 5) },
    ],
    axis: MONTHS,
  },
]

export const reportById = new Map(reports.map((r) => [r.id, r]))

/* ----------------------------------- Admin ----------------------------------- */

export const adminUsers: AdminUser[] = [
  { id: 'usr-01', name: 'Anjali Raghunathan', email: 'anjali.r@suzlon.example', avatar: '', role: 'Executive Leadership', department: 'Corporate', status: 'active', lastActive: daysAgo(0), mfa: true, sites: 15 },
  { id: 'usr-02', name: 'Vikram Deshpande', email: 'vikram.d@suzlon.example', avatar: '', role: 'Operations Manager', department: 'Operations', status: 'active', lastActive: daysAgo(0), mfa: true, sites: 15 },
  { id: 'usr-03', name: 'Sneha Iyer', email: 'sneha.i@suzlon.example', avatar: '', role: 'SCADA Analyst', department: 'Remote Monitoring', status: 'active', lastActive: daysAgo(0), mfa: true, sites: 15 },
  { id: 'usr-04', name: 'Rahul Menon', email: 'rahul.m@suzlon.example', avatar: '', role: 'O&M Engineer', department: 'Service', status: 'active', lastActive: daysAgo(1), mfa: true, sites: 9 },
  { id: 'usr-05', name: 'Karthik Selvam', email: 'karthik.s@suzlon.example', avatar: '', role: 'Field Technician', department: 'Service', status: 'active', lastActive: daysAgo(0), mfa: false, sites: 2 },
  { id: 'usr-06', name: 'Priya Nair', email: 'priya.n@suzlon.example', avatar: '', role: 'Sales & BD', department: 'Commercial', status: 'active', lastActive: daysAgo(1), mfa: true, sites: 15 },
  { id: 'usr-07', name: 'Arun Bhatt', email: 'arun.b@suzlon.example', avatar: '', role: 'Project Manager', department: 'Projects', status: 'active', lastActive: daysAgo(2), mfa: true, sites: 4 },
  { id: 'usr-08', name: 'Vasudha Reddy', email: 'vasudha.r@suzlon.example', avatar: '', role: 'Project Manager', department: 'Projects', status: 'active', lastActive: daysAgo(0), mfa: true, sites: 2 },
  { id: 'usr-09', name: 'Rohan Kapoor', email: 'rohan.k@suzlon.example', avatar: '', role: 'Sales & BD', department: 'Commercial', status: 'active', lastActive: daysAgo(3), mfa: true, sites: 15 },
  { id: 'usr-10', name: 'Meena Rajendran', email: 'meena.r@suzlon.example', avatar: '', role: 'Project Manager', department: 'Projects', status: 'active', lastActive: daysAgo(1), mfa: true, sites: 3 },
  { id: 'usr-11', name: 'Nikhil Sharma', email: 'nikhil.s@suzlon.example', avatar: '', role: 'Sales & BD', department: 'Commercial', status: 'invited', lastActive: daysAgo(14), mfa: false, sites: 0 },
  { id: 'usr-12', name: 'Deepa Krishnan', email: 'deepa.k@suzlon.example', avatar: '', role: 'SCADA Analyst', department: 'Remote Monitoring', status: 'active', lastActive: daysAgo(0), mfa: true, sites: 6 },
  { id: 'usr-13', name: 'Imran Sheikh', email: 'imran.s@suzlon.example', avatar: '', role: 'Field Technician', department: 'Service', status: 'active', lastActive: daysAgo(0), mfa: false, sites: 3 },
  { id: 'usr-14', name: 'Sameer Kulkarni', email: 'sameer.k@suzlon.example', avatar: '', role: 'Operations Manager', department: 'Operations', status: 'suspended', lastActive: daysAgo(48), mfa: true, sites: 0 },
]

export const integrations: IntegrationConfig[] = [
  { id: 'int-scada', name: 'Fleet SCADA Gateway', category: 'SCADA', description: 'Ten-minute and one-second telemetry from turbine controllers across all operating sites.', status: 'connected', lastSync: daysAgo(0), recordsPerDay: 18_400_000, endpoint: 'opc-ua://scada-gateway.internal:4840' },
  { id: 'int-cms', name: 'Condition Monitoring Platform', category: 'SCADA', description: 'Drivetrain vibration spectra and envelope-band trends feeding the predictive queue.', status: 'connected', lastSync: daysAgo(0), recordsPerDay: 96_000, endpoint: 'https://cms.internal/api/v3' },
  { id: 'int-weather', name: 'Meteorological Feed', category: 'Environmental', description: 'Site-level observations and 36-hour forecast at 3-hour resolution.', status: 'connected', lastSync: daysAgo(0), recordsPerDay: 4_320, endpoint: 'https://met-feed.example/v2/observations' },
  { id: 'int-seismic', name: 'Seismic Event Feed', category: 'Environmental', description: 'National seismology network events filtered to a 300 km radius of monitored assets.', status: 'connected', lastSync: daysAgo(0), recordsPerDay: 40, endpoint: 'https://seismic.example/events' },
  { id: 'int-cyclone', name: 'Cyclone Advisory Service', category: 'Environmental', description: 'Track, intensity and forecast cone bulletins for the North Indian Ocean basins.', status: 'degraded', lastSync: daysAgo(0), recordsPerDay: 24, endpoint: 'https://cyclone-advisory.example/bulletins' },
  { id: 'int-tsunami', name: 'Tsunami Advisory Centre', category: 'Environmental', description: 'Coastal advisory, watch and warning bulletins for Indian coastline segments.', status: 'connected', lastSync: daysAgo(0), recordsPerDay: 6, endpoint: 'https://tsunami-advisory.example/alerts' },
  { id: 'int-lightning', name: 'Lightning Detection Network', category: 'Environmental', description: 'Strike geolocation clustered to a 60-minute rolling window.', status: 'connected', lastSync: daysAgo(0), recordsPerDay: 12_800, endpoint: 'https://lightning.example/strikes' },
  { id: 'int-flood', name: 'Basin & Reservoir Levels', category: 'Environmental', description: 'Reservoir storage and river-stage telemetry for basins containing operating assets.', status: 'not-configured', lastSync: null, recordsPerDay: 0, endpoint: '—' },
  { id: 'int-erp', name: 'Enterprise Resource Planning', category: 'ERP', description: 'Spare-part stock, purchase orders and service billing.', status: 'connected', lastSync: daysAgo(0), recordsPerDay: 32_000, endpoint: 'https://erp.internal/odata/v4' },
  { id: 'int-gis', name: 'GIS & Micro-siting', category: 'GIS', description: 'Turbine coordinates, land parcels, access tracks and site boundaries.', status: 'connected', lastSync: daysAgo(2), recordsPerDay: 900, endpoint: 'https://gis.internal/wfs' },
  { id: 'int-sldc', name: 'Grid Dispatch Interface', category: 'Grid', description: 'State load dispatch instructions, curtailment notices and scheduling.', status: 'degraded', lastSync: daysAgo(0), recordsPerDay: 1_440, endpoint: 'https://sldc-interface.example/api' },
  { id: 'int-comms', name: 'Field Communications', category: 'Communications', description: 'Crew dispatch notifications, escalation paging and shift handover.', status: 'connected', lastSync: daysAgo(0), recordsPerDay: 2_100, endpoint: 'https://comms.internal/notify' },
]
