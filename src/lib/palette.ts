/**
 * Paper colours: calm, distinguishable hues with dark text in light mode and
 * light text in dark mode (both ≥ 4.5:1 contrast). Papers that share a room
 * get different colours (greedy graph colouring), so a room never shows two
 * papers in the same colour unless it has more papers than colours.
 */
export interface PaperColour {
  light: string
  lightBorder: string
  dark: string
  darkBorder: string
  /** Solid swatch used for dots in the overview. */
  solid: string
}

export const PALETTE: PaperColour[] = [
  { light: '#dbeafe', lightBorder: '#93c5fd', dark: '#1e3a8a', darkBorder: '#3b82f6', solid: '#3b82f6' },
  { light: '#fde68a', lightBorder: '#f59e0b', dark: '#78350f', darkBorder: '#d97706', solid: '#f59e0b' },
  { light: '#d1fae5', lightBorder: '#6ee7b7', dark: '#064e3b', darkBorder: '#10b981', solid: '#10b981' },
  { light: '#fce7f3', lightBorder: '#f9a8d4', dark: '#831843', darkBorder: '#ec4899', solid: '#ec4899' },
  { light: '#ede9fe', lightBorder: '#c4b5fd', dark: '#4c1d95', darkBorder: '#8b5cf6', solid: '#8b5cf6' },
  { light: '#ffedd5', lightBorder: '#fdba74', dark: '#7c2d12', darkBorder: '#f97316', solid: '#f97316' },
  { light: '#cffafe', lightBorder: '#67e8f9', dark: '#164e63', darkBorder: '#06b6d4', solid: '#06b6d4' },
  { light: '#ecfccb', lightBorder: '#bef264', dark: '#365314', darkBorder: '#84cc16', solid: '#84cc16' },
  { light: '#fee2e2', lightBorder: '#fca5a5', dark: '#7f1d1d', darkBorder: '#ef4444', solid: '#ef4444' },
  { light: '#e0e7ff', lightBorder: '#a5b4fc', dark: '#312e81', darkBorder: '#6366f1', solid: '#6366f1' },
  { light: '#f5f5f4', lightBorder: '#a8a29e', dark: '#44403c', darkBorder: '#a8a29e', solid: '#78716c' },
  { light: '#ccfbf1', lightBorder: '#5eead4', dark: '#134e4a', darkBorder: '#14b8a6', solid: '#14b8a6' },
]

/** Assigns each paper a palette index so that papers sharing a room differ. */
export function assignPaperColours(roomsPapers: string[][]): Map<string, number> {
  const neighbours = new Map<string, Set<string>>()
  for (const papers of roomsPapers) {
    for (const p of papers) {
      const set = neighbours.get(p) ?? new Set<string>()
      for (const q of papers) if (q !== p) set.add(q)
      neighbours.set(p, set)
    }
  }
  const order = [...neighbours.keys()].sort((a, b) => neighbours.get(b)!.size - neighbours.get(a)!.size || a.localeCompare(b))
  const colour = new Map<string, number>()
  let rotate = 0
  for (const p of order) {
    const used = new Set([...neighbours.get(p)!].map((q) => colour.get(q)).filter((c) => c !== undefined))
    let c = -1
    for (let k = 0; k < PALETTE.length; k++) {
      const cand = (k + rotate) % PALETTE.length
      if (!used.has(cand)) {
        c = cand
        break
      }
    }
    if (c < 0) c = rotate % PALETTE.length
    colour.set(p, c)
    rotate++ // spread colours across the palette instead of reusing the first few
  }
  return colour
}
