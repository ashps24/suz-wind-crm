'use client'

import * as React from 'react'
import Link from 'next/link'
import { CaretDown, CaretUp, CaretUpDown } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  /** Right-align numeric columns and give them tabular figures. */
  numeric?: boolean
  width?: string
  sortValue?: (row: T) => number | string
  render: (row: T) => React.ReactNode
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
}

const HIDE_CLASS: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  href,
  onRowClick,
  caption,
  defaultSort,
  emptyState,
  maxHeight,
  className,
  compact,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  href?: (row: T) => string
  onRowClick?: (row: T) => void
  caption?: string
  defaultSort?: { key: string; dir: 'asc' | 'desc' }
  emptyState?: React.ReactNode
  maxHeight?: number
  className?: string
  compact?: boolean
}) {
  const [sort, setSort] = React.useState(defaultSort ?? null)

  const sorted = React.useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return rows
    const get = column.sortValue
    return [...rows].sort((a, b) => {
      const av = get(a)
      const bv = get(b)
      if (av === bv) return 0
      const result = av > bv ? 1 : -1
      return sort.dir === 'asc' ? result : -result
    })
  }, [rows, sort, columns])

  function toggleSort(key: string) {
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' },
    )
  }

  if (rows.length === 0 && emptyState) return <>{emptyState}</>

  return (
    <div
      className={cn('panel overflow-hidden', className)}
      style={maxHeight ? undefined : undefined}
    >
      <div
        className="scrollbar-thin overflow-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full min-w-max border-collapse text-left">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-10 bg-[var(--surface)]">
            <tr className="border-b border-[var(--line)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{ width: column.width }}
                  aria-sort={
                    sort?.key === column.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={cn(
                    'whitespace-nowrap px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--ink-muted)]',
                    column.numeric && 'text-right',
                    column.hideBelow && HIDE_CLASS[column.hideBelow],
                  )}
                >
                  {column.sortValue ? (
                    <button
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors hover:text-[var(--ink)]',
                        column.numeric && 'flex-row-reverse',
                      )}
                    >
                      {column.header}
                      {sort?.key === column.key ? (
                        sort.dir === 'asc' ? (
                          <CaretUp className="size-3" weight="bold" aria-hidden />
                        ) : (
                          <CaretDown className="size-3" weight="bold" aria-hidden />
                        )
                      ) : (
                        <CaretUpDown className="size-3 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const key = rowKey(row)
              const interactive = Boolean(href || onRowClick)
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-[var(--line)] transition-colors last:border-0',
                    interactive && 'cursor-pointer hover:bg-[var(--subtle)]',
                  )}
                >
                  {columns.map((column, i) => {
                    const content = column.render(row)
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          'px-3.5 align-middle text-[13px] text-[var(--ink-secondary)]',
                          compact ? 'py-2' : 'py-2.5',
                          column.numeric && 'tabular text-right',
                          column.hideBelow && HIDE_CLASS[column.hideBelow],
                        )}
                      >
                        {href && i === 0 ? (
                          <Link href={href(row)} className="block outline-none focus-visible:underline">
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Primary cell: bold title over muted metadata. */
export function CellTitle({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate font-medium text-[var(--ink)]">{title}</span>
      {subtitle && <span className="block truncate text-[11.5px] text-[var(--ink-muted)]">{subtitle}</span>}
    </span>
  )
}
