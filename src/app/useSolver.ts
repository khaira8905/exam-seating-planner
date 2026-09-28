import { useCallback } from 'react'
import type { SolveRequest } from '../lib/engine/solve'
import { solverClient } from './solverClient'
import { useStore } from './store'

/** Runs the seating pipeline in the Web Worker and feeds progress/results into the store. */
export function useSolver() {
  const { dispatch } = useStore()
  const run = useCallback(
    async (req: SolveRequest) => {
      dispatch({ type: 'solve-start' })
      try {
        const out = await solverClient.solve(req, (progress) => dispatch({ type: 'solve-progress', progress }))
        if (out.ok) dispatch({ type: 'solve-done', plan: out.plan })
        else dispatch({ type: 'solve-failed', problem: out.problem })
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
