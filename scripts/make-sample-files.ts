/**
 * Writes the fake sample sessions and the blank templates as Excel files into
 * samples/, so people can try SeatWise with real files. All names are random.
 *
 *   npm run sample-files
 */
import fs from 'node:fs'
import { roomsTemplate, roomsToWorkbook, studentsTemplate, studentsToWorkbook } from '../src/lib/io/sheet'
import { FIRST_NAMES, SPECIAL_NEEDS, SURNAMES } from '../src/lib/sample/catalog'
import { generateSample, SAMPLE_PRESETS } from '../src/lib/sample/generate'
import { createRng } from '../src/lib/sample/random'
import type { Student } from '../src/lib/types'

fs.mkdirSync('samples', { recursive: true })
fs.writeFileSync('samples/students-template.xlsx', Buffer.from(studentsTemplate()))
fs.writeFileSync('samples/rooms-template.xlsx', Buffer.from(roomsTemplate()))
for (const p of SAMPLE_PRESETS) {
  const { students, rooms } = generateSample({ students: p.students, rooms: p.rooms })
  fs.writeFileSync(`samples/students-${p.students}.xlsx`, Buffer.from(studentsToWorkbook(students)))
  fs.writeFileSync(`samples/rooms-for-${p.students}.xlsx`, Buffer.from(roomsToWorkbook(rooms)))
  console.log(`${p.label}: ${students.length} students, ${rooms.length} rooms`)
}

// Engineering-only session: 1,200 B.Tech Sem 3 students writing 4 subjects, 30 rooms.
const BRANCHES = [
  { course: 'CSE', paper: 'CS301', paperName: 'Data Structures', n: 360 },
  { course: 'ECE', paper: 'EC301', paperName: 'Signals and Systems', n: 300 },
  { course: 'ME', paper: 'TD301', paperName: 'Thermodynamics', n: 300 },
  { course: 'CE', paper: 'CV301', paperName: 'Structural Analysis', n: 240 },
]
const rng = createRng(4242)
const engineering: Student[] = BRANCHES.flatMap((b) =>
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
const { rooms: engineeringRooms } = generateSample({ students: 1200, rooms: 30, seed: 2026 })
fs.writeFileSync('samples/engineering-students-1200.xlsx', Buffer.from(studentsToWorkbook(engineering)))
fs.writeFileSync('samples/engineering-rooms-30.xlsx', Buffer.from(roomsToWorkbook(engineeringRooms)))
console.log(`Engineering (4 subjects): ${engineering.length} students, ${engineeringRooms.length} rooms`)
