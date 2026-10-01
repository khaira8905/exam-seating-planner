import { parseSeatLabel, seatLabel } from '../seatLabel'
import type { Room, Slot, Student } from '../types'
import { normaliseHeader, ROOM_COLUMNS, STUDENT_COLUMNS, type ColumnDef } from './columns'

/** A problem found in an uploaded file. `row` is the spreadsheet row number (header = row 1). */
export interface Issue {
  row?: number
  message: string
}

export interface ParseResult<T> {
  items: T[]
  errors: Issue[]
  warnings: Issue[]
}

/** A sheet as a grid of cell values, first row = headers. */
export type Grid = unknown[][]

const MAX_ROWS_PER_ROOM = 40
const MAX_SEATS_PER_ROW = 40
const MAX_ERRORS = 200

function cellText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v)
  return String(v).trim()
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((c) => cellText(c) === '')
}

/** Finds the header row (the first non-blank row) and maps each known column to its index. */
function mapColumns<K extends string>(grid: Grid, defs: ColumnDef<K>[], what: string) {
  const headerIndex = grid.findIndex((r) => !isBlankRow(r))
  const errors: Issue[] = []
  const index = new Map<K, number>()
  if (headerIndex < 0) {
    errors.push({ message: `The ${what} file is empty.` })
    return { headerIndex, index, errors }
  }
  const headers = grid[headerIndex].map((h) => normaliseHeader(cellText(h)))
  for (const def of defs) {
    const i = headers.findIndex((h) => h !== '' && def.aliases.includes(h))
    if (i >= 0) index.set(def.key, i)
  }
  for (const def of defs) {
    if (def.required && !index.has(def.key)) {
      const found = grid[headerIndex].map(cellText).filter(Boolean)
      errors.push({
        row: headerIndex + 1,
        message: `Couldn't find a "${def.header}" column in the ${what} file. Columns found: ${found.map((f) => `"${f}"`).join(', ') || 'none'}. Download the template to see the expected layout.`,
      })
    }
  }
  return { headerIndex, index, errors }
}

const NO_NEEDS = new Set(['', 'no', 'none', 'nil', 'na', 'n/a', '-', '--', '0', 'false', 'nill', 'n'])

/** "Morning", "FN", "AM", "1st" → morning; "Evening", "Afternoon", "AN", "PM", "2nd" → evening. */
export function parseSlot(text: string): Slot | undefined | null {
  const t = text.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!t) return undefined
  if (['morning', 'm', 'fn', 'forenoon', 'am', 'mor', '1', '1st', 'first', 'session1', 's1'].includes(t)) return 'morning'
  if (['evening', 'e', 'an', 'afternoon', 'pm', 'eve', '2', '2nd', 'second', 'session2', 's2'].includes(t)) return 'evening'
  return null
}

export function parseStudents(grid: Grid): ParseResult<Student> {
  const { headerIndex, index, errors } = mapColumns(grid, STUDENT_COLUMNS, 'students')
  const warnings: Issue[] = []
  const items: Student[] = []
  if (errors.length) return { items, errors, warnings }

  const get = (row: unknown[], key: (typeof STUDENT_COLUMNS)[number]['key']) => {
    const i = index.get(key)
    return i === undefined ? '' : cellText(row[i])
  }
  const firstRowOfRoll = new Map<string, number>()
  for (let r = headerIndex + 1; r < grid.length; r++) {
    const row = grid[r]
    if (!row || isBlankRow(row)) continue
    const line = r + 1
    const roll = get(row, 'roll').replace(/\s+/g, '')
    const name = get(row, 'name')
    const paper = get(row, 'paper').replace(/\s+/g, '').toUpperCase()
    const slotText = get(row, 'slot')
    const slot = parseSlot(slotText)
    // A student may write once per session, so duplicates are checked per session.
    const key = `${roll.toUpperCase()}|${slot ?? ''}`
    let bad = false
    if (!roll) {
      errors.push({ row: line, message: `Row ${line}: roll number missing.` })
      bad = true
    } else if (firstRowOfRoll.has(key)) {
      errors.push({
        row: line,
        message: `Row ${line}: roll number ${roll} appears twice${slot ? ` in the ${slot} session` : ''} (also in row ${firstRowOfRoll.get(key)}).`,
      })
      bad = true
    }
    if (slot === null) {
      errors.push({ row: line, message: `Row ${line}: session "${slotText}" not understood — use Morning or Evening.` })
      bad = true
    }
    if (!paper) {
      errors.push({ row: line, message: `Row ${line}: paper code missing${roll ? ` for ${roll}` : ''}.` })
      bad = true
    }
    if (errors.length > MAX_ERRORS) {
      errors.push({ message: 'Too many problems — showing the first 200. Please check the file against the template.' })
      break
    }
    if (bad) continue
    firstRowOfRoll.set(key, line)
    if (!name) warnings.push({ row: line, message: `Row ${line}: name missing for ${roll} — the roll number will be printed instead.` })
    const student: Student = { roll, name: name || roll, course: get(row, 'course'), paper }
    const paperName = get(row, 'paperName')
    if (paperName) student.paperName = paperName
    const needs = get(row, 'specialNeeds')
    if (!NO_NEEDS.has(needs.toLowerCase())) student.specialNeeds = /^(y|yes|true|1)$/i.test(needs) ? 'Yes' : needs
    if (slot) student.slot = slot
    items.push(student)
  }
  if (!errors.length && !items.length) errors.push({ message: 'The students file has headers but no student rows.' })
  const withSlot = items.filter((s) => s.slot).length
  if (withSlot > 0 && withSlot < items.length) {
    warnings.push({
      message: `${items.length - withSlot} student${items.length - withSlot === 1 ? ' has' : 's have'} no session filled in — they will be planned in the morning session.`,
    })
    for (const s of items) s.slot ??= 'morning'
  }

  // Same paper code with different names is usually a typo — warn once per paper.
  const names = new Map<string, string>()
  const warned = new Set<string>()
  for (const s of items) {
    if (!s.paperName) continue
    const prev = names.get(s.paper)
    if (prev === undefined) names.set(s.paper, s.paperName)
    else if (prev.toLowerCase() !== s.paperName.toLowerCase() && !warned.has(s.paper)) {
      warned.add(s.paper)
      warnings.push({ message: `Paper ${s.paper} has two different names ("${prev}" and "${s.paperName}"). They are treated as the same paper.` })
    }
  }
  return { items, errors, warnings }
}

function parsePositiveInt(text: string): number | null {
  if (!/^\d+(\.0+)?$/.test(text)) return null
  const n = Number(text)
  return n >= 1 ? n : null
}

function parseFloor(text: string): number | undefined | null {
  const t = text.trim().toLowerCase()
  if (!t) return undefined
  if (['g', 'gf', 'ground', 'groundfloor', 'ground floor', '0'].includes(t)) return 0
  const m = /^(-?\d+)\s*(st|nd|rd|th)?(\s*floor)?$/.exec(t)
  return m ? Number(m[1]) : null
}

/** Expands "A1, C4; B1-B3" into seat labels. `bad` is the first token that couldn't be read. */
export function parseBlockedList(text: string): { labels: string[]; bad?: string } {
  const labels: string[] = []
  const cleaned = text.replace(/\s*[-–]\s*/g, '-').replace(/([A-Za-z])\s+(\d)/g, '$1$2')
  for (const token of cleaned.split(/[,;\s]+/).filter(Boolean)) {
    const range = /^([A-Za-z]{1,2}\d{1,3})-([A-Za-z]{1,2}\d{1,3})$/.exec(token)
    if (range) {
      const a = parseSeatLabel(range[1])
      const b = parseSeatLabel(range[2])
      if (!a || !b || a.row !== b.row) return { labels, bad: token }
      for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) labels.push(seatLabel(a.row, c))
      continue
    }
    const one = parseSeatLabel(token)
    if (!one) return { labels, bad: token }
    labels.push(seatLabel(one.row, one.col))
  }
  return { labels }
}

export function parseRooms(grid: Grid): ParseResult<Room> {
  const { headerIndex, index, errors } = mapColumns(grid, ROOM_COLUMNS, 'rooms')
  const warnings: Issue[] = []
  const items: Room[] = []
  if (errors.length) return { items, errors, warnings }
  if (!index.has('seatsPerRow') && !(index.has('benchesPerRow') && index.has('seatsPerBench'))) {
    errors.push({
      row: headerIndex + 1,
      message: 'The rooms file needs a "Seats Per Row" column (or both "Benches Per Row" and "Seats Per Bench").',
    })
    return { items, errors, warnings }
  }
  const get = (row: unknown[], key: (typeof ROOM_COLUMNS)[number]['key']) => {
    const i = index.get(key)
    return i === undefined ? '' : cellText(row[i])
  }
  const seen = new Map<string, number>()
  for (let r = headerIndex + 1; r < grid.length; r++) {
    const row = grid[r]
    if (!row || isBlankRow(row)) continue
    const line = r + 1
    const name = get(row, 'room')
    const where = name ? ` (room ${name})` : ''
    if (!name) {
      errors.push({ row: line, message: `Row ${line}: room number missing.` })
      continue
    }
    if (seen.has(name.toUpperCase())) {
      errors.push({ row: line, message: `Row ${line}: room ${name} appears twice (also in row ${seen.get(name.toUpperCase())}).` })
      continue
    }
    const rows = parsePositiveInt(get(row, 'rows'))
    if (rows === null || rows > MAX_ROWS_PER_ROOM) {
      errors.push({ row: line, message: `Row ${line}${where}: "Rows" must be a whole number from 1 to ${MAX_ROWS_PER_ROOM}.` })
      continue
    }
    const seatsText = get(row, 'seatsPerRow')
    const benchesText = get(row, 'benchesPerRow')
    const perBenchText = get(row, 'seatsPerBench')
    let cols: number | null = null
    let perBench: number | undefined
    if (perBenchText) {
      const pb = parsePositiveInt(perBenchText)
      if (pb === null || pb > 6) {
        errors.push({ row: line, message: `Row ${line}${where}: "Seats Per Bench" must be a whole number from 1 to 6.` })
        continue
      }
      perBench = pb > 1 ? pb : undefined
    }
    if (benchesText) {
      const b = parsePositiveInt(benchesText)
      if (b === null || !perBenchText) {
        errors.push({ row: line, message: `Row ${line}${where}: "Benches Per Row" needs a whole number and a "Seats Per Bench" value.` })
        continue
      }
      cols = b * (perBench ?? 1)
      if (seatsText && parsePositiveInt(seatsText) !== cols) {
        errors.push({ row: line, message: `Row ${line}${where}: ${b} benches × ${perBench ?? 1} seats = ${cols}, but "Seats Per Row" says ${seatsText}.` })
        continue
      }
    } else {
      cols = parsePositiveInt(seatsText)
      if (cols === null) {
        errors.push({ row: line, message: `Row ${line}${where}: "Seats Per Row" missing or not a whole number.` })
        continue
      }
      if (perBench && cols % perBench !== 0) {
        errors.push({ row: line, message: `Row ${line}${where}: ${cols} seats per row can't be split into benches of ${perBench}.` })
        continue
      }
    }
    if (cols > MAX_SEATS_PER_ROW) {
      errors.push({ row: line, message: `Row ${line}${where}: at most ${MAX_SEATS_PER_ROW} seats per row are supported.` })
      continue
    }
    const { labels, bad } = parseBlockedList(get(row, 'blocked'))
    if (bad) {
      errors.push({ row: line, message: `Row ${line}${where}: couldn't read blocked seat "${bad}". Use labels like A1, C4 or B1-B3.` })
      continue
    }
    const outside = labels.find((l) => {
      const p = parseSeatLabel(l)!
      return p.row >= rows || p.col >= cols!
    })
    if (outside) {
      errors.push({ row: line, message: `Row ${line}${where}: blocked seat ${outside} is outside the room (${rows} rows × ${cols} seats).` })
      continue
    }
    const floor = parseFloor(get(row, 'floor'))
    if (floor === null) warnings.push({ row: line, message: `Row ${line}${where}: couldn't read floor "${get(row, 'floor')}" — ignored.` })
    const blocked = [...new Set(labels)]
    if (blocked.length >= rows * cols) {
      warnings.push({ row: line, message: `Row ${line}${where}: every seat is blocked — the room will not be used.` })
    }
    const room: Room = { id: name, name, rows, cols, blocked }
    if (perBench) room.seatsPerBench = perBench
    if (floor !== null && floor !== undefined) room.floor = floor
    seen.set(name.toUpperCase(), line)
    items.push(room)
    if (errors.length > MAX_ERRORS) break
  }
  if (!errors.length && !items.length) errors.push({ message: 'The rooms file has headers but no room rows.' })
  return { items, errors, warnings }
}
