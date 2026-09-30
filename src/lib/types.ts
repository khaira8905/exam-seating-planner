/** A student writing one paper in the session. */
export interface Student {
  roll: string
  name: string
  course: string
  /** Paper (subject) code, e.g. "CS301". Students with the same code must not sit together. */
  paper: string
  /** Optional human-readable paper title, e.g. "Data Structures". */
  paperName?: string
  /** Free text such as "Wheelchair" or "Scribe". Empty/undefined means none. */
  specialNeeds?: string
}

/**
 * An exam room laid out as a grid: `rows` rows (row A is at the front, next to
 * the board) with `cols` seats in every row. If `seatsPerBench` > 1, every row
 * is made of benches of that many seats placed side by side.
 */
export interface Room {
  id: string
  name: string
  rows: number
  cols: number
  seatsPerBench?: number
  /** Seat labels that cannot be used, e.g. ["A1", "C4"]. */
  blocked: string[]
  /** 0 = ground floor. Undefined = unknown. */
  floor?: number
}

export type Strictness = 'basic' | 'strict' | 'very-strict' | 'bench'

export type Slot = 'morning' | 'evening'

export interface Session {
  /** ISO date, e.g. "2026-11-24". */
  date: string
  slot: Slot
  /** Optional exam name shown on printouts, e.g. "End-Semester Examination". */
  title?: string
}

export type Method = 'optimised' | 'pattern'

/** One student placed in one seat. */
export interface SeatAssignment {
  roll: string
  roomId: string
  row: number
  col: number
}

export interface PlanStats {
  students: number
  roomsUsed: number
  usableSeats: number
  emptySeats: number
  clashes: number
  timeMs: number
  /** How many rooms were solved by HiGHS vs. the pattern method. */
  roomsByMethod: { optimised: number; pattern: number }
}

export interface Plan {
  version: 1
  id: string
  createdAt: string
  session: Session
  rule: Strictness
  method: Method
  rooms: Room[]
  students: Student[]
  seats: SeatAssignment[]
  /** Room ids that hold at least one student, in display order. */
  roomOrder: string[]
  stats: PlanStats
  warnings: string[]
  /** How many times this plan has been re-planned after changes (0/undefined = original). */
  revision?: number
  /** Human-readable list of changes applied by re-planning. */
  changes?: string[]
  /** Invigilator names typed on the Download step (for the duty list). */
  invigilators?: string[]
  /** Students per invigilator used for the duty list (default 40). */
  studentsPerInvigilator?: number
}
