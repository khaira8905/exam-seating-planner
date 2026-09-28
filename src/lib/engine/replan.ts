/**
 * Re-plan after a last-minute change, moving as few students as possible.
 *
 * 1. Everyone whose seat is still valid stays put.
 * 2. Displaced and new students go into an empty seat with no same-paper
 *    neighbour — preferring rooms that already hold their paper.
 * 3. If that fails, one room is re-solved with HiGHS, where keeping a seat's
 *    current paper is rewarded, so only a handful of students move.
 * 4. As a last resort an unused room is opened.
 * The result is re-checked by the independent checker, and the differences
 * (moved / added / removed) are reported.
 */
import { explainRoom, type Infeasible } from './explain'
import { buildGrid, type RoomGrid } from './grid'
import { solveRoom, type HighsLike } from './milp'
import { patternFill, type Demand, type SeatPapers } from './pattern'
import { checkPlan } from './checker'
import { byRoll } from '../sort'
import { parseSeatLabel, seatLabel } from '../seatLabel'
import type { Plan, Room, SeatAssignment, Student } from '../types'

export type Change =
  | { type: 'add-student'; student: Student }
  | { type: 'remove-student'; roll: string }
  | { type: 'room-unavailable'; roomId: string }
  | { type: 'block-seat'; roomId: string; seat: string }

export interface SeatRef {
  room: string
  seat: string
}

export interface PlanDiff {
  moved: { roll: string; from: SeatRef; to: SeatRef }[]
  added: { roll: string; to: SeatRef }[]
  removed: { roll: string; from: SeatRef }[]
  unchanged: number
}

export type ReplanResult = { ok: true; plan: Plan; diff: PlanDiff } | { ok: false; problem: Infeasible }

interface RoomState {
  grid: RoomGrid
  /** seat index → roll */
  occupant: Map<number, string>
}

export function describeChange(c: Change, plan: Plan): string {
  const room = (id: string) => plan.rooms.find((r) => r.id === id)?.name ?? id
  switch (c.type) {
    case 'add-student':
      return `Add ${c.student.roll} (${c.student.paper})`
    case 'remove-student':
      return `Remove ${c.roll}`
    case 'room-unavailable':
      return `Room ${room(c.roomId)} unavailable`
    case 'block-seat':
      return `Seat ${c.seat} in ${room(c.roomId)} unusable`
  }
}

/** Validates a change against the plan; returns a friendly error or null. */
export function validateChange(c: Change, plan: Plan): string | null {
  switch (c.type) {
    case 'add-student':
      if (!c.student.roll.trim()) return 'Enter a roll number.'
      if (!c.student.paper.trim()) return 'Enter a paper code.'
      if (plan.students.some((s) => s.roll.toLowerCase() === c.student.roll.trim().toLowerCase())) return `${c.student.roll} is already in the plan.`
      return null
    case 'remove-student':
      return plan.students.some((s) => s.roll === c.roll) ? null : `No student with roll number ${c.roll}.`
    case 'room-unavailable':
      return plan.rooms.some((r) => r.id === c.roomId) ? null : 'Unknown room.'
    case 'block-seat': {
      const room = plan.rooms.find((r) => r.id === c.roomId)
      const p = parseSeatLabel(c.seat)
      if (!room) return 'Unknown room.'
      if (!p || p.row >= room.rows || p.col >= room.cols) return `Seat ${c.seat} is not in room ${room.name}.`
      return null
    }
  }
}

export async function replan(plan: Plan, changes: Change[], opts: { highs?: HighsLike } = {}): Promise<ReplanResult> {
  const t0 = performance.now()
  let students = [...plan.students]
  let rooms: Room[] = plan.rooms.map((r) => ({ ...r, blocked: [...r.blocked] }))
  for (const c of changes) {
    if (c.type === 'add-student') students.push({ ...c.student, roll: c.student.roll.trim(), paper: c.student.paper.trim().toUpperCase() })
    if (c.type === 'remove-student') students = students.filter((s) => s.roll !== c.roll)
    if (c.type === 'room-unavailable') rooms = rooms.filter((r) => r.id !== c.roomId)
    if (c.type === 'block-seat') {
      const room = rooms.find((r) => r.id === c.roomId)
      const p = parseSeatLabel(c.seat)
      if (room && p) room.blocked = [...new Set([...room.blocked, seatLabel(p.row, p.col)])]
    }
  }
  const byRollMap = new Map(students.map((s) => [s.roll, s]))
  const paperOf = (roll: string) => byRollMap.get(roll)!.paper
  const oldSeat = new Map(plan.seats.map((a) => [a.roll, a]))

  // 1. Keep every still-valid seat.
  const state = new Map<string, RoomState>()
  const getState = (room: Room) => {
    let st = state.get(room.id)
    if (!st) {
      st = { grid: buildGrid(room, plan.rule), occupant: new Map() }
      state.set(room.id, st)
    }
    return st
  }
  const unplaced: Student[] = []
  const roomById = new Map(rooms.map((r) => [r.id, r]))
  for (const s of students) {
    const a = oldSeat.get(s.roll)
    const room = a && roomById.get(a.roomId)
    if (a && room) {
      const st = getState(room)
      const i = a.row * room.cols + a.col
      if (st.grid.usable[i]) {
        st.occupant.set(i, s.roll)
        continue
      }
    }
    unplaced.push(s)
  }
  unplaced.sort((a, b) => Number(!!b.specialNeeds) - Number(!!a.specialNeeds) || byRoll(a, b))

  const freeSafeSeat = (st: RoomState, paper: string, preferFront: boolean): number | null => {
    const seats = preferFront ? [...st.grid.seats].sort((a, b) => Math.floor(a / st.grid.cols) - Math.floor(b / st.grid.cols)) : st.grid.seats
    for (const s of seats) {
      if (st.occupant.has(s)) continue
      if (st.grid.neighbours[s].every((n) => { const o = st.occupant.get(n); return !o || paperOf(o) !== paper })) return s
    }
    return null
  }
  const usedRooms = () => rooms.filter((r) => (state.get(r.id)?.occupant.size ?? 0) > 0)
  const hasPaper = (st: RoomState, paper: string) => [...st.occupant.values()].some((r) => paperOf(r) === paper)
  const failures: string[] = []

  for (const s of unplaced) {
    const candidates = usedRooms()
      .map((r) => getState(r))
      .sort((a, b) => Number(hasPaper(b, s.paper)) - Number(hasPaper(a, s.paper)) || freeCount(b) - freeCount(a))
      .filter((st) => freeCount(st) > 0)
    // Special-needs students: ground floor first.
    if (s.specialNeeds) candidates.sort((a, b) => (a.grid.room.floor ?? 9) - (b.grid.room.floor ?? 9))
    // 2. A free seat with no same-paper neighbour.
    let placed = false
    for (const st of candidates) {
      const seat = freeSafeSeat(st, s.paper, !!s.specialNeeds)
      if (seat !== null) {
        st.occupant.set(seat, s.roll)
        placed = true
        break
      }
    }
    // 3. Re-solve one room, keeping as many students in place as possible.
    if (!placed) {
      for (const st of candidates) {
        if (resolveRoomWith(st, s, paperOf, opts.highs)) {
          placed = true
          break
        }
        if (failures.length < 3) failures.push(...explainRoom(st.grid, demandsOf(st, paperOf, s)))
      }
    }
    // 4. Open an unused room.
    if (!placed) {
      const spare = rooms
        .filter((r) => (state.get(r.id)?.occupant.size ?? 0) === 0)
        .map((r) => getState(r))
        .sort((a, b) => b.grid.seats.length - a.grid.seats.length)[0]
      const seat = spare && freeSafeSeat(spare, s.paper, !!s.specialNeeds)
      if (spare && seat !== null && seat !== undefined) {
        spare.occupant.set(seat, s.roll)
        placed = true
      }
    }
    if (!placed) {
      return {
        ok: false,
        problem: {
          title: `Couldn't find a seat for ${s.roll}`,
          reasons: failures.length ? [...new Set(failures)].slice(0, 3) : [`Every room is full or already has a ${s.paper} student next to each free seat.`],
          suggestions: ['Make another room available.', 'Or relax the rule by one level and generate again.'],
        },
      }
    }
  }

  // Build the new plan and the diff.
  const seats: SeatAssignment[] = []
  for (const [roomId, st] of state) for (const [i, roll] of st.occupant) seats.push({ roll, roomId, row: Math.floor(i / st.grid.cols), col: i % st.grid.cols })
  const roomOrder = [...plan.roomOrder.filter((id) => (state.get(id)?.occupant.size ?? 0) > 0), ...[...state.keys()].filter((id) => !plan.roomOrder.includes(id) && state.get(id)!.occupant.size > 0)]
  const newSeat = new Map(seats.map((a) => [a.roll, a]))
  const ref = (a: SeatAssignment): SeatRef => ({ room: plan.rooms.find((r) => r.id === a.roomId)?.name ?? a.roomId, seat: seatLabel(a.row, a.col) })
  const diff: PlanDiff = { moved: [], added: [], removed: [], unchanged: 0 }
  for (const s of students) {
    const before = oldSeat.get(s.roll)
    const after = newSeat.get(s.roll)!
    if (!before) diff.added.push({ roll: s.roll, to: ref(after) })
    else if (before.roomId !== after.roomId || before.row !== after.row || before.col !== after.col) diff.moved.push({ roll: s.roll, from: ref(before), to: ref(after) })
    else diff.unchanged++
  }
  for (const a of plan.seats) if (!byRollMap.has(a.roll)) diff.removed.push({ roll: a.roll, from: ref(a) })

  const check = checkPlan({ rooms, students, seats, rule: plan.rule })
  const usable = roomOrder.reduce((a, id) => a + state.get(id)!.grid.seats.length, 0)
  const next: Plan = {
    ...plan,
    createdAt: new Date().toISOString(),
    revision: (plan.revision ?? 0) + 1,
    rooms,
    students,
    seats,
    roomOrder,
    stats: {
      ...plan.stats,
      students: students.length,
      roomsUsed: roomOrder.length,
      usableSeats: usable,
      emptySeats: usable - seats.length,
      clashes: check.clashes.length + check.problems.length,
      timeMs: Math.round(performance.now() - t0),
    },
    changes: [...(plan.changes ?? []), ...changes.map((c) => describeChange(c, plan))],
  }
  return { ok: true, plan: next, diff }
}

function freeCount(st: RoomState) {
  return st.grid.seats.length - st.occupant.size
}

/** The room's current papers as demands, plus one more seat for `extra`'s paper. */
function demandsOf(st: RoomState, paperOf: (r: string) => string, extra: Student): Demand[] {
  const counts = new Map<string, number>()
  for (const roll of st.occupant.values()) counts.set(paperOf(roll), (counts.get(paperOf(roll)) ?? 0) + 1)
  counts.set(extra.paper, (counts.get(extra.paper) ?? 0) + 1)
  return [...counts.entries()].map(([paper, count]) => ({ paper, count, special: 0 }))
}

/**
 * Re-solves one room so it can take `s`, rewarding seats that keep their
 * current paper (few moves). Students of a paper keep their seat when the
 * seat keeps that paper; the rest are placed into the paper's new seats.
 */
function resolveRoomWith(st: RoomState, s: Student, paperOf: (r: string) => string, highs?: HighsLike): boolean {
  const demands = demandsOf(st, paperOf, s)
  if (demands.reduce((a, d) => a + d.count, 0) > st.grid.seats.length) return false
  const index = new Map(demands.map((d, i) => [d.paper, i]))
  const current: SeatPapers = new Int32Array(st.grid.rows * st.grid.cols).fill(-1)
  for (const [seat, roll] of st.occupant) current[seat] = index.get(paperOf(roll))!
  let sp: SeatPapers | null = null
  if (highs) {
    const res = solveRoom(highs, st.grid, demands, { current, timeLimit: 2 })
    if (res.status === 'optimal' || res.status === 'feasible') sp = res.seatPapers
  }
  sp ??= patternFill(st.grid, demands)
  if (!sp) return false
  const next = new Map<number, string>()
  const waiting = new Map<number, string[]>()
  for (const [seat, roll] of [...st.occupant.entries()].sort((a, b) => a[0] - b[0])) {
    const p = index.get(paperOf(roll))!
    if (sp[seat] === p) next.set(seat, roll)
    else waiting.set(p, [...(waiting.get(p) ?? []), roll])
  }
  waiting.set(index.get(s.paper)!, [...(waiting.get(index.get(s.paper)!) ?? []), s.roll])
  for (const seat of st.grid.seats) {
    const p = sp[seat]
    if (p < 0 || next.has(seat)) continue
    const roll = waiting.get(p)?.shift()
    if (roll) next.set(seat, roll)
  }
  st.occupant = next
  return true
}
