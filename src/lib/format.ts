import type { Session } from './types'

const nf = new Intl.NumberFormat('en-IN')

/** 1200 → "1,200" (Indian grouping: 1,00,000). */
export const fmt = (n: number) => nf.format(n)

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function sessionLabel(s: Session): string {
  return `${formatDate(s.date)} · ${s.slot === 'morning' ? 'Morning' : 'Evening'}`
}

/** "seatwise-2026-11-24-morning" — used for downloaded file names. */
export function fileStem(s: Session): string {
  return `seatwise-${s.date}-${s.slot}`
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${fmt(n)} ${n === 1 ? one : many}`
}

export function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`
}
