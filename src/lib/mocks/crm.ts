import { between, daysAgo, daysAhead, pick, seededRandom, sum } from '@/lib/utils'
import { windFarms } from './fleet'
import { projects } from './projects'
import type {
  Account,
  AccountType,
  Contact,
  IndianState,
  Opportunity,
  OpportunityActivity,
  OpportunityStage,
  ProductFamily,
  Quote,
  QuoteLine,
} from '@/types'

/* --------------------------------- Accounts --------------------------------- */

interface AccountSeed {
  id: string
  name: string
  type: AccountType
  region: string
  headquarters: string
  relationshipOwner: string
  since: string
  website: string
  segments: string[]
  logoTint: string
  health: number
  openCases: number
}

const ACCOUNT_SEEDS: AccountSeed[] = [
  {
    id: 'acc-greengrid', name: 'GreenGrid Power Ltd.', type: 'IPP', region: 'West', headquarters: 'Ahmedabad, Gujarat',
    relationshipOwner: 'Priya Nair', since: '2016-04-11', website: 'greengridpower.example',
    segments: ['Merchant', 'Group Captive'], logoTint: 'var(--series-3)', health: 88, openCases: 4,
  },
  {
    id: 'acc-southcoast', name: 'South Coast Utilities', type: 'Utility', region: 'South', headquarters: 'Chennai, Tamil Nadu',
    relationshipOwner: 'Priya Nair', since: '2014-09-02', website: 'southcoastutilities.example',
    segments: ['Regulated Utility', 'PPA'], logoTint: 'var(--series-1)', health: 74, openCases: 9,
  },
  {
    id: 'acc-aranya', name: 'Aranya Renewables', type: 'Infrastructure Fund', region: 'Pan-India', headquarters: 'Mumbai, Maharashtra',
    relationshipOwner: 'Rohan Kapoor', since: '2019-01-28', website: 'aranyarenewables.example',
    segments: ['Yieldco', 'Repowering'], logoTint: 'var(--series-6)', health: 91, openCases: 2,
  },
  {
    id: 'acc-meridian', name: 'Meridian Industrial Energy', type: 'C&I Captive', region: 'South & West', headquarters: 'Pune, Maharashtra',
    relationshipOwner: 'Nikhil Sharma', since: '2018-06-14', website: 'meridianindustrial.example',
    segments: ['Captive', 'Open Access', 'Hybrid'], logoTint: 'var(--series-2)', health: 66, openCases: 12,
  },
  {
    id: 'acc-horizon', name: 'Horizon Power Ventures', type: 'IPP', region: 'North-West', headquarters: 'Jaipur, Rajasthan',
    relationshipOwner: 'Nikhil Sharma', since: '2021-03-09', website: 'horizonpv.example',
    segments: ['Merchant', 'SECI'], logoTint: 'var(--series-7)', health: 82, openCases: 6,
  },
  {
    id: 'acc-deccan', name: 'Deccan Clean Energy Trust', type: 'Infrastructure Fund', region: 'South', headquarters: 'Bengaluru, Karnataka',
    relationshipOwner: 'Rohan Kapoor', since: '2020-11-23', website: 'deccancleanenergy.example',
    segments: ['Yieldco', 'Corporate PPA'], logoTint: 'var(--series-5)', health: 79, openCases: 3,
  },
  {
    id: 'acc-saurashtra', name: 'Saurashtra Grid Corporation', type: 'PSU', region: 'West', headquarters: 'Rajkot, Gujarat',
    relationshipOwner: 'Priya Nair', since: '2015-07-30', website: 'saurashtragrid.example',
    segments: ['State Utility'], logoTint: 'var(--series-4)', health: 71, openCases: 7,
  },
  {
    id: 'acc-vindhya', name: 'Vindhya Steel & Alloys', type: 'Corporate PPA', region: 'Central', headquarters: 'Indore, Madhya Pradesh',
    relationshipOwner: 'Nikhil Sharma', since: '2023-02-16', website: 'vindhyasteel.example',
    segments: ['Corporate PPA', 'RE100'], logoTint: 'var(--series-8)', health: 85, openCases: 1,
  },
]

export const accounts: Account[] = ACCOUNT_SEEDS.map((seed) => {
  const rng = seededRandom(`account:${seed.id}`)
  const sites = windFarms.filter((w) => w.customerId === seed.id)
  const installedMw = Math.round(sum(sites.map((s) => s.installedMw)) * 10) / 10
  const activeProjects = projects.filter((p) => p.customerId === seed.id).length
  const delta = Math.round(between(rng, -6, 9, 1) * 10) / 10
  return {
    id: seed.id,
    name: seed.name,
    type: seed.type,
    logoTint: seed.logoTint,
    region: seed.region,
    headquarters: seed.headquarters,
    installedMw,
    activeProjects,
    serviceContracts: sites.length,
    openCases: seed.openCases,
    relationshipOwner: seed.relationshipOwner,
    healthScore: seed.health,
    healthTrend: {
      direction: delta > 0.6 ? 'up' : delta < -0.6 ? 'down' : 'flat',
      valuePct: Math.abs(delta),
      upIsGood: true,
    },
    lastEngagement: daysAgo(Math.round(between(rng, 1, 42))),
    since: seed.since,
    annualServiceValueCr: Math.round(installedMw * between(rng, 0.11, 0.19, 3) * 10) / 10,
    website: seed.website,
    segments: seed.segments,
    windFarmIds: sites.map((s) => s.id),
    contactIds: [],
  }
})

const accountById = new Map(accounts.map((a) => [a.id, a]))
export function getAccount(id: string) {
  return accountById.get(id)
}

/* --------------------------------- Contacts --------------------------------- */

const CONTACT_SEEDS: {
  name: string
  title: string
  accountId: string
  location: string
  influence: Contact['influence']
}[] = [
  { name: 'Rajiv Malhotra', title: 'Chief Operating Officer', accountId: 'acc-greengrid', location: 'Ahmedabad', influence: 'economic-buyer' },
  { name: 'Shruti Desai', title: 'Head of Asset Management', accountId: 'acc-greengrid', location: 'Ahmedabad', influence: 'champion' },
  { name: 'Paresh Modi', title: 'Manager — O&M Contracts', accountId: 'acc-greengrid', location: 'Bhuj', influence: 'technical-buyer' },
  { name: 'Dr. Lakshmi Venkatesan', title: 'Director (Generation)', accountId: 'acc-southcoast', location: 'Chennai', influence: 'economic-buyer' },
  { name: 'S. Ramanathan', title: 'Chief Engineer — Renewables', accountId: 'acc-southcoast', location: 'Chennai', influence: 'technical-buyer' },
  { name: 'Bhuvana Sekar', title: 'Senior Manager — Site Operations', accountId: 'acc-southcoast', location: 'Thoothukudi', influence: 'user' },
  { name: 'Aditya Ranganathan', title: 'Managing Partner', accountId: 'acc-aranya', location: 'Mumbai', influence: 'economic-buyer' },
  { name: 'Neha Bhandari', title: 'VP — Portfolio Performance', accountId: 'acc-aranya', location: 'Mumbai', influence: 'champion' },
  { name: 'Girish Iyengar', title: 'Group Head — Energy', accountId: 'acc-meridian', location: 'Pune', influence: 'economic-buyer' },
  { name: 'Farhan Qureshi', title: 'Manager — Power Procurement', accountId: 'acc-meridian', location: 'Pune', influence: 'gatekeeper' },
  { name: 'Sunita Rao', title: 'Plant Head — Anantapur', accountId: 'acc-meridian', location: 'Anantapur', influence: 'user' },
  { name: 'Vikram Singh Shekhawat', title: 'Founder & CEO', accountId: 'acc-horizon', location: 'Jaipur', influence: 'economic-buyer' },
  { name: 'Ritu Agarwal', title: 'Head of Engineering', accountId: 'acc-horizon', location: 'Jaipur', influence: 'technical-buyer' },
  { name: 'Kiran Shetty', title: 'Investment Director', accountId: 'acc-deccan', location: 'Bengaluru', influence: 'economic-buyer' },
  { name: 'Mohan Prabhu', title: 'Head — Technical Due Diligence', accountId: 'acc-deccan', location: 'Bengaluru', influence: 'technical-buyer' },
  { name: 'J. K. Vaghela', title: 'Superintending Engineer', accountId: 'acc-saurashtra', location: 'Rajkot', influence: 'technical-buyer' },
  { name: 'Alpa Trivedi', title: 'Deputy General Manager (Wind)', accountId: 'acc-saurashtra', location: 'Rajkot', influence: 'economic-buyer' },
  { name: 'Sanjay Agrawal', title: 'Head — Sustainability', accountId: 'acc-vindhya', location: 'Indore', influence: 'champion' },
]

export const contacts: Contact[] = CONTACT_SEEDS.map((seed, i) => {
  const rng = seededRandom(`contact:${seed.name}`)
  const account = accountById.get(seed.accountId)!
  return {
    id: `con-${String(i + 1).padStart(3, '0')}`,
    name: seed.name,
    title: seed.title,
    accountId: seed.accountId,
    accountName: account.name,
    email: `${seed.name.toLowerCase().replace(/[^a-z ]/g, '').split(' ').slice(-2).join('.')}@${account.website}`,
    phone: `+91 ${Math.round(between(rng, 70, 99))}${Math.round(between(rng, 10000000, 99999999))}`,
    avatar: '',
    relationshipOwner: account.relationshipOwner,
    lastContact: daysAgo(Math.round(between(rng, 1, 70))),
    location: seed.location,
    influence: seed.influence,
    relatedProjectIds: projects.filter((p) => p.customerId === seed.accountId).map((p) => p.id).slice(0, 3),
    relatedWindFarmIds: account.windFarmIds.slice(0, 3),
  }
})

for (const account of accounts) {
  account.contactIds = contacts.filter((c) => c.accountId === account.id).map((c) => c.id)
}

export function getContactsForAccount(accountId: string) {
  return contacts.filter((c) => c.accountId === accountId)
}

/* ------------------------------- Opportunities ------------------------------- */

interface OppSeed {
  id: string
  name: string
  accountId: string
  stage: OpportunityStage
  capacityMw: number
  state: IndianState
  product: ProductFamily
  probability: number
  closeInDays: number
  owner: string
  nextStep: string
  competitor: string | null
  risks: string[]
}

const OPP_SEEDS: OppSeed[] = [
  { id: 'opp-001', name: 'GreenGrid Kutch Repowering Tranche 2', accountId: 'acc-greengrid', stage: 'Negotiation', capacityMw: 63, state: 'Gujarat', product: 'S144', probability: 78, closeInDays: 34, owner: 'Priya Nair', nextStep: 'Close commercial terms on the escalation clause with procurement.', competitor: 'Regional OEM', risks: ['Existing foundations require load re-verification for the larger rotor.', 'Evacuation bay upgrade needed at Bhuj 220 kV.'] },
  { id: 'opp-002', name: 'South Coast Thoothukudi Phase 3', accountId: 'acc-southcoast', stage: 'Technical Evaluation', capacityMw: 126, state: 'Tamil Nadu', product: 'S144', probability: 62, closeInDays: 71, owner: 'Priya Nair', nextStep: 'Submit the revised yield assessment incorporating the customer’s met-mast data.', competitor: 'International OEM', risks: ['Cyclone-class certification evidence requested for the coastal envelope.', 'Customer benchmarking against a 4 MW class machine.'] },
  { id: 'opp-003', name: 'Aranya Dhule Corridor Extension', accountId: 'acc-aranya', stage: 'Proposal', capacityMw: 75, state: 'Maharashtra', product: 'S133', probability: 55, closeInDays: 58, owner: 'Rohan Kapoor', nextStep: 'Present the 15-year full-scope service model to the investment committee.', competitor: null, risks: ['Land aggregation still at 68% of target.'] },
  { id: 'opp-004', name: 'Meridian Anantapur Hybrid Phase 2', accountId: 'acc-meridian', stage: 'Site Study', capacityMw: 94.5, state: 'Andhra Pradesh', product: 'S144', probability: 40, closeInDays: 112, owner: 'Nikhil Sharma', nextStep: 'Complete the 12-month wind resource campaign and issue the P50/P90 report.', competitor: 'International OEM', risks: ['Solar co-location reduces the usable wind envelope.', 'Grid curtailment history in the district needs quantifying.'] },
  { id: 'opp-005', name: 'Horizon Barmer Phase 3', accountId: 'acc-horizon', stage: 'Commercial', capacityMw: 100.8, state: 'Rajasthan', product: 'S144', probability: 70, closeInDays: 45, owner: 'Nikhil Sharma', nextStep: 'Align on the liquidated-damages structure carried over from Phase 2.', competitor: null, risks: ['Phase 2 delay has made the customer sensitive on schedule guarantees.'] },
  { id: 'opp-006', name: 'Deccan Chitradurga Repowering', accountId: 'acc-deccan', stage: 'Qualified', capacityMw: 54, state: 'Karnataka', product: 'S133', probability: 30, closeInDays: 145, owner: 'Rohan Kapoor', nextStep: 'Schedule the technical due-diligence workshop with the fund’s advisors.', competitor: 'Regional OEM', risks: ['Repowering policy clarity pending at the state level.'] },
  { id: 'opp-007', name: 'Saurashtra Grid Bhuj Uprate', accountId: 'acc-saurashtra', stage: 'Proposal', capacityMw: 48, state: 'Gujarat', product: 'S133', probability: 48, closeInDays: 66, owner: 'Priya Nair', nextStep: 'Respond to the tender clarification set by the closing date.', competitor: 'Regional OEM', risks: ['Public tender — price weighting is 70%.'] },
  { id: 'opp-008', name: 'Vindhya Steel Captive Wind', accountId: 'acc-vindhya', stage: 'Lead', capacityMw: 36, state: 'Madhya Pradesh', product: 'S133', probability: 18, closeInDays: 190, owner: 'Nikhil Sharma', nextStep: 'Qualify the open-access pathway with the state discom before investing further.', competitor: null, risks: ['Open-access charges in the state are under revision.'] },
  { id: 'opp-009', name: 'GreenGrid Dwarka Blade Upgrade', accountId: 'acc-greengrid', stage: 'Won', capacityMw: 30, state: 'Gujarat', product: 'S120', probability: 100, closeInDays: -18, owner: 'Priya Nair', nextStep: 'Handover to project delivery — kick-off scheduled.', competitor: null, risks: [] },
  { id: 'opp-010', name: 'Meridian Satara Service Renewal', accountId: 'acc-meridian', stage: 'Negotiation', capacityMw: 96, state: 'Maharashtra', product: 'S133', probability: 65, closeInDays: 28, owner: 'Nikhil Sharma', nextStep: 'Resolve the availability-guarantee threshold at 97.5% versus 98%.', competitor: 'Independent service provider', risks: ['Customer citing three availability misses in the last 12 months.'] },
  { id: 'opp-011', name: 'South Coast Kayathar Repowering', accountId: 'acc-southcoast', stage: 'Site Study', capacityMw: 68, state: 'Tamil Nadu', product: 'S144', probability: 35, closeInDays: 128, owner: 'Priya Nair', nextStep: 'Micro-siting study for the existing 34-position layout.', competitor: null, risks: ['Existing turbines still within their warranty tail.'] },
  { id: 'opp-012', name: 'Aranya Ratlam Phase 3', accountId: 'acc-aranya', stage: 'Lost', capacityMw: 42, state: 'Madhya Pradesh', product: 'S133', probability: 0, closeInDays: -46, owner: 'Rohan Kapoor', nextStep: 'Post-mortem complete — revisit at the next capex cycle.', competitor: 'International OEM', risks: [] },
]

const ACTIVITY_TEMPLATES: { type: OpportunityActivity['type']; summary: string }[] = [
  { type: 'meeting', summary: 'Technical workshop covering the power curve, availability guarantee and grid-compliance envelope.' },
  { type: 'site-visit', summary: 'Customer team visited the reference site; walked the nacelle and reviewed the service model.' },
  { type: 'proposal', summary: 'Commercial proposal issued with the 10-year comprehensive O&M option priced separately.' },
  { type: 'call', summary: 'Alignment call on the delivery schedule and the crane campaign window.' },
  { type: 'email', summary: 'Shared the P50/P90 yield assessment and the independent engineer’s summary.' },
  { type: 'note', summary: 'Competitor is understood to be positioning a larger rotor at a higher price point.' },
  { type: 'meeting', summary: 'Review with the customer’s independent engineer on foundation load assumptions.' },
]

const STAKEHOLDER_ROLES = ['Economic buyer', 'Technical evaluator', 'Procurement', 'Independent engineer', 'Site operations']

export const opportunities: Opportunity[] = OPP_SEEDS.map((seed) => {
  const rng = seededRandom(`opp:${seed.id}`)
  const account = accountById.get(seed.accountId)!
  const accountContacts = contacts.filter((c) => c.accountId === seed.accountId)
  const perMwCr = seed.product === 'S144' ? 6.3 : seed.product === 'S133' ? 6.1 : 5.8

  const activityCount = Math.round(between(rng, 3, 7))
  const activities: OpportunityActivity[] = Array.from({ length: activityCount }, (_, i) => {
    const tpl = ACTIVITY_TEMPLATES[(i * 2 + Math.round(seed.capacityMw)) % ACTIVITY_TEMPLATES.length]!
    return {
      id: `${seed.id}-act-${i}`,
      at: daysAgo(Math.round(between(rng, 2, 24)) + i * 13),
      type: tpl.type,
      author: seed.owner,
      summary: tpl.summary,
    }
  }).sort((a, b) => (a.at < b.at ? 1 : -1))

  const studyStatus: Opportunity['siteStudyStatus'] =
    seed.stage === 'Lead' || seed.stage === 'Qualified'
      ? 'not-started'
      : seed.stage === 'Site Study'
        ? 'in-progress'
        : 'complete'

  return {
    id: seed.id,
    name: seed.name,
    accountId: seed.accountId,
    accountName: account.name,
    stage: seed.stage,
    capacityMw: seed.capacityMw,
    state: seed.state,
    product: seed.product,
    valueCr: Math.round(seed.capacityMw * perMwCr * 10) / 10,
    probabilityPct: seed.probability,
    expectedClose: daysAhead(seed.closeInDays),
    owner: seed.owner,
    createdAt: daysAgo(Math.round(between(rng, 90, 420))),
    siteStudyStatus: studyStatus,
    meanWindSpeedMs: studyStatus === 'not-started' ? null : Math.round(between(rng, 6.6, 9.2, 1) * 10) / 10,
    technicalRisks: seed.risks,
    stakeholders: accountContacts.slice(0, 3).map((c, i) => ({
      name: c.name,
      role: STAKEHOLDER_ROLES[i % STAKEHOLDER_ROLES.length]!,
      avatar: '',
    })),
    activities,
    nextStep: seed.nextStep,
    competitor: seed.competitor,
  }
})

const opportunityById = new Map(opportunities.map((o) => [o.id, o]))
export function getOpportunity(id: string) {
  return opportunityById.get(id)
}
export function getOpportunitiesForAccount(accountId: string) {
  return opportunities.filter((o) => o.accountId === accountId)
}

export const pipelineSummary = {
  openValueCr: Math.round(
    opportunities.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost').reduce((a, o) => a + o.valueCr, 0),
  ),
  weightedValueCr: Math.round(
    opportunities
      .filter((o) => o.stage !== 'Won' && o.stage !== 'Lost')
      .reduce((a, o) => a + (o.valueCr * o.probabilityPct) / 100, 0),
  ),
  openMw: Math.round(
    opportunities.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost').reduce((a, o) => a + o.capacityMw, 0) * 10,
  ) / 10,
  wonThisYear: opportunities.filter((o) => o.stage === 'Won').length,
  winRatePct: Math.round(
    (opportunities.filter((o) => o.stage === 'Won').length /
      Math.max(1, opportunities.filter((o) => o.stage === 'Won' || o.stage === 'Lost').length)) *
      100,
  ),
}

/* ---------------------------------- Quotes ---------------------------------- */

function buildLines(product: ProductFamily, mw: number, count: number, rng: () => number): QuoteLine[] {
  const perTurbineCr = product === 'S144' ? 17.2 : product === 'S133' ? 16.1 : 12.4
  return [
    { id: 'ql-1', category: 'Turbine Supply', description: `${product} wind turbine generator — supply, ex-works`, quantity: count, unit: 'nos', unitRateLakh: Math.round(perTurbineCr * 100) },
    { id: 'ql-2', category: 'EPC', description: 'Foundation design, civil works and internal access roads', quantity: count, unit: 'nos', unitRateLakh: Math.round(between(rng, 168, 214)) },
    { id: 'ql-3', category: 'Logistics', description: 'Inland transport, ODC permits and site handling', quantity: count, unit: 'nos', unitRateLakh: Math.round(between(rng, 52, 78)) },
    { id: 'ql-4', category: 'Installation', description: 'Erection, crane campaign and pre-commissioning', quantity: count, unit: 'nos', unitRateLakh: Math.round(between(rng, 96, 132)) },
    { id: 'ql-5', category: 'Grid', description: 'Internal grid, pooling substation and evacuation interface', quantity: 1, unit: 'lot', unitRateLakh: Math.round(mw * between(rng, 24, 34)) },
    { id: 'ql-6', category: 'Service', description: 'Operations & maintenance — contracted term', quantity: mw, unit: 'MW/yr', unitRateLakh: Math.round(between(rng, 11, 17)) },
  ]
}

const QUOTE_SEEDS: { id: string; opportunityId: string; status: Quote['status']; servicePackage: Quote['servicePackage']; discount: number }[] = [
  { id: 'qt-001', opportunityId: 'opp-001', status: 'sent', servicePackage: 'Comprehensive O&M 10yr', discount: 3.5 },
  { id: 'qt-002', opportunityId: 'opp-002', status: 'internal-review', servicePackage: 'Full-Scope 15yr', discount: 2.0 },
  { id: 'qt-003', opportunityId: 'opp-003', status: 'sent', servicePackage: 'Full-Scope 15yr', discount: 4.2 },
  { id: 'qt-004', opportunityId: 'opp-005', status: 'sent', servicePackage: 'Full-Scope 15yr', discount: 1.5 },
  { id: 'qt-005', opportunityId: 'opp-007', status: 'draft', servicePackage: 'Standard O&M 5yr', discount: 0 },
  { id: 'qt-006', opportunityId: 'opp-009', status: 'accepted', servicePackage: 'Comprehensive O&M 10yr', discount: 5.0 },
  { id: 'qt-007', opportunityId: 'opp-010', status: 'internal-review', servicePackage: 'Comprehensive O&M 10yr', discount: 6.5 },
]

export const quotes: Quote[] = QUOTE_SEEDS.map((seed, i) => {
  const rng = seededRandom(`quote:${seed.id}`)
  const opp = opportunityById.get(seed.opportunityId)!
  const turbineCount = Math.max(1, Math.round(opp.capacityMw / (opp.product === 'S120' ? 2.1 : opp.product === 'S133' ? 3.0 : 3.15)))
  return {
    id: seed.id,
    number: `SZ/Q/2026/${String(i + 1).padStart(4, '0')}`,
    opportunityId: seed.opportunityId,
    accountId: opp.accountId,
    accountName: opp.accountName,
    projectName: opp.name,
    product: opp.product,
    capacityMw: opp.capacityMw,
    turbineCount,
    status: seed.status,
    validUntil: daysAhead(Math.round(between(rng, 12, 90))),
    createdAt: daysAgo(Math.round(between(rng, 5, 80))),
    owner: opp.owner,
    lines: buildLines(opp.product, opp.capacityMw, turbineCount, rng),
    servicePackage: seed.servicePackage,
    assumptions: [
      'Prices are ex-works and exclude GST and other statutory levies.',
      'Foundation design assumes a minimum safe bearing capacity of 20 t/m² — subject to the geotechnical report.',
      'Grid evacuation bay and transmission connectivity are in the customer’s scope.',
      `Availability guarantee of ${seed.servicePackage === 'Full-Scope 15yr' ? '98.0' : '97.0'}% on a time-based annual average.`,
      'Validity is subject to steel and logistics index movement beyond ±4%.',
    ],
    discountPct: seed.discount,
  }
})

export function quoteTotalCr(quote: Quote) {
  const gross = quote.lines.reduce((a, l) => a + (l.quantity * l.unitRateLakh) / 100, 0)
  return Math.round(gross * (1 - quote.discountPct / 100) * 10) / 10
}

const quoteById = new Map(quotes.map((q) => [q.id, q]))
export function getQuote(id: string) {
  return quoteById.get(id)
}
