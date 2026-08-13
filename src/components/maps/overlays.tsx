'use client'

import * as React from 'react'
import { TONE_VAR } from '@/lib/constants'
import { kmToUnits, pathFromLatLng, project } from '@/lib/mocks/geo'
import { cn } from '@/lib/utils'
import type {
  Cyclone,
  EarthquakeEvent,
  FloodRiskZone,
  LightningCluster,
  Technician,
  Turbine,
  WeatherReading,
  WindFarm,
} from '@/types'

/* ------------------------------------------------------------------ *
 * Map overlays — all rendered in projected user-space inside the zoom
 * group. `k` is the current zoom; sizes divide by it so markers keep a
 * constant screen size while geography scales.
 * ------------------------------------------------------------------ */

interface LayerProps {
  k: number
  baseScale: number
}

function screen(k: number, baseScale: number, px: number) {
  return px / (k * baseScale)
}

/* -------------------------------- Wind farms -------------------------------- */

const SITE_TONE: Record<WindFarm['riskBand'], string> = {
  severe: TONE_VAR.critical,
  elevated: TONE_VAR.serious,
  moderate: TONE_VAR.warning,
  low: TONE_VAR.good,
}

export function WindFarmMarkers({
  farms,
  k,
  baseScale,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  dimUnselected = false,
}: LayerProps & {
  farms: WindFarm[]
  selectedId: string | null
  hoveredId?: string | null
  onSelect: (id: string) => void
  onHover?: (id: string | null) => void
  dimUnselected?: boolean
}) {
  return (
    <g>
      {farms.map((farm) => {
        const p = project(farm.position.lat, farm.position.lng)
        const radius = screen(k, baseScale, Math.max(9, Math.min(17, 7 + farm.installedMw / 16)))
        const selected = selectedId === farm.id
        const hovered = hoveredId === farm.id
        const tone = SITE_TONE[farm.riskBand]
        const dim = dimUnselected && selectedId !== null && !selected

        return (
          <g
            key={farm.id}
            transform={`translate(${p.x},${p.y})`}
            className="cursor-pointer"
            opacity={dim ? 0.35 : 1}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(farm.id)
            }}
            onMouseEnter={() => onHover?.(farm.id)}
            onMouseLeave={() => onHover?.(null)}
            role="button"
            aria-label={`${farm.name}, ${farm.installedMw} megawatts, risk ${farm.riskBand}`}
          >
            {/* Risk ring */}
            {(farm.riskBand === 'severe' || farm.riskBand === 'elevated') && (
              <circle
                r={radius * 1.9}
                fill="none"
                stroke={tone}
                strokeWidth={screen(k, baseScale, 1.4)}
                opacity={0.5}
                className={farm.riskBand === 'severe' ? 'animate-[breathe_3.2s_ease-in-out_infinite]' : undefined}
                style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
              />
            )}
            {/* Selection halo */}
            {(selected || hovered) && (
              <circle r={radius * 1.55} fill={tone} opacity={0.18} />
            )}
            <circle
              r={radius}
              fill="var(--surface)"
              stroke={tone}
              strokeWidth={screen(k, baseScale, selected ? 2.6 : 2)}
            />
            {/* Turbine glyph */}
            <g
              stroke={tone}
              strokeWidth={screen(k, baseScale, 1.6)}
              strokeLinecap="round"
              transform={`scale(${radius / 12})`}
            >
              <line x1={0} y1={1} x2={0} y2={7} />
              <line x1={0} y1={0} x2={0} y2={-6} />
              <line x1={0} y1={0} x2={5.2} y2={3} />
              <line x1={0} y1={0} x2={-5.2} y2={3} />
              <circle r={1.4} fill={tone} stroke="none" cy={0} />
            </g>
            {/* Label at closer zoom */}
            <text
              y={-radius - screen(k, baseScale, 6)}
              textAnchor="middle"
              fontSize={screen(k, baseScale, 11)}
              fontWeight={600}
              className="pointer-events-none fill-[var(--ink)]"
              opacity={selected || hovered || k > 2.4 ? 1 : 0}
              paintOrder="stroke"
              stroke="var(--surface)"
              strokeWidth={screen(k, baseScale, 3)}
              strokeLinejoin="round"
            >
              {farm.name}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/* --------------------------------- Turbines --------------------------------- */

const TURBINE_TONE: Record<Turbine['status'], string> = {
  running: TONE_VAR.good,
  standby: TONE_VAR.neutral,
  maintenance: TONE_VAR.info,
  curtailment: TONE_VAR.warning,
  alarm: TONE_VAR.serious,
  offline: TONE_VAR.critical,
}

export function TurbineMarkers({
  turbines,
  k,
  baseScale,
  onSelect,
  selectedId,
}: LayerProps & {
  turbines: Turbine[]
  onSelect?: (id: string) => void
  selectedId?: string | null
}) {
  if (k < 3.4) return null
  return (
    <g>
      {turbines.map((turbine) => {
        const p = project(turbine.position.lat, turbine.position.lng)
        const r = screen(k, baseScale, selectedId === turbine.id ? 5 : 3.4)
        return (
          <circle
            key={turbine.id}
            cx={p.x}
            cy={p.y}
            r={r}
            fill={TURBINE_TONE[turbine.status]}
            stroke="var(--surface)"
            strokeWidth={screen(k, baseScale, 1.2)}
            className={onSelect ? 'cursor-pointer' : undefined}
            onClick={
              onSelect
                ? (event) => {
                    event.stopPropagation()
                    onSelect(turbine.id)
                  }
                : undefined
            }
          >
            <title>
              {turbine.name} · {turbine.status} · {turbine.currentPowerKw} kW
            </title>
          </circle>
        )
      })}
    </g>
  )
}

/* ------------------------------- Site boundary ------------------------------- */

export function SiteBoundary({ farm, k, baseScale }: LayerProps & { farm: WindFarm }) {
  return (
    <path
      d={pathFromLatLng(farm.boundary)}
      fill={SITE_TONE[farm.riskBand]}
      fillOpacity={0.06}
      stroke={SITE_TONE[farm.riskBand]}
      strokeOpacity={0.55}
      strokeWidth={screen(k, baseScale, 1.2)}
      strokeDasharray={`${screen(k, baseScale, 5)} ${screen(k, baseScale, 4)}`}
      pointerEvents="none"
    />
  )
}

/* --------------------------------- Cyclones --------------------------------- */

export function CycloneOverlay({
  cyclones,
  k,
  baseScale,
  onSelect,
}: LayerProps & { cyclones: Cyclone[]; onSelect?: (id: string) => void }) {
  return (
    <g>
      {cyclones
        .filter((c) => c.status !== 'dissipated')
        .map((cyclone) => {
          const pos = project(cyclone.position.lat, cyclone.position.lng)
          const historical = cyclone.track.filter((t) => !t.forecast)
          const forecast = cyclone.track.filter((t) => t.forecast)
          const forecastFrom = historical.length ? [historical[historical.length - 1]!, ...forecast] : forecast
          const impactR = kmToUnits(cyclone.impactRadiusKm, cyclone.position.lat)

          return (
            <g
              key={cyclone.id}
              className={onSelect ? 'cursor-pointer' : undefined}
              onClick={
                onSelect
                  ? (event) => {
                      event.stopPropagation()
                      onSelect(cyclone.id)
                    }
                  : undefined
              }
            >
              {/* Impact radius */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={impactR}
                fill={TONE_VAR.critical}
                fillOpacity={0.07}
                stroke={TONE_VAR.critical}
                strokeOpacity={0.45}
                strokeWidth={screen(k, baseScale, 1.2)}
                strokeDasharray={`${screen(k, baseScale, 6)} ${screen(k, baseScale, 5)}`}
              />
              {/* Historical track */}
              <path
                d={historical
                  .map((t, i) => {
                    const tp = project(t.lat, t.lng)
                    return `${i === 0 ? 'M' : 'L'}${tp.x} ${tp.y}`
                  })
                  .join(' ')}
                fill="none"
                stroke={TONE_VAR.critical}
                strokeWidth={screen(k, baseScale, 2)}
                strokeLinecap="round"
                opacity={0.8}
              />
              {/* Forecast track */}
              <path
                d={forecastFrom
                  .map((t, i) => {
                    const tp = project(t.lat, t.lng)
                    return `${i === 0 ? 'M' : 'L'}${tp.x} ${tp.y}`
                  })
                  .join(' ')}
                fill="none"
                stroke={TONE_VAR.critical}
                strokeWidth={screen(k, baseScale, 2)}
                strokeDasharray={`${screen(k, baseScale, 2)} ${screen(k, baseScale, 6)}`}
                strokeLinecap="round"
                opacity={0.75}
              />
              {/* Track points */}
              {cyclone.track.map((t, i) => {
                const tp = project(t.lat, t.lng)
                return (
                  <circle
                    key={i}
                    cx={tp.x}
                    cy={tp.y}
                    r={screen(k, baseScale, t.forecast ? 2.2 : 3)}
                    fill={t.forecast ? 'var(--surface)' : TONE_VAR.critical}
                    stroke={TONE_VAR.critical}
                    strokeWidth={screen(k, baseScale, 1.2)}
                  />
                )
              })}
              {/* Eye */}
              <g transform={`translate(${pos.x},${pos.y})`}>
                <circle
                  r={screen(k, baseScale, 13)}
                  fill={TONE_VAR.critical}
                  opacity={0.16}
                  className="animate-[breathe_3.2s_ease-in-out_infinite]"
                  style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
                />
                <g className="animate-[sweep_4.5s_linear_infinite]" style={{ transformOrigin: 'center', transformBox: 'fill-box' }}>
                  <path
                    d={`M0 ${-screen(k, baseScale, 8)} A ${screen(k, baseScale, 8)} ${screen(k, baseScale, 8)} 0 0 1 ${screen(k, baseScale, 8)} 0`}
                    fill="none"
                    stroke={TONE_VAR.critical}
                    strokeWidth={screen(k, baseScale, 2.4)}
                    strokeLinecap="round"
                  />
                  <path
                    d={`M0 ${screen(k, baseScale, 8)} A ${screen(k, baseScale, 8)} ${screen(k, baseScale, 8)} 0 0 1 ${-screen(k, baseScale, 8)} 0`}
                    fill="none"
                    stroke={TONE_VAR.critical}
                    strokeWidth={screen(k, baseScale, 2.4)}
                    strokeLinecap="round"
                  />
                </g>
                <circle r={screen(k, baseScale, 3)} fill={TONE_VAR.critical} />
                <text
                  y={-screen(k, baseScale, 18)}
                  textAnchor="middle"
                  fontSize={screen(k, baseScale, 11.5)}
                  fontWeight={700}
                  className="pointer-events-none fill-[var(--ink)]"
                  paintOrder="stroke"
                  stroke="var(--surface)"
                  strokeWidth={screen(k, baseScale, 3)}
                >
                  {cyclone.name}
                </text>
              </g>
            </g>
          )
        })}
    </g>
  )
}

/* -------------------------------- Earthquakes -------------------------------- */

export function EarthquakeOverlay({
  earthquakes,
  k,
  baseScale,
  onSelect,
}: LayerProps & { earthquakes: EarthquakeEvent[]; onSelect?: (id: string) => void }) {
  return (
    <g>
      {earthquakes.map((quake) => {
        const p = project(quake.position.lat, quake.position.lng)
        const r = screen(k, baseScale, 5 + quake.magnitude * 2.2)
        const major = quake.magnitude >= 4.5
        return (
          <g
            key={quake.id}
            transform={`translate(${p.x},${p.y})`}
            className={onSelect ? 'cursor-pointer' : undefined}
            onClick={
              onSelect
                ? (event) => {
                    event.stopPropagation()
                    onSelect(quake.id)
                  }
                : undefined
            }
          >
            <circle r={r * 1.7} fill={TONE_VAR.serious} opacity={major ? 0.14 : 0.08} />
            <circle
              r={r}
              fill="none"
              stroke={TONE_VAR.serious}
              strokeWidth={screen(k, baseScale, major ? 2 : 1.4)}
              opacity={0.85}
            />
            <circle r={screen(k, baseScale, 2.4)} fill={TONE_VAR.serious} />
            <text
              y={r + screen(k, baseScale, 12)}
              textAnchor="middle"
              fontSize={screen(k, baseScale, 10)}
              fontWeight={600}
              className="pointer-events-none fill-[var(--ink-secondary)]"
              paintOrder="stroke"
              stroke="var(--surface)"
              strokeWidth={screen(k, baseScale, 2.5)}
            >
              M {quake.magnitude.toFixed(1)}
            </text>
            <title>
              M {quake.magnitude.toFixed(1)} — {quake.epicenter}
            </title>
          </g>
        )
      })}
    </g>
  )
}

/* --------------------------------- Lightning --------------------------------- */

export function LightningOverlay({ clusters, k, baseScale }: LayerProps & { clusters: LightningCluster[] }) {
  return (
    <g pointerEvents="none">
      {clusters.map((cluster) => {
        const p = project(cluster.position.lat, cluster.position.lng)
        const s = screen(k, baseScale, cluster.intensity === 'high' ? 9 : cluster.intensity === 'moderate' ? 7 : 5.5)
        return (
          <g key={cluster.id} transform={`translate(${p.x},${p.y})`} opacity={0.92}>
            <circle r={s * 1.8} fill={TONE_VAR.warning} opacity={0.14} />
            <path
              d={`M ${-s * 0.22} ${-s} L ${s * 0.42} ${-s * 0.16} L ${s * 0.08} ${-s * 0.16} L ${s * 0.3} ${s} L ${-s * 0.44} ${s * 0.08} L ${-s * 0.06} ${s * 0.08} Z`}
              fill={TONE_VAR.warning}
              stroke="var(--surface)"
              strokeWidth={screen(k, baseScale, 0.8)}
            />
            <title>
              {cluster.strikeCount} strikes / {cluster.windowMinutes} min
            </title>
          </g>
        )
      })}
    </g>
  )
}

/* ----------------------------------- Flood ----------------------------------- */

export function FloodOverlay({
  zones,
  k,
  baseScale,
  onSelect,
}: LayerProps & { zones: FloodRiskZone[]; onSelect?: (id: string) => void }) {
  return (
    <g>
      {zones.map((zone) => {
        const p = project(zone.position.lat, zone.position.lng)
        const r = kmToUnits(zone.radiusKm, zone.position.lat)
        const tone = zone.riskLevel === 'severe' ? TONE_VAR.critical : zone.riskLevel === 'elevated' ? TONE_VAR.serious : TONE_VAR.info
        return (
          <g
            key={zone.id}
            className={onSelect ? 'cursor-pointer' : undefined}
            onClick={
              onSelect
                ? (event) => {
                    event.stopPropagation()
                    onSelect(zone.id)
                  }
                : undefined
            }
          >
            <circle cx={p.x} cy={p.y} r={r} fill={tone} fillOpacity={0.07} stroke={tone} strokeOpacity={0.4} strokeWidth={screen(k, baseScale, 1)} />
            {/* Wave glyph */}
            <g transform={`translate(${p.x},${p.y})`} stroke={tone} strokeWidth={screen(k, baseScale, 1.6)} fill="none" strokeLinecap="round">
              <path d={`M ${-screen(k, baseScale, 7)} ${-screen(k, baseScale, 2)} q ${screen(k, baseScale, 3.5)} ${-screen(k, baseScale, 4)} ${screen(k, baseScale, 7)} 0 q ${screen(k, baseScale, 3.5)} ${screen(k, baseScale, 4)} ${screen(k, baseScale, 7)} 0`} />
              <path d={`M ${-screen(k, baseScale, 7)} ${screen(k, baseScale, 3)} q ${screen(k, baseScale, 3.5)} ${-screen(k, baseScale, 4)} ${screen(k, baseScale, 7)} 0 q ${screen(k, baseScale, 3.5)} ${screen(k, baseScale, 4)} ${screen(k, baseScale, 7)} 0`} />
            </g>
            <title>{zone.region}</title>
          </g>
        )
      })}
    </g>
  )
}

/* -------------------------------- Field teams -------------------------------- */

const TECH_TONE: Record<Technician['status'], string> = {
  'on-site': TONE_VAR.good,
  travelling: TONE_VAR.info,
  available: TONE_VAR.neutral,
  'off-shift': TONE_VAR.neutral,
}

export function FieldTeamOverlay({
  technicians,
  k,
  baseScale,
}: LayerProps & { technicians: Technician[] }) {
  return (
    // Non-interactive: crew pins must never intercept a site marker click.
    <g pointerEvents="none">
      {technicians
        .filter((t) => t.status !== 'off-shift')
        .map((tech) => {
          const p = project(tech.position.lat, tech.position.lng)
          const r = screen(k, baseScale, 7)
          return (
            <g key={tech.id} transform={`translate(${p.x},${p.y})`}>
              <circle r={r} fill={TECH_TONE[tech.status]} stroke="var(--surface)" strokeWidth={screen(k, baseScale, 1.6)} />
              {/* Hard-hat glyph */}
              <path
                d={`M ${-r * 0.52} ${r * 0.18} a ${r * 0.52} ${r * 0.52} 0 0 1 ${r * 1.04} 0 z`}
                fill="var(--surface)"
              />
              <rect x={-r * 0.62} y={r * 0.14} width={r * 1.24} height={r * 0.18} rx={r * 0.09} fill="var(--surface)" />
              <title>
                {tech.name} · {tech.role} · {tech.status}
              </title>
            </g>
          )
        })}
    </g>
  )
}

/* ------------------------------- Weather badges ------------------------------- */

export function WeatherOverlay({
  readings,
  farms,
  k,
  baseScale,
}: LayerProps & { readings: WeatherReading[]; farms: WindFarm[] }) {
  const farmById = new Map(farms.map((f) => [f.id, f]))
  return (
    <g pointerEvents="none">
      {readings.map((reading) => {
        const farm = farmById.get(reading.windFarmId)
        if (!farm) return null
        const p = project(farm.position.lat, farm.position.lng)
        const offset = screen(k, baseScale, 22)
        const fs = screen(k, baseScale, 9.5)
        return (
          <g key={reading.windFarmId} transform={`translate(${p.x + offset},${p.y - offset * 0.4})`}>
            <text
              fontSize={fs}
              fontWeight={600}
              className="fill-[var(--ink-secondary)]"
              paintOrder="stroke"
              stroke="var(--surface)"
              strokeWidth={screen(k, baseScale, 2.4)}
            >
              {reading.windSpeedMs.toFixed(1)} m/s
            </text>
            {/* Wind direction arrow */}
            <g transform={`translate(${-screen(k, baseScale, 10)}, ${-fs * 0.36}) rotate(${reading.windDirectionDeg + 180})`}>
              <path
                d={`M 0 ${-screen(k, baseScale, 4.5)} L ${screen(k, baseScale, 3)} ${screen(k, baseScale, 4)} L 0 ${screen(k, baseScale, 2)} L ${-screen(k, baseScale, 3)} ${screen(k, baseScale, 4)} Z`}
                fill="var(--ink-secondary)"
                stroke="var(--surface)"
                strokeWidth={screen(k, baseScale, 0.8)}
              />
            </g>
          </g>
        )
      })}
    </g>
  )
}

/* ---------------------------- Wind-speed field tint ---------------------------- */

export function WindFieldOverlay({ farms, k, baseScale }: LayerProps & { farms: WindFarm[] }) {
  return (
    <g pointerEvents="none">
      {farms.map((farm) => {
        const p = project(farm.position.lat, farm.position.lng)
        const r = kmToUnits(46 + farm.meanWindSpeedMs * 8, farm.position.lat)
        const intensity = Math.min(1, Math.max(0, (farm.meanWindSpeedMs - 5.5) / 4.5))
        return (
          <circle
            key={farm.id}
            cx={p.x}
            cy={p.y}
            r={r}
            fill="var(--seq-400)"
            opacity={0.05 + intensity * 0.1}
          />
        )
      })}
    </g>
  )
}

/* ----------------------------- Grid infrastructure ----------------------------- */

export function GridOverlay({ farms, k, baseScale }: LayerProps & { farms: WindFarm[] }) {
  return (
    <g pointerEvents="none">
      {farms.map((farm) => {
        const p = project(farm.position.lat, farm.position.lng)
        // Substation sits off-site toward the interior; draw the evacuation line.
        const dx = screen(k, baseScale, 34)
        const dy = screen(k, baseScale, 18)
        return (
          <g key={farm.id} opacity={0.75}>
            <line
              x1={p.x}
              y1={p.y}
              x2={p.x + dx}
              y2={p.y + dy}
              stroke="var(--series-7)"
              strokeWidth={screen(k, baseScale, 1.3)}
              strokeDasharray={`${screen(k, baseScale, 4)} ${screen(k, baseScale, 3)}`}
            />
            <rect
              x={p.x + dx - screen(k, baseScale, 4)}
              y={p.y + dy - screen(k, baseScale, 4)}
              width={screen(k, baseScale, 8)}
              height={screen(k, baseScale, 8)}
              fill="var(--surface)"
              stroke="var(--series-7)"
              strokeWidth={screen(k, baseScale, 1.4)}
            />
            <title>{farm.gridSubstation}</title>
          </g>
        )
      })}
    </g>
  )
}

/* ------------------------------ Incident markers ------------------------------ */

export function IncidentOverlay({
  farms,
  k,
  baseScale,
}: LayerProps & { farms: WindFarm[] }) {
  return (
    <g pointerEvents="none">
      {farms
        .filter((f) => f.activeAlerts > 0)
        .map((farm) => {
          const p = project(farm.position.lat, farm.position.lng)
          const offset = screen(k, baseScale, 13)
          const r = screen(k, baseScale, 7)
          return (
            <g key={farm.id} transform={`translate(${p.x + offset},${p.y - offset})`}>
              <circle r={r} fill={TONE_VAR.critical} stroke="var(--surface)" strokeWidth={screen(k, baseScale, 1.4)} />
              <text
                textAnchor="middle"
                dy="0.34em"
                fontSize={r * 1.15}
                fontWeight={700}
                fill="#fff"
              >
                {farm.activeAlerts}
              </text>
            </g>
          )
        })}
    </g>
  )
}
