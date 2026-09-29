import { describe, expect, it } from 'vitest'
import { checkPlan } from '../engine/checker'
import { replan } from '../engine/replan'
import { solve } from '../engine/solve'
import { generateSample } from '../sample/generate'
import { readPlanFile, serialisePlan } from './planFile'

async function samplePlan() {
  const { students, rooms } = generateSample({ students: 300, rooms: 10 })
  const out = await solve({ students, rooms, rule: 'strict', method: 'pattern', session: { date: '2026-11-24', slot: 'evening', title: 'Mid-Semester' } })
  if (!out.ok) throw new Error('setup')
  return out.plan
}

describe('plan files (.seatwise.json)', () => {
  it('round-trips a plan exactly', async () => {
    const plan = await samplePlan()
    const back = readPlanFile(serialisePlan(plan))
    expect(back).toEqual(plan)
    expect(checkPlan(back).ok).toBe(true)
  })

  it('a reopened plan can still be re-planned', async () => {
    const back = readPlanFile(serialisePlan(await samplePlan()))
    const res = await replan(back, [{ type: 'remove-student', roll: back.students[0].roll }])
    expect(res.ok).toBe(true)
    if (res.ok) expect(checkPlan(res.plan).ok).toBe(true)
  })

  it('explains what is wrong with other files', () => {
    expect(() => readPlanFile('not json')).toThrow('This is not a SeatWise plan file (it is not valid JSON).')
    expect(() => readPlanFile('{"hello": 1}')).toThrow('This is not a SeatWise plan file.')
    expect(() => readPlanFile('{"format":"seatwise-plan","version":2,"plan":{}}')).toThrow('newer version of SeatWise')
    expect(() => readPlanFile('{"format":"seatwise-plan","version":1,"plan":{"students":[]}}')).toThrow('damaged or incomplete')
  })
})
