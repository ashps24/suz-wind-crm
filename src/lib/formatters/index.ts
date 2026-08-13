import { DEMO_NOW } from '@/lib/utils'

const NUM = new Intl.NumberFormat('en-IN')
const NUM1 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const NUM2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function fmtNumber(value: number, decimals = 0) {
  if (decimals === 1) return NUM1.format(value)
  if (decimals === 2) return NUM2.format(value)
  return NUM.format(Math.round(value))
}

export function fmtMw(value: number, decimals = 1) {
  return `${fmtNumber(value, decimals)} MW`
}

export function fmtKw(value: number) {
  return `${fmtNumber(value)} kW`
}

export function fmtGwh(value: number, decimals = 2) {
  return `${fmtNumber(value, decimals)} GWh`
}

export function fmtMwh(value: number, decimals = 1) {
  return `${fmtNumber(value, decimals)} MWh`
}

export function fmtPct(value: number, decimals = 1) {
  return `${fmtNumber(value, decimals)}%`
}

export function fmtCrore(value: number) {
  return `₹${fmtNumber(value, value < 10 ? 2 : 1)} Cr`
}

export function fmtLakh(value: number) {
  return `₹${fmtNumber(value, 2)} L`
}

export function fmtSpeed(value: number) {
  return `${fmtNumber(value, 1)} m/s`
}

export function fmtTemp(value: number) {
  return `${fmtNumber(value, 1)}°C`
}

export function fmtDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${fmtNumber(km)} km`
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

export function fmtBearing(deg: number) {
  return `${COMPASS[Math.round(deg / 22.5) % 16]} ${Math.round(deg)}°`
}

export function compassPoint(deg: number) {
  return COMPASS[Math.round(deg / 22.5) % 16] as string
}

/* ----------------------------------- Dates ----------------------------------- */

const DATE_FMT = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const DATE_SHORT = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' })
const TIME_FMT = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
const DATETIME_FMT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' })

export function fmtDate(value: string | Date) {
  return DATE_FMT.format(new Date(value))
}
export function fmtDateShort(value: string | Date) {
  return DATE_SHORT.format(new Date(value))
}
export function fmtTime(value: string | Date) {
  return TIME_FMT.format(new Date(value))
}
export function fmtDateTime(value: string | Date) {
  return DATETIME_FMT.format(new Date(value))
}
export function fmtMonthYear(value: string | Date) {
  return MONTH_YEAR.format(new Date(value))
}

/** Relative time against the fixed demo clock. */
export function fmtRelative(value: string | Date) {
  const then = new Date(value).getTime()
  const diff = then - DEMO_NOW.getTime()
  const abs = Math.abs(diff)
  const future = diff > 0

  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  let text: string
  if (abs < minute) text = 'just now'
  else if (abs < hour) text = `${Math.round(abs / minute)} min`
  else if (abs < day) text = `${Math.round(abs / hour)} h`
  else if (abs < 30 * day) text = `${Math.round(abs / day)} d`
  else if (abs < 365 * day) text = `${Math.round(abs / (30 * day))} mo`
  else text = `${Math.round(abs / (365 * day))} y`

  if (text === 'just now') return text
  return future ? `in ${text}` : `${text} ago`
}

export function daysBetween(from: string | Date, to: string | Date) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000)
}

export function isOverdue(value: string) {
  return new Date(value).getTime() < DEMO_NOW.getTime()
}

export function isToday(value: string) {
  const d = new Date(value)
  return (
    d.getFullYear() === DEMO_NOW.getFullYear() &&
    d.getMonth() === DEMO_NOW.getMonth() &&
    d.getDate() === DEMO_NOW.getDate()
  )
}

/* ----------------------------------- Misc ----------------------------------- */

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function fmtDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m ? `${h} h ${m} min` : `${h} h`
}

export function fmtFileSize(mb: number) {
  return mb < 1 ? `${Math.round(mb * 1024)} KB` : `${fmtNumber(mb, 1)} MB`
}

export function fmtDelta(value: number, decimals = 1) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${fmtNumber(value, decimals)}`
}
