/**
 * Writes the fake sample sessions and the blank templates as Excel files into
 * samples/, so people can try SeatWise with real files. All names are random.
 *
 *   npm run sample-files
 */
import fs from 'node:fs'
import { roomsTemplate, roomsToWorkbook, studentsTemplate, studentsToWorkbook } from '../src/lib/io/sheet'
import { generateSample, SAMPLE_PRESETS } from '../src/lib/sample/generate'
import { generateEngineeringSample } from '../src/lib/sample/engineering'

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
const eng = generateEngineeringSample()
fs.writeFileSync('samples/engineering-students-1200.xlsx', Buffer.from(studentsToWorkbook(eng.students)))
fs.writeFileSync('samples/engineering-rooms-30.xlsx', Buffer.from(roomsToWorkbook(eng.rooms)))
console.log(`Engineering (4 subjects): ${eng.students.length} students, ${eng.rooms.length} rooms`)
