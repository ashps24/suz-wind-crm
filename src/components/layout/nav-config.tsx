import {
  AddressBook,
  Broadcast,
  Buildings,
  ChartLineUp,
  ChatCircleDots,
  CloudLightning,
  Compass,
  FileText,
  Gauge,
  GearSix,
  HardHat,
  Kanban,
  MapTrifold,
  Presentation,
  ReceiptX,
  Wind,
  Wrench,
} from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@/components/ui/icon'

export interface NavItem {
  key: string
  label: string
  href: string
  icon: Icon
  children?: { key: string; label: string; href: string; icon: Icon }[]
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'command-center', label: 'Command Center', href: '/command-center', icon: Compass },
  {
    key: 'crm',
    label: 'CRM',
    href: '/crm/accounts',
    icon: Buildings,
    children: [
      { key: 'accounts', label: 'Accounts', href: '/crm/accounts', icon: Buildings },
      { key: 'contacts', label: 'Contacts', href: '/crm/contacts', icon: AddressBook },
      { key: 'opportunities', label: 'Opportunities', href: '/crm/opportunities', icon: Kanban },
      { key: 'quotes', label: 'Quotes', href: '/crm/quotes', icon: ReceiptX },
    ],
  },
  { key: 'wind-farms', label: 'Wind Farms', href: '/wind-farms', icon: MapTrifold },
  { key: 'turbines', label: 'Turbines', href: '/turbines', icon: Wind },
  { key: 'projects', label: 'Projects', href: '/projects', icon: HardHat },
  { key: 'maintenance', label: 'Maintenance', href: '/maintenance', icon: Wrench },
  { key: 'field-service', label: 'Field Service', href: '/field-service', icon: Broadcast },
  { key: 'asset-monitoring', label: 'Asset Monitoring', href: '/asset-monitoring', icon: Gauge },
  { key: 'environment', label: 'Environment', href: '/environment', icon: CloudLightning },
  { key: 'documents', label: 'Documents', href: '/documents', icon: FileText },
  { key: 'ai-copilot', label: 'AI Copilot', href: '/ai-copilot', icon: ChatCircleDots },
  { key: 'reports', label: 'Reports', href: '/reports', icon: Presentation },
  { key: 'admin', label: 'Administration', href: '/admin', icon: GearSix },
]

export { ChartLineUp }
