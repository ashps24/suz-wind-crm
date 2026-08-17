import { SEED_SITE_IDS, getTurbine } from '@/lib/mocks/fleet'

/**
 * Hrefs for wind farms and turbines.
 *
 * The app ships as a static export on Catalyst Slate, which serves exact file
 * matches only. Documents exist for every site compiled into the build, but a
 * site created at runtime in the Data Store has no `/wind-farms/<id>/` file —
 * requesting it would bounce through the deep-link shim forever. Those records
 * are routed to prebuilt host pages (`/wind-farms/view/`, `/turbines/view/`)
 * that read the id from the query string and render the same workspace.
 */

function withQuery(base: string, params: Record<string, string>) {
  const q = new URLSearchParams(params).toString()
  return q ? `${base}?${q}` : base
}

export function windFarmHref(id: string, params: Record<string, string> = {}) {
  return SEED_SITE_IDS.has(id)
    ? withQuery(`/wind-farms/${id}`, params)
    : withQuery('/wind-farms/view', { site: id, ...params })
}

export function turbineHref(id: string, params: Record<string, string> = {}) {
  // A turbine is prebuilt exactly when its site was in the compiled seed set.
  const siteId = getTurbine(id)?.windFarmId ?? ''
  return SEED_SITE_IDS.has(siteId)
    ? withQuery(`/turbines/${id}`, params)
    : withQuery('/turbines/view', { t: id, ...params })
}
