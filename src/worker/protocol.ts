import type { Change, ReplanResult } from '../lib/engine/replan'
import type { Progress, SolveOutcome, SolveRequest } from '../lib/engine/solve'
import type { Plan } from '../lib/types'

export type WorkerRequest =
  | { id: number; type: 'solve'; req: SolveRequest }
  | { id: number; type: 'replan'; plan: Plan; changes: Change[] }

export type WorkerResponse =
  | { id: number; type: 'progress'; progress: Progress }
  | { id: number; type: 'done'; outcome: SolveOutcome }
  | { id: number; type: 'replanned'; result: ReplanResult }
  | { id: number; type: 'error'; message: string }
  | { id: 0; type: 'ready'; highs: boolean }
