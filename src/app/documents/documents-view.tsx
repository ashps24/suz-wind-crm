'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Buildings,
  Cards,
  DownloadSimple,
  FileDoc,
  FilePdf,
  FileText,
  FileXls,
  FileZip,
  HardHat,
  Image as ImageIcon,
  LockKey,
  MapTrifold,
  Rows,
  Wind,
} from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@/components/ui/icon'
import { Page } from '@/components/layout/app-shell'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/primitives'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/dialog'
import { KpiCard } from '@/components/cards/kpi'
import { CellTitle, DataTable, type Column } from '@/components/tables/data-table'
import { FilterBar, ViewToggle } from '@/components/tables/filter-bar'
import { CardGridSkeleton, EmptyState, QueryState, TableSkeleton } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { documentCategories } from '@/lib/mocks/documents'
import { fmtDate, fmtFileSize, fmtNumber, fmtRelative } from '@/lib/formatters'
import type { DocumentRecord } from '@/types'
import { turbineHref, windFarmHref } from '@/lib/routing'

const FILE_ICON: Record<DocumentRecord['fileType'], Icon> = {
  pdf: FilePdf,
  dwg: FileText,
  xlsx: FileXls,
  docx: FileDoc,
  jpg: ImageIcon,
  zip: FileZip,
}

const FILE_TINT: Record<DocumentRecord['fileType'], string> = {
  pdf: 'var(--series-8)',
  dwg: 'var(--series-7)',
  xlsx: 'var(--series-3)',
  docx: 'var(--series-1)',
  jpg: 'var(--series-5)',
  zip: 'var(--series-4)',
}

const RELATED_ICON: Record<DocumentRecord['relatedTo']['kind'], Icon> = {
  'wind-farm': MapTrifold,
  turbine: Wind,
  project: HardHat,
  account: Buildings,
}

const RELATED_HREF: Record<DocumentRecord['relatedTo']['kind'], (id: string) => string> = {
  'wind-farm': (id) => windFarmHref(id),
  turbine: (id) => turbineHref(id),
  project: (id) => `/projects/${id}`,
  account: (id) => `/crm/accounts/${id}`,
}

export function DocumentsView() {
  const searchParams = useSearchParams()
  const [view, setView] = React.useState<'grid' | 'list'>('grid')
  const [search, setSearch] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, string>>({
    category: searchParams.get('category') ?? 'all',
    type: 'all',
    related: 'all',
  })
  const [preview, setPreview] = React.useState<string | null>(searchParams.get('doc'))

  const documents = useQuery({ queryKey: ['documents'], queryFn: api.documents.list })
  const summary = useQuery({ queryKey: ['documents', 'summary'], queryFn: api.documents.summary })

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (documents.data ?? []).filter((d) => {
      if (q && !`${d.name} ${d.category} ${d.uploadedBy} ${d.tags.join(' ')}`.toLowerCase().includes(q)) return false
      if (filters.category !== 'all' && d.category !== filters.category) return false
      if (filters.type !== 'all' && d.fileType !== filters.type) return false
      if (filters.related !== 'all' && d.relatedTo.kind !== filters.related) return false
      return true
    })
  }, [documents.data, search, filters])

  const previewDoc = documents.data?.find((d) => d.id === preview) ?? null

  const columns: Column<DocumentRecord>[] = [
    {
      key: 'name',
      header: 'Document',
      width: '38%',
      sortValue: (d) => d.name,
      render: (d) => {
        const FileIcon = FILE_ICON[d.fileType]
        return (
          <span className="flex items-center gap-2.5">
            <FileIcon className="size-4 shrink-0" style={{ color: FILE_TINT[d.fileType] }} weight="fill" aria-hidden />
            <CellTitle title={d.name} subtitle={`${d.category} · ${d.version}`} />
          </span>
        )
      },
    },
    {
      key: 'related',
      header: 'Related to',
      hideBelow: 'lg',
      sortValue: (d) => d.relatedTo.label,
      render: (d) => (
        <Link href={RELATED_HREF[d.relatedTo.kind](d.relatedTo.id)} className="text-[var(--brand)] hover:underline">
          {d.relatedTo.label}
        </Link>
      ),
    },
    { key: 'size', header: 'Size', numeric: true, hideBelow: 'md', sortValue: (d) => d.sizeMb, render: (d) => fmtFileSize(d.sizeMb) },
    { key: 'by', header: 'Uploaded by', hideBelow: 'xl', sortValue: (d) => d.uploadedBy, render: (d) => d.uploadedBy },
    { key: 'at', header: 'Uploaded', numeric: true, sortValue: (d) => d.uploadedAt, render: (d) => fmtRelative(d.uploadedAt) },
    {
      key: 'access',
      header: 'Access',
      render: (d) =>
        d.confidential ? (
          <Badge tone="warning" dot>
            Confidential
          </Badge>
        ) : (
          <Chip>Internal</Chip>
        ),
    },
  ]

  return (
    <Page
      title="Documents"
      description="Every contract, drawing, report and certificate, linked to the asset, project or account it belongs to."
      wide
      actions={
        <ViewToggle
          value={view}
          onChange={setView}
          options={[
            { value: 'grid', label: 'Grid', icon: <Cards className="size-4" aria-hidden /> },
            { value: 'list', label: 'List', icon: <Rows className="size-4" aria-hidden /> },
          ]}
        />
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.data && (
          <>
            <KpiCard label="Documents" value={fmtNumber(summary.data.total)} icon={FileText} />
            <KpiCard label="Confidential" value={fmtNumber(summary.data.confidential)} icon={LockKey} emphasis="warning" />
            <KpiCard label="Added this month" value={fmtNumber(summary.data.addedThisMonth)} />
            <KpiCard label="Total size" value={`${summary.data.totalSizeGb} GB`} />
          </>
        )}
      </div>

      <FilterBar
        className="mb-4"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search document name, tag, uploader…"
        values={filters}
        onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        filters={[
          { key: 'category', label: 'Category', options: documentCategories.map((c) => ({ value: c, label: c })) },
          {
            key: 'type',
            label: 'File type',
            options: ['pdf', 'dwg', 'xlsx', 'docx', 'jpg', 'zip'].map((t) => ({ value: t, label: t.toUpperCase() })),
          },
          {
            key: 'related',
            label: 'Related to',
            options: [
              { value: 'wind-farm', label: 'Wind farm' },
              { value: 'turbine', label: 'Turbine' },
              { value: 'project', label: 'Project' },
              { value: 'account', label: 'Account' },
            ],
          },
        ]}
        right={<span className="text-[12.5px] text-[var(--ink-muted)]">{fmtNumber(filtered.length)} documents</span>}
      />

      <QueryState
        query={documents}
        errorTitle="Document library unavailable"
        skeleton={
          view === 'grid' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <CardGridSkeleton count={8} height={170} />
            </div>
          ) : (
            <TableSkeleton rows={12} cols={6} />
          )
        }
      >
        {() =>
          filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents match"
              description="Nothing in the library matches this combination of category, type and linked record."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setFilters({ category: 'all', type: 'all', related: 'all' })
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : view === 'grid' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.slice(0, 60).map((doc, i) => {
                const FileIcon = FILE_ICON[doc.fileType]
                const RelIcon = RELATED_ICON[doc.relatedTo.kind]
                return (
                  <motion.button
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.2) }}
                    onClick={() => setPreview(doc.id)}
                    className="panel p-4 text-left transition-shadow hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `color-mix(in oklab, ${FILE_TINT[doc.fileType]} 14%, transparent)` }}
                      >
                        <FileIcon className="size-[18px]" style={{ color: FILE_TINT[doc.fileType] }} weight="fill" aria-hidden />
                      </span>
                      {doc.confidential && (
                        <LockKey className="size-3.5 text-[var(--status-warning)]" weight="fill" aria-label="Confidential" />
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 text-[12.5px] font-medium leading-snug text-[var(--ink)]">{doc.name}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
                      <RelIcon className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">{doc.relatedTo.label}</span>
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-2.5 text-[10.5px] text-[var(--ink-muted)]">
                      <span>{doc.version} · {fmtFileSize(doc.sizeMb)}</span>
                      <span>{fmtRelative(doc.uploadedAt)}</span>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          ) : (
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(d) => d.id}
              onRowClick={(d) => setPreview(d.id)}
              caption="Document library"
              defaultSort={{ key: 'at', dir: 'desc' }}
              maxHeight={680}
            />
          )
        }
      </QueryState>

      <Sheet open={Boolean(previewDoc)} onOpenChange={(o) => !o && setPreview(null)}>
        <SheetContent side="right" className="w-[min(94vw,28rem)] p-0">
          {previewDoc && <DocumentPreview doc={previewDoc} />}
        </SheetContent>
      </Sheet>
    </Page>
  )
}

function DocumentPreview({ doc }: { doc: DocumentRecord }) {
  const FileIcon = FILE_ICON[doc.fileType]
  const RelIcon = RELATED_ICON[doc.relatedTo.kind]

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[var(--line)] px-5 pb-4 pt-4">
        <SheetTitle className="pr-8 text-[15px] font-semibold leading-snug text-[var(--ink)]">{doc.name}</SheetTitle>
        <p className="mt-1 text-[12px] text-[var(--ink-muted)]">
          {doc.category} · {doc.version}
        </p>
      </div>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
        {/* Preview surface */}
        <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--subtle)]">
          <FileIcon className="size-12" style={{ color: FILE_TINT[doc.fileType] }} weight="duotone" aria-hidden />
          <p className="mt-3 text-[12.5px] font-medium text-[var(--ink)]">{doc.fileType.toUpperCase()} document</p>
          <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">
            Preview rendering is not available in this prototype
          </p>
        </div>

        <dl className="space-y-2.5 text-[12.5px]">
          {[
            ['File type', doc.fileType.toUpperCase()],
            ['Size', fmtFileSize(doc.sizeMb)],
            ['Version', doc.version],
            ['Uploaded by', doc.uploadedBy],
            ['Uploaded', fmtDate(doc.uploadedAt)],
            ['Access', doc.confidential ? 'Confidential' : 'Internal'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-2.5 last:border-0">
              <dt className="text-[var(--ink-muted)]">{label}</dt>
              <dd className="text-right font-medium text-[var(--ink)]">{value}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">
            Related record
          </h3>
          <Link
            href={RELATED_HREF[doc.relatedTo.kind](doc.relatedTo.id)}
            className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3.5 py-3 transition-colors hover:border-[var(--brand)]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--subtle)] text-[var(--ink-secondary)]">
              <RelIcon className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-[var(--ink)]">{doc.relatedTo.label}</span>
              <span className="block text-[11px] capitalize text-[var(--ink-muted)]">
                {doc.relatedTo.kind.replace('-', ' ')}
              </span>
            </span>
          </Link>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {doc.tags.map((tag) => (
              <Chip key={tag}>{tag}</Chip>
            ))}
          </div>
        </section>
      </div>

      <div className="shrink-0 border-t border-[var(--line)] p-3">
        <Button variant="primary" className="w-full">
          <DownloadSimple aria-hidden />
          Download
        </Button>
      </div>
    </div>
  )
}
