/**
 * The solver's view of a room: usable seats, which seat pairs are "neighbours"
 * under a rule, and a colouring of seats into classes where no two seats of
 * the same class are neighbours (a chessboard for Strict, 2×2 tiles for Very
 * strict, bench positions for Bench mode, alternating columns for Basic).
 */
import { parseSeatLabel } from '../seatLabel'
import type { Room, Strictness } from '../types'

export interface RoomGrid {
  room: Room
  rule: Strictness
  /** The rule actually applied in this room (bench mode without benches → basic). */
  effectiveRule: Exclude<Strictness, 'bench'> | 'bench'
  rows: number
  cols: number
  /** usable[r * cols + c] */
  usable: boolean[]
  /** Usable seat indices in reading order (front row first, left to right). */
  seats: number[]
  /** Neighbour lists (only usable seats), indexed by seat index. */
  neighbours: number[][]
  /** Each neighbouring pair once, s < t. */
  edges: [number, number][]
  /**
   * Groups of seats that are all mutual neighbours (a paper may use at most one
   * seat per group). Covers every edge; gives the optimisation model tighter,
   * fewer constraints than one per edge.
   */
  cliques: number[][]
  /** Seat classes: no two seats in the same class are neighbours. */
  classes: number[][]
}

export const idx = (g: { cols: number }, r: number, c: number) => r * g.cols + c

export function effectiveRule(room: Room, rule: Strictness): RoomGrid['effectiveRule'] {
  if (rule === 'bench' && (room.seatsPerBench ?? 1) <= 1) return 'basic'
  return rule
}

export function buildGrid(room: Room, rule: Strictness): RoomGrid {
  const { rows, cols } = room
  const eff = effectiveRule(room, rule)
  const usable = Array.from({ length: rows * cols }, () => true)
  for (const label of room.blocked) {
    const p = parseSeatLabel(label)
    if (p && p.row < rows && p.col < cols) usable[p.row * cols + p.col] = false
  }
  const seats: number[] = []
  for (let i = 0; i < rows * cols; i++) if (usable[i]) seats.push(i)

  const neighbours: number[][] = Array.from({ length: rows * cols }, () => [])
  const edges: [number, number][] = []
  const addEdge = (a: number, b: number) => {
    if (!usable[a] || !usable[b]) return
    neighbours[a].push(b)
    neighbours[b].push(a)
    edges.push(a < b ? [a, b] : [b, a])
  }
  const cliques: number[][] = []
  const bench = room.seatsPerBench ?? 1

  if (eff === 'bench') {
    for (let r = 0; r < rows; r++) {
      for (let start = 0; start < cols; start += bench) {
        const group: number[] = []
        for (let c = start; c < Math.min(cols, start + bench); c++) if (usable[r * cols + c]) group.push(r * cols + c)
        for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) addEdge(group[i], group[j])
        if (group.length > 1) cliques.push(group)
      }
    }
  } else {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s = r * cols + c
        if (c + 1 < cols) addEdge(s, s + 1)
        if (eff !== 'basic' && r + 1 < rows) addEdge(s, s + cols)
        if (eff === 'very-strict' && r + 1 < rows) {
          if (c + 1 < cols) addEdge(s, s + cols + 1)
          if (c > 0) addEdge(s, s + cols - 1)
        }
      }
    }
    if (eff === 'very-strict') {
      // Every king-move edge lies inside some 2×2 block, and each block is a clique.
      for (let r = 0; r < Math.max(1, rows - 1); r++) {
        for (let c = 0; c < Math.max(1, cols - 1); c++) {
          const block = [r * cols + c, r * cols + c + 1, (r + 1) * cols + c, (r + 1) * cols + c + 1].filter(
            (s, i) => r + (i >> 1) < rows && c + (i & 1) < cols && usable[s],
          )
          if (block.length > 1) cliques.push(block)
        }
      }
    } else {
      for (const e of edges) cliques.push([e[0], e[1]])
    }
  }

  const classOf = (r: number, c: number) => {
    switch (eff) {
      case 'basic':
        return c % 2
      case 'strict':
        return (r + c) % 2
      case 'very-strict':
        return (r % 2) * 2 + (c % 2)
      case 'bench':
        return c % bench
    }
  }
  const classCount = eff === 'very-strict' ? 4 : eff === 'bench' ? bench : 2
  const classes: number[][] = Array.from({ length: classCount }, () => [])
  for (const s of seats) classes[classOf(Math.floor(s / cols), s % cols)].push(s)

  return { room, rule, effectiveRule: eff, rows, cols, usable, seats, neighbours, edges, cliques, classes: classes.filter((c) => c.length) }
}

/**
 * The most students of ONE paper this room can take under the rule: the size
 * of the largest seat class. (For a chessboard / 2×2 tiling / benches this is
 * the exact maximum when there are no blocked seats, and always achievable.)
 */
export function paperCapacity(g: RoomGrid): number {
  if (g.effectiveRule === 'basic') {
    // Exact: each row splits into runs of usable seats; a run of n seats takes ceil(n/2).
    let total = 0
    for (let r = 0; r < g.rows; r++) {
      let run = 0
      for (let c = 0; c <= g.cols; c++) {
        if (c < g.cols && g.usable[r * g.cols + c]) run++
        else {
          total += Math.ceil(run / 2)
          run = 0
        }
      }
    }
    return total
  }
  if (g.effectiveRule === 'bench') {
    // Exact: one seat per bench that has any usable seat.
    return g.cliques.length + g.seats.filter((s) => g.neighbours[s].length === 0).length
  }
  return Math.max(0, ...g.classes.map((c) => c.length))
}

/** Rough "how many different papers does this room need to be filled completely". */
export function minPapersToFill(g: RoomGrid): number {
  const cap = paperCapacity(g)
  return cap === 0 ? Infinity : Math.ceil(g.seats.length / cap)
}
