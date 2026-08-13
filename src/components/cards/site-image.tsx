'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Site photography with a designed fallback. If the remote image cannot be
 * fetched (offline demo, blocked host), a generated wind-farm scene renders in
 * its place rather than a broken image.
 */
export function SiteImage({
  src,
  alt,
  seed = 0,
  className,
  overlay = true,
}: {
  src: string
  alt: string
  seed?: number
  className?: string
  overlay?: boolean
}) {
  const [failed, setFailed] = React.useState(false)

  return (
    <div className={cn('relative overflow-hidden bg-[var(--inset)]', className)}>
      {failed ? (
        <FallbackScene seed={seed} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
      {overlay && (
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[rgb(6_10_16/0.86)] via-[rgb(6_10_16/0.28)] to-transparent"
        />
      )}
    </div>
  )
}

function FallbackScene({ seed }: { seed: number }) {
  const turbines = [
    { x: 18, scale: 0.76, phase: 0 },
    { x: 42, scale: 1, phase: 24 },
    { x: 68, scale: 0.62, phase: 48 },
    { x: 86, scale: 0.44, phase: 12 },
  ]
  const hueShift = (seed % 3) * 12

  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="size-full" role="img" aria-hidden>
      <defs>
        <linearGradient id={`sky-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${208 + hueShift} 62% 24%)`} />
          <stop offset="58%" stopColor={`hsl(${200 + hueShift} 48% 40%)`} />
          <stop offset="100%" stopColor={`hsl(${34 + hueShift} 54% 58%)`} />
        </linearGradient>
        <linearGradient id={`ground-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${150 + hueShift} 22% 24%)`} />
          <stop offset="100%" stopColor={`hsl(${150 + hueShift} 26% 14%)`} />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#sky-${seed})`} />
      <circle cx={318} cy={132} r={17} fill={`hsl(${44 + hueShift} 88% 72%)`} opacity={0.9} />
      <path d="M0 148 Q60 132 118 144 T240 140 T400 150 V200 H0 Z" fill={`url(#ground-${seed})`} />
      <path d="M0 160 Q90 150 170 158 T400 162 V200 H0 Z" fill="rgb(8 14 20 / 0.55)" />
      {turbines.map((t, i) => {
        const baseY = 158
        const towerH = 62 * t.scale
        const hubY = baseY - towerH
        const cx = (t.x / 100) * 400
        return (
          <g key={i} stroke="rgb(236 244 250 / 0.92)" strokeLinecap="round" fill="none">
            <line x1={cx} y1={baseY} x2={cx} y2={hubY} strokeWidth={2.4 * t.scale} />
            <g transform={`rotate(${t.phase} ${cx} ${hubY})`}>
              <line x1={cx} y1={hubY} x2={cx} y2={hubY - 26 * t.scale} strokeWidth={2 * t.scale} />
              <line x1={cx} y1={hubY} x2={cx + 23 * t.scale} y2={hubY + 13 * t.scale} strokeWidth={2 * t.scale} />
              <line x1={cx} y1={hubY} x2={cx - 23 * t.scale} y2={hubY + 13 * t.scale} strokeWidth={2 * t.scale} />
            </g>
            <circle cx={cx} cy={hubY} r={2.2 * t.scale} fill="rgb(236 244 250 / 0.92)" stroke="none" />
          </g>
        )
      })}
    </svg>
  )
}
