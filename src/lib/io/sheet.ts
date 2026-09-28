import * as XLSX from 'xlsx'
import type { Room, Student } from '../types'
import { ROOM_COLUMNS, STUDENT_COLUMNS, normaliseHeader, type ColumnDef } from './columns'
import { parseRooms, parseStudents, type Grid, type ParseResult } from './parse'

/** Sheets whose name looks like documentation are skipped when reading. */
const SKIP_SHEETS = /instruction|readme|help|notes/i

/**
 * Reads the first data sheet of an .xlsx/.xls/.csv file into a grid of cells.
 * Everything happens in memory — nothing is uploaded anywhere.
 */
export function readGrid(data: ArrayBuffer, fileName: string, preferSheet?: RegExp): Grid {
  const isCsv = /\.(csv|txt)$/i.test(fileName)
  const wb = isCsv
    ? XLSX.read(new TextDecoder('utf-8').decode(data).replace(/^﻿/, ''), { type: 'string', raw: true })
    : XLSX.read(data, { type: 'array' })
  const names = wb.SheetNames
  const name =
    (preferSheet && names.find((n) => preferSheet.test(n))) ?? names.find((n) => !SKIP_SHEETS.test(n)) ?? names[0]
  if (!name) return []
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: '', raw: false, blankrows: true })
}

export function readStudentsFile(data: ArrayBuffer, fileName: string): ParseResult<Student> {
  return parseStudents(readGrid(data, fileName, /student/i))
}

export function readRoomsFile(data: ArrayBuffer, fileName: string): ParseResult<Room> {
  return parseRooms(readGrid(data, fileName, /room/i))
}

/** Which kind of file this looks like, judging by its headers — used to catch swapped uploads. */
export function guessKind(grid: Grid): 'students' | 'rooms' | 'unknown' {
  const headers = (grid.find((r) => r.some((c) => String(c ?? '').trim())) ?? []).map((h) =>
    normaliseHeader(String(h ?? '')),
  )
  const score = (defs: ColumnDef<string>[]) => defs.filter((d) => d.aliases.some((a) => headers.includes(a))).length
  const s = score(STUDENT_COLUMNS)
  const r = score(ROOM_COLUMNS)
  if (s === r) return 'unknown'
  return s > r ? 'students' : 'rooms'
}

function instructionsSheet(title: string, defs: ColumnDef<string>[], extra: string[]) {
  const rows: string[][] = [
    [title],
    [],
    ['Column', 'Required?', 'What to enter', 'Example'],
    ...defs.map((d) => [d.header, d.required ? 'Required' : 'Optional', d.description, d.example]),
    [],
    ...extra.map((e) => [e]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 18 }, { wch: 11 }, { wch: 90 }, { wch: 16 }]
  return ws
}

function dataSheet(defs: ColumnDef<string>[], examples: string[][]) {
  const ws = XLSX.utils.aoa_to_sheet([defs.map((d) => d.header), ...examples])
  ws['!cols'] = defs.map((d) => ({ wch: Math.max(12, d.header.length + 4) }))
  return ws
}

const PRIVACY =
  'Privacy: SeatWise reads this file inside your browser. It is never uploaded to any server.'

export function studentsTemplate(): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    dataSheet(STUDENT_COLUMNS, [
      ['CSE301', 'Priya Sharma', 'CSE Sem 3', 'CS301', 'Data Structures', ''],
      ['CSE302', 'Rahul Verma', 'CSE Sem 3', 'CS301', 'Data Structures', 'Wheelchair'],
      ['ECE101', 'Ananya Iyer', 'ECE Sem 1', 'PH101', 'Engineering Physics', ''],
      ['BBA501', 'Arjun Singh', 'BBA Sem 5', 'BB501', 'Financial Management', ''],
    ]),
    'Students',
  )
  XLSX.utils.book_append_sheet(
    wb,
    instructionsSheet('SeatWise — students file', STUDENT_COLUMNS, [
      'One row per student writing an exam in this session. Replace the example rows with your own.',
      'Students writing the same Paper Code will never be seated next to each other (how strictly is chosen in the app).',
      'You can also upload a CSV with the same column headers.',
      PRIVACY,
    ]),
    'Instructions',
  )
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer
}

export function roomsTemplate(): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    dataSheet(ROOM_COLUMNS, [
      ['A-G01', '6', '8', '', '', '', 'G'],
      ['A-101', '7', '8', '', '', 'D4, D5', '1'],
      ['B-204', '6', '6', '3', '2', 'A1', '2'],
      ['LT-1', '10', '12', '', '', '', '0'],
    ]),
    'Rooms',
  )
  XLSX.utils.book_append_sheet(
    wb,
    instructionsSheet('SeatWise — rooms file', ROOM_COLUMNS, [
      'One row per room available in this session.',
      'Layout: Rows × Seats Per Row. For bench rooms, give Benches Per Row and Seats Per Bench (Seats Per Row is then optional).',
      'Seat labels: row A is the front row (next to the board); seat 1 is the leftmost seat when facing the board.',
      PRIVACY,
    ]),
    'Instructions',
  )
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer
}

/** Exports the (generated) sample data as two Excel files so users can inspect them. */
export function studentsToWorkbook(students: Student[]): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  const rows = students.map((s) => [s.roll, s.name, s.course, s.paper, s.paperName ?? '', s.specialNeeds ?? ''])
  XLSX.utils.book_append_sheet(wb, dataSheet(STUDENT_COLUMNS, rows), 'Students')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer
}

export function roomsToWorkbook(rooms: Room[]): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  const rows = rooms.map((r) => [
    r.name,
    String(r.rows),
    String(r.cols),
    r.seatsPerBench ? String(r.cols / r.seatsPerBench) : '',
    r.seatsPerBench ? String(r.seatsPerBench) : '',
    r.blocked.join(', '),
    r.floor === undefined ? '' : r.floor === 0 ? 'G' : String(r.floor),
  ])
  XLSX.utils.book_append_sheet(wb, dataSheet(ROOM_COLUMNS, rows), 'Rooms')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer
}
