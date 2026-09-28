/**
 * The five printouts as plain tables. The PDF and Excel writers both render
 * these, so the two formats always contain exactly the same information.
 */
import { fmt, formatMs, sessionLabel } from '../format'
import type { PlanView, RoomView } from '../planView'
import { RULE_BY_ID } from '../rules'
import { seatLabel } from '../seatLabel'
import { compareRoll } from '../sort'

export interface ReportHeader {
  title: string
  session: string
  rule: string
}

export function reportHeader(view: PlanView): ReportHeader {
  const { plan } = view
  return {
    title: plan.session.title?.trim() || 'Examination',
    session: sessionLabel(plan.session),
    rule: `${RULE_BY_ID[plan.rule].label} rule (${RULE_BY_ID[plan.rule].short})`,
  }
}

export const floorText = (f?: number) => (f === undefined ? '' : f === 0 ? 'Ground floor' : `Floor ${f}`)

/** One cell of a room's seating chart. */
export type ChartCell =
  | { kind: 'student'; label: string; paper: string; roll: string; special: boolean }
  | { kind: 'empty'; label: string }
  | { kind: 'blocked'; label: string }

export function seatingChart(room: RoomView): ChartCell[][] {
  const { cols, rows } = room.room
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c): ChartCell => {
      const i = r * cols + c
      const label = seatLabel(r, c)
      if (!room.grid.usable[i]) return { kind: 'blocked', label }
      const st = room.bySeat.get(i)
      return st ? { kind: 'student', label, paper: st.paper, roll: st.roll, special: !!st.specialNeeds } : { kind: 'empty', label }
    }),
  )
}

export interface DoorRow {
  paper: string
  paperName: string
  rolls: string
  count: number
}

export function doorList(room: RoomView): DoorRow[] {
  return room.papers.map((p) => ({ paper: p.paper, paperName: p.paperName ?? '', rolls: p.ranges.join(', '), count: p.count }))
}

export interface MasterRow {
  roll: string
  name: string
  course: string
  paper: string
  room: string
  seat: string
  floor: string
  specialNeeds: string
}

export function masterList(view: PlanView): MasterRow[] {
  const rows: MasterRow[] = []
  for (const s of view.plan.students) {
    const a = view.seatByRoll.get(s.roll)
    const room = a ? view.roomById.get(a.roomId) : undefined
    rows.push({
      roll: s.roll,
      name: s.name,
      course: s.course,
      paper: s.paper,
      room: room?.room.name ?? '—',
      seat: a ? seatLabel(a.row, a.col) : '—',
      floor: floorText(room?.room.floor),
      specialNeeds: s.specialNeeds ?? '',
    })
  }
  return rows.sort((a, b) => compareRoll(a.roll, b.roll))
}

export interface AttendanceRow {
  seat: string
  roll: string
  name: string
  paper: string
}

/** Attendance sheet rows in seat order (row A first, left to right) — the order invigilators walk. */
export function attendance(room: RoomView): AttendanceRow[] {
  return [...room.bySeat.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, st]) => ({ seat: seatLabel(Math.floor(i / room.room.cols), i % room.room.cols), roll: st.roll, name: st.name, paper: st.paper }))
}

export interface SummaryData {
  items: [string, string][]
  rooms: { room: string; floor: string; papers: string; students: number; empty: number; usable: number }[]
}

export function summary(view: PlanView): SummaryData {
  const { plan, check } = view
  const h = reportHeader(view)
  const s = plan.stats
  const clashes = check.clashes.length + check.problems.length
  return {
    items: [
      ['Examination', h.title],
      ['Session', h.session],
      ['Rule', h.rule],
      ['Method', plan.method === 'optimised' ? `Optimised with HiGHS (${s.roomsByMethod.optimised} rooms; pattern fallback: ${s.roomsByMethod.pattern})` : 'Pattern filling'],
      ['Students', fmt(s.students)],
      ['Papers', fmt(new Set(plan.students.map((x) => x.paper)).size)],
      ['Special-needs students', fmt(plan.students.filter((x) => x.specialNeeds).length)],
      ['Rooms used', `${fmt(s.roomsUsed)} of ${fmt(plan.rooms.length)}`],
      ['Usable seats in rooms used', fmt(s.usableSeats)],
      ['Empty seats', fmt(s.emptySeats)],
      ['Clash check (independent)', clashes === 0 ? `0 clashes — ${fmt(check.checkedPairs)} student pairs re-checked` : `${clashes} problems found`],
      ['Time taken', formatMs(s.timeMs)],
      ['Generated', new Date(plan.createdAt).toLocaleString('en-IN')],
    ],
    rooms: view.rooms.map((r) => ({
      room: r.room.name,
      floor: floorText(r.room.floor),
      papers: r.papers.map((p) => p.paper).join(', '),
      students: r.used,
      empty: r.usable - r.used,
      usable: r.usable,
    })),
  }
}
