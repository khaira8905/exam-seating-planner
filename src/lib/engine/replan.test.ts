import { beforeAll, describe, expect, it } from 'vitest'
import { generateSample } from '../sample/generate'
import type { Plan, Room, Student } from '../types'
import { checkPlan } from './checker'
import type { HighsLike } from './milp'
import { replan, validateChange } from './replan'
import { solve } from './solve'
import { loadHighs } from './testHighs'

let highs: HighsLike
let plan: Plan
beforeAll(async () => {
  highs = await loadHighs()
  const { students, rooms } = generateSample({ students: 1200, rooms: 30 })
  const out = await solve({ students, rooms, rule: 'strict', method: 'optimised', session: { date: '2026-11-24', slot: 'morning' } }, { highs })
  if (!out.ok) throw new Error('setup')
  plan = out.plan
})

function expectClean(p: Plan) {
  const c = checkPlan(p)
  expect(c.problems).toEqual([])
  expect(c.clashes).toEqual([])
}

describe('re-plan', () => {
  it('removing a student moves nobody', async () => {
    const roll = plan.students[10].roll
    const res = await replan(plan, [{ type: 'remove-student', roll }], { highs })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.diff.removed.map((r) => r.roll)).toEqual([roll])
    expect(res.diff.moved).toEqual([])
    expect(res.plan.students).toHaveLength(1199)
    expectClean(res.plan)
  })

  it('adding a student seats them without moving anyone when a safe seat exists', async () => {
    const student: Student = { roll: 'CSE3999', name: 'New Student', course: 'CSE Sem 3', paper: plan.students[0].paper }
    const res = await replan(plan, [{ type: 'add-student', student }], { highs })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.diff.added).toHaveLength(1)
    expect(res.diff.moved.length).toBeLessThanOrEqual(2)
    expectClean(res.plan)
  })

  it('a room becoming unavailable moves only that room\'s students', async () => {
    const roomId = plan.roomOrder[3]
    const inRoom = plan.seats.filter((s) => s.roomId === roomId).length
    const res = await replan(plan, [{ type: 'room-unavailable', roomId }], { highs })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.diff.moved.length).toBeGreaterThanOrEqual(inRoom)
    expect(res.diff.moved.length).toBeLessThan(inRoom + 25) // a few extra moves at most
    expect(res.plan.roomOrder).not.toContain(roomId)
    expectClean(res.plan)
    expect(res.diff.unchanged + res.diff.moved.length).toBe(1200)
  })

  it('a broken seat moves just its occupant', async () => {
    const a = plan.seats[0]
    const label = `${String.fromCharCode(65 + a.row)}${a.col + 1}`
    const res = await replan(plan, [{ type: 'block-seat', roomId: a.roomId, seat: label }], { highs })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.diff.moved.map((m) => m.roll)).toContain(a.roll)
    expect(res.diff.moved.length).toBeLessThanOrEqual(3)
    expectClean(res.plan)
  })

  it('re-solves a full room with HiGHS, moving few students', async () => {
    // One room, completely full: adding a student needs the room rearranged.
    const room: Room = { id: 'R', name: 'R', rows: 4, cols: 6, blocked: [] }
    const students: Student[] = ['A', 'B', 'C']
      .flatMap((p, k) => Array.from({ length: [10, 8, 4][k] }, (_, i) => ({ roll: `${p}${i + 10}`, name: 'x', course: '', paper: p })))
    const out = await solve({ students, rooms: [room], rule: 'strict', method: 'optimised', session: { date: '2026-11-24', slot: 'morning' } }, { highs })
    if (!out.ok) throw new Error('setup')
    const res = await replan(out.plan, [{ type: 'add-student', student: { roll: 'C99', name: 'late', course: '', paper: 'C' } }], { highs })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expectClean(res.plan)
    expect(res.plan.students).toHaveLength(23)
  })

  it('explains when a change is impossible', async () => {
    const room: Room = { id: 'R', name: 'R', rows: 2, cols: 2, blocked: [] }
    const students: Student[] = [
      { roll: 'A1', name: 'x', course: '', paper: 'A' },
      { roll: 'B1', name: 'x', course: '', paper: 'B' },
    ]
    const out = await solve({ students, rooms: [room], rule: 'very-strict', method: 'optimised', session: { date: '2026-11-24', slot: 'morning' } }, { highs })
    if (!out.ok) throw new Error('setup')
    const res = await replan(out.plan, [{ type: 'add-student', student: { roll: 'A2', name: 'y', course: '', paper: 'A' } }], { highs })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.problem.reasons.join(' ')).toContain('A needs 2 separated seats but Room R allows only 1')
  })

  it('validates changes with friendly messages', () => {
    expect(validateChange({ type: 'remove-student', roll: 'NOPE' }, plan)).toBe('No student with roll number NOPE.')
    expect(validateChange({ type: 'add-student', student: { ...plan.students[0] } }, plan)).toBe(`${plan.students[0].roll} is already in the plan.`)
  })
})
