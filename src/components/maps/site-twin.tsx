'use client'

import * as React from 'react'
import { TONE_VAR, TURBINE_STATUS, TURBINE_STATUS_ORDER } from '@/lib/constants'
import { project } from '@/lib/mocks/geo'
import { fmtBearing, fmtKw, fmtPct } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useMeasure } from '@/hooks'
import type { Technician, Turbine, WeatherReading, WindFarm, WorkOrder } from '@/types'

const STATUS_TONE = Object.fromEntries(
  TURBINE_STATUS_ORDER.map((s) => [s, TONE_VAR[TURBINE_STATUS[s].tone]]),
) as Record<Turbine['status'], string>

/**
 * Wind farm digital twin — a 2.5D site plan.
 *
 * Turbine positions come from the same Mercator projection as the fleet map,
 * then get auto-fitted to the site bounding box, so the layout geometry is real
 * rather than decorative. Renders as plain SVG: no WebGL, no tile server.
 */
export function SiteDigitalTwin({
  farm,
  turbines,
  workOrders = [],
  technicians = [],
  weather,
  selectedTurbineId,
  onSelectTurbine,
  className,
  showLegend = true,
}: {
  farm: WindFarm
  turbines: Turbine[]
  workOrders?: WorkOrder[]
  technicians?: Technician[]
  weather?: WeatherReading
  selectedTurbineId?: string | null
  onSelectTurbine?: (id: string) => void
  className?: string
  showLegend?: boolean
}) {
  const [ref, { width, height }] = useMeasure<HTMLDivElement>()
  const [hovered, setHovered] = React.useState<Turbine | null>(null)

  const geometry = React.useMemo(() => {
    const points = turbines.map((t) => ({ turbine: t, ...project(t.position.lat, t.position.lng) }))
    const boundary = farm.boundary.map((p) => project(p.lat, p.lng))
    const all = [...points, ...boundary]
    if (!all.length) return null

    const minX = Math.min(...all.map((p) => p.x))
    const maxX = Math.max(...all.map((p) => p.x))
    const minY = Math.min(...all.map((p) => p.y))
    const maxY = Math.max(...all.map((p) => p.y))
    return { points, boundary, minX, maxX, minY, maxY, w: maxX - minX || 1, h: maxY - minY || 1 }
  }, [turbines, farm.boundary])

  const pad = 34
  const scale = geometry && width > 0 && height > 0
    ? Math.min((width - pad * 2) / geometry.w, (height - pad * 2) / geometry.h)
    : 0
  const offsetX = geometry && scale ? pad + (width - pad * 2 - geometry.w * scale) / 2 - geometry.minX * scale : 0
  const offsetY = geometry && scale ? pad + (height - pad * 2 - geometry.h * scale) / 2 - geometry.minY * scale : 0

  const toScreen = (x: number, y: number) => ({ x: x * scale + offsetX, y: y * scale + offsetY })

  const orderByTurbine = new Map(workOrders.filter((w) => w.status !== 'completed').map((w) => [w.turbineId, w]))
  const windDeg = weather?.windDirectionDeg ?? 245

  return (
    <div ref={ref} className={cn('relative size-full overflow-hidden bg-[var(--map-water)]', className)}>
      {geometry && scale > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${farm.name} site plan with ${turbines.length} turbine positions`}>
          <defs>
            <pattern id={`terrain-${farm.id}`} width="18" height="18" patternUnits="userSpaceOnUse">
              <path d="M0 18 L18 0" stroke="var(--map-graticule)" strokeWidth="1" />
            </pattern>
            <radialGradient id={`glow-${farm.id}`}>
              <stop offset="0%" stopColor="var(--seq-400)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--seq-400)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Terrain */}
          <rect width={width} height={height} fill="var(--map-land)" />
          <rect width={width} height={height} fill={`url(#terrain-${farm.id})`} />

          {/* Site envelope */}
          <path
            d={geometry.boundary
              .map((p, i) => {
                const s = toScreen(p.x, p.y)
                return `${i === 0 ? 'M' : 'L'}${s.x.toFixed(1)} ${s.y.toFixed(1)}`
              })
              .join(' ') + ' Z'}
            fill="var(--map-land-alt)"
            stroke="var(--map-border)"
            strokeWidth={1.5}
            strokeDasharray="7 5"
          />

          {/* Prevailing wind arrows */}
          <g opacity={0.5}>
            {Array.from({ length: 5 }, (_, i) => {
              const y = (height / 6) * (i + 1)
              const rad = ((windDeg + 180) * Math.PI) / 180
              const dx = Math.sin(rad) * 46
              const dy = -Math.cos(rad) * 46
              return (
                <g key={i} transform={`translate(${18 + i * 8}, ${y})`}>
                  <line x1={0} y1={0} x2={dx} y2={dy} stroke="var(--seq-400)" strokeWidth={1.4} strokeDasharray="4 4" />
                  <circle cx={dx} cy={dy} r={2} fill="var(--seq-400)" />
                </g>
              )
            })}
          </g>

          {/* Wake glow behind each turbine */}
          {geometry.points.map(({ turbine, x, y }) => {
            const s = toScreen(x, y)
            if (turbine.currentPowerKw <= 0) return null
            return <circle key={`w-${turbine.id}`} cx={s.x} cy={s.y} r={22} fill={`url(#glow-${farm.id})`} />
          })}

          {/* Turbines */}
          {geometry.points.map(({ turbine, x, y }) => {
            const s = toScreen(x, y)
            const tone = STATUS_TONE[turbine.status]
            const selected = selectedTurbineId === turbine.id
            const hasOrder = orderByTurbine.has(turbine.id)
            const spinning = turbine.currentPowerKw > 0
            return (
              <g
                key={turbine.id}
                transform={`translate(${s.x},${s.y})`}
                className={onSelectTurbine ? 'cursor-pointer' : undefined}
                onClick={() => onSelectTurbine?.(turbine.id)}
                onMouseEnter={() => setHovered(turbine)}
                onMouseLeave={() => setHovered(null)}
                role={onSelectTurbine ? 'button' : undefined}
                aria-label={`${turbine.name}, ${TURBINE_STATUS[turbine.status].label}, ${turbine.currentPowerKw} kilowatts`}
              >
                {selected && <circle r={14} fill={tone} opacity={0.2} />}
                {turbine.status === 'offline' && (
                  <circle r={11} fill="none" stroke={tone} strokeWidth={1.2} opacity={0.6} />
                )}
                {/* Tower + rotor glyph */}
                <line x1={0} y1={1} x2={0} y2={7} stroke={tone} strokeWidth={1.8} strokeLinecap="round" />
                <g
                  className={spinning ? 'animate-[sweep_4.5s_linear_infinite]' : undefined}
                  style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
                >
                  <line x1={0} y1={0} x2={0} y2={-7} stroke={tone} strokeWidth={1.6} strokeLinecap="round" />
                  <line x1={0} y1={0} x2={6} y2={3.6} stroke={tone} strokeWidth={1.6} strokeLinecap="round" />
                  <line x1={0} y1={0} x2={-6} y2={3.6} stroke={tone} strokeWidth={1.6} strokeLinecap="round" />
                </g>
                <circle r={1.9} fill={tone} />
                {hasOrder && (
                  <circle cx={7} cy={-7} r={3.2} fill="var(--status-info)" stroke="var(--map-land)" strokeWidth={1.2}>
                    <title>Open work order</title>
                  </circle>
                )}
              </g>
            )
          })}

          {/* Technicians on site */}
          {technicians.map((tech) => {
            const p = project(tech.position.lat, tech.position.lng)
            const s = toScreen(p.x, p.y)
            if (s.x < 0 || s.x > width || s.y < 0 || s.y > height) return null
            return (
              <g key={tech.id} transform={`translate(${s.x},${s.y})`} pointerEvents="none">
                <circle r={6} fill="var(--status-good)" stroke="var(--map-land)" strokeWidth={1.6} />
                <path d="M-3 1 a3 3 0 0 1 6 0 z" fill="var(--map-land)" />
              </g>
            )
          })}

          {/* North arrow */}
          <g transform={`translate(${width - 30},${30})`} pointerEvents="none">
            <circle r={13} fill="var(--surface)" opacity={0.8} stroke="var(--line-strong)" />
            <path d="M0 -8 L3.4 4 L0 1.6 L-3.4 4 Z" fill="var(--ink)" />
            <text y={11} textAnchor="middle" fontSize={7} className="fill-[var(--ink-muted)]" fontWeight={700}>
              N
            </text>
          </g>
        </svg>
      )}

      {/* Hover card */}
      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2 shadow-[var(--shadow-lg)]">
          <p className="text-[12.5px] font-semibold text-[var(--ink)]">{hovered.name}</p>
          <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
            {TURBINE_STATUS[hovered.status].label} · {fmtKw(hovered.currentPowerKw)} · {fmtPct(hovered.availabilityPct)} avail
          </p>
          {hovered.activeAlarm && (
            <p className="mt-1 max-w-[16rem] text-[11px]" style={{ color: 'var(--status-serious)' }}>
              {hovered.activeAlarm}
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-[var(--line)] bg-[var(--glass)] px-2.5 py-1.5 backdrop-blur">
          {TURBINE_STATUS_ORDER.map((status) => {
            const count = turbines.filter((t) => t.status === status).length
            if (!count) return null
            return (
              <span key={status} className="flex items-center gap-1.5 text-[10.5px] text-[var(--ink-secondary)]">
                <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: STATUS_TONE[status] }} />
                {TURBINE_STATUS[status].label}
                <span className="tabular font-medium text-[var(--ink)]">{count}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Wind readout */}
      {weather && (
        <div className="pointer-events-none absolute right-3 top-16 rounded-lg border border-[var(--line)] bg-[var(--glass)] px-2.5 py-1.5 text-right backdrop-blur">
          <p className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">Prevailing wind</p>
          <p className="kpi-value text-[13px] font-semibold text-[var(--ink)]">{weather.windSpeedMs.toFixed(1)} m/s</p>
          <p className="text-[10.5px] text-[var(--ink-muted)]">{fmtBearing(weather.windDirectionDeg)}</p>
        </div>
      )}
    </div>
  )
}
