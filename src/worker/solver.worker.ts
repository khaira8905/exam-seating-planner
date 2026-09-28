/// <reference lib="webworker" />
/**
 * Runs the seating pipeline off the main thread so the page never freezes.
 * HiGHS (WebAssembly) is loaded once when the worker starts.
 */
import highsLoader from 'highs'
import wasmUrl from 'highs/runtime?url'
import type { HighsLike } from '../lib/engine/milp'
import { replan } from '../lib/engine/replan'
import { solve } from '../lib/engine/solve'
import type { WorkerRequest, WorkerResponse } from './protocol'

declare const self: DedicatedWorkerGlobalScope

const post = (msg: WorkerResponse) => self.postMessage(msg)

const highsReady: Promise<HighsLike | null> = highsLoader({ locateFile: () => wasmUrl })
  .then((h) => h as unknown as HighsLike)
  .catch((err) => {
    console.error('HiGHS failed to load; the pattern method will be used.', err)
    return null
  })

highsReady.then((h) => post({ id: 0, type: 'ready', highs: h !== null }))

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  const { id } = msg
  try {
    const highs = await highsReady
    if (msg.type === 'replan') {
      post({ id, type: 'replanned', result: await replan(msg.plan, msg.changes, { highs: highs ?? undefined }) })
      return
    }
    const req = msg.req
    const outcome = await solve(req, {
      highs: highs ?? undefined,
      onProgress: (progress) => post({ id, type: 'progress', progress }),
    })
    post({ id, type: 'done', outcome })
  } catch (err) {
    post({ id, type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
