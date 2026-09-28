/** Row 0 → "A", 25 → "Z", 26 → "AA", … (row A is the front row). */
export function rowLabel(row: number): string {
  let n = row + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

/** Seat label such as "C4" (row C, 4th seat from the left). */
export function seatLabel(row: number, col: number): string {
  return `${rowLabel(row)}${col + 1}`
}

/** Parses "C4" / "c 4" / "AA12" into zero-based row/col. Returns null if malformed. */
export function parseSeatLabel(label: string): { row: number; col: number } | null {
  const m = /^\s*([A-Za-z]{1,2})\s*-?\s*(\d{1,3})\s*$/.exec(label)
  if (!m) return null
  const letters = m[1].toUpperCase()
  let row = 0
  for (const ch of letters) row = row * 26 + (ch.charCodeAt(0) - 64)
  const col = Number(m[2]) - 1
  if (col < 0) return null
  return { row: row - 1, col }
}
