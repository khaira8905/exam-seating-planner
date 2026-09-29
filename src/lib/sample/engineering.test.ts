import { describe, expect, it } from 'vitest'
import { checkPlan } from '../engine/checker'
import { solve } from '../engine/solve'
import { ENGINEERING_BRANCHES, generateEngineeringSample } from './engineering'

describe('engineering sample', () => {
  it('has 1,200 students writing exactly 4 subjects, and 30 rooms', () => {
    const { students, rooms } = generateEngineeringSample()
    expect(students).toHaveLength(1200)
    expect(new Set(students.map((s) => s.roll)).size).toBe(1200)
    expect([...new Set(students.map((s) => s.paper))].sort()).toEqual(ENGINEERING_BRANCHES.map((b) => b.paper).sort())
    expect(rooms).toHaveLength(30)
  })

  it('seats clash-free under every rule (pattern method)', async () => {
    const { students, rooms } = generateEngineeringSample()
    for (const rule of ['basic', 'strict', 'very-strict', 'bench'] as const) {
      const out = await solve({ students, rooms, rule, method: 'pattern', session: { date: '2026-11-24', slot: 'morning' } })
      expect(out.ok).toBe(true)
      if (out.ok) expect(checkPlan(out.plan).ok).toBe(true)
    }
  })
})
