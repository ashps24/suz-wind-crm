'use client'

import * as React from 'react'
import { Badge, type Tone } from '@/components/ui/badge'
import { RISK_BAND, SEVERITY, TURBINE_STATUS, WIND_FARM_STATUS, WORK_ORDER_STATUS } from '@/lib/constants'
import type { RiskBand, Severity, TurbineStatus, WindFarmStatus, WorkOrderStatus } from '@/types'

export function TurbineStatusBadge({ status, size }: { status: TurbineStatus; size?: 'sm' | 'md' }) {
  const token = TURBINE_STATUS[status]
  return (
    <Badge tone={token.tone} dot size={size} title={token.description}>
      {token.label}
    </Badge>
  )
}

export function SeverityBadge({ severity, size }: { severity: Severity; size?: 'sm' | 'md' }) {
  const token = SEVERITY[severity]
  return (
    <Badge tone={token.tone} dot size={size} title={token.description}>
      {token.label}
    </Badge>
  )
}

export function RiskBadge({ band, size, prefix }: { band: RiskBand; size?: 'sm' | 'md'; prefix?: string }) {
  const token = RISK_BAND[band]
  return (
    <Badge tone={token.tone} dot size={size} title={token.description}>
      {prefix}
      {token.label}
    </Badge>
  )
}

export function SiteStatusBadge({ status, size }: { status: WindFarmStatus; size?: 'sm' | 'md' }) {
  const token = WIND_FARM_STATUS[status]
  return (
    <Badge tone={token.tone} dot size={size} title={token.description}>
      {token.label}
    </Badge>
  )
}

export function WorkOrderStatusBadge({ status, size }: { status: WorkOrderStatus; size?: 'sm' | 'md' }) {
  const token = WORK_ORDER_STATUS[status]
  return (
    <Badge tone={token.tone} dot size={size} title={token.description}>
      {token.label}
    </Badge>
  )
}

/** Small inline status dot + label for table cells where a badge is too loud. */
export function StatusDot({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--ink-secondary)]">
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: `var(--status-${tone})` }} />
      {label}
    </span>
  )
}
