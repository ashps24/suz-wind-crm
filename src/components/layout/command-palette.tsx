'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Command } from 'cmdk'
import {
  AddressBook,
  Buildings,
  FileText,
  HardHat,
  MagnifyingGlass,
  MapTrifold,
  Wind,
  Wrench,
} from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@/components/ui/icon'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { useDebounced, useHotkey } from '@/hooks'
import { useUiStore } from '@/stores/ui-store'
import { NAV_ITEMS } from './nav-config'
import type { SearchResult } from '@/types'

const KIND_ICON: Record<SearchResult['kind'], Icon> = {
  'wind-farm': MapTrifold,
  turbine: Wind,
  account: Buildings,
  contact: AddressBook,
  project: HardHat,
  'work-order': Wrench,
  document: FileText,
}

const KIND_LABEL: Record<SearchResult['kind'], string> = {
  'wind-farm': 'Wind farms',
  turbine: 'Turbines',
  account: 'Accounts',
  contact: 'Contacts',
  project: 'Projects',
  'work-order': 'Work orders',
  document: 'Documents',
}

const KIND_ORDER: SearchResult['kind'][] = [
  'wind-farm',
  'turbine',
  'project',
  'account',
  'work-order',
  'contact',
  'document',
]

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen)
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const debounced = useDebounced(query, 140)

  useHotkey('k', () => setOpen(true), { meta: true, allowInInput: true })

  const results = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => api.search(debounced),
    enabled: open && debounced.trim().length >= 2,
    placeholderData: (prev) => prev,
  })

  React.useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  const grouped = React.useMemo(() => {
    const map = new Map<SearchResult['kind'], SearchResult[]>()
    for (const result of results.data ?? []) {
      const list = map.get(result.kind) ?? []
      if (list.length < 5) list.push(result)
      map.set(result.kind, list)
    }
    return KIND_ORDER.filter((k) => map.has(k)).map((k) => ({ kind: k, items: map.get(k)! }))
  }, [results.data])

  const showNav = query.trim().length < 2

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent hideClose className="top-[18%] max-w-xl -translate-y-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <Command shouldFilter={showNav} label="Global search">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-4">
            <MagnifyingGlass className="size-[18px] shrink-0 text-[var(--ink-muted)]" aria-hidden />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search wind farms, turbines, orders, accounts…"
              className="h-12 w-full bg-transparent text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
            />
            <kbd className="rounded border border-[var(--line)] bg-[var(--subtle)] px-1.5 py-0.5 font-sans text-[10px] text-[var(--ink-muted)]">
              esc
            </kbd>
          </div>

          <Command.List className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2">
            {showNav ? (
              <Command.Group
                heading="Go to"
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--ink-muted)]"
              >
                {NAV_ITEMS.map((item) => (
                  <Command.Item
                    key={item.key}
                    value={`nav ${item.label}`}
                    onSelect={() => go(item.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-[13px] text-[var(--ink)] data-[selected=true]:bg-[var(--subtle)]"
                  >
                    <item.icon className="size-[18px] text-[var(--ink-muted)]" aria-hidden />
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : results.isFetching && !results.data?.length ? (
              <div className="space-y-2 p-2">
                {[0.9, 0.7, 0.5].map((opacity) => (
                  <div key={opacity} className="flex items-center gap-3 rounded-lg p-2.5" style={{ opacity }}>
                    <span className="size-8 animate-[shimmer_1.9s_ease-in-out_infinite] rounded-lg bg-[var(--inset)]" />
                    <span className="flex-1 space-y-1.5">
                      <span className="block h-3 w-1/2 animate-[shimmer_1.9s_ease-in-out_infinite] rounded bg-[var(--inset)]" />
                      <span className="block h-2.5 w-1/3 animate-[shimmer_1.9s_ease-in-out_infinite] rounded bg-[var(--inset)]" />
                    </span>
                  </div>
                ))}
              </div>
            ) : grouped.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[13.5px] font-medium text-[var(--ink)]">No matches for “{query}”</p>
                <p className="mt-1 text-[12px] text-[var(--ink-muted)]">
                  Try a turbine ID, site name, customer, work order or document title.
                </p>
              </div>
            ) : (
              grouped.map((group) => (
                <Command.Group
                  key={group.kind}
                  heading={KIND_LABEL[group.kind]}
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--ink-muted)]"
                >
                  {group.items.map((result) => {
                    const KindIcon = KIND_ICON[result.kind]
                    return (
                      <Command.Item
                        key={`${result.kind}-${result.id}`}
                        value={`${result.kind}-${result.id}`}
                        onSelect={() => go(result.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 data-[selected=true]:bg-[var(--subtle)]"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-secondary)]">
                          <KindIcon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-[var(--ink)]">
                            {result.title}
                          </span>
                          <span className="block truncate text-[11.5px] text-[var(--ink-muted)]">
                            {result.subtitle}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-[11px] text-[var(--ink-muted)] sm:block">
                          {result.meta}
                        </span>
                      </Command.Item>
                    )
                  })}
                </Command.Group>
              ))
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
