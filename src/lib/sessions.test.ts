import { describe, expect, it } from 'vitest'
import { parseSlot, parseStudents } from './io/parse'
import { splitBySession, studentsInBothSessions } from './sessions'

describe('Session column', () => {
  it('understands common ways of writing the session', () => {
    for (const t of ['Morning', 'FN', 'forenoon', 'AM', '1st', 'S1']) expect(parseSlot(t)).toBe('morning')
    for (const t of ['Evening', 'AN', 'Afternoon', 'p.m.', '2', 'Second']) expect(parseSlot(t)).toBe('evening')
    expect(parseSlot('')).toBeUndefined()
    expect(parseSlot('night')).toBeNull()
  })

  it('lets a student appear once per session, but not twice in one session', () => {
    const r = parseStudents([
      ['Roll No', 'Name', 'Paper Code', 'Session'],
      ['CSE301', 'Priya', 'CS301', 'Morning'],
      ['CSE301', 'Priya', 'MA301', 'Evening'],
      ['CSE301', 'Priya', 'PH301', 'FN'],
      ['CSE302', 'Rahul', 'CS301', 'Night'],
    ])
    expect(r.errors.map((e) => e.message)).toEqual([
      'Row 4: roll number CSE301 appears twice in the morning session (also in row 2).',
      'Row 5: session "Night" not understood — use Morning or Evening.',
    ])
    expect(r.items.map((s) => `${s.roll}/${s.paper}/${s.slot}`)).toEqual(['CSE301/CS301/morning', 'CSE301/MA301/evening'])
  })

  it('puts students without a session in the morning (with a warning)', () => {
    const r = parseStudents([
      ['Roll No', 'Name', 'Paper Code', 'Session'],
      ['A1', 'x', 'P1', 'Evening'],
      ['A2', 'y', 'P1', ''],
    ])
    expect(r.errors).toEqual([])
    expect(r.items.map((s) => s.slot)).toEqual(['evening', 'morning'])
    expect(r.warnings[0].message).toBe('1 student has no session filled in — they will be planned in the morning session.')
  })

  it('files without a Session column stay single-session', () => {
    const r = parseStudents([
      ['Roll No', 'Name', 'Paper Code'],
      ['A1', 'x', 'P1'],
    ])
    expect(r.items[0].slot).toBeUndefined()
    expect(splitBySession(r.items)).toBeNull()
  })

  it('splits by session and finds students writing in both', () => {
    const students = parseStudents([
      ['Roll No', 'Name', 'Paper Code', 'Session'],
      ['CSE302', 'Rahul', 'CS301', 'Morning'],
      ['CSE301', 'Priya', 'CS301', 'Morning'],
      ['ECE301', 'Ananya', 'EC301', 'Evening'],
      ['CSE301', 'Priya', 'MA301', 'Evening'],
    ]).items
    const split = splitBySession(students)!
    expect(split.get('morning')).toHaveLength(2)
    expect(split.get('evening')).toHaveLength(2)
    expect(studentsInBothSessions(split.get('morning')!, split.get('evening')!)).toEqual([
      { roll: 'CSE301', name: 'Priya', morningPaper: 'CS301', eveningPaper: 'MA301' },
    ])
  })
})
