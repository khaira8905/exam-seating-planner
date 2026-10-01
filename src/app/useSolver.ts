import { useCallback } from 'react'
import type { SolveRequest } from '../lib/engine/solve'
import { slotLabel, SLOTS, splitBySession } from '../lib/sessions'
import type { Plan } from '../lib/types'
import { solverClient } from './solverClient'
import { useStore } from './store'

/**
 * Runs the seating pipeline in the Web Worker and feeds progress/results into
 * the store. If the students file has a Session column with both sessions,
 * each session is planned in turn (same rooms, same rule).
 */
export function useSolver() {
  const { dispatch } = useStore()
  const run = useCallback(
    async (req: SolveRequest) => {
      dispatch({ type: 'solve-start' })
      try {
        const split = splitBySession(req.students)
        const groups = split ? SLOTS.filter((s) => split.has(s)).map((slot) => ({ slot, students: split.get(slot)! })) : null
        if (!groups || groups.length === 1) {
          const session = groups ? { ...req.session, slot: groups[0].slot } : req.session
          const out = await solverClient.solve({ ...req, session }, (progress) => dispatch({ type: 'solve-progress', progress }))
          if (out.ok) dispatch({ type: 'solve-done', plan: out.plan })
          else dispatch({ type: 'solve-failed', problem: out.problem })
          return
        }
        const plans: Plan[] = []
        for (const { slot, students } of groups) {
          const out = await solverClient.solve({ ...req, students, session: { ...req.session, slot } }, (progress) =>
            dispatch({ type: 'solve-progress', progress: { ...progress, session: slotLabel(slot) } }),
          )
          if (!out.ok) {
            dispatch({ type: 'solve-failed', problem: { ...out.problem, title: `${slotLabel(slot)} session: ${out.problem.title}` } })
            return
          }
          plans.push(out.plan)
        }
        dispatch({ type: 'sessions-done', plans })
      } catch (err) {
        dispatch({
          type: 'solve-failed',
          problem: {
            title: 'Something went wrong while solving',
            reasons: [err instanceof Error ? err.message : String(err)],
            suggestions: ['Try again, or choose the "Quick pattern" method.'],
          },
        })
      }
    },
    [dispatch],
  )
  return { run }
}
