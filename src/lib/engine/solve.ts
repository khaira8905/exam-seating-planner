/**
 * The full pipeline: allocate students to rooms → decide which seats each
 * paper gets in every room → place students → re-check with the independent
 * checker. Pure TypeScript, so it runs the same in a Web Worker, in Node tests
 * and in the benchmark script.
 */
import { byRoll } from '../sort'
import type { Method, Plan, Room, SeatAssignment, Session, Strictness, Student } from '../types'
import { checkPlan } from './checker'
import { buildGrid, paperCapacity, type RoomGrid } from './grid'
import { patternFill, type Demand, type SeatPapers } from './pattern'
import { placeStudents } from './place'

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
}

export interface Infeasible {
  title: string
  reasons: string[]
  suggestions: string[]
}

export type SolveOutcome = { ok: true; plan: Plan } | { ok: false; problem: Infeasible }

export interface SolveOptions {
  onProgress?: (p: Progress) => void
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

/** Simple first-fit allocation: fill rooms in order, each paper up to the room's per-paper limit. */
function allocateSequential(grids: RoomGrid[], papers: Map<string, Student[]>): Map<string, Map<string, Student[]>> | null {
  const queue = [...papers.entries()].map(([paper, list]) => ({ paper, list: [...list] }))
  const out = new Map<string, Map<string, Student[]>>()
  for (const g of grids) {
    let free = g.seats.length
    const cap = paperCapacity(g)
    const inRoom = new Map<string, Student[]>()
    for (const q of queue) {
      if (free === 0) break
      const take = Math.min(q.list.length, cap, free)
      if (take <= 0) continue
      inRoom.set(q.paper, q.list.splice(0, take))
      free -= take
    }
    if (inRoom.size) out.set(g.room.id, inRoom)
  }
  return queue.some((q) => q.list.length) ? null : out
}

export async function solve(req: SolveRequest, opts: SolveOptions = {}): Promise<SolveOutcome> {
  const t0 = performance.now()
  const { students, rooms, rule, method, session } = req
  opts.onProgress?.({ phase: 'allocating', done: 0, total: 1 })
  const grids = rooms.map((r) => buildGrid(r, rule))
  const papers = groupByPaper(students)
  const allocation = allocateSequential(grids, papers)
  if (!allocation) {
    return {
      ok: false,
      problem: { title: 'Not enough room', reasons: ['The rooms cannot hold all students under this rule.'], suggestions: ['Add rooms or relax the rule.'] },
    }
  }

  const seats: SeatAssignment[] = []
  const roomOrder: string[] = []
  const gridById = new Map(grids.map((g) => [g.room.id, g]))
  let done = 0
  for (const [roomId, inRoom] of allocation) {
    const g = gridById.get(roomId)!
    opts.onProgress?.({ phase: 'seating', done, total: allocation.size, room: g.room.name })
    const groups = [...inRoom.values()]
    const demands: Demand[] = [...inRoom.entries()].map(([paper, list]) => ({
      paper,
      count: list.length,
      special: list.filter((s) => s.specialNeeds).length,
    }))
    const sp: SeatPapers | null = patternFill(g, demands)
    if (!sp) {
      return {
        ok: false,
        problem: { title: `Couldn't seat room ${g.room.name}`, reasons: ['The pattern method found no clash-free layout.'], suggestions: [] },
      }
    }
    seats.push(...placeStudents(g, sp, groups))
    roomOrder.push(roomId)
    done++
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
      roomsByMethod: { optimised: 0, pattern: roomOrder.length },
    },
    warnings: [],
  }
  return { ok: true, plan }
}
