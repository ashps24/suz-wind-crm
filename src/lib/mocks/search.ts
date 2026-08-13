import { fmtMw, fmtPct } from '@/lib/formatters'
import { accounts, contacts } from './crm'
import { documents } from './documents'
import { turbines, windFarms } from './fleet'
import { workOrders } from './maintenance'
import { projects } from './projects'
import type { SearchResult } from '@/types'

/** Flat, pre-built index — rebuilt once at module load, then filtered per keystroke. */
const INDEX: (SearchResult & { haystack: string })[] = [
  ...windFarms.map((w) => ({
    id: w.id,
    kind: 'wind-farm' as const,
    title: w.name,
    subtitle: `${w.district}, ${w.state} · ${w.customerName}`,
    meta: `${fmtMw(w.installedMw)} · ${w.turbineCount} turbines`,
    href: `/wind-farms/${w.id}`,
    status: w.status,
    haystack: `${w.name} ${w.code} ${w.state} ${w.district} ${w.customerName} ${w.products.join(' ')}`.toLowerCase(),
  })),
  ...turbines.map((t) => ({
    id: t.id,
    kind: 'turbine' as const,
    title: t.name,
    subtitle: `${t.windFarmName} · ${t.product}`,
    meta: `${fmtPct(t.availabilityPct)} availability · health ${t.healthScore}`,
    href: `/turbines/${t.id}`,
    status: t.status,
    haystack: `${t.name} ${t.serialNumber} ${t.product} ${t.windFarmName} ${t.state} ${t.customerName} ${t.activeAlarm ?? ''}`.toLowerCase(),
  })),
  ...accounts.map((a) => ({
    id: a.id,
    kind: 'account' as const,
    title: a.name,
    subtitle: `${a.type} · ${a.headquarters}`,
    meta: `${fmtMw(a.installedMw)} installed · ${a.activeProjects} projects`,
    href: `/crm/accounts/${a.id}`,
    haystack: `${a.name} ${a.type} ${a.region} ${a.headquarters} ${a.segments.join(' ')}`.toLowerCase(),
  })),
  ...contacts.map((c) => ({
    id: c.id,
    kind: 'contact' as const,
    title: c.name,
    subtitle: `${c.title} · ${c.accountName}`,
    meta: c.location,
    href: `/crm/contacts?contact=${c.id}`,
    haystack: `${c.name} ${c.title} ${c.accountName} ${c.email} ${c.location}`.toLowerCase(),
  })),
  ...projects.map((p) => ({
    id: p.id,
    kind: 'project' as const,
    title: p.name,
    subtitle: `${p.code} · ${p.customerName}`,
    meta: `${p.stage} · ${p.completionPct}% complete`,
    href: `/projects/${p.id}`,
    status: p.risk,
    haystack: `${p.name} ${p.code} ${p.customerName} ${p.state} ${p.type} ${p.stage} ${p.projectManager}`.toLowerCase(),
  })),
  ...workOrders.map((w) => ({
    id: w.id,
    kind: 'work-order' as const,
    title: `${w.id} · ${w.title}`,
    subtitle: `${w.turbineName} · ${w.windFarmName}`,
    meta: `${w.type} · ${w.technicianName}`,
    href: `/maintenance/${w.id}`,
    status: w.status,
    haystack: `${w.id} ${w.title} ${w.turbineName} ${w.windFarmName} ${w.technicianName} ${w.type} ${w.status}`.toLowerCase(),
  })),
  ...documents.map((d) => ({
    id: d.id,
    kind: 'document' as const,
    title: d.name,
    subtitle: `${d.category} · ${d.version}`,
    meta: `${d.uploadedBy} · ${d.fileType.toUpperCase()}`,
    href: `/documents?doc=${d.id}`,
    haystack: `${d.name} ${d.category} ${d.tags.join(' ')} ${d.uploadedBy}`.toLowerCase(),
  })),
]

const KIND_WEIGHT: Record<SearchResult['kind'], number> = {
  'wind-farm': 0,
  turbine: 1,
  project: 2,
  account: 3,
  'work-order': 4,
  contact: 5,
  document: 6,
}

export function search(query: string, limit = 24): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const terms = q.split(/\s+/)

  const scored = INDEX.map((entry) => {
    let score = 0
    for (const term of terms) {
      const at = entry.haystack.indexOf(term)
      if (at === -1) return null
      score += at === 0 ? 12 : at < 24 ? 6 : 2
      if (entry.title.toLowerCase().startsWith(term)) score += 10
    }
    return { entry, score: score - KIND_WEIGHT[entry.kind] * 0.4 }
  }).filter(Boolean) as { entry: (typeof INDEX)[number]; score: number }[]

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => {
      const { haystack: _haystack, ...result } = entry
      return result
    })
}

export const searchIndexSize = INDEX.length
