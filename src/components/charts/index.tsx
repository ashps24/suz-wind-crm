'use client'

import * as React from 'react'
import { SEQUENTIAL_VARS, SERIES_VARS, TONE_VAR } from '@/lib/constants'
import { fmtNumber } from '@/lib/formatters'
import { useMeasure } from '@/hooks'
import { cn } from '@/lib/utils'
import type { Tone } from '@/components/ui/badge'

/* ------------------------------------------------------------------ *
 * Chart system
 *
 * Hand-built SVG. Categorical hues are assigned in fixed slot order and
 * never cycled; sequential encoding uses the single-hue blue ramp; the
 * status palette is reserved and always ships with a label. Every plot
 * carries a hover layer, and every chart exposes an accessible table
 * summary so the data is never colour-only.
 * ------------------------------------------------------------------ */

export function seriesColor(index: number) {
  return SERIES_VARS[index % SERIES_VARS.length]!
}

const AXIS_TEXT = 'fill-[var(--ink-muted)] text-[10px]'

/* --------------------------------- Scaffold --------------------------------- */

interface ChartFrameProps {
  title?: string
  subtitle?: string
  unit?: string
  legend?: { label: string; color: string }[]
  action?: React.ReactNode
  /** Rendered inside a visually hidden region so the data has a text equivalent. */
  tableSummary?: { headers: string[]; rows: (string | number)[][] }
  className?: string
  children: React.ReactNode
}

export function ChartFrame({
  title,
  subtitle,
  unit,
  legend,
  action,
  tableSummary,
  className,
  children,
}: ChartFrameProps) {
  return (
    <figure className={cn('min-w-0', className)}>
      {(title || legend || action) && (
        <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {title && <p className="text-[13px] font-semibold text-[var(--ink)]">{title}</p>}
            {subtitle && <p className="mt-0.5 text-[11.5px] text-[var(--ink-muted)]">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {legend && legend.length > 1 && (
              <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {legend.map((item) => (
                  <li key={item.label} className="flex items-center gap-1.5 text-[11.5px] text-[var(--ink-secondary)]">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </li>
                ))}
              </ul>
            )}
            {unit && !action && <span className="text-[11px] text-[var(--ink-muted)]">{unit}</span>}
            {action}
          </div>
        </figcaption>
      )}
      {children}
      {tableSummary && (
        <table className="sr-only">
          <thead>
            <tr>
              {tableSummary.headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableSummary.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  )
}

/* --------------------------------- Tooltip --------------------------------- */

interface TooltipState {
  x: number
  y: number
  title: string
  rows: { label: string; value: string; color?: string }[]
}

function ChartTooltip({ state, width }: { state: TooltipState | null; width: number }) {
  if (!state) return null
  const flip = state.x > width * 0.62
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute z-20 min-w-[132px] rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-2.5 py-2 shadow-[var(--shadow-lg)]"
      style={{
        left: state.x,
        top: state.y,
        transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
    >
      <p className="mb-1 text-[11px] font-medium text-[var(--ink-muted)]">{state.title}</p>
      <ul className="space-y-0.5">
        {state.rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 text-[12px]">
            <span className="flex items-center gap-1.5 text-[var(--ink-secondary)]">
              {row.color && (
                <span aria-hidden className="size-2 rounded-[2px]" style={{ backgroundColor: row.color }} />
              )}
              {row.label}
            </span>
            <span className="tabular font-medium text-[var(--ink)]">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* -------------------------------- Line / Area -------------------------------- */

export interface LineSeries {
  label: string
  values: number[]
  /** Overrides the categorical slot — use only for reference lines. */
  color?: string
  dashed?: boolean
  area?: boolean
}

export function LineChart({
  series,
  axis,
  height = 220,
  unit = '',
  decimals = 1,
  yMin,
  yMax,
  title,
  subtitle,
  tickCount = 4,
  className,
  showArea = false,
}: {
  series: LineSeries[]
  axis: string[]
  height?: number
  unit?: string
  decimals?: number
  yMin?: number
  yMax?: number
  title?: string
  subtitle?: string
  tickCount?: number
  className?: string
  showArea?: boolean
}) {
  const [ref, { width }] = useMeasure<HTMLDivElement>()
  const [hover, setHover] = React.useState<number | null>(null)

  const padding = { top: 10, right: 12, bottom: 22, left: 40 }
  const plotW = Math.max(0, width - padding.left - padding.right)
  const plotH = height - padding.top - padding.bottom

  const all = series.flatMap((s) => s.values)
  const rawMin = yMin ?? Math.min(...all)
  const rawMax = yMax ?? Math.max(...all)
  const span = rawMax - rawMin || 1
  // Never pad below zero for non-negative measures — a negative kW tick is nonsense.
  const min = yMin ?? (rawMin >= 0 ? Math.max(0, rawMin - span * 0.12) : rawMin - span * 0.12)
  const max = yMax ?? rawMax + span * 0.12

  const x = (i: number) => (series[0]!.values.length <= 1 ? plotW / 2 : (i / (series[0]!.values.length - 1)) * plotW)
  const y = (v: number) => plotH - ((v - min) / (max - min)) * plotH

  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => min + ((max - min) / tickCount) * i)
  const colors = series.map((s, i) => s.color ?? seriesColor(i))

  const tooltip: TooltipState | null =
    hover === null || !width
      ? null
      : {
          x: padding.left + x(hover),
          y: padding.top + y(series[0]!.values[hover] ?? 0),
          title: axis[hover] ?? '',
          rows: series.map((s, i) => ({
            label: s.label,
            value: `${fmtNumber(s.values[hover] ?? 0, decimals)}${unit}`,
            color: colors[i],
          })),
        }

  const labelEvery = Math.max(1, Math.ceil(axis.length / Math.max(2, Math.floor(width / 78))))

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      unit={unit ? unit.trim() : undefined}
      legend={series.map((s, i) => ({ label: s.label, color: colors[i]! }))}
      tableSummary={{
        headers: ['Period', ...series.map((s) => s.label)],
        rows: axis.map((a, i) => [a, ...series.map((s) => fmtNumber(s.values[i] ?? 0, decimals))]),
      }}
      className={className}
    >
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={title ? `${title} line chart` : 'Line chart'}
            onMouseLeave={() => setHover(null)}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              const px = event.clientX - rect.left - padding.left
              const idx = Math.round((px / plotW) * (axis.length - 1))
              setHover(Math.max(0, Math.min(axis.length - 1, idx)))
            }}
          >
            <g transform={`translate(${padding.left},${padding.top})`}>
              {ticks.map((t, i) => (
                <g key={i}>
                  <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
                  <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className={cn(AXIS_TEXT, 'tabular')}>
                    {fmtNumber(t, decimals === 0 ? 0 : t >= 100 ? 0 : decimals)}
                  </text>
                </g>
              ))}

              {showArea &&
                series.map(
                  (s, i) =>
                    (s.area ?? i === 0) && (
                      <React.Fragment key={`area-${s.label}`}>
                        <defs>
                          <linearGradient id={`grad-${i}-${s.label.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors[i]} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={colors[i]} stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <path
                          d={`M0 ${plotH} ${s.values.map((v, j) => `L${x(j)} ${y(v)}`).join(' ')} L${plotW} ${plotH} Z`}
                          fill={`url(#grad-${i}-${s.label.replace(/\W/g, '')})`}
                        />
                      </React.Fragment>
                    ),
                )}

              {series.map((s, i) => (
                <path
                  key={s.label}
                  d={s.values.map((v, j) => `${j === 0 ? 'M' : 'L'}${x(j)} ${y(v)}`).join(' ')}
                  fill="none"
                  stroke={colors[i]}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.dashed ? '4 4' : undefined}
                />
              ))}

              {hover !== null && (
                <>
                  <line
                    x1={x(hover)}
                    x2={x(hover)}
                    y1={0}
                    y2={plotH}
                    stroke="var(--axis)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  {series.map((s, i) => (
                    <circle
                      key={s.label}
                      cx={x(hover)}
                      cy={y(s.values[hover] ?? 0)}
                      r={4.5}
                      fill={colors[i]}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    />
                  ))}
                </>
              )}

              {axis.map((label, i) =>
                i % labelEvery === 0 ? (
                  <text key={i} x={x(i)} y={plotH + 15} textAnchor="middle" className={AXIS_TEXT}>
                    {label}
                  </text>
                ) : null,
              )}
            </g>
          </svg>
        )}
        <ChartTooltip state={tooltip} width={width} />
      </div>
    </ChartFrame>
  )
}

/* ----------------------------------- Bars ----------------------------------- */

export function BarChart({
  data,
  height = 220,
  unit = '',
  decimals = 0,
  title,
  subtitle,
  color,
  tone,
  horizontal = false,
  maxValue,
  className,
  highlightIndex,
}: {
  data: { label: string; value: number; color?: string }[]
  height?: number
  unit?: string
  decimals?: number
  title?: string
  subtitle?: string
  color?: string
  tone?: Tone
  horizontal?: boolean
  maxValue?: number
  className?: string
  highlightIndex?: number
}) {
  const [ref, { width }] = useMeasure<HTMLDivElement>()
  const [hover, setHover] = React.useState<number | null>(null)
  const base = tone ? TONE_VAR[tone] : (color ?? seriesColor(0))
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1)

  if (horizontal) {
    return (
      <ChartFrame title={title} subtitle={subtitle} unit={unit || undefined} className={className}
        tableSummary={{ headers: ['Item', 'Value'], rows: data.map((d) => [d.label, fmtNumber(d.value, decimals)]) }}>
        <ul className="space-y-2">
          {data.map((d, i) => (
            <li key={d.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3">
              <span className="truncate text-[12px] text-[var(--ink-secondary)]" title={d.label}>
                {d.label}
              </span>
              <span className="relative h-2.5 overflow-hidden rounded-full bg-[var(--inset)]">
                <span
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                  style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color ?? base }}
                />
              </span>
              <span className="tabular text-[12px] font-medium text-[var(--ink)]">
                {fmtNumber(d.value, decimals)}
                {unit}
              </span>
            </li>
          ))}
        </ul>
      </ChartFrame>
    )
  }

  const padding = { top: 12, right: 4, bottom: 26, left: 38 }
  const plotW = Math.max(0, width - padding.left - padding.right)
  const plotH = height - padding.top - padding.bottom
  // 2px surface gap between adjacent bars keeps the marks visually separate.
  const slot = data.length ? plotW / data.length : 0
  const barW = Math.max(3, slot - 2 - Math.min(14, slot * 0.34))

  const ticks = Array.from({ length: 4 }, (_, i) => (max / 3) * i)

  const tooltip: TooltipState | null =
    hover === null || !width
      ? null
      : {
          x: padding.left + hover * slot + slot / 2,
          y: padding.top + plotH - (data[hover]!.value / max) * plotH,
          title: data[hover]!.label,
          rows: [{ label: title ?? 'Value', value: `${fmtNumber(data[hover]!.value, decimals)}${unit}`, color: data[hover]!.color ?? base }],
        }

  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(width / 56))))

  return (
    <ChartFrame title={title} subtitle={subtitle} unit={unit || undefined} className={className}
      tableSummary={{ headers: ['Item', 'Value'], rows: data.map((d) => [d.label, fmtNumber(d.value, decimals)]) }}>
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={title ? `${title} bar chart` : 'Bar chart'}>
            <g transform={`translate(${padding.left},${padding.top})`}>
              {ticks.map((t, i) => (
                <g key={i}>
                  <line
                    x1={0}
                    x2={plotW}
                    y1={plotH - (t / max) * plotH}
                    y2={plotH - (t / max) * plotH}
                    stroke="var(--grid)"
                    strokeWidth={1}
                  />
                  <text x={-8} y={plotH - (t / max) * plotH} dy="0.32em" textAnchor="end" className={cn(AXIS_TEXT, 'tabular')}>
                    {fmtNumber(t, decimals)}
                  </text>
                </g>
              ))}
              {data.map((d, i) => {
                const h = Math.max(2, (d.value / max) * plotH)
                const dim = highlightIndex !== undefined && highlightIndex !== i
                return (
                  <g
                    key={`${d.label}-${i}`}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {/* Hit target is wider than the mark. */}
                    <rect x={i * slot} y={0} width={slot} height={plotH} fill="transparent" />
                    <rect
                      x={i * slot + (slot - barW) / 2}
                      y={plotH - h}
                      width={barW}
                      height={h}
                      rx={4}
                      fill={d.color ?? base}
                      opacity={dim ? 0.32 : hover === i ? 1 : 0.92}
                    />
                  </g>
                )
              })}
              {data.map((d, i) =>
                i % labelEvery === 0 ? (
                  <text
                    key={`l-${i}`}
                    x={i * slot + slot / 2}
                    y={plotH + 16}
                    textAnchor="middle"
                    className={AXIS_TEXT}
                  >
                    {d.label.length > 9 ? `${d.label.slice(0, 8)}…` : d.label}
                  </text>
                ) : null,
              )}
            </g>
          </svg>
        )}
        <ChartTooltip state={tooltip} width={width} />
      </div>
    </ChartFrame>
  )
}

/* -------------------------------- Stacked bars -------------------------------- */

export function StackedBar({
  segments,
  height = 10,
  className,
  showLegend = true,
}: {
  segments: { label: string; value: number; color: string }[]
  height?: number
  className?: string
  showLegend?: boolean
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  return (
    <div className={className}>
      <div
        className="flex w-full overflow-hidden rounded-full bg-[var(--inset)]"
        style={{ height }}
        role="img"
        aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s, i) => (
            <span
              key={s.label}
              title={`${s.label}: ${s.value}`}
              style={{
                width: `${(s.value / total) * 100}%`,
                backgroundColor: s.color,
                // 2px surface gap so adjacent segments never blend.
                marginLeft: i === 0 ? 0 : 2,
              }}
            />
          ))}
      </div>
      {showLegend && (
        <ul className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5 text-[11.5px] text-[var(--ink-secondary)]">
              <span aria-hidden className="size-2 rounded-[2px]" style={{ backgroundColor: s.color }} />
              {s.label}
              <span className="tabular font-medium text-[var(--ink)]">{s.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* --------------------------------- Sparkline --------------------------------- */

export function Sparkline({
  values,
  width = 84,
  height = 26,
  color,
  tone,
  area = true,
  className,
  label,
}: {
  values: number[]
  width?: number
  height?: number
  color?: string
  tone?: Tone
  area?: boolean
  className?: string
  label?: string
}) {
  if (!values.length) return null
  const stroke = tone ? TONE_VAR[tone] : (color ?? seriesColor(0))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 2
  const x = (i: number) => pad + (i / Math.max(1, values.length - 1)) * (width - pad * 2)
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2)
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const id = React.useId().replace(/:/g, '')

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      role="img"
      aria-label={label ?? `Trend from ${fmtNumber(values[0] ?? 0, 1)} to ${fmtNumber(values[values.length - 1] ?? 0, 1)}`}
    >
      {area && (
        <>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.24} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${line} L${x(values.length - 1)} ${height} L${x(0)} ${height} Z`} fill={`url(#spark-${id})`} />
        </>
      )}
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1] ?? 0)} r={2} fill={stroke} />
    </svg>
  )
}

/* ---------------------------------- Donut ---------------------------------- */

export function DonutChart({
  data,
  size = 148,
  thickness = 16,
  centerLabel,
  centerValue,
  className,
  title,
}: {
  data: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
  className?: string
  title?: string
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <ChartFrame
      title={title}
      className={className}
      tableSummary={{ headers: ['Segment', 'Count'], rows: data.map((d) => [d.label, d.value]) }}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" role="img" aria-label={title ?? 'Distribution'}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--inset)" strokeWidth={thickness} />
            {data
              .filter((d) => d.value > 0)
              .map((d) => {
                const len = (d.value / total) * c
                const el = (
                  <circle
                    key={d.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={d.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${Math.max(0, len - 2)} ${c - Math.max(0, len - 2)}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                )
                offset += len
                return el
              })}
          </svg>
          {(centerValue || centerLabel) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {centerValue && <span className="kpi-value text-xl font-semibold text-[var(--ink)]">{centerValue}</span>}
              {centerLabel && <span className="text-[10.5px] text-[var(--ink-muted)]">{centerLabel}</span>}
            </div>
          )}
        </div>
        <ul className="min-w-[9rem] flex-1 space-y-1.5">
          {data.map((d) => (
            <li key={d.label} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="flex items-center gap-2 text-[var(--ink-secondary)]">
                <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: d.color }} />
                {d.label}
              </span>
              <span className="tabular font-medium text-[var(--ink)]">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  )
}

/* ---------------------------------- Gauge ---------------------------------- */

export function HealthRing({
  value,
  size = 52,
  thickness = 5,
  label,
  tone,
  showValue = true,
}: {
  value: number
  size?: number
  thickness?: number
  label?: string
  tone?: Tone
  showValue?: boolean
}) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const resolved: Tone = tone ?? (pct >= 85 ? 'good' : pct >= 70 ? 'warning' : pct >= 55 ? 'serious' : 'critical')
  const color = TONE_VAR[resolved]

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? 'Score'}: ${Math.round(pct)} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--inset)" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      {showValue && (
        <span
          className="kpi-value absolute font-semibold text-[var(--ink)]"
          style={{ fontSize: Math.max(10, size * 0.3) }}
        >
          {Math.round(pct)}
        </span>
      )}
    </span>
  )
}

/* --------------------------------- Heatmap --------------------------------- */

export function Heatmap({
  rows,
  columns,
  min,
  max,
  unit = '',
  title,
  subtitle,
  rowLabelWidth = 168,
  className,
}: {
  rows: { label: string; values: number[] }[]
  columns: string[]
  min?: number
  max?: number
  unit?: string
  title?: string
  subtitle?: string
  rowLabelWidth?: number
  className?: string
}) {
  const all = rows.flatMap((r) => r.values)
  const lo = min ?? Math.min(...all)
  const hi = max ?? Math.max(...all)

  // Sequential encoding — one hue, light to dark, never a rainbow.
  const stepFor = (v: number) => {
    const t = (v - lo) / (hi - lo || 1)
    return SEQUENTIAL_VARS[Math.min(SEQUENTIAL_VARS.length - 1, Math.max(0, Math.round(t * (SEQUENTIAL_VARS.length - 1))))]!
  }

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      className={className}
      tableSummary={{
        headers: ['Site', ...columns],
        rows: rows.map((r) => [r.label, ...r.values.map((v) => fmtNumber(v, 1))]),
      }}
      action={
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
          <span>{fmtNumber(lo, 0)}{unit}</span>
          <span className="flex h-2.5 overflow-hidden rounded-full">
            {SEQUENTIAL_VARS.map((v) => (
              <span key={v} className="w-3.5" style={{ backgroundColor: v }} />
            ))}
          </span>
          <span>{fmtNumber(hi, 0)}{unit}</span>
        </div>
      }
    >
      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-max">
          <div className="mb-1.5 flex gap-[3px]" style={{ paddingLeft: rowLabelWidth }}>
            {columns.map((c) => (
              <span key={c} className="w-6 text-center text-[9.5px] text-[var(--ink-muted)]">
                {c}
              </span>
            ))}
          </div>
          {rows.map((row) => (
            <div key={row.label} className="mb-[3px] flex items-center gap-[3px]">
              <span
                className="truncate pr-3 text-[11.5px] text-[var(--ink-secondary)]"
                style={{ width: rowLabelWidth }}
                title={row.label}
              >
                {row.label}
              </span>
              {row.values.map((v, i) => (
                <span
                  key={i}
                  className="h-6 w-6 rounded-[3px] transition-transform hover:scale-110"
                  style={{ backgroundColor: stepFor(v) }}
                  title={`${row.label} · ${columns[i]}: ${fmtNumber(v, 1)}${unit}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </ChartFrame>
  )
}

/* -------------------------------- Power curve -------------------------------- */

export function PowerCurveChart({
  data,
  height = 240,
  className,
}: {
  data: { windSpeed: number; expectedKw: number; actualKw: number | null }[]
  height?: number
  className?: string
}) {
  const [ref, { width }] = useMeasure<HTMLDivElement>()
  const [hover, setHover] = React.useState<number | null>(null)

  const padding = { top: 12, right: 12, bottom: 46, left: 46 }
  const plotW = Math.max(0, width - padding.left - padding.right)
  const plotH = height - padding.top - padding.bottom
  const maxKw = Math.max(...data.map((d) => d.expectedKw)) * 1.08
  const maxWs = Math.max(...data.map((d) => d.windSpeed))

  const x = (ws: number) => (ws / maxWs) * plotW
  const y = (kw: number) => plotH - (kw / maxKw) * plotH

  const measured = data.filter((d) => d.actualKw !== null)

  const tooltip: TooltipState | null =
    hover === null || !width
      ? null
      : {
          x: padding.left + x(data[hover]!.windSpeed),
          y: padding.top + y(data[hover]!.expectedKw),
          title: `${data[hover]!.windSpeed} m/s`,
          rows: [
            { label: 'Expected', value: `${fmtNumber(data[hover]!.expectedKw)} kW`, color: 'var(--ink-muted)' },
            {
              label: 'Measured',
              value: data[hover]!.actualKw === null ? '—' : `${fmtNumber(data[hover]!.actualKw!)} kW`,
              color: seriesColor(0),
            },
          ],
        }

  return (
    <ChartFrame
      title="Power curve"
      subtitle="Measured output against the certified curve"
      legend={[
        { label: 'Measured', color: seriesColor(0) },
        { label: 'Certified', color: 'var(--axis)' },
      ]}
      className={className}
      tableSummary={{
        headers: ['Wind speed (m/s)', 'Expected (kW)', 'Measured (kW)'],
        rows: data.map((d) => [d.windSpeed, d.expectedKw, d.actualKw ?? '—']),
      }}
    >
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label="Power curve"
            onMouseLeave={() => setHover(null)}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              const px = event.clientX - rect.left - padding.left
              const ws = (px / plotW) * maxWs
              const idx = data.reduce(
                (best, d, i) => (Math.abs(d.windSpeed - ws) < Math.abs(data[best]!.windSpeed - ws) ? i : best),
                0,
              )
              setHover(idx)
            }}
          >
            <g transform={`translate(${padding.left},${padding.top})`}>
              {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <g key={t}>
                  <line x1={0} x2={plotW} y1={plotH * (1 - t)} y2={plotH * (1 - t)} stroke="var(--grid)" strokeWidth={1} />
                  <text x={-8} y={plotH * (1 - t)} dy="0.32em" textAnchor="end" className={cn(AXIS_TEXT, 'tabular')}>
                    {fmtNumber(maxKw * t)}
                  </text>
                </g>
              ))}
              <path
                d={data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.windSpeed)} ${y(d.expectedKw)}`).join(' ')}
                fill="none"
                stroke="var(--axis)"
                strokeWidth={2}
                strokeDasharray="5 4"
              />
              <path
                d={measured.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.windSpeed)} ${y(d.actualKw!)}`).join(' ')}
                fill="none"
                stroke={seriesColor(0)}
                strokeWidth={2}
                strokeLinecap="round"
              />
              {measured.map((d) => (
                <circle
                  key={d.windSpeed}
                  cx={x(d.windSpeed)}
                  cy={y(d.actualKw!)}
                  r={2.6}
                  fill={seriesColor(0)}
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                />
              ))}
              {hover !== null && (
                <line
                  x1={x(data[hover]!.windSpeed)}
                  x2={x(data[hover]!.windSpeed)}
                  y1={0}
                  y2={plotH}
                  stroke="var(--axis)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
              {[0, 5, 10, 15, 20, 25].map((ws) => (
                <text key={ws} x={x(ws)} y={plotH + 17} textAnchor="middle" className={AXIS_TEXT}>
                  {ws}
                </text>
              ))}
              <text x={plotW / 2} y={plotH + 30} textAnchor="middle" className={AXIS_TEXT}>
                Wind speed (m/s)
              </text>
            </g>
          </svg>
        )}
        <ChartTooltip state={tooltip} width={width} />
      </div>
    </ChartFrame>
  )
}
