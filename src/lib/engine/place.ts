/**
 * After the room's seats are split between papers, put real students into
 * them: special-needs students first into the paper's front-most seats, then
 * everyone else in roll-number order, reading the room front to back, left to
 * right — so an invigilator walking the rows sees roll numbers in order.
 */
import { byRoll } from '../sort'
import type { SeatAssignment, Student } from '../types'
import type { RoomGrid } from './grid'
import type { SeatPapers } from './pattern'

export function placeStudents(g: RoomGrid, sp: SeatPapers, studentsPerDemand: Student[][]): SeatAssignment[] {
  const out: SeatAssignment[] = []
  studentsPerDemand.forEach((students, d) => {
    const seats = g.seats.filter((s) => sp[s] === d) // reading order
    if (seats.length !== students.length) {
      throw new Error(`Internal error: ${students.length} students but ${seats.length} seats for a paper in ${g.room.name}`)
    }
    const sorted = [...students].sort(byRoll)
    const special = sorted.filter((s) => s.specialNeeds)
    const others = sorted.filter((s) => !s.specialNeeds)
    // Front-most seats go to special-needs students; the rest keep reading order.
    const frontFirst = [...seats].sort((a, b) => Math.floor(a / g.cols) - Math.floor(b / g.cols) || a - b)
    const taken = new Set(frontFirst.slice(0, special.length))
    special.forEach((st, i) => out.push(at(g, st, frontFirst[i])))
    const rest = seats.filter((s) => !taken.has(s))
    others.forEach((st, i) => out.push(at(g, st, rest[i])))
  })
  return out
}

function at(g: RoomGrid, st: Student, seat: number): SeatAssignment {
  return { roll: st.roll, roomId: g.room.id, row: Math.floor(seat / g.cols), col: seat % g.cols }
}
