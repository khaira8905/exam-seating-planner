import { seatLabel } from '../seatLabel'
import type { Room, Student } from '../types'
import { COURSE_GROUPS, FIRST_NAMES, ROOM_SHAPES, SPECIAL_NEEDS, SURNAMES, type CourseGroup } from './catalog'
import { createRng, type Rng } from './random'

export interface SampleOptions {
  students: number
  /** Number of rooms. If omitted, enough rooms for ~125% of the students are generated. */
  rooms?: number
  seed?: number
  /** Share of students with special needs (default 1.5%). */
  specialNeedsRate?: number
}

export interface SampleData {
  students: Student[]
  rooms: Room[]
}

/** Preset sizes offered in the UI and used by the benchmark. */
export const SAMPLE_PRESETS = [
  { label: 'Small college', students: 300, rooms: 10 },
  { label: 'Typical session', students: 1200, rooms: 30 },
  { label: 'Large university', students: 5000, rooms: undefined },
] as const

export function generateSample(opts: SampleOptions): SampleData {
  const seed = opts.seed ?? 2026
  const rng = createRng(seed)
  const students = generateStudents(rng, opts.students, opts.specialNeedsRate ?? 0.015)
  const rooms = generateRooms(rng, opts.rooms, Math.ceil(opts.students * 1.25))
  return { students, rooms }
}

/** Picks how many course groups write in this session: small sessions have fewer. */
function chooseGroups(rng: Rng, total: number): CourseGroup[] {
  const wanted = Math.min(COURSE_GROUPS.length, Math.max(6, Math.round(total / 38)))
  const shuffled = rng.shuffle([...COURSE_GROUPS])
  return shuffled.slice(0, wanted)
}

function generateStudents(rng: Rng, total: number, specialRate: number): Student[] {
  const groups = chooseGroups(rng, total)
  // Split `total` proportionally to weight × jitter.
  const w = groups.map((g) => g.weight * (0.75 + rng.next() * 0.5))
  const wSum = w.reduce((a, b) => a + b, 0)
  const sizes = w.map((x) => Math.max(1, Math.floor((x / wSum) * total)))
  let diff = total - sizes.reduce((a, b) => a + b, 0)
  for (let i = 0; diff !== 0; i = (i + 1) % sizes.length) {
    if (diff > 0) {
      sizes[i]++
      diff--
    } else if (sizes[i] > 1) {
      sizes[i]--
      diff++
    }
  }
  const width = Math.max(...sizes) > 99 ? 3 : 2
  const students: Student[] = []
  groups.forEach((g, gi) => {
    for (let k = 1; k <= sizes[gi]; k++) {
      const roll = `${g.course}${g.semester}${String(k).padStart(width, '0')}`
      const student: Student = {
        roll,
        name: `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`,
        course: `${g.course} Sem ${g.semester}`,
        paper: g.paper,
        paperName: g.paperName,
      }
      if (rng.chance(specialRate)) student.specialNeeds = rng.pick(SPECIAL_NEEDS)
      students.push(student)
    }
  })
  return students
}

function pickShape(rng: Rng) {
  const total = ROOM_SHAPES.reduce((a, s) => a + s.weight, 0)
  let r = rng.next() * total
  for (const s of ROOM_SHAPES) {
    r -= s.weight
    if (r <= 0) return s
  }
  return ROOM_SHAPES[0]
}

function generateRooms(rng: Rng, count: number | undefined, seatsWanted: number): Room[] {
  const rooms: Room[] = []
  const blocks = ['A', 'B', 'C', 'D', 'E']
  const perFloor = new Map<string, number>()
  let seats = 0
  for (let i = 0; count !== undefined ? i < count : seats < seatsWanted; i++) {
    const shape = pickShape(rng)
    const block = blocks[Math.floor(i / 16) % blocks.length]
    const floor = Math.floor(i / 4) % 4
    const key = `${block}${floor}`
    const n = (perFloor.get(key) ?? 0) + 1
    perFloor.set(key, n)
    const name = `${block}-${floor === 0 ? 'G' : floor}${String(n).padStart(2, '0')}`
    const blocked: string[] = []
    // About a third of rooms have a pillar or broken seats.
    if (rng.chance(0.35)) {
      const k = rng.int(1, 3)
      while (blocked.length < k) {
        const label = seatLabel(rng.int(0, shape.rows - 1), rng.int(0, shape.cols - 1))
        if (!blocked.includes(label)) blocked.push(label)
      }
    }
    const room: Room = { id: name, name, rows: shape.rows, cols: shape.cols, blocked, floor }
    if (shape.seatsPerBench) room.seatsPerBench = shape.seatsPerBench
    rooms.push(room)
    seats += shape.rows * shape.cols - blocked.length
  }
  return rooms
}
