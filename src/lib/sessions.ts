/**
 * One students file can cover both sessions of a day (Session column). These
 * helpers split it and find students who write in both sessions.
 */
import { byRoll } from './sort'
import type { Slot, Student } from './types'

export const SLOTS: Slot[] = ['morning', 'evening']

export const slotLabel = (s: Slot) => (s === 'morning' ? 'Morning' : 'Evening')

/** Students per session, or null when the file has no Session column (single session). */
export function splitBySession(students: Student[]): Map<Slot, Student[]> | null {
  if (!students.some((s) => s.slot)) return null
  const out = new Map<Slot, Student[]>()
  for (const s of students) {
    const slot = s.slot ?? 'morning'
    const list = out.get(slot) ?? []
    list.push(s)
    out.set(slot, list)
  }
  return out
}

export interface BothSessions {
  roll: string
  name: string
  morningPaper: string
  eveningPaper: string
}

/** Students who write a paper in the morning AND in the evening, by roll number. */
export function studentsInBothSessions(morning: Student[], evening: Student[]): BothSessions[] {
  const eve = new Map(evening.map((s) => [s.roll.toUpperCase(), s]))
  return morning
    .filter((s) => eve.has(s.roll.toUpperCase()))
    .sort(byRoll)
    .map((s) => ({ roll: s.roll, name: s.name, morningPaper: s.paper, eveningPaper: eve.get(s.roll.toUpperCase())!.paper }))
}
