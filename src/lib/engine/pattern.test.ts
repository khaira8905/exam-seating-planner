import { describe, expect, it } from 'vitest'
import { generateSample } from '../sample/generate'
import type { Room, Strictness } from '../types'
import { checkPlan } from './checker'
import { buildGrid, paperCapacity } from './grid'
import { countConflicts, patternFill } from './pattern'
import { solve } from './solve'

const session = { date: '2026-11-24', slot: 'morning' as const }

describe('room grid', () => {
  const room: Room = { id: 'R', name: 'R', rows: 6, cols: 8, blocked: [] }
  it('computes per-paper capacity for each rule', () => {
    expect(paperCapacity(buildGrid(room, 'basic'))).toBe(24)
    expect(paperCapacity(buildGrid(room, 'strict'))).toBe(24)
    expect(paperCapacity(buildGrid(room, 'very-strict'))).toBe(12)
    expect(paperCapacity(buildGrid({ ...room, seatsPerBench: 2 }, 'bench'))).toBe(24)
    expect(paperCapacity(buildGrid({ ...room, seatsPerBench: 4 }, 'bench'))).toBe(12)
  })
  it('blocked seats reduce capacity', () => {
    const g = buildGrid({ ...room, blocked: ['A1', 'A2'] }, 'basic')
    expect(g.seats).toHaveLength(46)
    expect(paperCapacity(g)).toBe(23)
  })
})

describe('pattern filling', () => {
  const room: Room = { id: 'R', name: 'R', rows: 6, cols: 8, blocked: ['C4'] }
  const rules: Strictness[] = ['basic', 'strict', 'very-strict', 'bench']
  for (const rule of rules) {
    it(`fills a room clash-free in ${rule} mode`, () => {
      const r = rule === 'bench' ? { ...room, seatsPerBench: 2 } : room
      const g = buildGrid(r, rule)
      const cap = paperCapacity(g)
      const demands = rule === 'very-strict'
        ? [{ paper: 'A', count: 11, special: 1 }, { paper: 'B', count: 11, special: 0 }, { paper: 'C', count: 10, special: 0 }, { paper: 'D', count: 9, special: 0 }]
        : [{ paper: 'A', count: cap - 1, special: 1 }, { paper: 'B', count: 15, special: 0 }, { paper: 'C', count: 5, special: 0 }]
      const sp = patternFill(g, demands)
      expect(sp).not.toBeNull()
      expect(countConflicts(g, sp!)).toBe(0)
      demands.forEach((d, i) => expect(g.seats.filter((s) => sp![s] === i)).toHaveLength(d.count))
    })
  }
})

describe('pipeline with pattern method', () => {
  for (const rule of ['basic', 'strict', 'very-strict', 'bench'] as Strictness[]) {
    it(`seats 1,200 sample students with 0 clashes (${rule})`, async () => {
      const { students, rooms } = generateSample({ students: 1200, rooms: rule === 'very-strict' ? 45 : 30 })
      const out = await solve({ students, rooms, rule, method: 'pattern', session })
      expect(out.ok).toBe(true)
      if (!out.ok) return
      const check = checkPlan({ rooms, students, seats: out.plan.seats, rule })
      expect(check.problems).toEqual([])
      expect(check.clashes).toEqual([])
    })
  }
})
