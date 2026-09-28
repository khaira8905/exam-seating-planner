/** The same five printouts as Excel workbooks (SheetJS), for exam cells that edit in Excel. */
import * as XLSX from 'xlsx'
import type { PlanView } from '../planView'
import { attendance, doorList, floorText, masterList, reportHeader, seatingChart, summary } from './reports'
import type { ReportKind } from './catalog'

/** Excel sheet names: ≤ 31 chars, no []:*?/\ and unique within the workbook. */
export function sheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[[\]:*?/\\]/g, '-').slice(0, 31) || 'Sheet'
  let out = base
  for (let k = 2; used.has(out.toLowerCase()); k++) out = `${base.slice(0, 28)}~${k}`
  used.add(out.toLowerCase())
  return out
}

function titleRows(view: PlanView, heading: string): string[][] {
  const h = reportHeader(view)
  return [[h.title], [heading], [`${h.session} · ${h.rule}`], []]
}

function sheet(rows: (string | number)[][], widths: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = widths.map((wch) => ({ wch }))
  return ws
}

function workbook(sheets: [string, XLSX.WorkSheet][]): Uint8Array {
  const wb = XLSX.utils.book_new()
  const used = new Set<string>()
  for (const [name, ws] of sheets) XLSX.utils.book_append_sheet(wb, ws, sheetName(name, used))
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer)
}

export function seatingChartsXlsx(view: PlanView): Uint8Array {
  return workbook(
    view.rooms.map((room) => {
      const grid = seatingChart(room).map((row) =>
        row.map((c) => (c.kind === 'student' ? `${c.label}  ${c.paper}\n${c.roll}${c.special ? ' *' : ''}` : c.kind === 'blocked' ? `${c.label} blocked` : `${c.label} empty`)),
      )
      const rows = [
        ...titleRows(view, `Room ${room.room.name} — seating chart (${room.used} students)`),
        ['FRONT · BOARD'],
        ...grid,
        ['BACK'],
        [],
        ['Paper', 'Roll numbers', 'Count', 'Name'],
        ...room.papers.map((p) => [p.paper, p.ranges.join(', '), p.count, p.paperName ?? '']),
      ]
      return [room.room.name, sheet(rows, Array.from({ length: Math.max(4, room.room.cols) }, () => 16))]
    }),
  )
}

export function doorListsXlsx(view: PlanView): Uint8Array {
  const rows: (string | number)[][] = [...titleRows(view, 'Door lists'), ['Room', 'Floor', 'Paper', 'Paper name', 'Roll numbers', 'Count']]
  for (const room of view.rooms) {
    for (const d of doorList(room)) rows.push([room.room.name, floorText(room.room.floor), d.paper, d.paperName, d.rolls, d.count])
    rows.push([room.room.name, '', 'TOTAL', '', '', room.used], [])
  }
  return workbook([['Door lists', sheet(rows, [10, 12, 10, 28, 60, 8])]])
}

export function masterListXlsx(view: PlanView): Uint8Array {
  const rows = [
    ...titleRows(view, 'Master list — all students by roll number'),
    ['Roll no.', 'Name', 'Course', 'Paper', 'Room', 'Seat', 'Floor', 'Special needs'],
    ...masterList(view).map((r) => [r.roll, r.name, r.course, r.paper, r.room, r.seat, r.floor, r.specialNeeds]),
  ]
  const ws = sheet(rows, [12, 24, 14, 9, 9, 6, 12, 16])
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 4, c: 0 }, e: { r: rows.length - 1, c: 7 } }) }
  return workbook([['Master list', ws]])
}

export function attendanceXlsx(view: PlanView): Uint8Array {
  return workbook(
    view.rooms.map((room) => {
      const rows = [
        ...titleRows(view, `Attendance sheet — Room ${room.room.name}`),
        ['Seat', 'Roll no.', 'Name', 'Paper', 'Answer sheet no.', 'Signature'],
        ...attendance(room).map((r) => [r.seat, r.roll, r.name, r.paper, '', '']),
        [],
        ['Present:', '', 'Absent:', '', 'Invigilator signature:', ''],
      ]
      return [room.room.name, sheet(rows, [6, 12, 26, 9, 18, 22])]
    }),
  )
}

export function summaryXlsx(view: PlanView): Uint8Array {
  const s = summary(view)
  const rows: (string | number)[][] = [
    ...titleRows(view, 'Seating plan summary'),
    ...s.items,
    [],
    ['Room', 'Floor', 'Papers', 'Students', 'Empty', 'Usable'],
    ...s.rooms.map((r) => [r.room, r.floor, r.papers, r.students, r.empty, r.usable]),
  ]
  return workbook([['Summary', sheet(rows, [28, 50, 40, 10, 8, 8])]])
}

export const XLSX_BUILDERS: Record<ReportKind, (v: PlanView) => Uint8Array> = {
  'seating-charts': seatingChartsXlsx,
  'door-lists': doorListsXlsx,
  'master-list': masterListXlsx,
  'attendance-sheets': attendanceXlsx,
  summary: summaryXlsx,
}
