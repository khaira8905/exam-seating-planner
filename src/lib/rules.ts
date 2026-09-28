import type { Strictness } from './types'

export interface RuleInfo {
  id: Strictness
  label: string
  short: string
  description: string
}

/** Human descriptions of the four rule levels (the logic lives in the engine and the checker). */
export const RULES: RuleInfo[] = [
  {
    id: 'basic',
    label: 'Basic',
    short: 'left / right',
    description: 'Students on the left and right must be writing a different paper.',
  },
  {
    id: 'strict',
    label: 'Strict',
    short: 'left / right / front / back',
    description: 'Left, right, front and back neighbours must all be writing different papers.',
  },
  {
    id: 'very-strict',
    label: 'Very strict',
    short: 'all 8 around, incl. diagonals',
    description: 'No one in the 8 seats around a student (including diagonals) writes the same paper.',
  },
  {
    id: 'bench',
    label: 'Bench mode',
    short: 'same bench',
    description:
      'No two students of the same paper share a bench. Rooms without benches fall back to the Basic rule.',
  },
]

export const RULE_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r])) as Record<Strictness, RuleInfo>
