import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/layout/providers'
import { AppShell } from '@/components/layout/app-shell'
import { DeepLinkResolver } from '@/components/layout/deep-link-resolver'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

/**
 * Runs before React, in the document head. Everything here has to work when the
 * JS bundle itself cannot load, which is why it is inline and dependency-free.
 */
const bootstrapScript = `(function () {
  // --- Deep links -----------------------------------------------------------
  // Catalyst Slate hands out the root document for any path it has no exact
  // file for, so a deep link arrives with the landing page's markup. Park the
  // requested path and reset the address bar to '/' before React boots, so
  // hydration happens against the document we were actually served.
  // <DeepLinkResolver> then navigates to the parked path for real.
  try {
    // Only ever park something that can actually be an app route. Parking a
    // static asset or an RSC payload URL is how this turns into a loop: the
    // resolver replays it, the router cannot match it, the browser hard-loads
    // it, and the script parks it again on arrival.
    var isRoute = function (p) {
      if (!p || p.charAt(0) !== '/') return false;
      if (p.indexOf('/_next/') === 0) return false;
      var last = p.split('?')[0].split('#')[0].split('/').filter(Boolean).pop() || '';
      return last.indexOf('.') === -1;
    };

    var path = window.location.pathname + window.location.search + window.location.hash;

    // Recover anyone already stranded on an RSC payload URL by a hard-navigation
    // fallback: /turbines/index.txt is really /turbines/.
    path = path.replace(/\\/index\\.txt(?=($|[?#]))/, '/');

    if (window.location.pathname.replace(/\\/+$/, '') !== '' && isRoute(path)) {
      // Timestamped so a value left behind by an abandoned load can never
      // hijack a later visit to the site.
      window.sessionStorage.setItem(
        'suzlon:deeplink',
        JSON.stringify({ p: path, t: Date.now() })
      );
      window.history.replaceState(null, '', '/');
      document.documentElement.setAttribute('data-deeplink', 'resolving');
    } else {
      window.sessionStorage.removeItem('suzlon:deeplink');
      if (!isRoute(path) && window.location.pathname.indexOf('/_next/') !== 0) {
        window.history.replaceState(null, '', '/');
      }
    }
  } catch (e) {}

  // --- Stale document recovery ---------------------------------------------
  // Slate serves this document with max-age=31536000 and a deploy replaces
  // _next/static, so a returning visitor can be holding a year-old index.html
  // whose chunk filenames now 404. Compare the release baked into this document
  // against what is actually deployed and, if they disagree, reload past the
  // cache. Inline on purpose: it has to work when the bundle cannot load.
  try {
    var loaded = ${JSON.stringify(process.env.NEXT_PUBLIC_RELEASE ?? 'dev')};
    fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (v) {
        if (!v || !v.release || v.release === loaded) return;
        var key = 'suzlon:healed:' + v.release;
        if (window.sessionStorage.getItem(key)) return; // already tried once
        window.sessionStorage.setItem(key, '1');
        var url = new URL(window.location.href);
        url.searchParams.set('_v', v.release);
        window.location.replace(url.toString());
      })
      .catch(function () {});
  } catch (e) {}
})();`

export const metadata: Metadata = {
  title: {
    default: 'Suzlon Wind CRM',
    template: '%s · Suzlon Wind CRM',
  },
  description:
    'AI-powered renewable energy operations platform — wind farm development, turbine lifecycle, field service and environmental intelligence in one system of record.',
  applicationName: 'Suzlon Wind CRM',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Suzlon Wind CRM',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6f9' },
    { media: '(prefers-color-scheme: dark)', color: '#080c12' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootstrapScript }} />
      </head>
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>

        {/* Covers the brief window in which a deep link is replayed through the
          * client router. Hidden unless the document carries data-deeplink, so
          * it never appears on a normal navigation. */}
        <div id="deeplink-splash" aria-hidden="true">
          <span className="deeplink-splash__mark">
            <span />
            <span />
            <span />
          </span>
        </div>

        <div id="app-root">
          <Providers>
            <DeepLinkResolver />
            <AppShell>{children}</AppShell>
          </Providers>
        </div>
      </body>
    </html>
  )
}
