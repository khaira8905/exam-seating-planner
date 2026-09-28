/**
 * Stage 1 — room allocation (greedy).
 *
 * Every room is split into seat classes where no two seats are neighbours
 * (see grid.ts). A paper may occupy at most ONE class per room, so whatever
 * the allocation decides is clash-free by construction; the seat-level solver
 * then only improves the layout (front seats, spreading empty seats).
 *
 * Goals, in order: use as few rooms as possible, fill the chosen rooms evenly,
 * give every room a mix of papers, keep each paper in neighbouring rooms, and
 * put papers with special-needs students into ground-floor rooms.
 */
import { compareText } from '../sort'
import type { Student } from '../types'
import { explainInfeasible, type Infeasible } from './explain'
import { paperCapacity, type RoomGrid } from './grid'

/** `count` students of `paper` go into class `classIndex` of the room. */
export interface Piece {
  paper: string
  count: number
  classIndex: number
}

export interface RoomAllocation {
  grid: RoomGrid
  pieces: Piece[]
}

export type AllocationResult =
  | { ok: true; rooms: RoomAllocation[]; warnings: string[] }
  | { ok: false; problem: Infeasible }

interface PaperInfo {
  paper: string
  count: number
  special: number
}

const floorOf = (g: RoomGrid) => g.room.floor ?? Number.POSITIVE_INFINITY

/** Display / filling order: ground floor first, then by room name. */
export function roomOrder(a: RoomGrid, b: RoomGrid) {
  return floorOf(a) - floorOf(b) || compareText(a.room.name, b.room.name)
}

/** Splits `total` over `weights` proportionally, as integers that sum to `total`. */
export function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum === 0) return weights.map(() => 0)
  const raw = weights.map((w) => (w / sum) * total)
  const out = raw.map(Math.floor)
  let left = total - out.reduce((a, b) => a + b, 0)
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0])
  for (const [, i] of order) {
    if (left <= 0) break
    if (out[i] < weights[i]) {
      out[i]++
      left--
    }
  }
  return out
}

interface Bin {
  room: number
  classIndex: number
  quota: number
  used: number
}

/**
 * Lays papers along the rooms' seat classes in "class-major" order: every
 * room's largest class first (room 1, room 2, …), then every room's second
 * class, and so on. Each paper fills a run of consecutive bins, so it stays in
 * neighbouring rooms and each room gets one paper per class — a natural mix of
 * 2–4 papers. A paper never uses two classes of the same room: such bins are
 * skipped and left for the next paper.
 *
 * Special-needs students are placed first, as small pieces of their paper in
 * ground-floor rooms, so they don't depend on where their paper's run falls.
 */
function layout(chosen: RoomGrid[], order: PaperInfo[], total: number, mode: 'even' | 'full'): RoomAllocation[] | null {
  const classOrder = chosen.map((g) =>
    g.classes.map((c, i) => [c.length, i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map(([, i]) => i),
  )
  const targets = apportion(total, chosen.map((g) => g.seats.length))
  const quotas = chosen.map((g, r) =>
    mode === 'full' ? g.classes.map((c) => c.length) : apportion(targets[r], g.classes.map((c) => c.length)),
  )
  const bins: Bin[] = []
  const layers = Math.max(...classOrder.map((c) => c.length))
  for (let layer = 0; layer < layers; layer++) {
    chosen.forEach((_, r) => {
      const k = classOrder[r][layer]
      if (k !== undefined && quotas[r][k] > 0) bins.push({ room: r, classIndex: k, quota: quotas[r][k], used: 0 })
    })
  }
  const pieces: Piece[][] = chosen.map(() => [])
  const canUse = (bin: Bin, paper: string) => {
    const existing = pieces[bin.room].find((x) => x.paper === paper)
    return !existing || existing.classIndex === bin.classIndex
  }
  const put = (bin: Bin, paper: string, n: number) => {
    const existing = pieces[bin.room].find((x) => x.paper === paper)
    if (existing) existing.count += n
    else pieces[bin.room].push({ paper, count: n, classIndex: bin.classIndex })
    bin.used += n
  }

  // 1. Special-needs students → ground-floor rooms.
  const reserved = new Map<string, number>()
  const groundBins = bins.filter((b) => chosen[b.room].room.floor === 0)
  for (const p of [...order].filter((x) => x.special > 0).sort((a, b) => b.special - a.special)) {
    // The ground-floor class with the most free space, to spread these students out.
    const bin = groundBins
      .filter((b) => b.quota - b.used >= p.special && canUse(b, p.paper))
      .sort((a, b) => b.quota - b.used - (a.quota - a.used))[0]
    if (!bin) continue
    put(bin, p.paper, p.special)
    reserved.set(p.paper, p.special)
  }

  // 2. Everyone else, paper by paper, along the bins.
  let start = 0
  for (const p of order) {
    let n = p.count - (reserved.get(p.paper) ?? 0)
    while (start < bins.length && bins[start].used >= bins[start].quota) start++
    for (let b = start; n > 0; b++) {
      if (b >= bins.length) return null
      const bin = bins[b]
      const free = bin.quota - bin.used
      if (free <= 0 || !canUse(bin, p.paper)) continue
      const take = Math.min(n, free)
      put(bin, p.paper, take)
      n -= take
    }
  }
  return chosen.map((grid, r) => ({ grid, pieces: pieces[r] })).filter((r) => r.pieces.length > 0)
}

/** Tries a few layouts for a set of rooms: even fill first, packed rooms as a fallback. */
function fillRooms(chosen: RoomGrid[], papers: PaperInfo[], total: number): RoomAllocation[] | null {
  const bySize = [...papers].sort((a, b) => b.count - a.count || compareText(a.paper, b.paper))
  for (const mode of ['even', 'full'] as const) {
    const rooms = layout(chosen, bySize, total, mode)
    if (rooms) return rooms
  }
  return null
}

export function allocate(grids: RoomGrid[], students: Student[]): AllocationResult {
  const usable = grids.filter((g) => g.seats.length > 0)
  const byPaper = new Map<string, PaperInfo>()
  for (const s of students) {
    const p = byPaper.get(s.paper) ?? { paper: s.paper, count: 0, special: 0 }
    p.count++
    if (s.specialNeeds) p.special++
    byPaper.set(s.paper, p)
  }
  const papers = [...byPaper.values()].sort((a, b) => b.count - a.count || compareText(a.paper, b.paper))
  const total = students.length
  if (total === 0) return { ok: true, rooms: [], warnings: [] }

  const problem = explainInfeasible(usable, papers)
  if (problem) return { ok: false, problem }

  // Pick rooms: largest first (fewest rooms), ground floor breaks ties.
  const bySize = [...usable].sort((a, b) => b.seats.length - a.seats.length || roomOrder(a, b))
  const hasSpecial = papers.some((p) => p.special > 0)
  let k = 0
  let cap = 0
  while (cap < total) cap += bySize[k++].seats.length

  for (; k <= bySize.length; k++) {
    let chosen = bySize.slice(0, k)
    // Make sure special-needs students can sit on the ground floor if one exists.
    if (hasSpecial && !chosen.some((g) => g.room.floor === 0)) {
      const groundRoom = bySize.find((g) => g.room.floor === 0)
      if (groundRoom) chosen = [...chosen, groundRoom]
    }
    // A paper needs enough "one class per room" capacity among the chosen rooms.
    const perPaper = chosen.reduce((a, g) => a + paperCapacity(g), 0)
    if (papers[0].count > perPaper) continue
    const sorted = [...chosen].sort(roomOrder)
    const rooms = fillRooms(sorted, papers, total)
    if (rooms) return { ok: true, rooms, warnings: specialWarnings(rooms, papers) }
  }
  return {
    ok: false,
    problem: {
      title: "Couldn't fit everyone with this mix of papers",
      reasons: [
        `There are enough seats in total, but the papers don't split well across the rooms under this rule (for example ${papers[0].paper} has ${papers[0].count} students).`,
      ],
      suggestions: ['Add one more room.', 'Or relax the rule by one level (e.g. Strict → Basic).'],
    },
  }
}

function specialWarnings(rooms: RoomAllocation[], papers: PaperInfo[]): string[] {
  const groundPapers = new Set(rooms.filter((r) => r.grid.room.floor === 0).flatMap((r) => r.pieces.map((p) => p.paper)))
  const anyGround = rooms.some((r) => r.grid.room.floor === 0)
  const knownFloors = rooms.some((r) => r.grid.room.floor !== undefined)
  const missing = papers.filter((p) => p.special > 0 && !groundPapers.has(p.paper))
  if (!missing.length || !knownFloors) return []
  const n = missing.reduce((a, p) => a + p.special, 0)
  return [
    anyGround
      ? `${n} special-needs student${n === 1 ? '' : 's'} (${missing.map((p) => p.paper).join(', ')}) could not be placed on the ground floor; they have front-row seats instead.`
      : `No ground-floor room is in use, so ${n} special-needs student${n === 1 ? ' is' : 's are'} given front-row seats on upper floors.`,
  ]
}
