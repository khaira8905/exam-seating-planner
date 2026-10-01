import { describe, expect, it } from 'vitest'
import { checkPlan } from '../engine/checker'
import { solve } from '../engine/solve'
import { splitBySession, studentsInBothSessions } from '../sessions'
import { ENGINEERING_BRANCHES, generateEngineeringSample, generateTwoSessionSample } from './engineering'

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

describe('two-session sample', () => {
  it('has a morning and an evening session with 30 students in both', () => {
    const { students } = generateTwoSessionSample()
    const split = splitBySession(students)!
    expect(split.get('morning')).toHaveLength(1200)
    expect(split.get('evening')).toHaveLength(930)
    expect(studentsInBothSessions(split.get('morning')!, split.get('evening')!)).toHaveLength(30)
  })

  it('each session seats clash-free in the same 30 rooms', async () => {
    const { students, rooms } = generateTwoSessionSample()
    for (const [slot, group] of splitBySession(students)!) {
      const out = await solve({ students: group, rooms, rule: 'strict', method: 'pattern', session: { date: '2026-11-24', slot } })
      expect(out.ok).toBe(true)
      if (out.ok) expect(checkPlan(out.plan).ok).toBe(true)
    }
  })
})
