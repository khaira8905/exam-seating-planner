/**
 * Method B — the optimisation model, solved with HiGHS (compiled to WebAssembly).
 *
 * Variables   x[p,s] ∈ {0,1}   seat s holds a student of paper p
 * Constraints Σp x[p,s] ≤ 1                   every usable seat holds at most one student
 *             Σs x[p,s] = count[p]            every student of paper p gets a seat
 *             Σ(s∈C) x[p,s] ≤ 1               for every group C of mutually neighbouring seats
 *                                             (a neighbouring pair, a bench, or a 2×2 block in
 *                                             Very strict mode) and every paper p
 *             blocked seats have no variables at all
 * Objective   minimise  100 · (special-needs students not in the front rows)
 *                     +  10 · (students moved, when re-planning)
 *                     +   1 · (how unevenly empty seats are spread across rows)
 *                     + tiny tie-break that keeps each paper in a compact block
 *
 * The result is re-checked here (counts, one student per seat, no clashes)
 * and again by the independent checker at the end of the pipeline.
 */
import type { RoomGrid } from './grid'
import { countConflicts, type Demand, type SeatPapers } from './pattern'

/** The parts of the HiGHS API we use: the one-shot LP-text solver, and persistent models for warm starts. */
export interface HighsLike {
  solve(problem: string, options?: Record<string, unknown>): {
    Status: string
    Columns: Record<string, { Primal?: number }>
  }
  createModel?(source: { format: 'lp'; data: string }): PersistentModel
}

interface PersistentModel {
  options: { set(values: Record<string, unknown>): void }
  getColByName(name: string): number
  setSolution(solution: { indices: Int32Array; values: Float64Array }): unknown
  run(): unknown
  getModelStatus(): number
  getSolution(): { colValue: ArrayLike<number> }
  dispose(): void
}

export interface MilpOptions {
  /** Seconds before HiGHS stops and we use the best solution found (or fall back). */
  timeLimit?: number
  /** Current seat → demand map when re-planning; seats that keep their paper cost nothing. */
  current?: SeatPapers
  /** Rows counted as "front" for special-needs students. */
  frontRows?: number
  /** A known clash-free layout to start from (warm start), e.g. the pattern plan. */
  start?: SeatPapers
}

export type MilpOutcome =
  | { status: 'optimal' | 'feasible'; seatPapers: SeatPapers; ms: number }
  | { status: 'infeasible' | 'failed'; ms: number; detail: string }

const W_SPECIAL = 100
const W_MOVE = 10
const W_SPREAD = 1

const v = (p: number, s: number) => `x${p}_${s}`

/** HiGHS model status codes (kHighsModelStatus*) → the names the one-shot API uses. */
const MODEL_STATUS: Record<number, string> = {
  7: 'Optimal',
  8: 'Infeasible',
  9: 'Primal infeasible or unbounded',
  10: 'Unbounded',
  13: 'Time limit reached',
  14: 'Iteration limit reached',
}

/** Builds the model as CPLEX LP text (the format HiGHS reads). */
export function buildModel(g: RoomGrid, demands: Demand[], opts: MilpOptions = {}): string {
  const P = demands.length
  const seats = g.seats
  const total = demands.reduce((a, d) => a + d.count, 0)
  const frontRows = opts.frontRows ?? 2
  const obj: string[] = []
  const rows: string[] = []
  const bounds: string[] = []

  // Tiny tie-break: paper p prefers rows near its "home" band. Keeps papers compact
  // (nicer roll-number ranges) and breaks symmetry so the solver finishes faster.
  for (let p = 0; p < P; p++) {
    const home = P > 1 ? (p / (P - 1)) * (g.rows - 1) : 0
    for (const s of seats) {
      const r = Math.floor(s / g.cols)
      const c = 0.001 * Math.abs(r - home)
      if (c > 0) obj.push(`${c.toFixed(4)} ${v(p, s)}`)
    }
  }

  // Seat capacity.
  for (const s of seats) rows.push(` seat${s}: ${demands.map((_, p) => v(p, s)).join(' + ')} <= 1`)
  // Every student gets a seat.
  demands.forEach((d, p) => rows.push(` count${p}: ${seats.map((s) => v(p, s)).join(' + ')} = ${d.count}`))
  // No two students of the same paper in a group of neighbouring seats.
  g.cliques.forEach((clique, k) => {
    for (let p = 0; p < P; p++) rows.push(` nb${k}_${p}: ${clique.map((s) => v(p, s)).join(' + ')} <= 1`)
  })

  // Special-needs students in the front rows (soft: slack u_p is penalised).
  const front = seats.filter((s) => Math.floor(s / g.cols) < frontRows)
  demands.forEach((d, p) => {
    if (!d.special) return
    rows.push(` front${p}: ${front.map((s) => v(p, s)).join(' + ')}${front.length ? ' + ' : ''}u${p} >= ${d.special}`)
    obj.push(`${W_SPECIAL} u${p}`)
    bounds.push(` 0 <= u${p} <= ${d.special}`)
  })

  // Spread empty seats: each row's occupancy should be close to its fair share.
  if (total < seats.length) {
    for (let r = 0; r < g.rows; r++) {
      const inRow = seats.filter((s) => Math.floor(s / g.cols) === r)
      if (!inRow.length) continue
      const target = (inRow.length * total) / seats.length
      const terms = inRow.flatMap((s) => demands.map((_, p) => v(p, s))).join(' + ')
      rows.push(` spreadA${r}: ${terms} - d${r} <= ${target.toFixed(4)}`)
      rows.push(` spreadB${r}: ${terms} + d${r} >= ${target.toFixed(4)}`)
      obj.push(`${W_SPREAD} d${r}`)
      bounds.push(` d${r} >= 0`)
    }
  }

  // Re-planning: keeping a seat's current paper is rewarded, so few students move.
  if (opts.current) {
    for (const s of seats) {
      const p = opts.current[s]
      if (p >= 0 && p < P) obj.push(`-${W_MOVE} ${v(p, s)}`)
    }
  }

  if (!obj.length) obj.push(`0 ${v(0, seats[0])}`)
  const binaries = demands.flatMap((_, p) => seats.map((s) => v(p, s)))
  return [
    'Minimize',
    ` obj: ${obj.join(' + ').replace(/\+ -/g, '- ')}`,
    'Subject To',
    ...rows,
    ...(bounds.length ? ['Bounds', ...bounds] : []),
    'Binary',
    ` ${binaries.join(' ')}`,
    'End',
  ].join('\n')
}

/** Solves one room. Never throws: failures are returned so the caller can fall back. */
export function solveRoom(highs: HighsLike, g: RoomGrid, demands: Demand[], opts: MilpOptions = {}): MilpOutcome {
  const t0 = performance.now()
  const ms = () => Math.round(performance.now() - t0)
  const total = demands.reduce((a, d) => a + d.count, 0)
  if (total > g.seats.length) return { status: 'infeasible', ms: ms(), detail: 'more students than seats' }
  if (!demands.length || total === 0) return { status: 'optimal', seatPapers: new Int32Array(g.rows * g.cols).fill(-1), ms: ms() }
  const lp = buildModel(g, demands, opts)
  const options = {
    output_flag: false,
    time_limit: opts.timeLimit ?? 1,
    mip_rel_gap: 0.02,
    mip_abs_gap: 0.5,
    presolve: 'on',
  }
  let status: string
  let value: (p: number, s: number) => number
  try {
    if (opts.start && highs.createModel) {
      // Persistent model so we can hand HiGHS a starting solution (the pattern plan).
      const model = highs.createModel({ format: 'lp', data: lp })
      try {
        model.options.set(options)
        const idx: number[] = []
        for (const s of g.seats) if (opts.start[s] >= 0) idx.push(model.getColByName(v(opts.start[s], s)))
        model.setSolution({ indices: Int32Array.from(idx), values: new Float64Array(idx.length).fill(1) })
        model.run()
        status = MODEL_STATUS[model.getModelStatus()] ?? 'Unknown'
        const cols = model.getSolution().colValue
        const index = new Map<string, number>()
        for (let p = 0; p < demands.length; p++) for (const s of g.seats) index.set(v(p, s), model.getColByName(v(p, s)))
        value = (p, s) => cols[index.get(v(p, s))!] ?? 0
      } finally {
        model.dispose()
      }
    } else {
      const result = highs.solve(lp, options)
      status = result.Status
      value = (p, s) => result.Columns[v(p, s)]?.Primal ?? 0
    }
  } catch (err) {
    return { status: 'failed', ms: ms(), detail: err instanceof Error ? err.message : String(err) }
  }
  if (status === 'Infeasible') return { status: 'infeasible', ms: ms(), detail: 'HiGHS proved the room infeasible' }
  if (status !== 'Optimal' && status !== 'Time limit reached') {
    return { status: 'failed', ms: ms(), detail: `HiGHS status: ${status}` }
  }
  const sp = new Int32Array(g.rows * g.cols).fill(-1)
  for (let p = 0; p < demands.length; p++) {
    for (const s of g.seats) {
      if (value(p, s) > 0.5) {
        if (sp[s] !== -1) return { status: 'failed', ms: ms(), detail: 'two papers on one seat' }
        sp[s] = p
      }
    }
  }
  // Trust but verify.
  const counts = Array.from({ length: demands.length }, () => 0)
  for (const s of g.seats) if (sp[s] >= 0) counts[sp[s]]++
  const countsOk = counts.every((c, p) => c === demands[p].count)
  if (!countsOk || countConflicts(g, sp) > 0) {
    return { status: 'failed', ms: ms(), detail: status === 'Optimal' ? 'solution failed verification' : 'no usable solution before the time limit' }
  }
  return { status: status === 'Optimal' ? 'optimal' : 'feasible', seatPapers: sp, ms: ms() }
}
