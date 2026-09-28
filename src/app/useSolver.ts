import { useCallback } from 'react'
import { solve, type SolveRequest } from '../lib/engine/solve'
import { useStore } from './store'

/** Runs the seating pipeline and feeds progress/results into the store. */
export function useSolver() {
  const { dispatch } = useStore()
  const run = useCallback(
    async (req: SolveRequest) => {
      dispatch({ type: 'solve-start' })
      // Let the "Generating" screen paint before the (synchronous) work starts.
      await new Promise((r) => setTimeout(r, 30))
      const out = await solve(req, { onProgress: (progress) => dispatch({ type: 'solve-progress', progress }) })
      if (out.ok) dispatch({ type: 'solve-done', plan: out.plan })
      else dispatch({ type: 'solve-failed', problem: out.problem })
    },
    [dispatch],
  )
  return { run }
}
