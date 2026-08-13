'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretDown, SidebarSimple, Wind } from '@phosphor-icons/react/dist/ssr'
import { Tooltip } from '@/components/ui/primitives'
import { ROLE_BY_ID } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'
import { NAV_ITEMS, type NavItem } from './nav-config'

function isActive(pathname: string, item: NavItem | { href: string }) {
  if (item.href === '/') return pathname === '/'
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function NavEntry({ item, collapsed, pathname }: { item: NavItem; collapsed: boolean; pathname: string }) {
  const activeSelf = isActive(pathname, item) || (item.children?.some((c) => isActive(pathname, c)) ?? false)
  const [open, setOpen] = React.useState(activeSelf)

  React.useEffect(() => {
    if (activeSelf) setOpen(true)
  }, [activeSelf])

  if (!item.children || collapsed) {
    const link = (
      <Link
        href={item.href}
        aria-current={activeSelf ? 'page' : undefined}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
          collapsed && 'justify-center px-0 py-2.5',
          activeSelf
            ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)]'
            : 'text-[var(--ink-secondary)] hover:bg-[var(--subtle)] hover:text-[var(--ink)]',
        )}
      >
        {activeSelf && (
          <motion.span
            layoutId="nav-indicator"
            aria-hidden
            className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--brand)]"
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          />
        )}
        <item.icon className="size-[18px] shrink-0" weight={activeSelf ? 'fill' : 'regular'} aria-hidden />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    )
    return collapsed ? (
      <Tooltip content={item.label} side="right" delay={80}>
        {link}
      </Tooltip>
    ) : (
      link
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
          activeSelf && !open
            ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)]'
            : 'text-[var(--ink-secondary)] hover:bg-[var(--subtle)] hover:text-[var(--ink)]',
        )}
      >
        <item.icon className="size-[18px] shrink-0" weight={activeSelf ? 'fill' : 'regular'} aria-hidden />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <CaretDown
          className={cn('size-3.5 shrink-0 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden pl-4"
          >
            {item.children.map((child) => {
              const childActive = isActive(pathname, child)
              return (
                <li key={child.key}>
                  <Link
                    href={child.href}
                    aria-current={childActive ? 'page' : undefined}
                    className={cn(
                      'relative my-0.5 flex items-center gap-2.5 rounded-lg border-l border-[var(--line)] py-1.5 pl-4 pr-2 text-[12.5px] font-medium transition-colors',
                      childActive
                        ? 'border-l-[var(--brand)] text-[var(--brand-ink)]'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
                    )}
                  >
                    {child.label}
                  </Link>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const role = useUiStore((s) => s.role)
  const allowed = ROLE_BY_ID[role]?.nav ?? []

  const items = NAV_ITEMS.filter((item) => allowed.includes(item.key))

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 236 }}
      transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      className="relative z-30 hidden h-dvh shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] lg:flex"
      aria-label="Primary navigation"
    >
      <div className={cn('flex h-14 items-center gap-2.5 border-b border-[var(--line)] px-3.5', collapsed && 'justify-center px-0')}>
        <Link href="/command-center" className="flex items-center gap-2.5" aria-label="Suzlon Wind CRM home">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-white shadow-[var(--shadow-sm)]">
            <Wind weight="fill" className="size-[18px]" aria-hidden />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold leading-tight text-[var(--ink)]">
                Suzlon Wind CRM
              </span>
              <span className="block truncate text-[10.5px] leading-tight text-[var(--ink-muted)]">
                Operations Platform
              </span>
            </span>
          )}
        </Link>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        {items.map((item) => (
          <NavEntry key={item.key} item={item} collapsed={collapsed} pathname={pathname} />
        ))}
      </nav>

      <div className="border-t border-[var(--line)] p-2.5">
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-[var(--ink-muted)] transition-colors hover:bg-[var(--subtle)] hover:text-[var(--ink)]',
            collapsed && 'justify-center px-0',
          )}
        >
          <SidebarSimple className="size-[18px] shrink-0" aria-hidden />
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </motion.aside>
  )
}
