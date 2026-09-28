import type { Plan } from '../types'

const FORMAT = 'seatwise-plan'

/** Serialises a plan as a self-contained JSON file the user can keep and reopen later. */
export function serialisePlan(plan: Plan): string {
  return JSON.stringify({ format: FORMAT, version: 1, savedAt: new Date().toISOString(), plan })
}

/** Reads a plan file, with friendly errors for the wrong kind of file. */
export function readPlanFile(text: string): Plan {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This is not a SeatWise plan file (it is not valid JSON).')
  }
  const d = data as { format?: string; version?: number; plan?: Plan }
  if (!d || d.format !== FORMAT || !d.plan) throw new Error('This is not a SeatWise plan file.')
  if (d.version !== 1) throw new Error(`This plan file was made by a newer version of SeatWise (format v${d.version}).`)
  const p = d.plan
  const valid =
    Array.isArray(p.students) &&
    Array.isArray(p.rooms) &&
    Array.isArray(p.seats) &&
    Array.isArray(p.roomOrder) &&
    typeof p.rule === 'string' &&
    p.session &&
    p.stats
  if (!valid) throw new Error('This plan file is damaged or incomplete.')
  return p
}
