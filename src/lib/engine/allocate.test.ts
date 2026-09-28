import { describe, expect, it } from 'vitest'
import { generateSample } from '../sample/generate'
import type { Room, Strictness, Student } from '../types'
import { allocate } from './allocate'
import { buildGrid } from './grid'
import { solve } from './solve'

const session = { date: '2026-11-24', slot: 'morning' as const }

function students(paper: string, n: number, special = 0): Student[] {
  return Array.from({ length: n }, (_, i) => ({
    roll: `${paper}-${String(i + 1).padStart(3, '0')}`,
    name: `S${i}`,
    course: '',
    paper,
    ...(i < special ? { specialNeeds: 'Wheelchair' } : {}),
  }))
}
const room = (name: string, rows = 6, cols = 8, floor?: number): Room => ({ id: name, name, rows, cols, blocked: [], ...(floor === undefined ? {} : { floor }) })

describe('allocate', () => {
  it('explains when there are not enough seats', () => {
    const res = allocate([buildGrid(room('R1'), 'basic')], students('CS301', 60))
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.problem.title).toBe('Not enough seats')
    expect(res.problem.reasons[0]).toBe('You have 60 students but only 48 usable seats in 1 room — 12 seats short, before any seating rule is applied.')
  })

  it('explains when one paper is too big for the rule and suggests relaxing it', () => {
    const grids = [room('A-204'), room('A-205')].map((r) => buildGrid(r, 'very-strict'))
    const res = allocate(grids, [...students('MA101', 30), ...students('PH101', 20)])
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.problem.title).toBe('MA101 is too big for these rooms')
    expect(res.problem.reasons[0]).toContain('MA101 has 30 students, but in Very strict mode no two MA101 students may sit side by side, front/back or diagonally')
    expect(res.problem.reasons[0]).toContain('at most 24 MA101 seats across all 2 rooms')
    expect(res.problem.suggestions.join(' ')).toContain('relax the rule to Strict')
  })

  it('uses as few rooms as possible and fills them evenly', () => {
    const rooms = Array.from({ length: 10 }, (_, i) => room(`R${i}`))
    const list = [...students('A', 60), ...students('B', 50), ...students('C', 40), ...students('D', 30)]
    const res = allocate(rooms.map((r) => buildGrid(r, 'strict')), list)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rooms).toHaveLength(4) // 180 students / 48 seats → 4 rooms
    const loads = res.rooms.map((r) => r.pieces.reduce((a, p) => a + p.count, 0))
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(2)
    for (const r of res.rooms) expect(new Set(r.pieces.map((p) => p.paper)).size).toBeGreaterThanOrEqual(2)
  })

  it('never puts one paper in two classes of the same room', () => {
    const { students: s, rooms } = generateSample({ students: 1200, rooms: 30 })
    for (const rule of ['basic', 'strict', 'very-strict', 'bench'] as Strictness[]) {
      const res = allocate(rooms.map((r) => buildGrid(r, rule)), s)
      if (!res.ok) continue
      for (const r of res.rooms) {
        const papers = r.pieces.map((p) => p.paper)
        expect(new Set(papers).size).toBe(papers.length)
      }
    }
  })

  it('seats special-needs students on the ground floor, in the front', async () => {
    const rooms = [room('UP-1', 6, 8, 2), room('UP-2', 6, 8, 2), room('G-1', 6, 8, 0)]
    const list = [...students('A', 50, 2), ...students('B', 50), ...students('C', 30)]
    const out = await solve({ students: list, rooms, rule: 'strict', method: 'pattern', session })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    for (const roll of ['A-001', 'A-002']) {
      const seat = out.plan.seats.find((x) => x.roll === roll)!
      expect(seat.roomId).toBe('G-1')
      expect(seat.row).toBeLessThanOrEqual(1)
    }
    expect(out.plan.warnings).toEqual([])
  })

  it('keeps each paper in roll-number order through the rooms', async () => {
    const rooms = [room('R1'), room('R2'), room('R3')]
    const list = [...students('A', 60), ...students('B', 60)]
    const out = await solve({ students: list, rooms, rule: 'strict', method: 'pattern', session })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const roomIndex = new Map(out.plan.roomOrder.map((id, i) => [id, i]))
    const seq = list.filter((s) => s.paper === 'A').map((s) => roomIndex.get(out.plan.seats.find((x) => x.roll === s.roll)!.roomId)!)
    expect(seq).toEqual([...seq].sort((a, b) => a - b))
  })
})
