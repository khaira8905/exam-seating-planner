import { describe, expect, it } from 'vitest'
import { generateSample } from '../lib/sample/generate'
import { initialState, reachableSteps, reducer, type AppState } from './store'

const withInputs = (): AppState => {
  const { students, rooms } = generateSample({ students: 40 })
  return { ...initialState, students, rooms }
}

describe('reachable steps', () => {
  it('opens Rules once both files are in, but not Generate before anything ran', () => {
    expect([...reachableSteps(initialState)]).toEqual(['upload'])
    expect([...reachableSteps(withInputs())].sort()).toEqual(['rules', 'upload'])
  })

  it('never reopens the Generate step after a plan is made (it would wait for ever)', () => {
    const solving = reducer(withInputs(), { type: 'solve-start' })
    expect(solving.step).toBe('generate')
    const done = { ...solving, status: 'done' as const, plan: {} as AppState['plan'], step: 'review' as const }
    const steps = reachableSteps(done)
    expect(steps.has('generate')).toBe(false)
    expect(steps.has('review')).toBe(true)
    expect(steps.has('rules')).toBe(true)
  })

  it('reopens Generate after a failure, to read the explanation again', () => {
    const failed = reducer(reducer(withInputs(), { type: 'solve-start' }), { type: 'solve-failed', problem: { title: 'x', reasons: [], suggestions: [] } })
    expect(reachableSteps(failed).has('generate')).toBe(true)
  })
})
