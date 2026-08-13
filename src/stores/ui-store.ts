'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RoleId } from '@/types'

interface UiState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (value: boolean) => void

  mobileNavOpen: boolean
  setMobileNavOpen: (value: boolean) => void

  commandPaletteOpen: boolean
  setCommandPaletteOpen: (value: boolean) => void
  toggleCommandPalette: () => void

  notificationsOpen: boolean
  setNotificationsOpen: (value: boolean) => void

  role: RoleId
  setRole: (role: RoleId) => void

  /** Deliberately fail a share of mock requests so error states are reachable. */
  faultInjection: boolean
  setFaultInjection: (value: boolean) => void

  density: 'comfortable' | 'compact'
  setDensity: (value: 'comfortable' | 'compact') => void

  dismissedPriorities: string[]
  dismissPriority: (id: string) => void
  restorePriorities: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),

      mobileNavOpen: false,
      setMobileNavOpen: (value) => set({ mobileNavOpen: value }),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (value) => set({ commandPaletteOpen: value }),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

      notificationsOpen: false,
      setNotificationsOpen: (value) => set({ notificationsOpen: value }),

      role: 'operations-manager',
      setRole: (role) => set({ role }),

      faultInjection: false,
      setFaultInjection: (value) => set({ faultInjection: value }),

      density: 'comfortable',
      setDensity: (value) => set({ density: value }),

      dismissedPriorities: [],
      dismissPriority: (id) => set((s) => ({ dismissedPriorities: [...s.dismissedPriorities, id] })),
      restorePriorities: () => set({ dismissedPriorities: [] }),
    }),
    {
      name: 'suzlon-wind-crm-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        role: s.role,
        density: s.density,
        faultInjection: s.faultInjection,
      }),
    },
  ),
)
