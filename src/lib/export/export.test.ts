import JSZip from 'jszip'
import { beforeAll, describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { solve } from '../engine/solve'
import { buildPlanView, rollRanges, type PlanView } from '../planView'
import { generateSample } from '../sample/generate'
import { buildZip, REPORTS } from './bundle'
import { masterListXlsx, seatingChartsXlsx, sheetName, XLSX_BUILDERS } from './excel'
import { PDF_BUILDERS, renderPdf } from './pdf'
import { attendance, doorList, masterList } from './reports'

let view: PlanView
beforeAll(async () => {
  const { students, rooms } = generateSample({ students: 1200, rooms: 30 })
  const out = await solve({ students, rooms, rule: 'strict', method: 'pattern', session: { date: '2026-11-24', slot: 'morning', title: 'End-Semester Examination' } })
  if (!out.ok) throw new Error('sample should solve')
  view = buildPlanView(out.plan)
})

describe('report data', () => {
  it('compresses roll numbers into ranges', () => {
    expect(rollRanges(['CSE303', 'CSE301', 'CSE302', 'CSE305', 'ECE101'])).toEqual(['CSE301–CSE303', 'CSE305', 'ECE101'])
    expect(rollRanges(['CSE309', 'CSE310'])).toEqual(['CSE309–CSE310'])
  })

  it('master list has every student once, sorted by roll, with a seat', () => {
    const rows = masterList(view)
    expect(rows).toHaveLength(1200)
    expect(new Set(rows.map((r) => r.roll)).size).toBe(1200)
    expect(rows.every((r) => r.seat !== '—')).toBe(true)
  })

  it('door list counts add up to the room total', () => {
    for (const room of view.rooms) expect(doorList(room).reduce((a, d) => a + d.count, 0)).toBe(room.used)
  })

  it('attendance sheets are in seat order and cover everyone', () => {
    const all = view.rooms.flatMap((r) => attendance(r))
    expect(all).toHaveLength(1200)
    expect(attendance(view.rooms[0])[0].seat).toMatch(/^A\d+$/)
  })
})

describe('Excel output', () => {
  it('makes valid, unique sheet names', () => {
    const used = new Set<string>()
    expect(sheetName('Room [A]/1', used)).toBe('Room -A--1')
    expect(sheetName('room [a]/1', used)).toBe('room -a--1~2')
  })

  it('writes one seating-chart sheet per room and a readable master list', () => {
    const charts = XLSX.read(seatingChartsXlsx(view), { type: 'array' })
    expect(charts.SheetNames).toHaveLength(view.rooms.length)
    const master = XLSX.read(masterListXlsx(view), { type: 'array' })
    const rows = XLSX.utils.sheet_to_json<string[]>(master.Sheets[master.SheetNames[0]], { header: 1 })
    expect(rows[4]).toEqual(['Roll no.', 'Name', 'Course', 'Paper', 'Room', 'Seat', 'Floor', 'Special needs'])
    expect(rows.length).toBe(5 + 1200)
  })

  it('all five workbooks open', () => {
    for (const r of REPORTS) expect(XLSX.read(XLSX_BUILDERS[r.kind](view), { type: 'array' }).SheetNames.length).toBeGreaterThan(0)
  })
})

describe('PDF output', () => {
  it('renders all five PDFs', async () => {
    for (const r of REPORTS) {
      const bytes = await renderPdf(PDF_BUILDERS[r.kind](view))
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
      expect(bytes.length).toBeGreaterThan(5000)
    }
  })

  it('bundles everything into one ZIP', async () => {
    const zip = await JSZip.loadAsync(await buildZip(view))
    const names = Object.keys(zip.files)
    expect(names.filter((n) => n.endsWith('.pdf'))).toHaveLength(5)
    expect(names.filter((n) => n.endsWith('.xlsx'))).toHaveLength(5)
    expect(names).toContain('seatwise-2026-11-24-morning.seatwise.json')
  })
})
