import { describe, expect, it } from 'vitest'
import { generateSample } from '../sample/generate'
import { parseBlockedList, parseRooms, parseStudents } from './parse'
import {
  guessKind,
  readGrid,
  readRoomsFile,
  readStudentsFile,
  roomsTemplate,
  roomsToWorkbook,
  studentsTemplate,
  studentsToWorkbook,
} from './sheet'

const enc = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer

describe('parseStudents', () => {
  it('reads a clean file and accepts loose header names', () => {
    const r = parseStudents([
      ['Roll No.', 'Student Name', 'Branch', 'Subject Code', 'PwD'],
      ['CSE301', 'Priya Sharma', 'CSE Sem 3', 'cs 301', 'No'],
      ['CSE302', 'Rahul Verma', 'CSE Sem 3', 'CS301', 'Wheelchair'],
      ['', '', '', '', ''],
      ['ECE101', 'Ananya Iyer', 'ECE Sem 1', 'PH101', 'yes'],
    ])
    expect(r.errors).toEqual([])
    expect(r.items).toHaveLength(3)
    expect(r.items[0]).toEqual({ roll: 'CSE301', name: 'Priya Sharma', course: 'CSE Sem 3', paper: 'CS301' })
    expect(r.items[1].specialNeeds).toBe('Wheelchair')
    expect(r.items[2].specialNeeds).toBe('Yes')
  })

  it('gives friendly row-numbered errors', () => {
    const r = parseStudents([
      ['Roll No', 'Name', 'Paper Code'],
      ['CSE301', 'A', 'CS301'],
      ['', 'B', 'CS301'],
      ['CSE301', 'C', 'CS301'],
      ['CSE305', 'D', ''],
    ])
    expect(r.errors.map((e) => e.message)).toEqual([
      'Row 3: roll number missing.',
      'Row 4: roll number CSE301 appears twice (also in row 2).',
      'Row 5: paper code missing for CSE305.',
    ])
  })

  it('explains a missing column', () => {
    const r = parseStudents([
      ['Roll', 'Name'],
      ['CSE301', 'A'],
    ])
    expect(r.errors[0].message).toContain('Couldn\'t find a "Paper Code" column')
  })

  it('warns (but continues) when a name is missing', () => {
    const r = parseStudents([
      ['Roll No', 'Name', 'Paper Code'],
      ['CSE301', '', 'CS301'],
    ])
    expect(r.errors).toEqual([])
    expect(r.items[0].name).toBe('CSE301')
    expect(r.warnings[0].message).toBe('Row 2: name missing for CSE301 — the roll number will be printed instead.')
  })
})

describe('parseRooms', () => {
  it('reads seats-per-row and bench layouts, floors and blocked seats', () => {
    const r = parseRooms([
      ['Room', 'Rows', 'Seats Per Row', 'Benches Per Row', 'Seats Per Bench', 'Blocked Seats', 'Floor'],
      ['A-G01', 6, 8, '', '', 'A1, c4', 'G'],
      ['B-204', 6, '', 3, 2, 'B1-B3', '2nd'],
    ])
    expect(r.errors).toEqual([])
    expect(r.items[0]).toEqual({ id: 'A-G01', name: 'A-G01', rows: 6, cols: 8, blocked: ['A1', 'C4'], floor: 0 })
    expect(r.items[1]).toEqual({
      id: 'B-204', name: 'B-204', rows: 6, cols: 6, seatsPerBench: 2, blocked: ['B1', 'B2', 'B3'], floor: 2,
    })
  })

  it('rejects seats outside the room and bad numbers', () => {
    const r = parseRooms([
      ['Room', 'Rows', 'Seats Per Row', 'Blocked Seats'],
      ['R1', 6, 8, 'H1'],
      ['R2', 'six', 8, ''],
      ['R3', 5, 7, 'Q'],
      ['R1', 5, 5, ''],
    ])
    expect(r.errors.map((e) => e.message)).toEqual([
      'Row 2 (room R1): blocked seat H1 is outside the room (6 rows × 8 seats).',
      'Row 3 (room R2): "Rows" must be a whole number from 1 to 40.',
      'Row 4 (room R3): couldn\'t read blocked seat "Q". Use labels like A1, C4 or B1-B3.',
    ])
    // R1 row 2 failed validation, so the later R1 is not a duplicate.
    expect(r.items.map((x) => x.name)).toEqual(['R1'])
  })

  it('rejects seat counts that do not split into benches', () => {
    const r = parseRooms([
      ['Room', 'Rows', 'Seats Per Row', 'Seats Per Bench'],
      ['R1', 6, 7, 2],
    ])
    expect(r.errors[0].message).toBe("Row 2 (room R1): 7 seats per row can't be split into benches of 2.")
  })
})

describe('parseBlockedList', () => {
  it('handles separators and ranges', () => {
    expect(parseBlockedList('A1;B2 C3\nD 4, E1 - E2').labels).toEqual(['A1', 'B2', 'C3', 'D4', 'E1', 'E2'])
  })
})

describe('spreadsheet round trip (SheetJS)', () => {
  it('reads the templates back without errors', () => {
    const s = readStudentsFile(studentsTemplate(), 'students-template.xlsx')
    expect(s.errors).toEqual([])
    expect(s.items).toHaveLength(4)
    const r = readRoomsFile(roomsTemplate(), 'rooms-template.xlsx')
    expect(r.errors).toEqual([])
    expect(r.items.find((x) => x.name === 'B-204')).toMatchObject({ cols: 6, seatsPerBench: 2, blocked: ['A1'] })
  })

  it('round-trips generated sample data through Excel', () => {
    const sample = generateSample({ students: 300, rooms: 10 })
    const s = readStudentsFile(studentsToWorkbook(sample.students), 'students.xlsx')
    expect(s.errors).toEqual([])
    expect(s.items).toEqual(sample.students)
    const r = readRoomsFile(roomsToWorkbook(sample.rooms), 'rooms.xlsx')
    expect(r.errors).toEqual([])
    expect(r.items).toEqual(sample.rooms)
  })

  it('reads CSV (with BOM) and keeps leading zeros in roll numbers', () => {
    const csv = '﻿Roll No,Name,Paper Code\n00123,Priya,CS301\n00124,Rahul,CS301\n'
    const s = readStudentsFile(enc(csv), 'students.csv')
    expect(s.errors).toEqual([])
    expect(s.items.map((x) => x.roll)).toEqual(['00123', '00124'])
  })

  it('guesses which file is which', () => {
    expect(guessKind(readGrid(studentsTemplate(), 'a.xlsx'))).toBe('students')
    expect(guessKind(readGrid(roomsTemplate(), 'b.xlsx'))).toBe('rooms')
  })
})
