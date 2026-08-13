'use client'

import { create } from 'zustand'
import { DEFAULT_LAYERS } from '@/lib/constants'
import type { RiskBand, TurbineStatus, WindFarmStatus } from '@/types'

export interface MapViewport {
  /** Scale factor applied to the projected SVG canvas. */
  zoom: number
  /** Pan offset in SVG user units. */
  x: number
  y: number
}

interface MapState {
  layers: string[]
  toggleLayer: (id: string) => void
  setLayers: (ids: string[]) => void
  resetLayers: () => void

  selectedSiteId: string | null
  selectSite: (id: string | null) => void

  selectedTurbineId: string | null
  selectTurbine: (id: string | null) => void

  focusedEventId: string | null
  focusEvent: (id: string | null) => void

  hoveredSiteId: string | null
  setHoveredSite: (id: string | null) => void

  viewport: MapViewport
  setViewport: (viewport: MapViewport) => void
  resetViewport: () => void

  statusFilter: TurbineStatus[]
  toggleStatusFilter: (status: TurbineStatus) => void
  clearStatusFilter: () => void

  siteStatusFilter: WindFarmStatus[]
  toggleSiteStatusFilter: (status: WindFarmStatus) => void

  riskFilter: RiskBand | null
  setRiskFilter: (band: RiskBand | null) => void

  stateFilter: string | null
  setStateFilter: (value: string | null) => void

  timelineOpen: boolean
  setTimelineOpen: (value: boolean) => void

  prioritiesOpen: boolean
  setPrioritiesOpen: (value: boolean) => void

  layersOpen: boolean
  setLayersOpen: (value: boolean) => void
}

export const DEFAULT_VIEWPORT: MapViewport = { zoom: 1, x: 0, y: 0 }

export const useMapStore = create<MapState>((set) => ({
  layers: DEFAULT_LAYERS,
  toggleLayer: (id) =>
    set((s) => ({
      layers: s.layers.includes(id) ? s.layers.filter((l) => l !== id) : [...s.layers, id],
    })),
  setLayers: (ids) => set({ layers: ids }),
  resetLayers: () => set({ layers: DEFAULT_LAYERS }),

  selectedSiteId: null,
  selectSite: (id) => set({ selectedSiteId: id, selectedTurbineId: null }),

  selectedTurbineId: null,
  selectTurbine: (id) => set({ selectedTurbineId: id }),

  focusedEventId: null,
  focusEvent: (id) => set({ focusedEventId: id }),

  hoveredSiteId: null,
  setHoveredSite: (id) => set({ hoveredSiteId: id }),

  viewport: DEFAULT_VIEWPORT,
  setViewport: (viewport) => set({ viewport }),
  resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),

  statusFilter: [],
  toggleStatusFilter: (status) =>
    set((s) => ({
      statusFilter: s.statusFilter.includes(status)
        ? s.statusFilter.filter((x) => x !== status)
        : [...s.statusFilter, status],
    })),
  clearStatusFilter: () => set({ statusFilter: [] }),

  siteStatusFilter: [],
  toggleSiteStatusFilter: (status) =>
    set((s) => ({
      siteStatusFilter: s.siteStatusFilter.includes(status)
        ? s.siteStatusFilter.filter((x) => x !== status)
        : [...s.siteStatusFilter, status],
    })),

  riskFilter: null,
  setRiskFilter: (band) => set({ riskFilter: band }),

  stateFilter: null,
  setStateFilter: (value) => set({ stateFilter: value }),

  timelineOpen: true,
  setTimelineOpen: (value) => set({ timelineOpen: value }),

  prioritiesOpen: true,
  setPrioritiesOpen: (value) => set({ prioritiesOpen: value }),

  layersOpen: true,
  setLayersOpen: (value) => set({ layersOpen: value }),
}))
