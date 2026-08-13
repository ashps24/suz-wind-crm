/* ------------------------------------------------------------------ *
 * Geospatial canvas
 *
 * The Command Center map is drawn from first principles: a simplified
 * India boundary in lat/lng, projected through Web Mercator into a fixed
 * SVG viewBox. Markers, overlays and boundaries all share one projection
 * so everything registers correctly at any zoom, with no tile server,
 * no GIS dependency and no network calls.
 * ------------------------------------------------------------------ */

export const MAP_VIEW = { width: 1000, height: 1109 }

export const MAP_BOUNDS = {
  minLng: 67.0,
  maxLng: 98.5,
  minLat: 6.0,
  maxLat: 37.5,
}

const DEG = Math.PI / 180

function mercatorY(lat: number) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2))
}

const X0 = MAP_BOUNDS.minLng * DEG
const X1 = MAP_BOUNDS.maxLng * DEG
const Y0 = mercatorY(MAP_BOUNDS.maxLat)
const Y1 = mercatorY(MAP_BOUNDS.minLat)

/** lat/lng → SVG user-space coordinates inside MAP_VIEW. */
export function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng * DEG - X0) / (X1 - X0)) * MAP_VIEW.width
  const y = ((mercatorY(lat) - Y0) / (Y1 - Y0)) * MAP_VIEW.height
  return { x, y }
}

/** Inverse projection — used to translate pointer position back to a coordinate. */
export function unproject(x: number, y: number): { lat: number; lng: number } {
  const lng = (X0 + (x / MAP_VIEW.width) * (X1 - X0)) / DEG
  const my = Y0 + (y / MAP_VIEW.height) * (Y1 - Y0)
  const lat = (2 * Math.atan(Math.exp(my)) - Math.PI / 2) / DEG
  return { lat, lng }
}

/** Approximate SVG-units-per-km at a given latitude, for radius overlays. */
export function kmToUnits(km: number, lat: number) {
  const unitsPerDegLng = MAP_VIEW.width / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)
  const kmPerDegLng = 111.32 * Math.cos(lat * DEG)
  return (km / kmPerDegLng) * unitsPerDegLng
}

export function pathFrom(points: readonly (readonly [number, number])[], close = true) {
  if (!points.length) return ''
  const d = points
    .map(([lng, lat], i) => {
      const p = project(lat, lng)
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`
    })
    .join(' ')
  return close ? `${d} Z` : d
}

export function pathFromLatLng(points: readonly { lat: number; lng: number }[], close = true) {
  return pathFrom(
    points.map((p) => [p.lng, p.lat] as const),
    close,
  )
}

/* --------------------------- India mainland outline --------------------------- */
/* Simplified national boundary, [lng, lat], traced clockwise from Sir Creek.
   Detail level is tuned for a country-scale operations canvas, not cartography. */

export const INDIA_OUTLINE: readonly (readonly [number, number])[] = [
  // Kutch → Rajasthan western frontier
  [68.15, 23.85], [68.75, 23.95], [69.6, 24.25], [70.55, 24.28], [71.05, 24.7],
  [70.6, 25.7], [69.5, 26.5], [70.1, 27.4], [70.75, 27.72], [71.9, 27.96],
  [72.9, 28.95], [73.4, 29.6], [73.9, 29.95], [74.6, 31.05], [74.5, 31.72],
  [75.35, 32.28],
  // Himalayan arc
  [74.65, 32.75], [74.05, 33.25], [73.95, 34.05], [74.2, 34.72], [75.0, 34.65],
  [75.9, 35.5], [76.8, 35.65], [77.8, 35.5], [78.2, 34.6], [78.95, 34.35],
  [79.25, 33.4], [79.15, 32.55], [78.75, 31.3], [79.8, 30.95], [80.2, 30.55],
  [81.05, 30.2], [81.9, 30.35], [82.75, 29.7], [83.9, 29.3], [84.75, 28.6],
  [85.9, 27.95], [87.0, 27.75], [88.05, 27.4],
  // Sikkim → Bhutan → Arunachal
  [88.2, 26.75], [88.15, 27.15], [88.5, 27.85], [88.9, 28.05], [89.6, 28.05],
  [90.4, 28.1], [91.5, 27.85], [92.1, 27.45], [92.05, 26.9], [92.6, 27.5],
  [93.4, 28.3], [94.5, 29.35], [95.5, 29.15], [96.4, 29.35], [97.3, 28.5],
  [96.95, 27.7], [96.5, 27.25], [95.4, 27.05], [95.15, 26.6],
  // North-east states
  [94.7, 25.5], [94.55, 24.7], [94.15, 23.9], [93.35, 23.05], [93.2, 22.25],
  [92.65, 22.05], [92.35, 23.75], [91.6, 22.95], [91.25, 23.7], [91.45, 24.15],
  [92.1, 25.15], [90.6, 25.15], [89.85, 25.3], [89.05, 26.05], [88.15, 26.4],
  [88.15, 25.2], [88.7, 24.4], [88.05, 23.5], [88.9, 22.3], [88.95, 21.6],
  // East coast
  [87.9, 21.55], [87.15, 20.75], [86.5, 20.15], [85.15, 19.6], [84.35, 19.05],
  [83.3, 18.1], [82.35, 16.95], [81.25, 16.35], [80.35, 15.9], [80.2, 15.05],
  [80.25, 13.55], [79.95, 12.25], [79.85, 11.4], [79.5, 10.35], [79.3, 9.7],
  [78.85, 9.25], [78.2, 8.95], [77.55, 8.15], [77.05, 8.35],
  // West coast
  [76.55, 8.9], [76.15, 9.9], [75.7, 11.15], [74.85, 12.85], [74.65, 13.85],
  [74.15, 14.75], [73.85, 15.4], [73.45, 16.5], [73.05, 17.6], [72.85, 18.9],
  [72.7, 19.9], [72.85, 20.7], [72.65, 21.4], [72.9, 21.62],
  // Saurashtra peninsula and Gulf of Kutch
  [72.55, 21.7], [72.25, 21.1], [71.55, 20.9], [70.9, 20.75], [70.1, 20.95],
  [69.15, 21.9], [69.7, 22.45], [70.5, 22.5], [70.95, 22.62], [70.3, 22.9],
  [69.6, 22.85], [68.9, 23.2],
] as const

/** Andaman & Nicobar chain — referenced by the tsunami advisory module. */
export const INDIA_ISLANDS: readonly (readonly (readonly [number, number])[])[] = [
  [[92.6, 13.6], [93.0, 13.3], [92.95, 12.5], [92.75, 11.6], [92.5, 11.75], [92.45, 12.6]],
  [[92.6, 10.8], [92.9, 10.6], [92.85, 10.1], [92.55, 10.3]],
  [[93.5, 7.6], [93.9, 7.2], [93.75, 6.85], [93.45, 7.1]],
  [[72.2, 11.3], [72.4, 11.2], [72.35, 10.9], [72.15, 11.0]],
] as const

/* ----------------------------- Regional envelopes ----------------------------- */
/* Coarse state hulls used to tint the operating regions Suzlon runs fleets in. */

export const OPERATING_REGIONS: { id: string; label: string; ring: readonly (readonly [number, number])[] }[] = [
  {
    id: 'gujarat',
    label: 'Gujarat',
    ring: [
      [68.2, 23.9], [69.6, 24.25], [71.05, 24.7], [72.5, 24.6], [74.3, 24.2],
      [74.4, 22.3], [73.5, 21.0], [72.9, 21.62], [72.25, 21.1], [70.9, 20.75],
      [69.15, 21.9], [70.5, 22.5], [70.3, 22.9], [68.9, 23.2],
    ],
  },
  {
    id: 'rajasthan',
    label: 'Rajasthan',
    ring: [
      [69.5, 26.5], [70.1, 27.4], [71.9, 27.96], [73.4, 29.6], [74.6, 30.2],
      [76.9, 29.0], [77.3, 27.6], [78.3, 26.9], [77.0, 25.0], [76.0, 23.9],
      [74.4, 23.4], [73.0, 24.0], [71.05, 24.7], [70.55, 25.6],
    ],
  },
  {
    id: 'maharashtra',
    label: 'Maharashtra',
    ring: [
      [72.85, 20.7], [74.4, 21.6], [76.5, 21.6], [78.3, 21.7], [80.5, 21.0],
      [80.2, 19.4], [78.4, 18.6], [76.9, 17.3], [76.0, 16.0], [74.4, 15.7],
      [73.5, 16.5], [73.05, 17.6], [72.85, 18.9], [72.7, 19.9],
    ],
  },
  {
    id: 'karnataka',
    label: 'Karnataka',
    ring: [
      [74.15, 14.75], [74.9, 16.0], [75.5, 17.4], [77.0, 18.1], [78.4, 17.3],
      [78.0, 15.6], [78.5, 14.4], [78.2, 13.3], [77.5, 11.9], [76.2, 11.6],
      [75.0, 12.2], [74.65, 13.85],
    ],
  },
  {
    id: 'tamil-nadu',
    label: 'Tamil Nadu',
    ring: [
      [76.2, 11.6], [77.5, 11.9], [78.2, 13.3], [80.25, 13.55], [79.85, 11.4],
      [79.3, 9.7], [78.2, 8.95], [77.55, 8.15], [77.05, 8.35], [76.9, 9.6],
      [76.6, 10.8],
    ],
  },
  {
    id: 'madhya-pradesh',
    label: 'Madhya Pradesh',
    ring: [
      [74.4, 23.4], [76.0, 23.9], [77.5, 25.0], [79.0, 25.2], [80.8, 24.8],
      [82.7, 23.9], [82.0, 22.2], [80.5, 21.3], [78.3, 21.7], [76.5, 21.6],
      [74.4, 21.6],
    ],
  },
  {
    id: 'andhra-pradesh',
    label: 'Andhra Pradesh',
    ring: [
      [78.0, 15.6], [78.4, 17.3], [80.0, 17.6], [81.25, 16.35], [80.35, 15.9],
      [80.2, 15.05], [80.0, 13.7], [78.5, 14.4], [78.0, 15.0],
    ],
  },
]

/** Sparse graticule for spatial reference. */
export const GRATICULE = {
  lngs: [70, 75, 80, 85, 90, 95],
  lats: [10, 15, 20, 25, 30, 35],
}

/** Anchor labels for major reference cities — orientation, not navigation. */
export const REFERENCE_CITIES: { name: string; lat: number; lng: number; tier: 1 | 2 }[] = [
  { name: 'New Delhi', lat: 28.61, lng: 77.21, tier: 1 },
  { name: 'Mumbai', lat: 19.08, lng: 72.88, tier: 1 },
  { name: 'Chennai', lat: 13.08, lng: 80.27, tier: 1 },
  { name: 'Bengaluru', lat: 12.97, lng: 77.59, tier: 1 },
  { name: 'Kolkata', lat: 22.57, lng: 88.36, tier: 1 },
  { name: 'Ahmedabad', lat: 23.02, lng: 72.57, tier: 2 },
  { name: 'Hyderabad', lat: 17.39, lng: 78.49, tier: 2 },
  { name: 'Pune', lat: 18.52, lng: 73.86, tier: 2 },
  { name: 'Jaipur', lat: 26.91, lng: 75.79, tier: 2 },
  { name: 'Coimbatore', lat: 11.02, lng: 76.96, tier: 2 },
  { name: 'Bhuj', lat: 23.24, lng: 69.67, tier: 2 },
  { name: 'Jaisalmer', lat: 26.91, lng: 70.92, tier: 2 },
]

export const INDIA_PATH = pathFrom(INDIA_OUTLINE)
export const ISLAND_PATHS = INDIA_ISLANDS.map((ring) => pathFrom(ring))
