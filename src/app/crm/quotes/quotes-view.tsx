'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CurrencyInr, FilePlus, Receipt } from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select } from '@/components/ui/primitives'
import { BarChart, StackedBar, seriesColor } from '@/components/charts'
import { KpiCard } from '@/components/cards/kpi'
import { CardGridSkeleton, EmptyState, QueryState } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { PRODUCT_SPECS } from '@/lib/constants'
import { quoteTotalCr } from '@/lib/mocks/crm'
import { fmtCrore, fmtDate, fmtLakh, fmtMw, fmtNumber, fmtRelative } from '@/lib/formatters'
import { sum } from '@/lib/utils'
import type { Quote, QuoteLine } from '@/types'

const STATUS_TONE: Record<Quote['status'], 'neutral' | 'info' | 'warning' | 'good' | 'critical'> = {
  draft: 'neutral',
  'internal-review': 'warning',
  sent: 'info',
  accepted: 'good',
  expired: 'critical',
}

export function QuotesView() {
  const quotes = useQuery({ queryKey: ['quotes'], queryFn: api.quotes.list })
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const selected = quotes.data?.find((q) => q.id === selectedId) ?? quotes.data?.[0] ?? null

  const totals = quotes.data
    ? {
        count: quotes.data.length,
        value: Math.round(sum(quotes.data.map(quoteTotalCr))),
        mw: Math.round(sum(quotes.data.map((q) => q.capacityMw)) * 10) / 10,
        sent: quotes.data.filter((q) => q.status === 'sent').length,
      }
    : null

  return (
    <Page
      title="Quotes"
      description="Turbine supply, EPC, logistics, installation and service quotations built from the standard rate card."
      wide
      actions={
        <Button variant="primary" size="sm">
          <FilePlus aria-hidden />
          New quote
        </Button>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {totals && (
          <>
            <KpiCard label="Live quotes" value={fmtNumber(totals.count)} icon={Receipt} />
            <KpiCard label="Quoted value" value={fmtCrore(totals.value)} icon={CurrencyInr} />
            <KpiCard label="Quoted capacity" value={fmtMw(totals.mw, 0)} />
            <KpiCard label="With customer" value={fmtNumber(totals.sent)} trendLabel="Awaiting response" />
          </>
        )}
      </div>

      <QueryState
        query={quotes}
        errorTitle="Quotes unavailable"
        skeleton={
          <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <CardGridSkeleton count={2} height={300} />
          </div>
        }
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            icon={Receipt}
            title="No quotes yet"
            description="Quotations built against open opportunities will appear here."
            action={
              <Button variant="secondary" size="sm" asChild>
                <Link href="/crm/opportunities">Browse the pipeline</Link>
              </Button>
            }
          />
        }
      >
        {(rows) => (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
            <div className="space-y-2">
              {rows.map((quote) => {
                const active = selected?.id === quote.id
                return (
                  <button
                    key={quote.id}
                    onClick={() => setSelectedId(quote.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`panel w-full p-3.5 text-left transition-all ${
                      active ? 'border-[var(--brand)] shadow-[var(--shadow-md)]' : 'hover:border-[var(--line-strong)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold text-[var(--ink)]">{quote.projectName}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--ink-muted)]">{quote.number}</p>
                      </div>
                      <Badge tone={STATUS_TONE[quote.status]} dot>
                        {quote.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="kpi-value text-[15px] font-semibold text-[var(--ink)]">
                        {fmtCrore(quoteTotalCr(quote))}
                      </span>
                      <span className="text-[11px] text-[var(--ink-muted)]">
                        {quote.turbineCount} × {quote.product}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-[11px] text-[var(--ink-muted)]">{quote.accountName}</p>
                  </button>
                )
              })}
            </div>

            {selected && <QuoteBuilder quote={selected} />}
          </div>
        )}
      </QueryState>
    </Page>
  )
}

function QuoteBuilder({ quote }: { quote: Quote }) {
  const [lines, setLines] = React.useState<QuoteLine[]>(quote.lines)
  const [discount, setDiscount] = React.useState(quote.discountPct)
  const [servicePackage, setServicePackage] = React.useState(quote.servicePackage)

  React.useEffect(() => {
    setLines(quote.lines)
    setDiscount(quote.discountPct)
    setServicePackage(quote.servicePackage)
  }, [quote])

  const gross = lines.reduce((total, line) => total + (line.quantity * line.unitRateLakh) / 100, 0)
  const discountCr = (gross * discount) / 100
  const net = gross - discountCr
  const perMw = net / quote.capacityMw
  const spec = PRODUCT_SPECS[quote.product]

  const byCategory = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const line of lines) {
      map.set(line.category, (map.get(line.category) ?? 0) + (line.quantity * line.unitRateLakh) / 100)
    }
    return Array.from(map, ([label, value], i) => ({ label, value: Math.round(value * 10) / 10, color: seriesColor(i) }))
  }, [lines])

  function updateLine(id: string, patch: Partial<QuoteLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>{quote.projectName}</CardTitle>
            <CardDescription>
              {quote.number} · {quote.accountName} · issued {fmtRelative(quote.createdAt)}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={STATUS_TONE[quote.status]} dot size="md">
              {quote.status.replace('-', ' ')}
            </Badge>
            <Button variant="secondary" size="sm">
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Capacity', fmtMw(quote.capacityMw)],
              ['Turbines', `${quote.turbineCount} × ${quote.product}`],
              ['Rated output', `${spec.ratedCapacityMw} MW each`],
              ['Valid until', fmtDate(quote.validUntil)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--ink-muted)]">{label}</dt>
                <dd className="mt-1 text-[14px] font-semibold text-[var(--ink)]">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Line items</CardTitle>
            <CardDescription>Rates are editable — totals recalculate as you type</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-max text-left">
              <caption className="sr-only">Quote line items with quantity and unit rate</caption>
              <thead>
                <tr className="border-y border-[var(--line)]">
                  {['Category', 'Description', 'Quantity', 'Unit', 'Rate (₹ lakh)', 'Amount'].map((header, i) => (
                    <th
                      key={header}
                      className={`px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--ink-muted)] ${
                        i >= 2 ? 'text-right' : ''
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-[var(--line)]">
                    <td className="px-3.5 py-2">
                      <Chip>{line.category}</Chip>
                    </td>
                    <td className="max-w-[22rem] px-3.5 py-2 text-[12.5px] text-[var(--ink-secondary)]">
                      {line.description}
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <Input
                        type="number"
                        value={line.quantity}
                        min={0}
                        onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) || 0 })}
                        className="ml-auto h-8 w-20 text-right text-[12.5px]"
                        aria-label={`Quantity for ${line.description}`}
                      />
                    </td>
                    <td className="px-3.5 py-2 text-right text-[12px] text-[var(--ink-muted)]">{line.unit}</td>
                    <td className="px-3.5 py-2 text-right">
                      <Input
                        type="number"
                        value={line.unitRateLakh}
                        min={0}
                        onChange={(e) => updateLine(line.id, { unitRateLakh: Number(e.target.value) || 0 })}
                        className="ml-auto h-8 w-24 text-right text-[12.5px]"
                        aria-label={`Unit rate for ${line.description}`}
                      />
                    </td>
                    <td className="tabular px-3.5 py-2 text-right text-[13px] font-medium text-[var(--ink)]">
                      {fmtCrore((line.quantity * line.unitRateLakh) / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Cost composition</CardTitle>
              <CardDescription>Where the contract value sits</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <StackedBar segments={byCategory} height={11} />
            <div className="mt-4">
              <BarChart horizontal unit=" Cr" decimals={1} data={byCategory} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Commercial summary</CardTitle>
              <CardDescription>Frontend calculation for demonstration</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="service-package">Service package</Label>
              <Select
                id="service-package"
                value={servicePackage}
                onChange={(e) => setServicePackage(e.target.value as Quote['servicePackage'])}
              >
                <option value="Standard O&M 5yr">Standard O&amp;M — 5 years (97.0% guarantee)</option>
                <option value="Comprehensive O&M 10yr">Comprehensive O&amp;M — 10 years (97.0% guarantee)</option>
                <option value="Full-Scope 15yr">Full-Scope — 15 years (98.0% guarantee)</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                min={0}
                max={25}
                step={0.5}
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Math.min(25, Number(e.target.value) || 0)))}
              />
            </div>

            <dl className="space-y-2 border-t border-[var(--line)] pt-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Gross value</dt>
                <dd className="tabular font-medium text-[var(--ink)]">{fmtCrore(gross)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Discount ({discount}%)</dt>
                <dd className="tabular font-medium" style={{ color: 'var(--delta-down)' }}>
                  −{fmtCrore(discountCr)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-[var(--line)] pt-2">
                <dt className="font-semibold text-[var(--ink)]">Net contract value</dt>
                <dd className="kpi-value text-[17px] font-semibold text-[var(--ink)]">{fmtCrore(net)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Per MW</dt>
                <dd className="tabular font-medium text-[var(--ink)]">{fmtCrore(perMw)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Commercial assumptions</CardTitle>
            <CardDescription>Carried into the contract if the quote is accepted</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {quote.assumptions.map((assumption, i) => (
              <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                {assumption}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
