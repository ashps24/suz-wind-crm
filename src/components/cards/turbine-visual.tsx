'use client'

import * as React from 'react'
import { TONE_VAR, TURBINE_STATUS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { TurbineStatus } from '@/types'

/**
 * Scale-accurate turbine elevation drawing. Rotor diameter, hub height and
 * blade length come from the product spec, so an S144 visibly out-scales an
 * S120 rather than being a generic icon.
 */
export function TurbineVisual({
  hubHeightM,
  rotorDiameterM,
  status,
  spinning,
  className,
  showScale = true,
}: {
  hubHeightM: number
  rotorDiameterM: number
  status: TurbineStatus
  spinning?: boolean
  className?: string
  showScale?: boolean
}) {
  const tone = TONE_VAR[TURBINE_STATUS[status].tone]
  const totalHeight = hubHeightM + rotorDiameterM / 2
  const viewH = 260
  const groundY = viewH - 26
  // metres → user units
  const s = (groundY - 18) / totalHeight
  const hubY = groundY - hubHeightM * s
  const bladeLen = (rotorDiameterM / 2) * s
  const cx = 120
  const rotating = spinning ?? (status === 'running' || status === 'curtailment')

  return (
    <svg viewBox={`0 0 240 ${viewH}`} className={cn('h-full w-full', className)} role="img"
      aria-label={`${hubHeightM} metre hub height, ${rotorDiameterM} metre rotor, status ${TURBINE_STATUS[status].label}`}>
      <defs>
        <linearGradient id="tv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--seq-200)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--seq-200)" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="tv-tower" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--ink-muted)" stopOpacity="0.5" />
          <stop offset="42%" stopColor="var(--ink-secondary)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--ink-muted)" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      <rect width="240" height={viewH} fill="url(#tv-sky)" rx="10" />

      {/* Ground */}
      <line x1={12} y1={groundY} x2={228} y2={groundY} stroke="var(--axis)" strokeWidth={1.5} />
      <path d={`M12 ${groundY} Q60 ${groundY - 5} 110 ${groundY} T228 ${groundY}`} stroke="var(--line)" fill="none" />

      {/* Foundation */}
      <path
        d={`M${cx - 15} ${groundY} L${cx - 8} ${groundY - 7} L${cx + 8} ${groundY - 7} L${cx + 15} ${groundY} Z`}
        fill="var(--axis)"
        opacity={0.55}
      />

      {/* Tower — tapered */}
      <path
        d={`M${cx - 6} ${groundY - 5} L${cx - 2.6} ${hubY} L${cx + 2.6} ${hubY} L${cx + 6} ${groundY - 5} Z`}
        fill="url(#tv-tower)"
      />

      {/* Nacelle */}
      <rect x={cx - 3} y={hubY - 5.5} width={19} height={11} rx={4} fill="var(--ink-secondary)" />

      {/* Rotor */}
      <g transform={`translate(${cx},${hubY})`}>
        <g
          className={rotating ? 'animate-[sweep_5.5s_linear_infinite]' : undefined}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        >
          {[0, 120, 240].map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle})`}
              d={`M0 0 L-3.4 -${bladeLen * 0.42} L-1.4 -${bladeLen} L1.9 -${bladeLen * 0.94} L3.6 -${bladeLen * 0.36} Z`}
              fill={tone}
              opacity={0.92}
            />
          ))}
        </g>
        <circle r={4.2} fill="var(--ink-secondary)" />
        <circle r={1.8} fill={tone} />
      </g>

      {showScale && (
        <>
          {/* Hub height dimension */}
          <g stroke="var(--ink-muted)" strokeWidth={0.8} opacity={0.75}>
            <line x1={38} y1={hubY} x2={38} y2={groundY} strokeDasharray="3 3" />
            <line x1={34} y1={hubY} x2={42} y2={hubY} />
            <line x1={34} y1={groundY} x2={42} y2={groundY} />
          </g>
          <text
            x={33}
            y={(hubY + groundY) / 2}
            textAnchor="end"
            className="fill-[var(--ink-muted)]"
            fontSize={9.5}
          >
            {hubHeightM} m
          </text>

          {/* Rotor diameter dimension */}
          <g stroke="var(--ink-muted)" strokeWidth={0.8} opacity={0.75}>
            <line x1={cx - bladeLen} y1={22} x2={cx + bladeLen} y2={22} strokeDasharray="3 3" />
            <line x1={cx - bladeLen} y1={18} x2={cx - bladeLen} y2={26} />
            <line x1={cx + bladeLen} y1={18} x2={cx + bladeLen} y2={26} />
          </g>
          <text x={cx} y={15} textAnchor="middle" className="fill-[var(--ink-muted)]" fontSize={9.5}>
            ⌀ {rotorDiameterM} m
          </text>
        </>
      )}
    </svg>
  )
}
