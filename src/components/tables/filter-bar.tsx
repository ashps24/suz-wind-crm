'use client'

import * as React from 'react'
import { FunnelSimple, MagnifyingGlass, X } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

export interface FilterDefinition {
  key: string
  label: string
  options: { value: string; label: string }[]
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  values,
  onChange,
  right,
  className,
}: {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterDefinition[]
  values?: Record<string, string>
  onChange?: (key: string, value: string) => void
  right?: React.ReactNode
  className?: string
}) {
  const active = filters.filter((f) => values?.[f.key] && values[f.key] !== 'all')
  const hasFilters = active.length > 0 || Boolean(search)

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {onSearchChange && (
        <div className="relative min-w-[11rem] flex-1 sm:max-w-xs">
          <MagnifyingGlass
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-muted)]"
            aria-hidden
          />
          <Input
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      {filters.map((filter) => (
        <label key={filter.key} className="flex items-center gap-1.5">
          <span className="sr-only">{filter.label}</span>
          <Select
            value={values?.[filter.key] ?? 'all'}
            onChange={(e) => onChange?.(filter.key, e.target.value)}
            className="h-9 w-auto min-w-[8.5rem] text-[13px]"
            aria-label={filter.label}
          >
            <option value="all">{filter.label}: All</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      ))}

      {hasFilters && onChange && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSearchChange?.('')
            filters.forEach((f) => onChange(f.key, 'all'))
          }}
        >
          <X aria-hidden />
          Clear
        </Button>
      )}

      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  )
}

/** Segmented control for view switching (table / cards / calendar). */
export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: React.ReactNode }[]
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label="View mode"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
            value === option.value
              ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)]'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Quick chips that behave as saved segments. */
export function QuickFilters({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: string; label: string; count?: number; tone?: string }[]
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn('no-scrollbar flex items-center gap-1.5 overflow-x-auto', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
            value === option.value
              ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]'
              : 'border-[var(--line)] bg-[var(--elevated)] text-[var(--ink-secondary)] hover:border-[var(--line-strong)]',
          )}
        >
          {option.tone && (
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ backgroundColor: `var(--status-${option.tone})` }}
            />
          )}
          {option.label}
          {option.count !== undefined && (
            <span className="tabular text-[11px] text-[var(--ink-muted)]">{option.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
