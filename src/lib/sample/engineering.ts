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

const EVENING_BRANCHES = [
  { course: 'CSE', paper: 'CS501', paperName: 'Operating Systems', n: 300 },
  { course: 'ECE', paper: 'EC501', paperName: 'Digital Communication', n: 250 },
  { course: 'ME', paper: 'MD501', paperName: 'Machine Design', n: 200 },
  { course: 'CE', paper: 'CV501', paperName: 'Geotechnical Engineering', n: 150 },
] as const

/**
 * A full exam day in one file (Session column): the 1,200 Sem 3 students in
 * the morning; 900 Sem 5 students in the evening, plus 30 Sem 3 students
 * re-sitting a maths paper — they appear in both sessions.
 */
export function generateTwoSessionSample(): SampleData {
  const { students: morning, rooms } = generateEngineeringSample()
  const rng = createRng(5151)
  const evening: Student[] = EVENING_BRANCHES.flatMap((b) =>
    Array.from({ length: b.n }, (_, i) => {
      const s: Student = {
        roll: `${b.course}5${String(i + 1).padStart(3, '0')}`,
        name: `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`,
        course: `B.Tech ${b.course} Sem 5`,
        paper: b.paper,
        paperName: b.paperName,
        slot: 'evening',
      }
      if (rng.chance(0.015)) s.specialNeeds = rng.pick(SPECIAL_NEEDS)
      return s
    }),
  )
  // Every 40th Sem 3 student also re-sits Engineering Mathematics III in the evening.
  const resits: Student[] = morning
    .filter((_, i) => i % 40 === 7)
    .map((s) => ({ roll: s.roll, name: s.name, course: s.course, paper: 'MA201', paperName: 'Engineering Mathematics III (re-sit)', slot: 'evening' }))
  return { students: [...morning.map((s) => ({ ...s, slot: 'morning' as const })), ...evening, ...resits], rooms }
}
