import { describe, expect, it } from 'vitest'
import { generateSample } from './generate'

describe('sample data generator', () => {
  it('creates the requested number of students with unique roll numbers', () => {
    const { students } = generateSample({ students: 1200, rooms: 30 })
    expect(students).toHaveLength(1200)
    expect(new Set(students.map((s) => s.roll)).size).toBe(1200)
  })

  it('is deterministic for a given seed', () => {
    const a = generateSample({ students: 300, seed: 7 })
    const b = generateSample({ students: 300, seed: 7 })
    expect(a).toEqual(b)
  })

  it('produces roll numbers like CSE301 and several papers', () => {
    const { students } = generateSample({ students: 1200, rooms: 30 })
    for (const s of students) expect(s.roll).toMatch(/^[A-Z]+\d{3,4}$/)
    expect(new Set(students.map((s) => s.paper)).size).toBeGreaterThanOrEqual(8)
  })

  it('generates enough rooms when no count is given', () => {
    const { rooms } = generateSample({ students: 5000 })
    const seats = rooms.reduce((a, r) => a + r.rows * r.cols - r.blocked.length, 0)
    expect(seats).toBeGreaterThanOrEqual(5000 * 1.25)
    expect(new Set(rooms.map((r) => r.id)).size).toBe(rooms.length)
  })

  it('includes bench rooms and blocked seats', () => {
    const { rooms } = generateSample({ students: 1200, rooms: 30 })
    expect(rooms.some((r) => (r.seatsPerBench ?? 1) > 1)).toBe(true)
    expect(rooms.some((r) => r.blocked.length > 0)).toBe(true)
  })

  it('marks a small share of students with special needs', () => {
    const { students } = generateSample({ students: 5000 })
    const n = students.filter((s) => s.specialNeeds).length
    expect(n).toBeGreaterThan(20)
    expect(n).toBeLessThan(200)
  })
})
