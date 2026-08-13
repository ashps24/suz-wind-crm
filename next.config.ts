import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Catalyst Slate hosts a pre-built directory of files — it does not run a
   * Node server — so the app ships as a fully static export.
   */
  output: 'export',

  /**
   * Slate matches request paths against uploaded files. `trailingSlash` makes
   * every route emit as `<route>/index.html`, which is the shape the deep-link
   * handler in `src/app/deep-link.tsx` is written against.
   */
  trailingSlash: true,

  /**
   * Pinned so the build id is stable across deploys. Next embeds the build id
   * in every RSC payload and hard-navigates to that payload on mismatch; with a
   * per-build id, Slate's long-lived HTML cache leaves returning visitors
   * holding a document whose payloads 404 — it presents as "every link is dead".
   */
  generateBuildId: () => 'suzlon-wind-crm',

  images: {
    // No Next image optimiser exists in a static export.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },

  experimental: {
    optimizePackageImports: ['@phosphor-icons/react', 'framer-motion'],
  },
}

export default nextConfig
