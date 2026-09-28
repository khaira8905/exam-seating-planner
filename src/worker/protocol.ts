import type { Progress, SolveOutcome, SolveRequest } from '../lib/engine/solve'

export type WorkerRequest = { id: number; type: 'solve'; req: SolveRequest }

export type WorkerResponse =
  | { id: number; type: 'progress'; progress: Progress }
  | { id: number; type: 'done'; outcome: SolveOutcome }
  | { id: number; type: 'error'; message: string }
  | { id: 0; type: 'ready'; highs: boolean }
