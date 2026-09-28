import { beforeAll, describe, expect, it } from 'vitest'
import type { Room, Strictness } from '../types'
import { explainRoom } from './explain'
import { buildGrid, paperCapacity } from './grid'
import { buildModel, solveRoom, type HighsLike } from './milp'
import { countConflicts } from './pattern'
import { loadHighs } from './testHighs'

let highs: HighsLike
beforeAll(async () => {
  highs = await loadHighs()
})

const room: Room = { id: 'A-204', name: 'A-204', rows: 6, cols: 8, blocked: ['C4', 'F8'] }

describe('optimisation model (HiGHS)', () => {
  it('writes a valid LP model with the expected constraint families', () => {
    const lp = buildModel(buildGrid(room, 'strict'), [
      { paper: 'A', count: 10, special: 1 },
      { paper: 'B', count: 10, special: 0 },
    ])
    expect(lp).toMatch(/^Minimize/)
    expect(lp).toContain(' seat0: x0_0 + x1_0 <= 1')
    expect(lp).toMatch(/ count0: .* = 10/)
    expect(lp).toMatch(/ nb0_0: x0_0 \+ x0_1 <= 1/)
    expect(lp).toContain('u0 >= 1')
    expect(lp).not.toContain('x0_19') // C4 is blocked → no variable
    expect(lp.trim().endsWith('End')).toBe(true)
  })

  for (const rule of ['basic', 'strict', 'very-strict', 'bench'] as Strictness[]) {
    it(`finds a clash-free layout in ${rule} mode`, () => {
      const r = rule === 'bench' ? { ...room, seatsPerBench: 2 } : room
      const g = buildGrid(r, rule)
      const cap = paperCapacity(g)
      const demands =
        rule === 'very-strict'
          ? [{ paper: 'A', count: 10, special: 0 }, { paper: 'B', count: 10, special: 0 }, { paper: 'C', count: 9, special: 0 }, { paper: 'D', count: 8, special: 0 }]
          : [{ paper: 'A', count: cap - 2, special: 0 }, { paper: 'B', count: 12, special: 0 }, { paper: 'C', count: 6, special: 0 }]
      const res = solveRoom(highs, g, demands)
      expect(res.status).toBe('optimal')
      if (res.status !== 'optimal') return
      expect(countConflicts(g, res.seatPapers)).toBe(0)
      demands.forEach((d, i) => expect(g.seats.filter((s) => res.seatPapers[s] === i)).toHaveLength(d.count))
    })
  }

  it('puts special-needs papers in the front rows', () => {
    const g = buildGrid(room, 'strict')
    const res = solveRoom(highs, g, [
      { paper: 'A', count: 12, special: 0 },
      { paper: 'B', count: 12, special: 3 },
    ])
    expect(res.status).toBe('optimal')
    if (res.status !== 'optimal') return
    const frontB = g.seats.filter((s) => res.seatPapers[s] === 1 && Math.floor(s / g.cols) < 2)
    expect(frontB.length).toBeGreaterThanOrEqual(3)
  })

  it('spreads empty seats across rows', () => {
    const g = buildGrid({ id: 'R', name: 'R', rows: 6, cols: 8, blocked: [] }, 'strict')
    const res = solveRoom(highs, g, [
      { paper: 'A', count: 12, special: 0 },
      { paper: 'B', count: 12, special: 0 },
    ])
    expect(res.status).toBe('optimal')
    if (res.status !== 'optimal') return
    const perRow = Array.from({ length: 6 }, (_, r) => g.seats.filter((s) => Math.floor(s / 8) === r && res.seatPapers[s] >= 0).length)
    expect(Math.max(...perRow) - Math.min(...perRow)).toBeLessThanOrEqual(1)
  })

  it('proves infeasibility and explains it in plain words', () => {
    const g = buildGrid({ id: '204', name: '204', rows: 4, cols: 8, blocked: [] }, 'strict')
    const demands = [{ paper: 'MATHS', count: 17, special: 0 }, { paper: 'PHY', count: 10, special: 0 }]
    expect(solveRoom(highs, g, demands).status).toBe('infeasible')
    expect(explainRoom(g, demands)).toEqual([
      'MATHS needs 17 separated seats but Room 204 allows only 16 in strict mode — add a room or relax to Basic (left / right).',
    ])
  })

  it('keeps students in place when re-planning (warm start + move penalty)', () => {
    const g = buildGrid(room, 'strict')
    const before = solveRoom(highs, g, [
      { paper: 'A', count: 15, special: 0 },
      { paper: 'B', count: 15, special: 0 },
    ])
    if (before.status !== 'optimal') throw new Error('setup failed')
    const after = solveRoom(
      highs,
      g,
      [
        { paper: 'A', count: 15, special: 0 },
        { paper: 'B', count: 16, special: 0 },
      ],
      { current: before.seatPapers },
    )
    expect(after.status === 'optimal' || after.status === 'feasible').toBe(true)
    if (after.status !== 'optimal' && after.status !== 'feasible') return
    const changed = g.seats.filter((s) => before.seatPapers[s] >= 0 && before.seatPapers[s] !== after.seatPapers[s])
    expect(changed.length).toBe(0)
    expect(countConflicts(g, after.seatPapers)).toBe(0)
  })
})
