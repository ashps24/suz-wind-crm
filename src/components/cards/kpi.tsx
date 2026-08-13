'use client'

import * as React from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@/components/ui/icon'
import { Sparkline } from '@/components/charts'
import { cn } from '@/lib/utils'
import type { Trend } from '@/types'

export function TrendPill({ trend, suffix = '%' }: { trend: Trend; suffix?: string }) {
  const positive = trend.direction === 'up' ? trend.upIsGood : trend.direction === 'down' ? !trend.upIsGood : null
  const color =
    positive === null ? 'var(--ink-muted)' : positive ? 'var(--delta-up)' : 'var(--delta-down)'
  const ArrowIcon = trend.direction === 'up' ? ArrowUpRight : trend.direction === 'down' ? ArrowDownRight : Minus

  return (
    <span className="inline-flex items-center gap-0.5 text-[11.5px] font-medium" style={{ color }}>
      <ArrowIcon weight="bold" className="size-3" aria-hidden />
      {trend.valuePct}
      {suffix}
    </span>
  )
}

export function KpiCard({
  label,
  value,
  unit,
  trend,
  trendLabel,
  icon: IconComponent,
  spark,
  sparkTone,
  emphasis,
  onClick,
  className,
}: {
  label: string
  value: string
  unit?: string
  trend?: Trend
  trendLabel?: string
  icon?: Icon
  spark?: number[]
  sparkTone?: 'good' | 'warning' | 'serious' | 'critical' | 'neutral' | 'info'
  emphasis?: 'critical' | 'warning'
  onClick?: () => void
  className?: string
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'panel group relative overflow-hidden p-4 text-left transition-shadow',
        onClick && 'cursor-pointer hover:shadow-[var(--shadow-md)]',
        className,
      )}
    >
      {emphasis && (
        <span
          aria-hidden
          className="absolute inset-y-3 left-0 w-[3px] rounded-r-full"
          style={{ backgroundColor: emphasis === 'critical' ? 'var(--status-critical)' : 'var(--status-warning)' }}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--ink-muted)]">{label}</p>
        {IconComponent && (
          <IconComponent className="size-4 shrink-0 text-[var(--ink-muted)]" weight="duotone" aria-hidden />
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="kpi-value flex items-baseline gap-1 text-[26px] font-semibold leading-none tracking-tight text-[var(--ink)]">
          {value}
          {unit && <span className="text-[13px] font-medium text-[var(--ink-muted)]">{unit}</span>}
        </p>
        {spark && <Sparkline values={spark} tone={sparkTone} width={72} height={24} />}
      </div>
      {(trend || trendLabel) && (
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--ink-muted)]">
          {trend && <TrendPill trend={trend} />}
          {trendLabel}
        </p>
      )}
    </Wrapper>
  )
}

/** Compact KPI for dense rails (Command Center top bar). */
export function KpiTile({
  label,
  value,
  tone,
  onClick,
  active,
}: {
  label: string
  value: string
  tone?: 'good' | 'warning' | 'serious' | 'critical' | 'neutral' | 'info'
  onClick?: () => void
  active?: boolean
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'flex min-w-0 shrink-0 flex-col gap-0.5 rounded-lg px-3 py-1.5 text-left transition-colors',
        onClick && 'cursor-pointer hover:bg-[var(--subtle)]',
        active && 'bg-[var(--brand-soft)]',
      )}
    >
      <span className="flex items-center gap-1.5 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">
        {tone && (
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ backgroundColor: `var(--status-${tone})` }}
          />
        )}
        {label}
      </span>
      <span className="kpi-value whitespace-nowrap text-[17px] font-semibold leading-tight text-[var(--ink)]">
        {value}
      </span>
    </Wrapper>
  )
}
