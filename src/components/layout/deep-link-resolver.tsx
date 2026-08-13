'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'

/** Where the inline bootstrap script parks the originally-requested path. */
export const DEEPLINK_KEY = 'suzlon:deeplink'

/** A parked path older than this is treated as abandoned and discarded. */
const MAX_AGE_MS = 10_000

/**
 * Only paths that can plausibly be an app route are ever replayed.
 *
 * Replaying anything else is how this mechanism turns into a loop: the router
 * cannot match a static asset or an RSC payload URL, so the browser hard-loads
 * it, the bootstrap script parks it again on arrival, and the next visit repeats
 * the whole thing. The inline script applies the same test before parking; this
 * is the second half of that guard.
 */
function isRoute(path: string): boolean {
  if (!path || !path.startsWith('/')) return false
  if (path.startsWith('/_next/')) return false
  const last = path.split('?')[0]!.split('#')[0]!.split('/').filter(Boolean).pop() ?? ''
  return !last.includes('.')
}

/**
 * Makes deep links work on Catalyst Slate.
 *
 * Slate serves a file only on an exact path match. It resolves neither directory
 * indexes (`/turbines/` → `/turbines/index.html`) nor clean URLs onto `.html`,
 * and it ignores rewrite rules in both `slate-config.toml` and a root
 * `_redirects`. Every HTML request that is not an exact file returns the root
 * `index.html`. An App Router export is entirely directory indexes, so a visitor
 * opening `/wind-farms/wf-kutch-horizon/` is handed the Command Center document.
 *
 * The RSC payloads *are* served correctly, so the client router can reach every
 * route. The sequence is:
 *
 *  1. An inline script in the head runs before React. If the path is not the
 *     root, it parks that path (timestamped) and rewrites the address bar to `/`.
 *  2. React hydrates at `/`, which is genuinely the document it was given, so
 *     the router state and the markup agree. This step is what makes the replay
 *     work at all — without it the router already believes it is on the requested
 *     route while rendering the wrong tree, and navigating is a no-op.
 *  3. This component picks the parked path up and navigates to it for real.
 *
 * `<html data-deeplink>` keeps the splash over all three steps. Direct visits to
 * `/` skip the whole thing. If Slate ever gains directory-index resolution, the
 * parked value is simply never written and this clears itself on mount.
 */
export function DeepLinkResolver() {
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    const reveal = () => document.documentElement.removeAttribute('data-deeplink')
    let target: string | null = null

    try {
      const raw = window.sessionStorage.getItem(DEEPLINK_KEY)
      // Consumed immediately and unconditionally: a value that survived a failed
      // replay would hijack the next visit to the site.
      window.sessionStorage.removeItem(DEEPLINK_KEY)

      if (raw) {
        const parsed = JSON.parse(raw) as { p?: unknown; t?: unknown }
        const path = typeof parsed.p === 'string' ? parsed.p : null
        const stamp = typeof parsed.t === 'number' ? parsed.t : 0
        const fresh = Date.now() - stamp < MAX_AGE_MS
        if (path && fresh && isRoute(path) && path !== '/') target = path
      }
    } catch {
      // Malformed value, or storage unavailable in private browsing.
    }

    if (!target) {
      reveal()
      return
    }
    router.replace(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reveal once the router has landed somewhere other than the root.
  React.useEffect(() => {
    if (pathname !== '/') document.documentElement.removeAttribute('data-deeplink')
  }, [pathname])

  // Failsafe: never leave the app hidden, whatever happened above.
  React.useEffect(() => {
    const id = window.setTimeout(() => document.documentElement.removeAttribute('data-deeplink'), 5_000)
    return () => window.clearTimeout(id)
  }, [])

  return null
}
