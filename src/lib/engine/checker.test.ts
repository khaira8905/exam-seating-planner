import { describe, expect, it } from 'vitest'
import type { Room, SeatAssignment, Student } from '../types'
import { checkPlan } from './checker'

const room: Room = { id: 'R1', name: 'R1', rows: 3, cols: 4, blocked: ['C4'] }
const bench: Room = { id: 'B1', name: 'B1', rows: 2, cols: 4, seatsPerBench: 2, blocked: [] }

/** Builds students + seats from a picture: each cell is a paper letter or "." for empty. */
function layout(r: Room, picture: string[]) {
  const students: Student[] = []
  const seats: SeatAssignment[] = []
  picture.forEach((line, row) =>
    [...line].forEach((ch, col) => {
      if (ch === '.') return
      const roll = `${r.id}-${row}-${col}`
      students.push({ roll, name: roll, course: '', paper: ch })
      seats.push({ roll, roomId: r.id, row, col })
    }),
  )
  return { students, seats }
}

describe('checkPlan', () => {
  it('accepts a checkerboard in strict mode', () => {
    const p = layout(room, ['ABAB', 'BABA', 'ABA.'])
    const res = checkPlan({ rooms: [room], ...p, rule: 'strict' })
    expect(res).toMatchObject({ ok: true, clashes: [], problems: [] })
  })

  it('finds side-by-side clashes in basic mode', () => {
    const p = layout(room, ['AAB.', '....', '....'])
    const res = checkPlan({ rooms: [room], ...p, rule: 'basic' })
    expect(res.clashes).toHaveLength(1)
    expect(res.clashes[0]).toMatchObject({ kind: 'side', paper: 'A', a: { seat: 'A1' }, b: { seat: 'A2' } })
  })

  it('front/back only matters from strict upwards', () => {
    const p = layout(room, ['A...', 'A...', '....'])
    expect(checkPlan({ rooms: [room], ...p, rule: 'basic' }).clashes).toHaveLength(0)
    expect(checkPlan({ rooms: [room], ...p, rule: 'strict' }).clashes[0].kind).toBe('front-back')
  })

  it('diagonals only matter in very strict mode', () => {
    const p = layout(room, ['A...', '.A..', '....'])
    expect(checkPlan({ rooms: [room], ...p, rule: 'strict' }).ok).toBe(true)
    expect(checkPlan({ rooms: [room], ...p, rule: 'very-strict' }).clashes[0].kind).toBe('diagonal')
  })

  it('bench mode: only bench-mates clash, neighbouring benches are fine', () => {
    const ok = layout(bench, ['ABBA', 'ABBA'])
    expect(checkPlan({ rooms: [bench], ...ok, rule: 'bench' }).ok).toBe(true)
    const bad = layout(bench, ['AABB', '....'])
    expect(checkPlan({ rooms: [bench], ...bad, rule: 'bench' }).clashes).toHaveLength(2)
  })

  it('bench mode falls back to basic in rooms without benches', () => {
    const p = layout(room, ['AA..', '....', '....'])
    expect(checkPlan({ rooms: [room], ...p, rule: 'bench' }).clashes[0].kind).toBe('side')
  })

  it('reports bookkeeping problems', () => {
    const students: Student[] = [
      { roll: 'X1', name: 'x', course: '', paper: 'A' },
      { roll: 'X2', name: 'x', course: '', paper: 'B' },
      { roll: 'X3', name: 'x', course: '', paper: 'C' },
    ]
    const seats: SeatAssignment[] = [
      { roll: 'X1', roomId: 'R1', row: 2, col: 3 }, // blocked C4
      { roll: 'X2', roomId: 'R1', row: 0, col: 0 },
      { roll: 'X2', roomId: 'R1', row: 0, col: 0 },
    ]
    const res = checkPlan({ rooms: [room], students, seats, rule: 'basic' })
    expect(res.ok).toBe(false)
    expect(res.problems).toEqual(
      expect.arrayContaining([
        'X1 is placed on blocked seat C4 in room R1.',
        'X2 has 2 seats.',
        'X3 has no seat.',
        'Seat A1 in room R1 is given to both X2 and X2.',
      ]),
    )
  })

  it('different rooms never clash with each other', () => {
    const r2: Room = { ...room, id: 'R2', name: 'R2' }
    const a = layout(room, ['A...', '....', '....'])
    const b = layout(r2, ['A...', '....', '....'])
    const res = checkPlan({ rooms: [room, r2], students: [...a.students, ...b.students], seats: [...a.seats, ...b.seats], rule: 'very-strict' })
    expect(res.ok).toBe(true)
  })
})
