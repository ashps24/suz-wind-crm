'use client'

import * as React from 'react'
import {
  GRATICULE,
  INDIA_PATH,
  ISLAND_PATHS,
  MAP_VIEW,
  OPERATING_REGIONS,
  REFERENCE_CITIES,
  pathFrom,
  project,
} from '@/lib/mocks/geo'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * IndiaMapCanvas — the shared geospatial base layer.
 *
 * Pure SVG with pan/zoom handled through a transform group. Children
 * render in projected user-space coordinates (from project()) so every
 * overlay — markers, cyclone tracks, boundaries — registers precisely.
 * ------------------------------------------------------------------ */

export interface MapTransform {
  k: number
  x: number
  y: number
}

export const IDENTITY_TRANSFORM: MapTransform = { k: 1, x: 0, y: 0 }

export interface MapRenderContext {
  /** Current zoom factor of the transform group. */
  k: number
  /** Fit-to-container scale, so overlays can hold constant screen size. */
  baseScale: number
}

interface IndiaMapCanvasProps {
  transform: MapTransform
  onTransformChange?: (t: MapTransform) => void
  /** Overlays rendered inside the zoom group, in projected coordinates. */
  children?: React.ReactNode | ((ctx: MapRenderContext) => React.ReactNode)
  /** Overlays rendered outside the zoom group (screen-space HUD). */
  hud?: React.ReactNode
  minZoom?: number
  maxZoom?: number
  interactive?: boolean
  showRegions?: boolean
  showCities?: boolean
  className?: string
  onBackgroundClick?: () => void
  onSizeChange?: (size: { width: number; height: number }) => void
  ariaLabel?: string
}

export function computeFocusTransform(
  lat: number,
  lng: number,
  zoom: number,
  container: { width: number; height: number },
  padding: FitPadding = {},
): MapTransform {
  const p = project(lat, lng)
  const scale = baseScale(container)
  const { top = 0, right = 0, bottom = 0, left = 0 } = padding
  // Centre the target inside the region not covered by floating panels.
  const cx = left + (container.width - left - right) / 2
  const cy = top + (container.height - top - bottom) / 2
  return {
    k: zoom,
    x: cx - p.x * scale * zoom,
    y: cy - p.y * scale * zoom,
  }
}

export interface FitPadding {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

/**
 * Fits the projected map into the container. `padding` describes the chrome
 * floating over the canvas (KPI rail, event stream, side panels) so the
 * landmass settles in the region the user can actually see.
 */
export function defaultTransform(
  container: { width: number; height: number },
  padding: FitPadding = {},
): MapTransform {
  const scale = baseScale(container)
  if (!scale) return { k: 1, x: 0, y: 0 }

  const { top = 0, right = 0, bottom = 0, left = 0 } = padding
  const visibleW = Math.max(120, container.width - left - right)
  const visibleH = Math.max(120, container.height - top - bottom)

  // Zoom so the map fills the visible box, then centre it there.
  const k = Math.min(visibleW / (MAP_VIEW.width * scale), visibleH / (MAP_VIEW.height * scale))
  return {
    k,
    x: left + (visibleW - MAP_VIEW.width * scale * k) / 2,
    y: top + (visibleH - MAP_VIEW.height * scale * k) / 2,
  }
}

function baseScale(container: { width: number; height: number }) {
  if (!container.width || !container.height) return 0
  return Math.min(container.width / MAP_VIEW.width, container.height / MAP_VIEW.height)
}

export function useMapInteraction(
  containerRef: React.RefObject<HTMLDivElement | null>,
  transform: MapTransform,
  onChange: ((t: MapTransform) => void) | undefined,
  { minZoom = 0.8, maxZoom = 14, enabled = true }: { minZoom?: number; maxZoom?: number; enabled?: boolean },
) {
  const drag = React.useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)
  const justDragged = React.useRef(false)
  const pinch = React.useRef<{ distance: number; k: number } | null>(null)
  const transformRef = React.useRef(transform)
  transformRef.current = transform

  React.useEffect(() => {
    const node = containerRef.current
    if (!node || !enabled || !onChange) return

    function clampZoom(k: number) {
      return Math.max(minZoom, Math.min(maxZoom, k))
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const t = transformRef.current
      const rect = node!.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      const factor = Math.exp(-event.deltaY * 0.0016)
      const k = clampZoom(t.k * factor)
      const ratio = k / t.k
      onChange!({
        k,
        x: px - (px - t.x) * ratio,
        y: py - (py - t.y) * ratio,
      })
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return
      const t = transformRef.current
      // Capture is deliberately deferred until the pointer actually moves —
      // capturing on pointerdown would retarget the click away from markers.
      drag.current = { x: event.clientX, y: event.clientY, tx: t.x, ty: t.y, moved: false }
    }

    function onPointerMove(event: PointerEvent) {
      if (!drag.current) return
      const dx = event.clientX - drag.current.x
      const dy = event.clientY - drag.current.y
      if (!drag.current.moved) {
        if (Math.abs(dx) + Math.abs(dy) <= 4) return
        drag.current.moved = true
        node!.setPointerCapture(event.pointerId)
      }
      const t = transformRef.current
      onChange!({ k: t.k, x: drag.current.tx + dx, y: drag.current.ty + dy })
    }

    function onPointerUp(event: PointerEvent) {
      if (drag.current?.moved && node!.hasPointerCapture(event.pointerId)) {
        node!.releasePointerCapture(event.pointerId)
      }
      const wasDragging = drag.current?.moved ?? false
      drag.current = null
      // Let the click handler know the gesture was a pan, not a selection.
      if (wasDragging) {
        justDragged.current = true
        window.setTimeout(() => {
          justDragged.current = false
        }, 0)
      }
    }

    function touchDistance(event: TouchEvent) {
      const [a, b] = [event.touches[0]!, event.touches[1]!]
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length === 2) {
        pinch.current = { distance: touchDistance(event), k: transformRef.current.k }
      }
    }

    function onTouchMove(event: TouchEvent) {
      if (event.touches.length === 2 && pinch.current) {
        event.preventDefault()
        const t = transformRef.current
        const rect = node!.getBoundingClientRect()
        const cx = (event.touches[0]!.clientX + event.touches[1]!.clientX) / 2 - rect.left
        const cy = (event.touches[0]!.clientY + event.touches[1]!.clientY) / 2 - rect.top
        const k = clampZoom((pinch.current.k * touchDistance(event)) / pinch.current.distance)
        const ratio = k / t.k
        onChange!({ k, x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio })
      }
    }

    function onTouchEnd(event: TouchEvent) {
      if (event.touches.length < 2) pinch.current = null
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    node.addEventListener('pointerdown', onPointerDown)
    node.addEventListener('pointermove', onPointerMove)
    node.addEventListener('pointerup', onPointerUp)
    node.addEventListener('pointercancel', onPointerUp)
    node.addEventListener('touchstart', onTouchStart, { passive: true })
    node.addEventListener('touchmove', onTouchMove, { passive: false })
    node.addEventListener('touchend', onTouchEnd)
    return () => {
      node.removeEventListener('wheel', onWheel)
      node.removeEventListener('pointerdown', onPointerDown)
      node.removeEventListener('pointermove', onPointerMove)
      node.removeEventListener('pointerup', onPointerUp)
      node.removeEventListener('pointercancel', onPointerUp)
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchmove', onTouchMove)
      node.removeEventListener('touchend', onTouchEnd)
    }
  }, [containerRef, enabled, onChange, minZoom, maxZoom])

  return justDragged
}

const REGION_PATHS = OPERATING_REGIONS.map((r) => ({ id: r.id, label: r.label, d: pathFrom(r.ring) }))

const GRATICULE_LINES = (() => {
  const lines: string[] = []
  for (const lng of GRATICULE.lngs) {
    const points: string[] = []
    for (let lat = 6; lat <= 37.5; lat += 1.5) {
      const p = project(lat, lng)
      points.push(`${points.length === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    }
    lines.push(points.join(' '))
  }
  for (const lat of GRATICULE.lats) {
    const points: string[] = []
    for (let lng = 67; lng <= 98.5; lng += 1.5) {
      const p = project(lat, lng)
      points.push(`${points.length === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    }
    lines.push(points.join(' '))
  }
  return lines
})()

const CITY_POINTS = REFERENCE_CITIES.map((c) => ({ ...c, ...project(c.lat, c.lng) }))

export const IndiaMapCanvas = React.forwardRef<HTMLDivElement, IndiaMapCanvasProps>(function IndiaMapCanvas(
  {
    transform,
    onTransformChange,
    children,
    hud,
    minZoom = 0.8,
    maxZoom = 14,
    interactive = true,
    showRegions = true,
    showCities = true,
    className,
    onBackgroundClick,
    onSizeChange,
    ariaLabel = 'Map of India showing Suzlon wind operations',
  },
  forwardedRef,
) {
  const localRef = React.useRef<HTMLDivElement | null>(null)
  React.useImperativeHandle(forwardedRef, () => localRef.current as HTMLDivElement)

  const onSizeChangeRef = React.useRef(onSizeChange)
  onSizeChangeRef.current = onSizeChange

  const [size, setSize] = React.useState({ width: 0, height: 0 })
  React.useLayoutEffect(() => {
    const node = localRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        const next = { width: entry.contentRect.width, height: entry.contentRect.height }
        setSize(next)
        onSizeChangeRef.current?.(next)
      }
    })
    observer.observe(node)
    const initial = { width: node.clientWidth, height: node.clientHeight }
    setSize(initial)
    onSizeChangeRef.current?.(initial)
    return () => observer.disconnect()
  }, [])

  const justDragged = useMapInteraction(localRef, transform, onTransformChange, {
    minZoom,
    maxZoom,
    enabled: interactive,
  })

  const scale = baseScale(size)
  const cityScale = 1 / (transform.k * scale || 1)

  return (
    <div
      ref={localRef}
      className={cn(
        'relative h-full w-full touch-pan-y overflow-hidden bg-[var(--map-water)]',
        interactive && 'cursor-grab active:cursor-grabbing',
        className,
      )}
      role="application"
      aria-label={ariaLabel}
      onClick={(event) => {
        if (justDragged.current) return
        const target = event.target as Element
        if (target === event.currentTarget || target.hasAttribute?.('data-map-bg')) {
          onBackgroundClick?.()
        }
      }}
    >
      {size.width > 0 && (
        <svg width={size.width} height={size.height} className="absolute inset-0">
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k * scale})`}>
            {/* Background hit target */}
            <rect
              data-map-bg
              x={-MAP_VIEW.width}
              y={-MAP_VIEW.height}
              width={MAP_VIEW.width * 3}
              height={MAP_VIEW.height * 3}
              fill="transparent"
            />

            {/* Graticule */}
            {GRATICULE_LINES.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="var(--map-graticule)" strokeWidth={1 * cityScale} data-map-bg />
            ))}

            {/* Landmass */}
            <path
              d={INDIA_PATH}
              fill="var(--map-land)"
              stroke="var(--map-border)"
              strokeWidth={1.4 * cityScale}
              strokeLinejoin="round"
              data-map-bg
            />
            {ISLAND_PATHS.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="var(--map-land)"
                stroke="var(--map-border)"
                strokeWidth={1 * cityScale}
                data-map-bg
              />
            ))}

            {/* Operating regions */}
            {showRegions &&
              REGION_PATHS.map((region) => (
                <path
                  key={region.id}
                  d={region.d}
                  fill="var(--map-land-alt)"
                  stroke="var(--map-border)"
                  strokeWidth={0.7 * cityScale}
                  strokeDasharray={`${3 * cityScale} ${3 * cityScale}`}
                  opacity={0.85}
                  data-map-bg
                />
              ))}

            {/* Reference cities */}
            {showCities &&
              CITY_POINTS.map((city) => (
                <g key={city.name} opacity={city.tier === 1 || transform.k > 1.8 ? 0.9 : 0} data-map-bg>
                  <circle cx={city.x} cy={city.y} r={2.2 * cityScale} fill="var(--ink-muted)" opacity={0.55} />
                  <text
                    x={city.x + 6 * cityScale}
                    y={city.y + 3 * cityScale}
                    fontSize={11 * cityScale}
                    className="fill-[var(--ink-muted)]"
                    opacity={0.8}
                  >
                    {city.name}
                  </text>
                </g>
              ))}

            {typeof children === 'function'
              ? children({ k: transform.k, baseScale: scale })
              : children}
          </g>
        </svg>
      )}
      {hud}
    </div>
  )
})
