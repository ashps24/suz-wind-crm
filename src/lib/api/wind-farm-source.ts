import { SITE_SEEDS, type SiteSeed } from '@/lib/mocks/fleet'

/**
 * Where wind farm records come from.
 *
 * Sites are the one entity backed by a real Catalyst Data Store table; every
 * turbine, alarm, work order and telemetry point is still derived from a site's
 * seed values. So this module is the single seam between "real data" and the
 * generators, and everything downstream keeps working unchanged.
 *
 * If the API is unreachable — offline, function redeploying, CORS not yet
 * whitelisted for a new Slate URL — this falls back to the bundled seeds. The
 * app degrades to its Phase 1 behaviour rather than showing an empty fleet.
 */

const BASE = process.env.NEXT_PUBLIC_WINDFARMS_API ?? ''

export type SiteRecord = SiteSeed & { rowid?: string }

export interface SiteSource {
  sites: SiteRecord[]
  /** True when the records came from the Data Store rather than the seeds. */
  live: boolean
}

/** Seeds carry no rowid; the shape is otherwise identical. */
function fromSeeds(): SiteSource {
  return { sites: SITE_SEEDS as SiteRecord[], live: false }
}

let cache: SiteSource | null = null
let inflight: Promise<SiteSource> | null = null

async function request(path: string, init?: RequestInit) {
  if (!BASE) throw new Error('No wind farm API configured')
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = Array.isArray(body?.errors) ? body.errors.join('; ') : body?.error
    throw new Error(detail || `Request failed with ${res.status}`)
  }
  return body
}

/**
 * Reads every site, preferring the Data Store. Results are memoised because
 * the generators call this on module access and would otherwise refetch per
 * screen; `invalidateSites()` clears it after a write.
 */
export async function loadSites(): Promise<SiteSource> {
  if (cache) return cache
  if (inflight) return inflight

  /**
   * Never fetch during server rendering. A server-side fetch is not subject to
   * CORS, so it would succeed where the browser's is refused — the two would
   * render different fleets and React would fail hydration. Prerendering always
   * uses the seeds; the browser upgrades to live records after mount.
   */
  if (!BASE || typeof window === 'undefined') {
    return fromSeeds()
  }

  inflight = request('/wind-farms')
    .then((body) => {
      const sites = Array.isArray(body?.sites) ? (body.sites as SiteRecord[]) : []
      // An empty table is a real answer, but falling back beats an empty app.
      cache = sites.length ? { sites, live: true } : fromSeeds()
      return cache
    })
    .catch(() => {
      cache = fromSeeds()
      return cache
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function invalidateSites() {
  cache = null
}

export async function createSite(input: SiteRecord): Promise<SiteRecord> {
  const body = await request('/wind-farms', { method: 'POST', body: JSON.stringify(input) })
  invalidateSites()
  return body.site as SiteRecord
}

export async function updateSite(siteId: string, input: Partial<SiteRecord>): Promise<SiteRecord> {
  const body = await request(`/wind-farms/${encodeURIComponent(siteId)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  invalidateSites()
  return body.site as SiteRecord
}

export async function deleteSite(siteId: string): Promise<void> {
  await request(`/wind-farms/${encodeURIComponent(siteId)}`, { method: 'DELETE' })
  invalidateSites()
}

/** Whether a backend is configured at all — drives the "demo data" notice. */
export const hasRemoteSource = Boolean(BASE)
