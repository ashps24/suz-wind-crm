import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Fixed demo clock. Every mock timestamp is derived from this so the server and
 * the client render byte-identical output — a live `Date.now()` in mock data
 * would produce hydration mismatches on every load.
 */
export const DEMO_NOW = new Date('2026-08-13T09:42:00+05:30')

export function minutesAgo(n: number): string {
  return new Date(DEMO_NOW.getTime() - n * 60_000).toISOString()
}
export function hoursAgo(n: number): string {
  return minutesAgo(n * 60)
}
export function daysAgo(n: number): string {
  return minutesAgo(n * 60 * 24)
}
export function daysAhead(n: number): string {
  return minutesAgo(-n * 60 * 24)
}
export function hoursAhead(n: number): string {
  return minutesAgo(-n * 60)
}

/** Deterministic 32-bit hash → seeded PRNG (mulberry32). */
export function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T
}

export function between(rng: () => number, min: number, max: number, decimals = 0): number {
  const v = min + rng() * (max - min)
  const p = 10 ** decimals
  return Math.round(v * p) / p
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0)
}

export function mean(values: number[]) {
  return values.length ? sum(values) / values.length : 0
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item)
      ;(acc[k] ||= []).push(item)
      return acc
    },
    {} as Record<K, T[]>,
  )
}

export function sortBy<T>(items: T[], key: (item: T) => number | string, dir: 'asc' | 'desc' = 'asc') {
  return [...items].sort((a, b) => {
    const av = key(a)
    const bv = key(b)
    if (av === bv) return 0
    const r = av > bv ? 1 : -1
    return dir === 'asc' ? r : -r
  })
}

export function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

/** Great-circle distance in km. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2)
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Simulated network latency for the mock API layer. */
export function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
