import type { CSSProperties } from 'react'
import { PALETTE } from '../../lib/palette'

/** CSS variables for a paper's colour; used with the `paper-*` utility classes in index.css. */
export function paperStyle(colourIndex: number | undefined): CSSProperties {
  const c = PALETTE[(colourIndex ?? 0) % PALETTE.length]
  return {
    '--paper-bg': c.light,
    '--paper-border': c.lightBorder,
    '--paper-bg-dark': c.dark,
    '--paper-border-dark': c.darkBorder,
    '--paper-solid': c.solid,
  } as CSSProperties
}
