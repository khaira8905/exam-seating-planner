/**
 * The full pipeline: allocate students to rooms → decide which seats each
 * paper gets in every room → place students → re-check with the independent
 * checker. Pure TypeScript, so it runs the same in a Web Worker, in Node tests
 * and in the benchmark script.
 */
import { byRoll } from '../sort'
import type { Method, Plan, Room, SeatAssignment, Session, Strictness, Student } from '../types'
import { allocate, type RoomAllocation } from './allocate'
import { checkPlan } from './checker'
import type { Infeasible } from './explain'
import { buildGrid } from './grid'
import { solveRoom, type HighsLike } from './milp'
import { explainRoom } from './explain'
import { fillFromPieces, patternFill, type SeatPapers } from './pattern'
import { placeStudents } from './place'

export type { Infeasible } from './explain'

export interface SolveRequest {
  students: Student[]
  rooms: Room[]
  rule: Strictness
  method: Method
  session: Session
}

export interface Progress {
  phase: 'allocating' | 'seating' | 'checking'
  done: number
  total: number
  room?: string
  /** Which session is being planned, when a file covers both sessions. */
  session?: string
}

export type SolveOutcome = { ok: true; plan: Plan } | { ok: false; problem: Infeasible }

export interface SolveOptions {
  onProgress?: (p: Progress) => void
  /** A loaded HiGHS instance. Required for the optimised method; without it rooms use the pattern method. */
  highs?: HighsLike
  /** Per-room time limit for HiGHS, in seconds. */
  roomTimeLimit?: number
}

/** Students grouped by paper, each group in roll-number order. */
export function groupByPaper(students: Student[]): Map<string, Student[]> {
  const m = new Map<string, Student[]>()
  for (const s of [...students].sort(byRoll)) {
    const list = m.get(s.paper) ?? []
    list.push(s)
    m.set(s.paper, list)
  }
  return m
}

/**
 * Gives each allocated piece real students. Each paper's students are taken in
 * roll-number order through the rooms, except that special-needs students are
 * moved into the paper's lowest-floor rooms first.
 */
export function distributeStudents(rooms: RoomAllocation[], students: Student[]): Student[][][] {
  const papers = groupByPaper(students)
  const out: Student[][][] = rooms.map((r) => r.pieces.map(() => []))
  const slots = new Map<string, { room: number; piece: number; floor: number; count: number }[]>()
  rooms.forEach((r, ri) =>
    r.pieces.forEach((p, pi) => {
      const list = slots.get(p.paper) ?? []
      list.push({ room: ri, piece: pi, floor: r.grid.room.floor ?? Number.POSITIVE_INFINITY, count: p.count })
      slots.set(p.paper, list)
    }),
  )
  for (const [paper, list] of slots) {
    const all = papers.get(paper) ?? []
    const left = list.map((s) => s.count)
    // Special-needs students first, into the lowest-floor rooms holding this paper.
    const byFloor = list.map((s, i) => [s.floor, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1])
    for (const st of all.filter((s) => s.specialNeeds)) {
      const i = byFloor.find(([, j]) => left[j] > 0)![1]
      out[list[i].room][list[i].piece].push(st)
      left[i]--
    }
    // Everyone else in roll-number order through the rooms.
    let i = 0
    for (const st of all.filter((s) => !s.specialNeeds)) {
      while (left[i] === 0) i++
      out[list[i].room][list[i].piece].push(st)
      left[i]--
    }
  }
  return out
}

export async function solve(req: SolveRequest, opts: SolveOptions = {}): Promise<SolveOutcome> {
  const t0 = performance.now()
  const { students, rooms, rule, method, session } = req
  opts.onProgress?.({ phase: 'allocating', done: 0, total: 1 })
  const grids = rooms.map((r) => buildGrid(r, rule))
  const allocation = allocate(grids, students)
  if (!allocation.ok) return { ok: false, problem: allocation.problem }
  const perPiece = distributeStudents(allocation.rooms, students)

  const seats: SeatAssignment[] = []
  const roomOrder: string[] = []
  const warnings = [...allocation.warnings]
  const gridById = new Map(grids.map((g) => [g.room.id, g]))
  const byMethod = { optimised: 0, pattern: 0 }
  for (let ri = 0; ri < allocation.rooms.length; ri++) {
    const { grid: g, pieces, free } = allocation.rooms[ri]
    opts.onProgress?.({ phase: 'seating', done: ri, total: allocation.rooms.length, room: g.room.name })
    const groups = perPiece[ri]
    const withSpecial = pieces.map((p, i) => ({ ...p, special: groups[i].filter((s) => s.specialNeeds).length }))
    // Normally the allocator's class plan is clash-free by construction: it is the
    // pattern result, the optimiser's warm start and the fallback if HiGHS fails.
    // In "free" rooms (tight fallback) only the solvers can decide.
    const pattern = free ? patternFill(g, withSpecial) : fillFromPieces(g, withSpecial)
    let sp: SeatPapers | null = pattern
    let optimised = false
    if ((method === 'optimised' || free) && opts.highs) {
      const res = solveRoom(opts.highs, g, withSpecial, { timeLimit: opts.roomTimeLimit, start: pattern ?? undefined })
      if (res.status === 'optimal' || res.status === 'feasible') {
        sp = res.seatPapers
        optimised = true
      }
    }
    if (!sp) {
      return {
        ok: false,
        problem: {
          title: `Room ${g.room.name} can't be seated clash-free`,
          reasons: explainRoom(g, withSpecial).length
            ? explainRoom(g, withSpecial)
            : [`The papers sent to Room ${g.room.name} (${withSpecial.map((d) => `${d.paper} × ${d.count}`).join(', ')}) can't be arranged without two students of the same paper sitting together.`],
          suggestions: ['Add a room.', 'Or relax the rule by one level.'],
        },
      }
    }
    if (optimised) byMethod.optimised++
    else byMethod.pattern++
    seats.push(...placeStudents(g, sp, groups))
    roomOrder.push(g.room.id)
  }

  opts.onProgress?.({ phase: 'checking', done: 0, total: 1 })
  const check = checkPlan({ rooms, students, seats, rule })
  const usedGrids = roomOrder.map((id) => gridById.get(id)!)
  const usableSeats = usedGrids.reduce((a, g) => a + g.seats.length, 0)
  const plan: Plan = {
    version: 1,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    session,
    rule,
    method,
    rooms,
    students,
    seats,
    roomOrder,
    stats: {
      students: students.length,
      roomsUsed: roomOrder.length,
      usableSeats,
      emptySeats: usableSeats - seats.length,
      clashes: check.clashes.length + check.problems.length,
      timeMs: Math.round(performance.now() - t0),
      roomsByMethod: byMethod,
    },
    warnings,
  }
  return { ok: true, plan }
}
