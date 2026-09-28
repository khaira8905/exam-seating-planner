import { solve, type Progress, type SolveOutcome, type SolveRequest } from '../lib/engine/solve'
import type { WorkerRequest, WorkerResponse } from '../worker/protocol'

type Pending = {
  resolve: (o: SolveOutcome) => void
  reject: (e: Error) => void
  onProgress?: (p: Progress) => void
}

/**
 * Talks to the solver Web Worker. The worker is started as soon as the app
 * loads so HiGHS is ready (and cached for offline use) before the first click.
 */
class SolverClient {
  private worker: Worker | null = null
  private nextId = 1
  private pending = new Map<number, Pending>()
  highsAvailable: boolean | null = null

  start() {
    if (this.worker || typeof Worker === 'undefined') return
    try {
      this.worker = new Worker(new URL('../worker/solver.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      this.worker = null
      return
    }
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      if (msg.type === 'ready') {
        this.highsAvailable = msg.highs
        return
      }
      const p = this.pending.get(msg.id)
      if (!p) return
      if (msg.type === 'progress') p.onProgress?.(msg.progress)
      else {
        this.pending.delete(msg.id)
        if (msg.type === 'done') p.resolve(msg.outcome)
        else p.reject(new Error(msg.message))
      }
    }
    this.worker.onerror = (e) => {
      for (const p of this.pending.values()) p.reject(new Error(e.message || 'The solver stopped unexpectedly.'))
      this.pending.clear()
      this.worker?.terminate()
      this.worker = null
    }
  }

  solve(req: SolveRequest, onProgress?: (p: Progress) => void): Promise<SolveOutcome> {
    this.start()
    if (!this.worker) {
      // No worker support: run the pattern method on the main thread.
      return solve({ ...req, method: 'pattern' }, { onProgress })
    }
    const id = this.nextId++
    return new Promise<SolveOutcome>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress })
      this.worker!.postMessage({ id, type: 'solve', req } satisfies WorkerRequest)
    })
  }
}

export const solverClient = new SolverClient()
