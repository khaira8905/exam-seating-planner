/**
 * Invigilator duty list: assigns the invigilators the exam cell types in to
 * the rooms in use — one invigilator per N students (default 40), at least
 * one per room — in room order, so each person stays on one floor if possible.
 */
import type { PlanView } from '../planView'
import { floorText } from './reports'

export const DEFAULT_STUDENTS_PER_INVIGILATOR = 40

export interface DutyRow {
  room: string
  floor: string
  students: number
  papers: string
  invigilators: string[]
  /** How many more invigilators this room needs (names ran out). */
  missing: number
}

export interface DutyList {
  rows: DutyRow[]
  needed: number
  assigned: number
  /** Names left over after every room is covered (kept as reserves). */
  reserves: string[]
}

/** Cleans a pasted list: one name per line (commas also work), trimmed, no blanks or duplicates. */
export function parseNames(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/[\n,;]+/)) {
    const name = raw.replace(/\s+/g, ' ').trim()
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push(name)
  }
  return out
}

export function invigilatorsNeeded(students: number, perInvigilator = DEFAULT_STUDENTS_PER_INVIGILATOR): number {
  return students > 0 ? Math.max(1, Math.ceil(students / Math.max(1, perInvigilator))) : 0
}

export function assignDuties(view: PlanView, names: string[], perInvigilator = DEFAULT_STUDENTS_PER_INVIGILATOR): DutyList {
  let next = 0
  let needed = 0
  const rows = view.rooms.map((r): DutyRow => {
    const need = invigilatorsNeeded(r.used, perInvigilator)
    needed += need
    const invigilators = names.slice(next, next + need)
    next += invigilators.length
    return {
      room: r.room.name,
      floor: floorText(r.room.floor),
      students: r.used,
      papers: r.papers.map((p) => p.paper).join(', '),
      invigilators,
      missing: need - invigilators.length,
    }
  })
  return { rows, needed, assigned: next, reserves: names.slice(next) }
}
