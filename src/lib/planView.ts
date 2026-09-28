import { checkPlan, type CheckResult } from './engine/checker'
import { buildGrid, type RoomGrid } from './engine/grid'
import { assignPaperColours } from './palette'
import { compareRoll } from './sort'
import type { Plan, Room, SeatAssignment, Student } from './types'

export interface PaperInRoom {
  paper: string
  paperName?: string
  count: number
  /** Roll-number ranges, e.g. ["CSE301–CSE340", "CSE345"]. */
  ranges: string[]
  first: string
  last: string
}

export interface RoomView {
  room: Room
  grid: RoomGrid
  /** seat index (row * cols + col) → student */
  bySeat: Map<number, Student>
  seats: SeatAssignment[]
  papers: PaperInRoom[]
  used: number
  usable: number
}

export interface PlanView {
  plan: Plan
  rooms: RoomView[]
  roomById: Map<string, RoomView>
  studentByRoll: Map<string, Student>
  seatByRoll: Map<string, SeatAssignment>
  paperColour: Map<string, number>
  paperNames: Map<string, string>
  check: CheckResult
}

/**
 * Compresses a sorted list of rolls into ranges of consecutive roll numbers
 * (same prefix, number +1): CSE301, CSE302, CSE303, CSE305 → CSE301–CSE303, CSE305.
 */
export function rollRanges(rolls: string[]): string[] {
  const sorted = [...rolls].sort(compareRoll)
  const parse = (r: string) => {
    const m = /^(.*?)(\d+)$/.exec(r)
    return m ? { prefix: m[1], n: Number(m[2]), width: m[2].length } : null
  }
  const out: string[] = []
  let start = 0
  for (let i = 1; i <= sorted.length; i++) {
    const prev = parse(sorted[i - 1])
    const cur = i < sorted.length ? parse(sorted[i]) : null
    const consecutive = prev && cur && cur.prefix === prev.prefix && cur.n === prev.n + 1 && cur.width === prev.width
    if (!consecutive) {
      out.push(i - 1 === start ? sorted[start] : `${sorted[start]}–${sorted[i - 1]}`)
      start = i
    }
  }
  return out
}

export function buildPlanView(plan: Plan): PlanView {
  const studentByRoll = new Map(plan.students.map((s) => [s.roll, s]))
  const seatByRoll = new Map(plan.seats.map((s) => [s.roll, s]))
  const paperNames = new Map<string, string>()
  for (const s of plan.students) if (s.paperName && !paperNames.has(s.paper)) paperNames.set(s.paper, s.paperName)
  const roomsById = new Map(plan.rooms.map((r) => [r.id, r]))
  const seatsByRoom = new Map<string, SeatAssignment[]>()
  for (const a of plan.seats) {
    const list = seatsByRoom.get(a.roomId) ?? []
    list.push(a)
    seatsByRoom.set(a.roomId, list)
  }
  const rooms: RoomView[] = plan.roomOrder.map((id) => {
    const room = roomsById.get(id)!
    const grid = buildGrid(room, plan.rule)
    const seats = seatsByRoom.get(id) ?? []
    const bySeat = new Map<number, Student>()
    const rollsByPaper = new Map<string, string[]>()
    for (const a of seats) {
      const st = studentByRoll.get(a.roll)
      if (!st) continue
      bySeat.set(a.row * room.cols + a.col, st)
      const list = rollsByPaper.get(st.paper) ?? []
      list.push(st.roll)
      rollsByPaper.set(st.paper, list)
    }
    const papers = [...rollsByPaper.entries()]
      .map(([paper, rolls]) => {
        const sorted = rolls.sort(compareRoll)
        return {
          paper,
          paperName: paperNames.get(paper),
          count: rolls.length,
          ranges: rollRanges(sorted),
          first: sorted[0],
          last: sorted[sorted.length - 1],
        }
      })
      .sort((a, b) => compareRoll(a.first, b.first))
    return { room, grid, bySeat, seats, papers, used: seats.length, usable: grid.seats.length }
  })
  const paperColour = assignPaperColours(rooms.map((r) => r.papers.map((p) => p.paper)))
  const check = checkPlan(plan)
  return { plan, rooms, roomById: new Map(rooms.map((r) => [r.room.id, r])), studentByRoll, seatByRoll, paperColour, paperNames, check }
}
