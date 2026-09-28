/**
 * Method A — pattern filling (fast baseline).
 *
 * Seats are split into classes where no two seats are neighbours (a chessboard
 * for Strict, 2×2 tiles for Very strict, bench positions for Bench mode). We
 * walk the classes one after another, front to back, and lay the papers down
 * in contiguous blocks. When a paper spills from one class into the next it
 * can occasionally touch itself, so a short "min-conflicts" repair swaps seats
 * until no clashes remain.
 */
import { createRng } from '../sample/random'
import type { RoomGrid } from './grid'

export interface Demand {
  paper: string
  count: number
  /** How many of these students have special needs (they want front seats). */
  special: number
}

/** seatPaper[seatIndex] = index into demands, or -1 for empty/unusable. */
export type SeatPapers = Int32Array

export function countConflicts(g: RoomGrid, sp: SeatPapers): number {
  let n = 0
  for (const [a, b] of g.edges) if (sp[a] >= 0 && sp[a] === sp[b]) n++
  return n
}

function layout(g: RoomGrid, demands: Demand[], order: number[], classOrder: number[][]): SeatPapers {
  const sp = new Int32Array(g.rows * g.cols).fill(-1)
  const seq = classOrder.flat()
  const total = demands.reduce((a, d) => a + d.count, 0)
  // Spread empty seats: skip every k-th position instead of leaving the back empty.
  const empty = seq.length - total
  const skip = new Set<number>()
  if (empty > 0) {
    const step = seq.length / empty
    for (let k = 0; k < empty; k++) skip.add(Math.min(seq.length - 1, Math.floor(seq.length - 1 - k * step)))
  }
  let pos = 0
  for (const d of order) {
    for (let k = 0; k < demands[d].count; k++) {
      while (skip.has(pos)) pos++
      sp[seq[pos++]] = d
    }
  }
  return sp
}

/** Min-conflicts local search: swap a clashing seat with the seat that lowers clashes most. */
export function repair(g: RoomGrid, sp: SeatPapers, seed: number, maxIter = 4000): number {
  const rng = createRng(seed)
  const conflictsAt = (s: number, p: number) => {
    if (p < 0) return 0
    let n = 0
    for (const t of g.neighbours[s]) if (sp[t] === p) n++
    return n
  }
  let total = countConflicts(g, sp)
  for (let iter = 0; iter < maxIter && total > 0; iter++) {
    const bad = g.seats.filter((s) => sp[s] >= 0 && conflictsAt(s, sp[s]) > 0)
    if (!bad.length) break
    const s = rng.pick(bad)
    const p = sp[s]
    let best = Infinity
    let bestT: number[] = []
    for (const t of g.seats) {
      const q = sp[t]
      if (q === p) continue
      const before = conflictsAt(s, p) + conflictsAt(t, q)
      sp[s] = q
      sp[t] = p
      const after = conflictsAt(s, q) + conflictsAt(t, p)
      sp[s] = p
      sp[t] = q
      const delta = after - before
      if (delta < best) {
        best = delta
        bestT = [t]
      } else if (delta === best) bestT.push(t)
    }
    // Accept improving or sideways moves (sideways moves escape plateaus).
    if (best <= 0 && bestT.length) {
      const t = rng.pick(bestT)
      sp[s] = sp[t]
      sp[t] = p
      total += best
    }
  }
  return countConflicts(g, sp)
}

/**
 * Returns a clash-free seat → paper map for this room, or null if the pattern
 * method couldn't find one (the optimisation model may still succeed).
 */
export function patternFill(g: RoomGrid, demands: Demand[], seed = 1): SeatPapers | null {
  const total = demands.reduce((a, d) => a + d.count, 0)
  if (total > g.seats.length) return null
  const classes = [...g.classes].sort((a, b) => b.length - a.length)
  const byCount = demands.map((_, i) => i).sort((a, b) => demands[b].count - demands[a].count)
  // Papers with special-needs students go first so they start in the front row.
  const specialFirst = [...byCount].sort((a, b) => Number(demands[b].special > 0) - Number(demands[a].special > 0))
  const attempts: [number[], number[][]][] = [
    [specialFirst, classes],
    [byCount, classes],
    [specialFirst, classes.map((c, i) => (i % 2 ? [...c].reverse() : c))],
    [[...byCount].reverse(), classes],
  ]
  let best: SeatPapers | null = null
  let bestConflicts = Infinity
  for (const [order, cls] of attempts) {
    const sp = layout(g, demands, order, cls)
    const c = countConflicts(g, sp)
    if (c < bestConflicts) {
      best = sp
      bestConflicts = c
    }
    if (c === 0) return sp
  }
  if (!best) return null
  if (repair(g, best, seed) === 0) return best
  return null
}
