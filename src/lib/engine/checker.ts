/**
 * Stage 3 — the independent checker.
 *
 * This file deliberately shares NO neighbour logic with the solver. It takes a
 * finished plan and re-checks every pair of students in every room against the
 * chosen rule using plain row/column arithmetic, plus basic bookkeeping
 * (everyone seated exactly once, no blocked or double-booked seats). The UI's
 * "0 clashes" badge and all the property tests rely on this function.
 */
import { parseSeatLabel, seatLabel } from '../seatLabel'
import type { Room, SeatAssignment, Strictness, Student } from '../types'

export type ClashKind = 'side' | 'front-back' | 'diagonal' | 'bench'

export interface Clash {
  roomId: string
  paper: string
  a: { roll: string; seat: string }
  b: { roll: string; seat: string }
  kind: ClashKind
}

export interface CheckResult {
  ok: boolean
  clashes: Clash[]
  /** Bookkeeping problems: unseated students, blocked seats used, etc. */
  problems: string[]
  checkedPairs: number
}

/** Would two occupied seats in `room` break `rule`? Returns the kind of clash or null. */
export function neighbourKind(room: Room, rule: Strictness, r1: number, c1: number, r2: number, c2: number): ClashKind | null {
  const dr = Math.abs(r1 - r2)
  const dc = Math.abs(c1 - c2)
  if (rule === 'bench' && (room.seatsPerBench ?? 1) > 1) {
    const b = room.seatsPerBench!
    return dr === 0 && Math.floor(c1 / b) === Math.floor(c2 / b) ? 'bench' : null
  }
  const effective = rule === 'bench' ? 'basic' : rule
  if (dr === 0 && dc === 1) return 'side'
  if (effective === 'basic') return null
  if (dr === 1 && dc === 0) return 'front-back'
  if (effective === 'strict') return null
  if (dr === 1 && dc === 1) return 'diagonal'
  return null
}

export function checkPlan(input: {
  rooms: Room[]
  students: Student[]
  seats: SeatAssignment[]
  rule: Strictness
}): CheckResult {
  const { rooms, students, seats, rule } = input
  const problems: string[] = []
  const clashes: Clash[] = []
  const roomById = new Map(rooms.map((r) => [r.id, r]))
  const studentByRoll = new Map(students.map((s) => [s.roll, s]))
  const seatedCount = new Map<string, number>()
  const byRoom = new Map<string, SeatAssignment[]>()

  for (const a of seats) {
    const room = roomById.get(a.roomId)
    if (!room) {
      problems.push(`${a.roll} is placed in unknown room "${a.roomId}".`)
      continue
    }
    if (!studentByRoll.has(a.roll)) problems.push(`Seat ${room.name} ${seatLabel(a.row, a.col)} holds unknown roll number ${a.roll}.`)
    seatedCount.set(a.roll, (seatedCount.get(a.roll) ?? 0) + 1)
    if (a.row < 0 || a.col < 0 || a.row >= room.rows || a.col >= room.cols) {
      problems.push(`${a.roll} is placed outside room ${room.name}.`)
      continue
    }
    const blocked = room.blocked.some((l) => {
      const p = parseSeatLabel(l)
      return p !== null && p.row === a.row && p.col === a.col
    })
    if (blocked) problems.push(`${a.roll} is placed on blocked seat ${seatLabel(a.row, a.col)} in room ${room.name}.`)
    const list = byRoom.get(a.roomId) ?? []
    list.push(a)
    byRoom.set(a.roomId, list)
  }

  for (const s of students) {
    const n = seatedCount.get(s.roll) ?? 0
    if (n === 0) problems.push(`${s.roll} has no seat.`)
    else if (n > 1) problems.push(`${s.roll} has ${n} seats.`)
  }

  let checkedPairs = 0
  for (const [roomId, list] of byRoom) {
    const room = roomById.get(roomId)!
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const x = list[i]
        const y = list[j]
        checkedPairs++
        if (x.row === y.row && x.col === y.col) {
          problems.push(`Seat ${seatLabel(x.row, x.col)} in room ${room.name} is given to both ${x.roll} and ${y.roll}.`)
          continue
        }
        const px = studentByRoll.get(x.roll)?.paper
        const py = studentByRoll.get(y.roll)?.paper
        if (px === undefined || px !== py) continue
        const kind = neighbourKind(room, rule, x.row, x.col, y.row, y.col)
        if (kind) {
          clashes.push({
            roomId,
            paper: px,
            a: { roll: x.roll, seat: seatLabel(x.row, x.col) },
            b: { roll: y.roll, seat: seatLabel(y.row, y.col) },
            kind,
          })
        }
      }
    }
  }
  return { ok: clashes.length === 0 && problems.length === 0, clashes, problems, checkedPairs }
}
