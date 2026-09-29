import type { Student } from '../types'
import { FIRST_NAMES, SPECIAL_NEEDS, SURNAMES } from './catalog'
import { generateSample, type SampleData } from './generate'
import { createRng } from './random'

/** Four B.Tech Sem 3 branches, each writing one subject. */
export const ENGINEERING_BRANCHES = [
  { course: 'CSE', paper: 'CS301', paperName: 'Data Structures', n: 360 },
  { course: 'ECE', paper: 'EC301', paperName: 'Signals and Systems', n: 300 },
  { course: 'ME', paper: 'TD301', paperName: 'Thermodynamics', n: 300 },
  { course: 'CE', paper: 'CV301', paperName: 'Structural Analysis', n: 240 },
] as const

/**
 * Engineering-only session: 1,200 students writing 4 subjects, in 30 rooms.
 * Few, large papers are the hardest case for "no neighbour writes the same paper".
 */
export function generateEngineeringSample(): SampleData {
  const rng = createRng(4242)
  const students: Student[] = ENGINEERING_BRANCHES.flatMap((b) =>
    Array.from({ length: b.n }, (_, i) => {
      const s: Student = {
        roll: `${b.course}3${String(i + 1).padStart(3, '0')}`,
        name: `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`,
        course: `B.Tech ${b.course} Sem 3`,
        paper: b.paper,
        paperName: b.paperName,
      }
      if (rng.chance(0.015)) s.specialNeeds = rng.pick(SPECIAL_NEEDS)
      return s
    }),
  )
  const { rooms } = generateSample({ students: 1200, rooms: 30, seed: 2026 })
  return { students, rooms }
}
