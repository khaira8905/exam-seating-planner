import { beforeAll, describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { solve } from '../engine/solve'
import { buildPlanView, type PlanView } from '../planView'
import { generateSample } from '../sample/generate'
import { assignDuties, invigilatorsNeeded, parseNames } from './duty'
import { dutyXlsx } from './excel'
import { dutyDoc, renderPdf } from './pdf'

let view: PlanView
beforeAll(async () => {
  const { students, rooms } = generateSample({ students: 300, rooms: 10 })
  const out = await solve({ students, rooms, rule: 'strict', method: 'pattern', session: { date: '2026-11-24', slot: 'morning' } })
  if (!out.ok) throw new Error('setup')
  view = buildPlanView(out.plan)
})

describe('invigilator duty list', () => {
  it('cleans pasted names', () => {
    expect(parseNames(' Dr. A Sharma \n\nProf. B  Rao, dr. a sharma;Ms. C Iyer\n')).toEqual(['Dr. A Sharma', 'Prof. B Rao', 'Ms. C Iyer'])
  })

  it('needs one invigilator per 40 students, at least one per room', () => {
    expect(invigilatorsNeeded(0)).toBe(0)
    expect(invigilatorsNeeded(12)).toBe(1)
    expect(invigilatorsNeeded(40)).toBe(1)
    expect(invigilatorsNeeded(41)).toBe(2)
    expect(invigilatorsNeeded(118, 30)).toBe(4)
  })

  it('assigns everyone once, in room order, and keeps extras as reserves', () => {
    const names = Array.from({ length: 30 }, (_, i) => `Teacher ${i + 1}`)
    const duty = assignDuties(view, names)
    const assigned = duty.rows.flatMap((r) => r.invigilators)
    expect(new Set(assigned).size).toBe(assigned.length)
    expect(assigned).toEqual(names.slice(0, duty.needed))
    expect(duty.reserves).toEqual(names.slice(duty.needed))
    expect(duty.rows.every((r) => r.missing === 0)).toBe(true)
  })

  it('reports rooms left without enough invigilators', () => {
    const duty = assignDuties(view, ['Only One'])
    expect(duty.assigned).toBe(1)
    expect(duty.rows.reduce((a, r) => a + r.missing, 0)).toBe(duty.needed - 1)
  })

  it('renders as PDF and Excel', async () => {
    const duty = assignDuties(view, ['A', 'B', 'C'])
    const pdf = await renderPdf(dutyDoc(view, duty, 40))
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-')
    const wb = XLSX.read(dutyXlsx(view, duty, 40), { type: 'array' })
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 })
    expect(rows.some((r) => r[0] === 'Room' && r[4] === 'Invigilator(s)')).toBe(true)
  })
})
