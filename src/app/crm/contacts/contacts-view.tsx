'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AddressBook, Envelope, MapPin, Phone } from '@phosphor-icons/react/dist/ssr'
import { Page } from '@/components/layout/app-shell'
import { Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/primitives'
import { CardGridSkeleton, EmptyState, QueryState } from '@/components/feedback/states'
import { FilterBar } from '@/components/tables/filter-bar'
import { api } from '@/lib/api'
import { fmtRelative } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Contact } from '@/types'

const INFLUENCE_LABEL: Record<Contact['influence'], string> = {
  'economic-buyer': 'Economic buyer',
  'technical-buyer': 'Technical buyer',
  champion: 'Champion',
  user: 'User',
  gatekeeper: 'Gatekeeper',
}

export function ContactsView() {
  const searchParams = useSearchParams()
  const highlighted = searchParams.get('contact')
  const [search, setSearch] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, string>>({ account: 'all', influence: 'all' })

  const contacts = useQuery({ queryKey: ['contacts'], queryFn: api.contacts.list })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: api.accounts.list })

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (contacts.data ?? []).filter((c) => {
      if (q && !`${c.name} ${c.title} ${c.accountName} ${c.email} ${c.location}`.toLowerCase().includes(q)) return false
      if (filters.account !== 'all' && c.accountId !== filters.account) return false
      if (filters.influence !== 'all' && c.influence !== filters.influence) return false
      return true
    })
  }, [contacts.data, search, filters])

  return (
    <Page
      title="Contacts"
      description="People across customer organisations — who decides, who evaluates, and who runs the sites."
      wide
    >
      <FilterBar
        className="mb-4"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, title, account, location…"
        values={filters}
        onChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        filters={[
          { key: 'account', label: 'Account', options: (accounts.data ?? []).map((a) => ({ value: a.id, label: a.name })) },
          {
            key: 'influence',
            label: 'Influence',
            options: Object.entries(INFLUENCE_LABEL).map(([value, label]) => ({ value, label })),
          },
        ]}
        right={<span className="text-[12.5px] text-[var(--ink-muted)]">{filtered.length} contacts</span>}
      />

      <QueryState
        query={contacts}
        errorTitle="Contacts unavailable"
        skeleton={
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <CardGridSkeleton count={9} height={190} />
          </div>
        }
      >
        {() =>
          filtered.length === 0 ? (
            <EmptyState
              icon={AddressBook}
              title="No contacts match"
              description="Nothing matches this combination of account and influence."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setFilters({ account: 'all', influence: 'all' })
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((contact, i) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(i * 0.025, 0.2), ease: [0.22, 1, 0.36, 1] }}
                >
                  <div
                    className={cn(
                      'panel h-full p-4',
                      highlighted === contact.id && 'border-[var(--brand)] shadow-[var(--shadow-md)]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={contact.name} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-[var(--ink)]">{contact.name}</p>
                        <p className="truncate text-[12px] text-[var(--ink-muted)]">{contact.title}</p>
                        <Link
                          href={`/crm/accounts/${contact.accountId}`}
                          className="mt-1 inline-block truncate text-[12px] font-medium text-[var(--brand)] hover:underline"
                        >
                          {contact.accountName}
                        </Link>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Chip>{INFLUENCE_LABEL[contact.influence]}</Chip>
                      <Chip>{contact.location}</Chip>
                    </div>

                    <dl className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3 text-[11.5px] text-[var(--ink-secondary)]">
                      <div className="flex items-center gap-2">
                        <Envelope className="size-3.5 shrink-0 text-[var(--ink-muted)]" aria-hidden />
                        <dd className="truncate">{contact.email}</dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 shrink-0 text-[var(--ink-muted)]" aria-hidden />
                        <dd>{contact.phone}</dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 shrink-0 text-[var(--ink-muted)]" aria-hidden />
                        <dd className="truncate">
                          {contact.relatedWindFarmIds.length} site{contact.relatedWindFarmIds.length === 1 ? '' : 's'} ·{' '}
                          {contact.relatedProjectIds.length} project{contact.relatedProjectIds.length === 1 ? '' : 's'}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-3 flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
                      <span className="truncate">Owner: {contact.relationshipOwner}</span>
                      <span className="shrink-0">Last contact {fmtRelative(contact.lastContact)}</span>
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        }
      </QueryState>
    </Page>
  )
}
