'use client'

import * as React from 'react'
import { ArrowClockwise } from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

/* -------------------------------- Empty state -------------------------------- */

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: Icon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] text-center',
        compact ? 'gap-2 px-5 py-8' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      <span
        className="flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--subtle)] text-[var(--ink-muted)]"
        style={{ width: compact ? 36 : 46, height: compact ? 36 : 46 }}
      >
        <IconComponent className={compact ? 'size-[18px]' : 'size-[22px]'} weight="duotone" />
      </span>
      <div className="max-w-sm space-y-1">
        <p className={cn('font-semibold text-[var(--ink)]', compact ? 'text-[13px]' : 'text-sm')}>{title}</p>
        <p className={cn('text-[var(--ink-muted)]', compact ? 'text-[12px]' : 'text-[13px] leading-relaxed')}>
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}

/* -------------------------------- Error state -------------------------------- */

export function ErrorState({
  title = 'We could not load this',
  description,
  onRetry,
  className,
  compact,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
  compact?: boolean
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border text-center',
        compact ? 'gap-2 px-5 py-8' : 'gap-3 px-6 py-12',
        className,
      )}
      style={{
        borderColor: 'color-mix(in oklab, var(--status-critical) 35%, transparent)',
        backgroundColor: 'var(--status-critical-soft)',
      }}
    >
      <span
        className="flex size-10 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: 'var(--status-critical)' }}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8v5" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
          <path d="M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
        <p className="text-[13px] leading-relaxed text-[var(--ink-secondary)]">
          {description ?? 'The upstream data source did not respond. Nothing has been lost — try again.'}
        </p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <ArrowClockwise />
          Retry
        </Button>
      )}
    </div>
  )
}

/* ------------------------------- Loading states ------------------------------- */

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="panel space-y-3 p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ))}
    </>
  )
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex gap-4 border-b border-[var(--line)] px-4 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: i === 0 ? '22%' : `${60 / cols}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-[var(--line)] px-4 py-3.5 last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton
              key={c}
              className="h-3.5"
              style={{ width: c === 0 ? '22%' : `${60 / cols}%`, opacity: 1 - r * 0.06 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6, height = 150 }: { count?: number; height?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="panel space-y-3 p-4" style={{ opacity: 1 - i * 0.05 }}>
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
          <Skeleton className="w-full rounded-lg" style={{ height: height - 96 }} />
          <div className="flex gap-2">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>
      ))}
    </>
  )
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-32" />
      <div className="flex items-end gap-1.5" style={{ height }}>
        {Array.from({ length: 22 }, (_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-[3px]"
            style={{ height: `${34 + Math.abs(Math.sin(i / 2.4)) * 62}%` }}
          />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------- Query boundary ------------------------------- */

/**
 * Standard loading / error / empty envelope for a TanStack Query result, so
 * every screen handles the three states the same way.
 */
export function QueryState<T>({
  query,
  skeleton,
  errorTitle,
  isEmpty,
  empty,
  children,
}: {
  query: { data: T | undefined; isPending: boolean; isError: boolean; error?: unknown; refetch: () => void }
  skeleton: React.ReactNode
  errorTitle?: string
  isEmpty?: (data: T) => boolean
  empty?: React.ReactNode
  children: (data: T) => React.ReactNode
}) {
  if (query.isPending) return <>{skeleton}</>
  if (query.isError || query.data === undefined) {
    return (
      <ErrorState
        title={errorTitle}
        description={query.error instanceof Error ? query.error.message : undefined}
        onRetry={() => query.refetch()}
      />
    )
  }
  if (isEmpty?.(query.data) && empty) return <>{empty}</>
  return <>{children(query.data)}</>
}
