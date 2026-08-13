import { between, daysAgo, pick, seededRandom } from '@/lib/utils'
import { accounts } from './crm'
import { turbines, windFarms } from './fleet'
import { projects } from './projects'
import type { DocumentCategory, DocumentRecord } from '@/types'

interface DocTemplate {
  name: string
  category: DocumentCategory
  fileType: DocumentRecord['fileType']
  tags: string[]
  confidential: boolean
  relatedKind: DocumentRecord['relatedTo']['kind']
}

const TEMPLATES: DocTemplate[] = [
  { name: 'Turbine Supply & Erection Agreement', category: 'Contracts', fileType: 'pdf', tags: ['Executed', 'Legal'], confidential: true, relatedKind: 'account' },
  { name: 'Comprehensive O&M Agreement', category: 'Contracts', fileType: 'pdf', tags: ['Service', 'Availability guarantee'], confidential: true, relatedKind: 'account' },
  { name: 'Power Purchase Agreement — Schedule 4', category: 'Contracts', fileType: 'pdf', tags: ['PPA', 'Commercial'], confidential: true, relatedKind: 'account' },
  { name: 'EPC Scope Matrix & Responsibility Split', category: 'EPC Documents', fileType: 'xlsx', tags: ['EPC', 'Scope'], confidential: false, relatedKind: 'project' },
  { name: 'Foundation Design Basis Report', category: 'EPC Documents', fileType: 'pdf', tags: ['Civil', 'Design'], confidential: false, relatedKind: 'project' },
  { name: 'Crane Campaign Method Statement', category: 'EPC Documents', fileType: 'pdf', tags: ['Lifting', 'Method statement'], confidential: false, relatedKind: 'project' },
  { name: 'General Arrangement — Nacelle Assembly', category: 'Drawings', fileType: 'dwg', tags: ['Mechanical', 'GA'], confidential: false, relatedKind: 'turbine' },
  { name: 'Internal Grid Single Line Diagram', category: 'Drawings', fileType: 'dwg', tags: ['Electrical', 'SLD'], confidential: false, relatedKind: 'wind-farm' },
  { name: 'Micro-siting Layout & Coordinates', category: 'Drawings', fileType: 'dwg', tags: ['Layout', 'Survey'], confidential: false, relatedKind: 'wind-farm' },
  { name: 'Wind Resource Assessment — P50/P90', category: 'Wind Reports', fileType: 'pdf', tags: ['Yield', 'Independent engineer'], confidential: true, relatedKind: 'wind-farm' },
  { name: 'Met Mast Data Validation Report', category: 'Wind Reports', fileType: 'xlsx', tags: ['Met mast', 'Data'], confidential: false, relatedKind: 'wind-farm' },
  { name: 'Annual Energy Production Reconciliation', category: 'Wind Reports', fileType: 'xlsx', tags: ['AEP', 'Performance'], confidential: false, relatedKind: 'wind-farm' },
  { name: 'Blade Inspection Report — Full Survey', category: 'Inspection Reports', fileType: 'pdf', tags: ['Blades', 'Drone'], confidential: false, relatedKind: 'turbine' },
  { name: 'Gearbox Borescope Findings', category: 'Inspection Reports', fileType: 'pdf', tags: ['Drivetrain', 'CMS'], confidential: false, relatedKind: 'turbine' },
  { name: 'Post-Seismic Structural Walk-down', category: 'Inspection Reports', fileType: 'pdf', tags: ['Structural', 'Seismic'], confidential: false, relatedKind: 'wind-farm' },
  { name: 'Provisional Acceptance Certificate', category: 'Commissioning Certificates', fileType: 'pdf', tags: ['PAC', 'Handover'], confidential: false, relatedKind: 'turbine' },
  { name: 'Grid Compliance Test Report', category: 'Commissioning Certificates', fileType: 'pdf', tags: ['LVRT', 'Grid code'], confidential: false, relatedKind: 'wind-farm' },
  { name: 'Warranty Certificate — Drivetrain', category: 'Warranty', fileType: 'pdf', tags: ['Warranty', 'Drivetrain'], confidential: false, relatedKind: 'turbine' },
  { name: 'Extended Warranty Addendum', category: 'Warranty', fileType: 'pdf', tags: ['Warranty', 'Commercial'], confidential: true, relatedKind: 'account' },
  { name: 'Site HSE Plan & Emergency Response', category: 'Safety Documents', fileType: 'pdf', tags: ['HSE', 'Emergency'], confidential: false, relatedKind: 'wind-farm' },
  { name: 'Lock-out / Tag-out Procedure', category: 'Safety Documents', fileType: 'pdf', tags: ['LOTO', 'Procedure'], confidential: false, relatedKind: 'wind-farm' },
  { name: 'Working at Height Risk Assessment', category: 'Safety Documents', fileType: 'pdf', tags: ['HSE', 'Risk assessment'], confidential: false, relatedKind: 'wind-farm' },
  { name: 'Drone Survey Imagery Set — Blade A/B/C', category: 'Drone Imagery', fileType: 'zip', tags: ['Imagery', 'Blades'], confidential: false, relatedKind: 'turbine' },
  { name: 'Aerial Site Progress Capture', category: 'Drone Imagery', fileType: 'jpg', tags: ['Progress', 'Aerial'], confidential: false, relatedKind: 'project' },
]

const UPLOADERS = [
  'Meena Rajendran', 'Arun Bhatt', 'Sneha Iyer', 'Hitesh Chauhan', 'Rahul Menon',
  'Priya Nair', 'Vasudha Reddy', 'Deepa Krishnan', 'Sameer Kulkarni',
]

function buildDocuments(): DocumentRecord[] {
  const rng = seededRandom('documents:v1')
  const docs: DocumentRecord[] = []
  let n = 1

  for (const template of TEMPLATES) {
    // Each template is instantiated against several real records so every
    // asset, project and account has a credible document trail.
    const instances = template.relatedKind === 'turbine' ? 8 : template.relatedKind === 'wind-farm' ? 7 : template.relatedKind === 'project' ? 6 : 5
    for (let i = 0; i < instances; i++) {
      let related: DocumentRecord['relatedTo']
      if (template.relatedKind === 'turbine') {
        const t = turbines[(i * 61 + n * 7) % turbines.length]!
        related = { kind: 'turbine', id: t.id, label: t.name }
      } else if (template.relatedKind === 'wind-farm') {
        const w = windFarms[(i + n) % windFarms.length]!
        related = { kind: 'wind-farm', id: w.id, label: w.name }
      } else if (template.relatedKind === 'project') {
        const p = projects[(i + n) % projects.length]!
        related = { kind: 'project', id: p.id, label: p.name }
      } else {
        const a = accounts[(i + n) % accounts.length]!
        related = { kind: 'account', id: a.id, label: a.name }
      }

      docs.push({
        id: `doc-${String(n).padStart(4, '0')}`,
        name: `${template.name} — ${related.label}`,
        category: template.category,
        fileType: template.fileType,
        sizeMb: Math.round(between(rng, 0.2, 46, 1) * 10) / 10,
        uploadedBy: pick(rng, UPLOADERS),
        uploadedAt: daysAgo(Math.round(between(rng, 1, 900))),
        version: `v${Math.round(between(rng, 1, 4))}.${Math.round(between(rng, 0, 9))}`,
        relatedTo: related,
        tags: template.tags,
        confidential: template.confidential,
      })
      n++
    }
  }

  return docs.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
}

export const documents: DocumentRecord[] = buildDocuments()

const documentById = new Map(documents.map((d) => [d.id, d]))
export function getDocument(id: string) {
  return documentById.get(id)
}
export function getDocumentsFor(kind: DocumentRecord['relatedTo']['kind'], id: string) {
  return documents.filter((d) => d.relatedTo.kind === kind && d.relatedTo.id === id)
}

export const documentCategories = Array.from(new Set(documents.map((d) => d.category)))

export const documentSummary = {
  total: documents.length,
  confidential: documents.filter((d) => d.confidential).length,
  addedThisMonth: documents.filter((d) => new Date(d.uploadedAt) > new Date('2026-07-14')).length,
  totalSizeGb: Math.round((documents.reduce((a, d) => a + d.sizeMb, 0) / 1024) * 10) / 10,
}
