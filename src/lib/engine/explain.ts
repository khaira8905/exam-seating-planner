/**
 * Plain-language explanations for sessions (or rooms) that cannot be seated,
 * with concrete suggestions. Written for exam-cell staff, not programmers.
 */
import { fmt } from '../format'
import { RULE_BY_ID } from '../rules'
import type { Strictness } from '../types'
import { buildGrid, paperCapacity, type RoomGrid } from './grid'

export interface Infeasible {
  title: string
  reasons: string[]
  suggestions: string[]
}

interface PaperCount {
  paper: string
  count: number
}

const RELAX: Record<Strictness, Strictness | null> = {
  'very-strict': 'strict',
  strict: 'basic',
  bench: null,
  basic: null,
}

/** What a rule forbids, in words, for use inside sentences. */
function forbidden(rule: Strictness): string {
  switch (rule) {
    case 'basic':
      return 'side by side'
    case 'strict':
      return 'side by side or one behind the other'
    case 'very-strict':
      return 'side by side, front/back or diagonally'
    case 'bench':
      return 'on the same bench'
  }
}

/** Share of a room one paper can use, in words. */
function shareWords(rule: Strictness): string {
  switch (rule) {
    case 'basic':
    case 'strict':
      return 'about half'
    case 'very-strict':
      return 'about a quarter'
    case 'bench':
      return 'one seat per bench'
  }
}

/**
 * Session-level check before seating: are there enough seats overall, and can
 * each paper be spread thinly enough? Returns null when the session looks feasible.
 */
export function explainInfeasible(grids: RoomGrid[], papers: PaperCount[]): Infeasible | null {
  const rule = grids[0]?.rule ?? 'strict'
  const total = papers.reduce((a, p) => a + p.count, 0)
  const seats = grids.reduce((a, g) => a + g.seats.length, 0)
  const reasons: string[] = []
  const suggestions: string[] = []
  const avgRoom = grids.length ? seats / grids.length : 40

  if (total > seats) {
    const short = total - seats
    reasons.push(
      `You have ${fmt(total)} students but only ${fmt(seats)} usable seats in ${fmt(grids.length)} room${grids.length === 1 ? '' : 's'} — ${fmt(short)} seat${short === 1 ? '' : 's'} short, before any seating rule is applied.`,
    )
    suggestions.push(`Add rooms with at least ${fmt(short)} more seats (about ${Math.max(1, Math.ceil(short / avgRoom))} typical room${Math.ceil(short / avgRoom) > 1 ? 's' : ''}).`)
    suggestions.push('Or split this session into two sittings.')
    return { title: 'Not enough seats', reasons, suggestions }
  }

  const perPaper = grids.reduce((a, g) => a + paperCapacity(g), 0)
  const tooBig = papers.filter((p) => p.count > perPaper)
  if (tooBig.length) {
    const ruleName = RULE_BY_ID[rule].label
    for (const p of tooBig.slice(0, 3)) {
      reasons.push(
        `${p.paper} has ${fmt(p.count)} students, but in ${ruleName} mode no two ${p.paper} students may sit ${forbidden(rule)}, so one paper can use only ${shareWords(rule)} of each room — at most ${fmt(perPaper)} ${p.paper} seats across all ${fmt(grids.length)} rooms.`,
      )
    }
    const worst = tooBig[0]
    const extraPaperSeats = worst.count - perPaper
    const fraction = seats / Math.max(1, perPaper)
    suggestions.push(
      `Add rooms with about ${fmt(Math.ceil(extraPaperSeats * fraction))} more seats (${Math.max(1, Math.ceil((extraPaperSeats * fraction) / avgRoom))} typical room${Math.ceil((extraPaperSeats * fraction) / avgRoom) > 1 ? 's' : ''}).`,
    )
    const relaxed = RELAX[rule]
    if (relaxed) {
      const relaxedCap = grids.reduce((a, g) => a + paperCapacity(buildGrid(g.room, relaxed)), 0)
      if (tooBig.every((p) => p.count <= relaxedCap)) {
        suggestions.push(
          `Or relax the rule to ${RULE_BY_ID[relaxed].label} (${RULE_BY_ID[relaxed].short}) — that allows up to ${fmt(relaxedCap)} ${worst.paper} seats.`,
        )
      }
    }
    suggestions.push(`Or seat ${worst.paper} in two sittings (split its students across two sessions).`)
    return { title: tooBig.length === 1 ? `${worst.paper} is too big for these rooms` : 'Some papers are too big for these rooms', reasons, suggestions }
  }
  return null
}

/**
 * Explains why one room can't take a given mix, in the style
 * "Maths needs 16 separated seats but Room 204 allows only 15 in strict mode".
 */
export function explainRoom(g: RoomGrid, demands: { paper: string; count: number }[]): string[] {
  const out: string[] = []
  const cap = paperCapacity(g)
  const total = demands.reduce((a, d) => a + d.count, 0)
  const ruleName = RULE_BY_ID[g.rule].label.toLowerCase()
  if (total > g.seats.length) {
    out.push(`Room ${g.room.name} has ${fmt(g.seats.length)} usable seats but ${fmt(total)} students were sent to it.`)
  }
  for (const d of demands) {
    if (d.count > cap) {
      const relaxed = RELAX[g.rule]
      out.push(
        `${d.paper} needs ${fmt(d.count)} separated seats but Room ${g.room.name} allows only ${fmt(cap)} in ${ruleName} mode — add a room${
          relaxed ? ` or relax to ${RULE_BY_ID[relaxed].label} (${RULE_BY_ID[relaxed].short})` : ''
        }.`,
      )
    }
  }
  return out
}
