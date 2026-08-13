/* ------------------------------------------------------------------ *
 * Mock API layer
 *
 * Frontend-only. Every function mimics a network call: it resolves
 * asynchronously with simulated latency and, when fault injection is
 * enabled, fails often enough to exercise the error states for real.
 * There is no server, no database and no authentication in Phase 1.
 * ------------------------------------------------------------------ */

import { delay } from '@/lib/utils'
import { answerQuery } from '@/lib/mocks/ai'
import { commandCenterSummary, fleetKpis, aiPriorities, operationalTimeline } from '@/lib/mocks/command-center'
import { accounts, contacts, getAccount, getContactsForAccount, getOpportunitiesForAccount, getOpportunity, getQuote, opportunities, pipelineSummary, quotes } from '@/lib/mocks/crm'
import { documentSummary, documents, getDocument, getDocumentsFor } from '@/lib/mocks/documents'
import {
  cyclones,
  earthquakes,
  environmentEvents,
  environmentSummary,
  floodZones,
  lightningClusters,
  tsunamiAlerts,
  weatherReadings,
} from '@/lib/mocks/environment'
import {
  alarms,
  fleetTotals,
  getAlarmsForSite,
  getTurbine,
  getTurbineDetail,
  getTurbinesForSite,
  getWindFarm,
  turbines,
  windFarms,
} from '@/lib/mocks/fleet'
import {
  getWorkOrder,
  getWorkOrdersForSite,
  getWorkOrdersForTechnician,
  getWorkOrdersForTurbine,
  maintenanceMatrix,
  maintenanceSummary,
  technicians,
  workOrders,
} from '@/lib/mocks/maintenance'
import { alarmsByCategory, fleetHealth, underperformers, workOrdersByType } from '@/lib/mocks/monitoring'
import { getProject, getProjectsForAccount, getProjectsForSite, projectSummary, projects } from '@/lib/mocks/projects'
import { adminUsers, integrations, reportById, reports } from '@/lib/mocks/reports'
import { search } from '@/lib/mocks/search'
import type { AiResponseCard, SearchResult } from '@/types'

/* ------------------------------ Fault injection ------------------------------ */

let faultInjection = false
let requestCounter = 0

export function setFaultInjection(enabled: boolean) {
  faultInjection = enabled
  requestCounter = 0
}
export function isFaultInjectionEnabled() {
  return faultInjection
}

export class MockApiError extends Error {
  readonly status: number
  constructor(message: string, status = 503) {
    super(message)
    this.name = 'MockApiError'
    this.status = status
  }
}

const FAILURE_MESSAGES = [
  'Upstream SCADA gateway did not respond within the timeout window.',
  'Environmental data source is temporarily unavailable.',
  'Request rejected by the API gateway — retry shortly.',
]

/** Wraps a value in a simulated round trip. */
async function respond<T>(value: T | (() => T), minMs = 140, maxMs = 420): Promise<T> {
  requestCounter++
  await delay(minMs + Math.round((maxMs - minMs) * ((requestCounter * 37) % 100) / 100))
  if (faultInjection && requestCounter % 7 === 0) {
    throw new MockApiError(FAILURE_MESSAGES[requestCounter % FAILURE_MESSAGES.length]!)
  }
  return typeof value === 'function' ? (value as () => T)() : value
}

async function respondOr404<T>(value: T | undefined, entity: string): Promise<T> {
  const result = await respond(value)
  if (result === undefined) throw new MockApiError(`${entity} not found`, 404)
  return result
}

/* ------------------------------- Command Center ------------------------------- */

export const api = {
  commandCenter: {
    summary: () => respond(commandCenterSummary, 220, 620),
    kpis: () => respond(fleetKpis),
    priorities: () => respond(aiPriorities),
    timeline: () => respond(operationalTimeline),
  },

  windFarms: {
    list: () => respond(windFarms, 160, 380),
    detail: (id: string) => respondOr404(getWindFarm(id), 'Wind farm'),
    turbines: (id: string) => respond(() => getTurbinesForSite(id)),
    alarms: (id: string) => respond(() => getAlarmsForSite(id)),
    workOrders: (id: string) => respond(() => getWorkOrdersForSite(id)),
    projects: (id: string) => respond(() => getProjectsForSite(id)),
    documents: (id: string) => respond(() => getDocumentsFor('wind-farm', id)),
  },

  turbines: {
    list: () => respond(turbines, 200, 520),
    detail: (id: string) => respondOr404(getTurbineDetail(id), 'Turbine'),
    summary: (id: string) => respondOr404(getTurbine(id), 'Turbine'),
    workOrders: (id: string) => respond(() => getWorkOrdersForTurbine(id)),
    documents: (id: string) => respond(() => getDocumentsFor('turbine', id)),
    totals: () => respond(fleetTotals),
  },

  alarms: {
    list: () => respond(alarms),
  },

  projects: {
    list: () => respond(projects, 160, 400),
    detail: (id: string) => respondOr404(getProject(id), 'Project'),
    summary: () => respond(projectSummary),
    documents: (id: string) => respond(() => getDocumentsFor('project', id)),
  },

  accounts: {
    list: () => respond(accounts, 150, 360),
    detail: (id: string) => respondOr404(getAccount(id), 'Account'),
    contacts: (id: string) => respond(() => getContactsForAccount(id)),
    opportunities: (id: string) => respond(() => getOpportunitiesForAccount(id)),
    projects: (id: string) => respond(() => getProjectsForAccount(id)),
    documents: (id: string) => respond(() => getDocumentsFor('account', id)),
  },

  contacts: {
    list: () => respond(contacts, 140, 320),
  },

  opportunities: {
    list: () => respond(opportunities, 150, 360),
    detail: (id: string) => respondOr404(getOpportunity(id), 'Opportunity'),
    pipeline: () => respond(pipelineSummary),
  },

  quotes: {
    list: () => respond(quotes),
    detail: (id: string) => respondOr404(getQuote(id), 'Quote'),
  },

  workOrders: {
    list: () => respond(workOrders, 190, 480),
    detail: (id: string) => respondOr404(getWorkOrder(id), 'Work order'),
    summary: () => respond(maintenanceSummary),
    matrix: () => respond(maintenanceMatrix),
    forTechnician: (id: string) => respond(() => getWorkOrdersForTechnician(id)),
  },

  technicians: {
    list: () => respond(technicians, 130, 300),
  },

  monitoring: {
    fleetHealth: () => respond(fleetHealth, 240, 640),
    underperformers: () => respond(underperformers),
    alarmsByCategory: () => respond(alarmsByCategory),
    workOrdersByType: () => respond(workOrdersByType),
  },

  environment: {
    weather: () => respond(weatherReadings, 170, 420),
    earthquakes: () => respond(earthquakes),
    tsunami: () => respond(tsunamiAlerts),
    cyclones: () => respond(cyclones),
    lightning: () => respond(lightningClusters),
    floods: () => respond(floodZones),
    events: () => respond(environmentEvents),
    summary: () => respond(environmentSummary),
  },

  documents: {
    list: () => respond(documents, 200, 520),
    detail: (id: string) => respondOr404(getDocument(id), 'Document'),
    summary: () => respond(documentSummary),
  },

  reports: {
    list: () => respond(reports),
    detail: (id: string) => respondOr404(reportById.get(id), 'Report'),
  },

  admin: {
    users: () => respond(adminUsers),
    integrations: () => respond(integrations),
  },

  search: (query: string): Promise<SearchResult[]> => respond(() => search(query), 60, 180),

  ai: {
    /** POST /api/ai/query — mocked, deliberately slower to feel like inference. */
    query: (prompt: string): Promise<AiResponseCard> => respond(() => answerQuery(prompt), 700, 1600),
  },
}

export type Api = typeof api
