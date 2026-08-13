'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'

export function DetailHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  meta,
  badges,
  actions,
  media,
  className,
}: {
  backHref: string
  backLabel: string
  eyebrow?: string
  title: string
  meta?: React.ReactNode
  badges?: React.ReactNode
  actions?: React.ReactNode
  media?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-5', className)}>
      <Link
        href={backHref}
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {backLabel}
      </Link>

      <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
        {media}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">{eyebrow}</p>
          )}
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[var(--ink)] md:text-[24px]">{title}</h1>
          {meta && <div className="mt-1.5 text-[13px] text-[var(--ink-muted)]">{meta}</div>}
          {badges && <div className="mt-2.5 flex flex-wrap items-center gap-1.5">{badges}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/** Compact stat strip used under detail headers. */
export function StatStrip({
  items,
  className,
}: {
  items: { label: string; value: string; sub?: string; tone?: 'good' | 'warning' | 'serious' | 'critical' }[]
  className?: string
}) {
  return (
    <dl
      className={cn(
        'panel grid grid-cols-2 divide-x divide-y divide-[var(--line)] overflow-hidden sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <dt className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">
            {item.label}
          </dt>
          <dd
            className="kpi-value mt-1 text-[18px] font-semibold leading-none"
            style={{ color: item.tone ? `var(--status-${item.tone})` : 'var(--ink)' }}
          >
            {item.value}
          </dd>
          {item.sub && <dd className="mt-1 text-[11px] text-[var(--ink-muted)]">{item.sub}</dd>}
        </div>
      ))}
    </dl>
  )
}
