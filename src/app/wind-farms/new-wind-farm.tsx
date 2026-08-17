'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, MapPin, Plus, Warning } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Select } from '@/components/ui/primitives'
import { api, MockApiError } from '@/lib/api'
import { accounts } from '@/lib/mocks/crm'
import { PRODUCT_FAMILIES, TONE_VAR } from '@/lib/constants'
import { windFarmHref } from '@/lib/routing'
import { cn } from '@/lib/utils'

const INDIAN_STATES = [
  'Gujarat', 'Tamil Nadu', 'Rajasthan', 'Maharashtra', 'Karnataka', 'Madhya Pradesh', 'Andhra Pradesh',
] as const

/** Mirrors the server-side validation in functions/windfarms-api. */
const schema = z.object({
  name: z.string().trim().min(3, 'Give the site a name'),
  state: z.enum(INDIAN_STATES),
  district: z.string().trim().min(2, 'District is required'),
  customerId: z.string().min(1, 'Pick a customer'),
  lat: z.coerce.number().min(6, 'Must be within India (6–37.5)').max(37.5, 'Must be within India (6–37.5)'),
  lng: z.coerce.number().min(67, 'Must be within India (67–98.5)').max(98.5, 'Must be within India (67–98.5)'),
  turbineCount: z.coerce.number().int().min(1).max(200),
  product: z.enum(['S120', 'S133', 'S144']),
  status: z.enum(['operational', 'commissioning', 'construction', 'planned']),
  meanWindSpeedMs: z.coerce.number().min(4).max(14),
  commissionedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker'),
  siteManager: z.string().trim().min(2, 'Name the site manager'),
  gridSubstation: z.string().trim().min(2, 'Name the substation'),
  evacuationVoltageKv: z.coerce.number().int().min(11).max(765),
  o_and_mContract: z.enum(['Standard O&M 5yr', 'Comprehensive O&M 10yr', 'Full-Scope 15yr']),
})

type FormValues = z.infer<typeof schema>

const slugify = (name: string) =>
  'wf-' +
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

const CODE_PREFIX: Record<string, string> = {
  Gujarat: 'GJ', 'Tamil Nadu': 'TN', Rajasthan: 'RJ', Maharashtra: 'MH',
  Karnataka: 'KA', 'Madhya Pradesh': 'MP', 'Andhra Pradesh': 'AP',
}

function Field({ label, error, children, className }: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>{label}</Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[11px]" style={{ color: TONE_VAR.critical }} role="alert">
          <Warning className="size-3" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

export function NewWindFarmButton() {
  const [open, setOpen] = React.useState(false)
  const [created, setCreated] = React.useState<string | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      state: 'Gujarat',
      product: 'S144',
      status: 'construction',
      turbineCount: 24,
      meanWindSpeedMs: 7.5,
      evacuationVoltageKv: 220,
      o_and_mContract: 'Comprehensive O&M 10yr',
      commissionedOn: '2027-03-31',
    },
  })

  const create = useMutation({
    mutationFn: (values: FormValues) => {
      const account = accounts.find((a) => a.id === values.customerId)
      return api.windFarms.create({
        id: slugify(values.name),
        name: values.name.trim(),
        code: `${CODE_PREFIX[values.state] ?? 'XX'}-${slugify(values.name).slice(3, 6).toUpperCase()}-01`,
        state: values.state,
        district: values.district.trim(),
        customerId: values.customerId,
        customerName: account?.name ?? values.customerId,
        position: { lat: values.lat, lng: values.lng },
        turbineCount: values.turbineCount,
        products: [values.product],
        status: values.status,
        commissionedOn: values.commissionedOn,
        gridSubstation: values.gridSubstation.trim(),
        evacuationVoltageKv: values.evacuationVoltageKv,
        meanWindSpeedMs: values.meanWindSpeedMs,
        heroImage: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1600&q=72',
        siteManager: values.siteManager.trim(),
        o_and_mContract: values.o_and_mContract,
        contractExpiry: `${Number(values.commissionedOn.slice(0, 4)) + (values.o_and_mContract === 'Full-Scope 15yr' ? 15 : values.o_and_mContract === 'Comprehensive O&M 10yr' ? 10 : 5)}${values.commissionedOn.slice(4)}`,
        // Sensible defaults for the synthetic layers a new site has no history for.
        stress: 0.25,
        bearingDeg: 235,
      })
    },
    onSuccess: async (site) => {
      // Everything derives from sites, so every fleet-shaped query is stale now.
      await queryClient.invalidateQueries()
      setCreated(site.id)
    },
  })

  function close() {
    setOpen(false)
    setCreated(null)
    create.reset()
    form.reset()
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        New wind farm
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold text-[var(--ink)]">
            <MapPin className="size-4 text-[var(--brand)]" weight="duotone" aria-hidden />
            New wind farm
          </DialogTitle>

          {created ? (
            <div className="py-6 text-center">
              <CheckCircle className="mx-auto size-10" style={{ color: TONE_VAR.good }} weight="fill" aria-hidden />
              <p className="mt-3 text-[15px] font-semibold text-[var(--ink)]">Site registered</p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                The record is in the Data Store and the fleet has been rebuilt — turbines, map marker and KPIs
                included.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={close}>
                  Done
                </Button>
                <Button variant="primary" size="sm" onClick={() => { close(); router.push(windFarmHref(created)) }}>
                  Open site workspace
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { close(); router.push('/command-center') }}>
                  See it on the map
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={form.handleSubmit((values) => create.mutate(values))}
              className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2"
              noValidate
            >
              <Field label="Site name" error={form.formState.errors.name?.message} className="sm:col-span-2">
                <Input placeholder="e.g. Porbandar Coastal Wind Park" {...form.register('name')} />
              </Field>

              <Field label="State" error={form.formState.errors.state?.message}>
                <Select {...form.register('state')}>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>

              <Field label="District" error={form.formState.errors.district?.message}>
                <Input placeholder="e.g. Porbandar" {...form.register('district')} />
              </Field>

              <Field label="Customer" error={form.formState.errors.customerId?.message} className="sm:col-span-2">
                <Select defaultValue="" {...form.register('customerId')}>
                  <option value="" disabled>Select a customer…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Latitude" error={form.formState.errors.lat?.message}>
                <Input type="number" step="0.01" placeholder="21.64" {...form.register('lat')} />
              </Field>

              <Field label="Longitude" error={form.formState.errors.lng?.message}>
                <Input type="number" step="0.01" placeholder="69.61" {...form.register('lng')} />
              </Field>

              <Field label="Turbines" error={form.formState.errors.turbineCount?.message}>
                <Input type="number" min={1} max={200} {...form.register('turbineCount')} />
              </Field>

              <Field label="Product family" error={form.formState.errors.product?.message}>
                <Select {...form.register('product')}>
                  {PRODUCT_FAMILIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Status" error={form.formState.errors.status?.message}>
                <Select {...form.register('status')}>
                  <option value="planned">Planned</option>
                  <option value="construction">Under construction</option>
                  <option value="commissioning">Commissioning</option>
                  <option value="operational">Operational</option>
                </Select>
              </Field>

              <Field label="Mean wind speed (m/s)" error={form.formState.errors.meanWindSpeedMs?.message}>
                <Input type="number" step="0.1" min={4} max={14} {...form.register('meanWindSpeedMs')} />
              </Field>

              <Field label="Commissioning date" error={form.formState.errors.commissionedOn?.message}>
                <Input type="date" {...form.register('commissionedOn')} />
              </Field>

              <Field label="Site manager" error={form.formState.errors.siteManager?.message}>
                <Input placeholder="e.g. Meera Krishnan" {...form.register('siteManager')} />
              </Field>

              <Field label="Grid substation" error={form.formState.errors.gridSubstation?.message}>
                <Input placeholder="e.g. Porbandar 220 kV PGCIL" {...form.register('gridSubstation')} />
              </Field>

              <Field label="Evacuation (kV)" error={form.formState.errors.evacuationVoltageKv?.message}>
                <Input type="number" {...form.register('evacuationVoltageKv')} />
              </Field>

              <Field label="O&M contract" error={form.formState.errors.o_and_mContract?.message}>
                <Select {...form.register('o_and_mContract')}>
                  <option value="Standard O&M 5yr">Standard O&amp;M — 5 years</option>
                  <option value="Comprehensive O&M 10yr">Comprehensive O&amp;M — 10 years</option>
                  <option value="Full-Scope 15yr">Full-Scope — 15 years</option>
                </Select>
              </Field>

              {create.isError && (
                <p
                  className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12.5px] sm:col-span-2"
                  style={{ backgroundColor: 'var(--status-critical-soft)', color: TONE_VAR.critical }}
                  role="alert"
                >
                  <Warning className="mt-0.5 size-4 shrink-0" weight="fill" aria-hidden />
                  {create.error instanceof MockApiError || create.error instanceof Error
                    ? create.error.message
                    : 'The site could not be created.'}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-[var(--line)] pt-4 sm:col-span-2">
                <Button type="button" variant="secondary" size="sm" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={create.isPending}>
                  {create.isPending ? 'Registering…' : 'Create wind farm'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
