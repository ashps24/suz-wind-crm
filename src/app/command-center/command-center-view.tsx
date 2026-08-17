'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowCounterClockwise,
  CompassRose,
  CrosshairSimple,
  List,
  MapPin,
  Minus,
  Plus,
  Sparkle,
  Table,
  Warning,
} from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/dialog'
import { Skeleton, Tooltip } from '@/components/ui/primitives'
import { ErrorState } from '@/components/feedback/states'
import { KpiRail } from '@/components/command-center/kpi-rail'
import { LayerPanel } from '@/components/command-center/layer-panel'
import { PriorityPanel, PriorityCard } from '@/components/command-center/priority-panel'
import { SiteDrawer } from '@/components/command-center/site-drawer'
import { SiteList } from '@/components/command-center/site-list'
import { EventStream } from '@/components/command-center/event-stream'
import {
  IndiaMapCanvas,
  computeFocusTransform,
  defaultTransform,
  type MapTransform,
} from '@/components/maps/india-map'
import {
  CycloneOverlay,
  EarthquakeOverlay,
  FieldTeamOverlay,
  FloodOverlay,
  GridOverlay,
  IncidentOverlay,
  LightningOverlay,
  SiteBoundary,
  TurbineMarkers,
  WeatherOverlay,
  WindFarmMarkers,
  WindFieldOverlay,
} from '@/components/maps/overlays'
import { api } from '@/lib/api'
import { fmtMw, fmtPct } from '@/lib/formatters'
import { useIsMobile, useMediaQuery, useMounted } from '@/hooks'
import { useMapStore } from '@/stores/map-store'
import { useUiStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import { turbineHref } from '@/lib/routing'

function MapLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[var(--map-water)]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative size-14">
          <span className="absolute inset-0 animate-[breathe_3.2s_ease-in-out_infinite] rounded-full bg-[var(--brand)] opacity-30" />
          <span className="absolute inset-0 flex items-center justify-center text-[var(--brand)]">
            <CompassRose className="size-7 animate-[sweep_4.5s_linear_infinite]" weight="duotone" aria-hidden />
          </span>
        </div>
        <p className="text-[12.5px] font-medium text-[var(--ink-secondary)]">Loading fleet geometry…</p>
        <p className="max-w-xs text-center text-[11px] text-[var(--ink-muted)]">
          Projecting 15 sites, 522 turbines and live environmental layers
        </p>
      </div>
    </div>
  )
}

export function CommandCenterView() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const mounted = useMounted()

  const layers = useMapStore((s) => s.layers)
  const selectedSiteId = useMapStore((s) => s.selectedSiteId)
  const selectSite = useMapStore((s) => s.selectSite)
  const hoveredSiteId = useMapStore((s) => s.hoveredSiteId)
  const setHoveredSite = useMapStore((s) => s.setHoveredSite)
  const timelineOpen = useMapStore((s) => s.timelineOpen)
  const setTimelineOpen = useMapStore((s) => s.setTimelineOpen)
  const prioritiesOpen = useMapStore((s) => s.prioritiesOpen)
  const setPrioritiesOpen = useMapStore((s) => s.setPrioritiesOpen)

  const [transform, setTransform] = React.useState<MapTransform>({ k: 1, x: 0, y: 0 })
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 })
  const [initialised, setInitialised] = React.useState(false)
  const [mobilePanel, setMobilePanel] = React.useState<'none' | 'sites' | 'priorities'>('none')
  const sitePanelOpen = mobilePanel === 'sites' && !isMobile
  // Which floating panels are actually mounted at this breakpoint.
  const hasLayerRail = useMediaQuery('(min-width: 768px)')
  const hasPriorityPanel = useMediaQuery('(min-width: 1024px)')

  const summary = useQuery({ queryKey: ['command-center'], queryFn: api.commandCenter.summary })
  const weather = useQuery({ queryKey: ['environment', 'weather'], queryFn: api.environment.weather })
  const cyclones = useQuery({ queryKey: ['environment', 'cyclones'], queryFn: api.environment.cyclones })
  const earthquakes = useQuery({ queryKey: ['environment', 'earthquakes'], queryFn: api.environment.earthquakes })
  const lightning = useQuery({ queryKey: ['environment', 'lightning'], queryFn: api.environment.lightning })
  const floods = useQuery({ queryKey: ['environment', 'floods'], queryFn: api.environment.floods })
  const workOrders = useQuery({ queryKey: ['work-orders'], queryFn: api.workOrders.list })
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects.list })

  const selectedTurbines = useQuery({
    queryKey: ['wind-farms', selectedSiteId, 'turbines'],
    queryFn: () => api.windFarms.turbines(selectedSiteId!),
    enabled: Boolean(selectedSiteId),
  })

  const farms = summary.data?.windFarms ?? []
  const selectedFarm = farms.find((f) => f.id === selectedSiteId) ?? null

  /**
   * Chrome floating over the canvas, so the landmass settles in the region the
   * user can actually see. Measured from the map container, which already
   * excludes the app sidebar.
   */
  const fitPadding = React.useMemo(
    () => ({
      top: 96,
      bottom: hasLayerRail && timelineOpen ? 244 : 120,
      left: hasLayerRail ? (sitePanelOpen ? 560 : 250) : 12,
      right: hasPriorityPanel && prioritiesOpen ? 372 : 24,
    }),
    [hasLayerRail, hasPriorityPanel, timelineOpen, prioritiesOpen, sitePanelOpen],
  )

  // Refit whenever the container or the floating chrome changes, unless the
  // user has drilled into a site (their focus wins).
  React.useEffect(() => {
    if (containerSize.width === 0) return
    if (selectedSiteId) return
    setTransform(defaultTransform(containerSize, fitPadding))
    if (!initialised) setInitialised(true)
  }, [containerSize, fitPadding, selectedSiteId, initialised])

  const focusSite = React.useCallback(
    (siteId: string) => {
      selectSite(siteId)
      setMobilePanel('none')
      const farm = farms.find((f) => f.id === siteId)
      if (farm && containerSize.width > 0) {
        setTransform(
          computeFocusTransform(farm.position.lat, farm.position.lng, 4.6, containerSize, fitPadding),
        )
      }
    },
    [farms, containerSize, selectSite, fitPadding],
  )

  function zoomBy(factor: number) {
    setTransform((t) => {
      const k = Math.max(0.8, Math.min(14, t.k * factor))
      const ratio = k / t.k
      const cx = containerSize.width / 2
      const cy = containerSize.height / 2
      return { k, x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio }
    })
  }

  function resetView() {
    selectSite(null)
    setTransform(defaultTransform(containerSize, fitPadding))
  }

  const has = (id: string) => layers.includes(id)

  if (summary.isError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState
          title="Command Center is unavailable"
          description={
            summary.error instanceof Error
              ? summary.error.message
              : 'The operations summary could not be retrieved.'
          }
          onRetry={() => summary.refetch()}
          className="max-w-md"
        />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* ------------------------------- Map canvas ------------------------------- */}
      <IndiaMapCanvas
        transform={transform}
        onTransformChange={setTransform}
        onSizeChange={setContainerSize}
        onBackgroundClick={() => selectSite(null)}
        ariaLabel="Operational map of Suzlon wind farms across India"
      >
        {({ k, baseScale }) => (
          <>
            {has('wind-speed') && <WindFieldOverlay farms={farms} k={k} baseScale={baseScale} />}
            {has('flood') && floods.data && (
              <FloodOverlay zones={floods.data} k={k} baseScale={baseScale} onSelect={(id) => router.push(`/environment?event=${id}`)} />
            )}
            {has('grid') && <GridOverlay farms={farms} k={k} baseScale={baseScale} />}
            {selectedFarm && <SiteBoundary farm={selectedFarm} k={k} baseScale={baseScale} />}
            {has('cyclones') && cyclones.data && (
              <CycloneOverlay
                cyclones={cyclones.data}
                k={k}
                baseScale={baseScale}
                onSelect={(id) => router.push(`/environment?event=${id}`)}
              />
            )}
            {has('earthquakes') && earthquakes.data && (
              <EarthquakeOverlay
                earthquakes={earthquakes.data}
                k={k}
                baseScale={baseScale}
                onSelect={(id) => router.push(`/environment?event=${id}`)}
              />
            )}
            {has('lightning') && lightning.data && (
              <LightningOverlay clusters={lightning.data} k={k} baseScale={baseScale} />
            )}
            {has('turbines') && selectedTurbines.data && (
              <TurbineMarkers
                turbines={selectedTurbines.data}
                k={k}
                baseScale={baseScale}
                onSelect={(id) => router.push(turbineHref(id))}
              />
            )}
            {has('wind-farms') && (
              <WindFarmMarkers
                farms={has('projects') ? farms : farms.filter((f) => f.status === 'operational')}
                k={k}
                baseScale={baseScale}
                selectedId={selectedSiteId}
                hoveredId={hoveredSiteId}
                onSelect={focusSite}
                onHover={setHoveredSite}
              />
            )}
            {has('incidents') && <IncidentOverlay farms={farms} k={k} baseScale={baseScale} />}
            {has('weather') && weather.data && (
              <WeatherOverlay readings={weather.data} farms={farms} k={k} baseScale={baseScale} />
            )}
            {has('field-teams') && summary.data && (
              <FieldTeamOverlay technicians={summary.data.fieldTeams} k={k} baseScale={baseScale} />
            )}
          </>
        )}
      </IndiaMapCanvas>

      {summary.isPending && <MapLoading />}

      {/* --------------------------------- HUD --------------------------------- */}
      <div className="pointer-events-none absolute inset-0 flex flex-col p-3 md:p-4">
        {/* Top rail */}
        <div className="flex shrink-0 items-start gap-3">
          {summary.isPending ? (
            <div className="glass pointer-events-auto flex gap-4 rounded-xl px-4 py-2.5 shadow-[var(--shadow-md)]">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="space-y-1.5">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-4 w-12" />
                </span>
              ))}
            </div>
          ) : summary.data ? (
            <div className="min-w-0 flex-1">
              <KpiRail kpis={summary.data.kpis} />
            </div>
          ) : null}
        </div>

        {/* Middle band */}
        <div className="mt-3 flex min-h-0 flex-1 items-stretch justify-between gap-3">
          <div className="hidden min-h-0 items-stretch gap-3 md:flex">
            <LayerPanel />
            <AnimatePresence initial={false}>
              {sitePanelOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                  className="pointer-events-auto flex w-[18.5rem] flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
                >
                  <div className="flex shrink-0 items-center justify-between px-3.5 py-3">
                    <h2 className="text-[13px] font-semibold text-[var(--ink)]">All sites</h2>
                    <button
                      onClick={() => setMobilePanel('none')}
                      className="text-[11px] font-medium text-[var(--brand)] hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  <SiteList
                    farms={farms}
                    selectedId={selectedSiteId}
                    onSelect={focusSite}
                    className="min-h-0 flex-1"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pointer-events-none hidden min-h-0 flex-col items-end justify-start lg:flex">
            <AnimatePresence initial={false}>
              {prioritiesOpen && summary.data && (
                <motion.div
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 18 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 34 }}
                  className="pointer-events-auto flex min-h-0 flex-1"
                >
                  {selectedFarm ? (
                    <SiteDrawer
                      farm={selectedFarm}
                      turbines={selectedTurbines.data ?? []}
                      alarms={(summary.data.activeAlerts ?? []).filter((a) => a.windFarmId === selectedFarm.id)}
                      workOrders={(workOrders.data ?? []).filter((w) => w.windFarmId === selectedFarm.id)}
                      weather={weather.data?.find((w) => w.windFarmId === selectedFarm.id)}
                      projects={(projects.data ?? []).filter((p) => p.windFarmId === selectedFarm.id)}
                      technicians={summary.data.fieldTeams}
                      onClose={() => selectSite(null)}
                      onSelectTurbine={(id) => router.push(turbineHref(id))}
                    />
                  ) : (
                    <PriorityPanel priorities={summary.data.priorities} onFocusSite={focusSite} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom controls + stream */}
        <div className="mt-3 shrink-0 space-y-2.5">
          <div className="flex items-end justify-between gap-3">
            {/* Map controls */}
            <div className="glass pointer-events-auto flex items-center gap-0.5 rounded-lg p-1 shadow-[var(--shadow-md)]">
              <Tooltip content="Zoom in">
                <button
                  onClick={() => zoomBy(1.45)}
                  aria-label="Zoom in"
                  className="flex size-7 items-center justify-center rounded-md text-[var(--ink-secondary)] transition-colors hover:bg-[var(--subtle)]"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </Tooltip>
              <Tooltip content="Zoom out">
                <button
                  onClick={() => zoomBy(1 / 1.45)}
                  aria-label="Zoom out"
                  className="flex size-7 items-center justify-center rounded-md text-[var(--ink-secondary)] transition-colors hover:bg-[var(--subtle)]"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
              </Tooltip>
              <span className="mx-0.5 h-4 w-px bg-[var(--line)]" aria-hidden />
              <Tooltip content="Reset view">
                <button
                  onClick={resetView}
                  aria-label="Reset map view"
                  className="flex size-7 items-center justify-center rounded-md text-[var(--ink-secondary)] transition-colors hover:bg-[var(--subtle)]"
                >
                  <ArrowCounterClockwise className="size-4" aria-hidden />
                </button>
              </Tooltip>
              <span className="px-1.5 text-[10.5px] tabular text-[var(--ink-muted)]">
                {mounted ? `${transform.k.toFixed(1)}×` : '1.0×'}
              </span>
            </div>

            {/* Site list toggle (desktop) */}
            <div className="pointer-events-auto hidden items-center gap-2 lg:flex">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMobilePanel(mobilePanel === 'sites' ? 'none' : 'sites')}
                aria-expanded={mobilePanel === 'sites'}
              >
                <Table aria-hidden />
                Site list
              </Button>
              <Button
                variant={prioritiesOpen ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setPrioritiesOpen(!prioritiesOpen)}
                aria-expanded={prioritiesOpen}
              >
                <Sparkle aria-hidden />
                {prioritiesOpen ? 'Hide panel' : 'Show priorities'}
              </Button>
            </div>
          </div>

          {/* Event stream — desktop and tablet */}
          {summary.data && (
            <div className="pointer-events-auto hidden md:block">
              <EventStream
                events={summary.data.timeline}
                open={timelineOpen}
                onOpenChange={setTimelineOpen}
                onSelectSite={focusSite}
              />
            </div>
          )}

          {/* Mobile action bar */}
          <div className="pointer-events-auto flex items-center gap-2 md:hidden">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setMobilePanel('sites')}>
              <List aria-hidden />
              Sites
              <Badge tone="neutral">{farms.length}</Badge>
            </Button>
            <Button variant="primary" size="sm" className="flex-1" onClick={() => setMobilePanel('priorities')}>
              <Warning aria-hidden />
              Priorities
              <Badge tone="critical" variant="solid">
                {summary.data?.priorities.length ?? 0}
              </Badge>
            </Button>
          </div>
        </div>
      </div>

      {/* ----------------------------- Mobile sheets ----------------------------- */}
      <Sheet open={isMobile && mobilePanel === 'sites'} onOpenChange={(o) => !o && setMobilePanel('none')}>
        <SheetContent side="bottom" className="h-[72vh]">
          <div className="px-4 pb-2 pt-3">
            <SheetTitle className="text-[15px] font-semibold text-[var(--ink)]">Wind farms</SheetTitle>
            <p className="mt-0.5 text-[12px] text-[var(--ink-muted)]">
              {farms.length} sites · sorted by risk score
            </p>
          </div>
          <SiteList farms={farms} selectedId={selectedSiteId} onSelect={focusSite} className="min-h-0 flex-1" />
        </SheetContent>
      </Sheet>

      <Sheet open={isMobile && mobilePanel === 'priorities'} onOpenChange={(o) => !o && setMobilePanel('none')}>
        <SheetContent side="bottom" className="h-[80vh]">
          <div className="px-4 pb-2 pt-3">
            <SheetTitle className="flex items-center gap-2 text-[15px] font-semibold text-[var(--ink)]">
              <Sparkle className="size-4 text-[var(--brand)]" weight="fill" aria-hidden />
              AI Priorities
            </SheetTitle>
            <p className="mt-0.5 text-[12px] text-[var(--ink-muted)]">What needs attention right now</p>
          </div>
          <div className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto p-3">
            {(summary.data?.priorities ?? []).map((priority) => (
              <PriorityCard key={priority.id} priority={priority} onFocusSite={focusSite} />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile site drawer */}
      <Sheet open={isMobile && Boolean(selectedFarm)} onOpenChange={(o) => !o && selectSite(null)}>
        <SheetContent side="bottom" className="h-[86vh] p-0" hideClose>
          {selectedFarm && summary.data && (
            <>
              <SheetTitle className="sr-only">{selectedFarm.name}</SheetTitle>
              <SiteDrawer
                farm={selectedFarm}
                turbines={selectedTurbines.data ?? []}
                alarms={(summary.data.activeAlerts ?? []).filter((a) => a.windFarmId === selectedFarm.id)}
                workOrders={(workOrders.data ?? []).filter((w) => w.windFarmId === selectedFarm.id)}
                weather={weather.data?.find((w) => w.windFarmId === selectedFarm.id)}
                projects={(projects.data ?? []).filter((p) => p.windFarmId === selectedFarm.id)}
                technicians={summary.data.fieldTeams}
                onClose={() => selectSite(null)}
                onSelectTurbine={(id) => router.push(turbineHref(id))}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Screen-reader summary of the map layer */}
      <div className="sr-only">
        <h2>Wind farm fleet — text summary</h2>
        <table>
          <caption>All monitored wind farms with capacity, availability, risk and active alerts</caption>
          <thead>
            <tr>
              <th>Site</th>
              <th>State</th>
              <th>Capacity</th>
              <th>Availability</th>
              <th>Risk band</th>
              <th>Active alerts</th>
            </tr>
          </thead>
          <tbody>
            {farms.map((farm) => (
              <tr key={farm.id}>
                <td>{farm.name}</td>
                <td>{farm.state}</td>
                <td>{fmtMw(farm.installedMw)}</td>
                <td>{fmtPct(farm.availabilityPct)}</td>
                <td>{farm.riskBand}</td>
                <td>{farm.activeAlerts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
