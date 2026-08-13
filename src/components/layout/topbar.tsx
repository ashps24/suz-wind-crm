'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Bell,
  CaretDown,
  Check,
  Desktop,
  List,
  MagnifyingGlass,
  Moon,
  Sun,
  UserSwitch,
  Wind,
} from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/dialog'
import { Avatar, Separator, Tooltip } from '@/components/ui/primitives'
import { SeverityBadge } from '@/components/cards/status'
import { aiPriorities } from '@/lib/mocks/command-center'
import { getTurbine, getWindFarm } from '@/lib/mocks/fleet'
import { getProject } from '@/lib/mocks/projects'
import { getAccount } from '@/lib/mocks/crm'
import { getWorkOrder } from '@/lib/mocks/maintenance'
import { ROLES, ROLE_BY_ID } from '@/lib/constants'
import { fmtRelative } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useMounted } from '@/hooks'
import { useUiStore } from '@/stores/ui-store'
import { NAV_ITEMS } from './nav-config'

/* -------------------------------- Breadcrumbs -------------------------------- */

const SEGMENT_LABELS: Record<string, string> = {
  'command-center': 'Command Center',
  crm: 'CRM',
  accounts: 'Accounts',
  contacts: 'Contacts',
  opportunities: 'Opportunities',
  quotes: 'Quotes',
  'wind-farms': 'Wind Farms',
  turbines: 'Turbines',
  projects: 'Projects',
  maintenance: 'Maintenance',
  'field-service': 'Field Service',
  'asset-monitoring': 'Asset Monitoring',
  environment: 'Environment',
  documents: 'Documents',
  'ai-copilot': 'AI Copilot',
  reports: 'Reports',
  admin: 'Administration',
}

/** Resolves a record id in the URL to the human name of the thing it points at. */
function resolveLabel(segment: string) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]
  if (segment.startsWith('wf-')) return getWindFarm(segment)?.name ?? segment
  if (segment.startsWith('t-')) return getTurbine(segment)?.name ?? segment
  if (segment.startsWith('prj-')) return getProject(segment)?.name ?? segment
  if (segment.startsWith('acc-')) return getAccount(segment)?.name ?? segment
  if (segment.startsWith('WO-')) return getWorkOrder(segment)?.id ?? segment
  return segment
}

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  if (!segments.length) return null

  const visible = segments.slice(0, 3)

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
      {visible.map((segment, i) => {
        const label = resolveLabel(segment)
        const href = `/${segments.slice(0, i + 1).join('/')}`
        const last = i === visible.length - 1
        return (
          <React.Fragment key={href}>
            {i > 0 && (
              <span aria-hidden className="text-[var(--ink-muted)]">
                /
              </span>
            )}
            {last ? (
              <span className="truncate font-semibold text-[var(--ink)]">{label}</span>
            ) : (
              <Link href={href} className="truncate text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
                {label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

/* ------------------------------- Theme switcher ------------------------------- */

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Desktop },
  ] as const

  const current = options.find((o) => o.value === theme) ?? options[2]
  const CurrentIcon = mounted ? current.icon : Desktop

  return (
    <DropdownMenu>
      <Tooltip content="Theme">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Change theme">
            <CurrentIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent>
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
            <option.icon className="size-4" aria-hidden />
            <span className="flex-1">{option.label}</span>
            {mounted && theme === option.value && <Check className="size-3.5 text-[var(--brand)]" weight="bold" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* -------------------------------- Role switcher -------------------------------- */

function RoleSwitcher() {
  const role = useUiStore((s) => s.role)
  const setRole = useUiStore((s) => s.setRole)
  const router = useRouter()
  const mounted = useMounted()
  const definition = ROLE_BY_ID[role]

  const internal = ROLES.filter((r) => r.group === 'Internal')
  const external = ROLES.filter((r) => r.group === 'External')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--elevated)] py-1 pl-1 pr-2 shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--subtle)]"
          aria-label={`Current role: ${definition.label}. Switch demo role`}
        >
          <Avatar name={mounted ? definition.persona : 'Suzlon User'} size={26} />
          <span className="hidden min-w-0 text-left xl:block">
            <span className="block max-w-[9rem] truncate text-[12px] font-semibold leading-tight text-[var(--ink)]">
              {mounted ? definition.persona : '—'}
            </span>
            <span className="block max-w-[9rem] truncate text-[10.5px] leading-tight text-[var(--ink-muted)]">
              {mounted ? definition.label : 'Loading role'}
            </span>
          </span>
          <CaretDown className="size-3 text-[var(--ink-muted)]" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <UserSwitch className="size-3.5" aria-hidden />
          Demo role switcher
        </DropdownMenuLabel>
        <p className="px-2.5 pb-2 text-[11px] leading-relaxed text-[var(--ink-muted)]">
          Switches navigation, landing screen and headline metrics. No real authentication in Phase 1.
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Internal</DropdownMenuLabel>
        {internal.map((r) => (
          <DropdownMenuItem
            key={r.id}
            onClick={() => {
              setRole(r.id)
              router.push(r.landing)
            }}
          >
            <Avatar name={r.persona} size={24} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium">{r.label}</span>
              <span className="block truncate text-[10.5px] text-[var(--ink-muted)]">{r.persona}</span>
            </span>
            {role === r.id && <Check className="size-3.5 shrink-0 text-[var(--brand)]" weight="bold" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>External portals</DropdownMenuLabel>
        {external.map((r) => (
          <DropdownMenuItem
            key={r.id}
            onClick={() => {
              setRole(r.id)
              router.push(r.landing)
            }}
          >
            <Avatar name={r.persona} size={24} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium">{r.label}</span>
              <span className="block truncate text-[10.5px] text-[var(--ink-muted)]">{r.persona}</span>
            </span>
            {role === r.id && <Check className="size-3.5 shrink-0 text-[var(--brand)]" weight="bold" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ------------------------------ Notification center ------------------------------ */

function NotificationCenter() {
  const open = useUiStore((s) => s.notificationsOpen)
  const setOpen = useUiStore((s) => s.setNotificationsOpen)
  const unread = aiPriorities.filter((p) => p.severity === 'critical' || p.severity === 'high').length

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip content="Notifications">
        <button
          onClick={() => setOpen(true)}
          className="relative flex size-8 items-center justify-center rounded-lg text-[var(--ink-secondary)] transition-colors hover:bg-[var(--subtle)] hover:text-[var(--ink)]"
          aria-label={`Notifications, ${unread} requiring attention`}
        >
          <Bell className="size-[18px]" aria-hidden />
          {unread > 0 && (
            <span
              className="absolute right-1 top-1 flex size-2 rounded-full"
              style={{ backgroundColor: 'var(--status-critical)' }}
              aria-hidden
            />
          )}
        </button>
      </Tooltip>
      <SheetContent side="right" className="w-[min(94vw,25rem)]">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <SheetTitle className="text-[15px] font-semibold text-[var(--ink)]">Notifications</SheetTitle>
          <p className="mt-0.5 text-[12px] text-[var(--ink-muted)]">
            {unread} priorities need attention · generated by Wind Intelligence
          </p>
        </div>
        <div className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto p-4">
          {aiPriorities.map((priority) => (
            <Link
              key={priority.id}
              href={priority.cta.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl border border-[var(--line)] bg-[var(--elevated)] p-3.5 transition-all hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-center justify-between gap-2">
                <SeverityBadge severity={priority.severity} />
                <span className="text-[11px] text-[var(--ink-muted)]">{fmtRelative(priority.detectedAt)}</span>
              </div>
              <p className="mt-2 text-[13px] font-medium leading-snug text-[var(--ink)]">{priority.headline}</p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--ink-muted)]">
                {priority.businessImpact}
              </p>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* --------------------------------- Mobile nav --------------------------------- */

function MobileNav() {
  const open = useUiStore((s) => s.mobileNavOpen)
  const setOpen = useUiStore((s) => s.setMobileNavOpen)
  const role = useUiStore((s) => s.role)
  const pathname = usePathname()
  const allowed = ROLE_BY_ID[role]?.nav ?? []
  const items = NAV_ITEMS.filter((item) => allowed.includes(item.key))

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="flex size-8 items-center justify-center rounded-lg text-[var(--ink-secondary)] transition-colors hover:bg-[var(--subtle)] lg:hidden"
        aria-label="Open navigation"
      >
        <List className="size-5" aria-hidden />
      </button>
      <SheetContent side="left" className="w-[min(86vw,19rem)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-3.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--brand)] text-white">
            <Wind weight="fill" className="size-[18px]" aria-hidden />
          </span>
          <SheetTitle className="text-[14px] font-semibold text-[var(--ink)]">Suzlon Wind CRM</SheetTitle>
        </div>
        <nav className="scrollbar-thin flex-1 overflow-y-auto p-3" aria-label="Mobile navigation">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`) ||
              (item.children?.some((c) => pathname.startsWith(c.href)) ?? false)
            return (
              <div key={item.key}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors',
                    active
                      ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)]'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--subtle)]',
                  )}
                >
                  <item.icon className="size-5" weight={active ? 'fill' : 'regular'} aria-hidden />
                  {item.label}
                </Link>
                {item.children && active && (
                  <div className="ml-8 border-l border-[var(--line)]">
                    {item.children.map((child) => (
                      <Link
                        key={child.key}
                        href={child.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'block py-2 pl-4 text-[13px] font-medium',
                          pathname.startsWith(child.href)
                            ? 'text-[var(--brand-ink)]'
                            : 'text-[var(--ink-muted)]',
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

/* ----------------------------------- Topbar ----------------------------------- */

export function Topbar() {
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)

  return (
    <header className="glass sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--glass-line)] px-3.5 md:px-5">
      <MobileNav />
      <Breadcrumbs />

      <div className="flex-1" />

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex h-8 w-full max-w-[15rem] items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-2.5 text-[12.5px] text-[var(--ink-muted)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--line-strong)] sm:max-w-[17rem]"
        aria-label="Open global search"
      >
        <MagnifyingGlass className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate text-left">Search assets, sites, orders…</span>
        <kbd className="hidden rounded border border-[var(--line)] bg-[var(--subtle)] px-1.5 py-0.5 font-sans text-[10px] font-medium text-[var(--ink-muted)] md:block">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1">
        <ThemeSwitcher />
        <NotificationCenter />
      </div>

      <Separator orientation="vertical" className="hidden h-6 sm:block" />
      <RoleSwitcher />
    </header>
  )
}
