/**
 * Property tests: many random sessions (room shapes, blocked seats, benches,
 * floors, paper mixes, rules). Whenever the pipeline returns a plan, the
 * independent checker must find 0 clashes and 0 bookkeeping problems.
 */
import fc from 'fast-check'
import { beforeAll, describe, expect, it } from 'vitest'
import { seatLabel } from '../seatLabel'
import type { Method, Room, Strictness, Student } from '../types'
import { checkPlan } from './checker'
import type { HighsLike } from './milp'
import { solve } from './solve'
import { loadHighs } from './testHighs'

let highs: HighsLike
beforeAll(async () => {
  highs = await loadHighs()
})

const roomArb = fc
  .record({
    rows: fc.integer({ min: 1, max: 9 }),
    cols: fc.integer({ min: 1, max: 10 }),
    bench: fc.constantFrom(1, 2, 3),
    floor: fc.option(fc.integer({ min: 0, max: 3 }), { nil: undefined }),
    blockedSeed: fc.array(fc.tuple(fc.nat(), fc.nat()), { maxLength: 4 }),
  })
  .map(({ rows, cols, bench, floor, blockedSeed }) => {
    const c = bench > 1 ? Math.max(bench, cols - (cols % bench)) : cols
    const blocked = [...new Set(blockedSeed.map(([r, k]) => seatLabel(r % rows, k % c)))]
    return { rows, cols: c, bench, floor, blocked }
  })

const sessionArb = fc.record({
  rooms: fc.array(roomArb, { minLength: 1, maxLength: 14 }),
  papers: fc.array(fc.record({ size: fc.integer({ min: 1, max: 40 }), special: fc.integer({ min: 0, max: 2 }) }), {
    minLength: 1,
    maxLength: 8,
  }),
  rule: fc.constantFrom<Strictness>('basic', 'strict', 'very-strict', 'bench'),
})

type RandomSession = typeof sessionArb extends fc.Arbitrary<infer T> ? T : never

function build(s: RandomSession) {
  const rooms: Room[] = s.rooms.map((r, i) => ({
    id: `R${i}`,
    name: `R${i}`,
    rows: r.rows,
    cols: r.cols,
    blocked: r.blocked,
    ...(r.bench > 1 ? { seatsPerBench: r.bench } : {}),
    ...(r.floor === undefined ? {} : { floor: r.floor }),
  }))
  const students: Student[] = s.papers.flatMap((p, pi) =>
    Array.from({ length: p.size }, (_, k) => ({
      roll: `P${pi}-${k}`,
      name: `S${k}`,
      course: '',
      paper: `P${pi}`,
      ...(k < p.special ? { specialNeeds: 'Wheelchair' } : {}),
    })),
  )
  return { rooms, students }
}

async function property(method: Method, runs: number) {
  let solved = 0
  await fc.assert(
    fc.asyncProperty(sessionArb, async (s) => {
      const { rooms, students } = build(s)
      const out = await solve(
        { students, rooms, rule: s.rule, method, session: { date: '2026-11-24', slot: 'morning' } },
        { highs, roomTimeLimit: 1 },
      )
      if (!out.ok) {
        // Infeasible sessions must come with an explanation.
        expect(out.problem.reasons.length).toBeGreaterThan(0)
        return
      }
      solved++
      const check = checkPlan({ rooms, students, seats: out.plan.seats, rule: s.rule })
      expect(check.problems).toEqual([])
      expect(check.clashes).toEqual([])
    }),
    { numRuns: runs, seed: 20261124 },
  )
  if (process.env.VERBOSE) console.log(`${method}: ${solved}/${runs} random sessions produced a plan`)
  return solved
}

describe('property: every returned plan has 0 clashes', () => {
  it('pattern method, 1,000 random sessions', async () => {
    const solved = await property('pattern', 1000)
    expect(solved).toBeGreaterThan(400) // make sure the generator isn't only producing impossible sessions
  })

  it('optimised method (HiGHS), 200 random sessions', async () => {
    const solved = await property('optimised', 200)
    expect(solved).toBeGreaterThan(80)
  })
})
