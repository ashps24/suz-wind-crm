'use client'

import * as React from 'react'

/** Element width/height tracked through a ResizeObserver — charts need real pixels. */
export function useMeasure<T extends HTMLElement = HTMLDivElement>() {
  const ref = React.useRef<T>(null)
  const [size, setSize] = React.useState({ width: 0, height: 0 })

  React.useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(node)
    setSize({ width: node.clientWidth, height: node.clientHeight })
    return () => observer.disconnect()
  }, [])

  return [ref, size] as const
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)')
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1279px)')
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1280px)')
}

export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/** Guards against rendering client-only values during hydration. */
export function useMounted() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  return mounted
}

export function useDebounced<T>(value: T, ms = 180) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

/** Global keyboard shortcut. Ignores keystrokes typed into form fields. */
export function useHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  { meta = false, allowInInput = false }: { meta?: boolean; allowInInput?: boolean } = {},
) {
  const handlerRef = React.useRef(handler)
  handlerRef.current = handler

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== key.toLowerCase()) return
      if (meta && !(event.metaKey || event.ctrlKey)) return
      if (!meta && (event.metaKey || event.ctrlKey)) return
      if (!allowInInput) {
        const target = event.target as HTMLElement | null
        if (target && /^(input|textarea|select)$/i.test(target.tagName)) return
        if (target?.isContentEditable) return
      }
      handlerRef.current(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, meta, allowInInput])
}
