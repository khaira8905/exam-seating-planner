/**
 * Writes the fake sample sessions and the blank templates as Excel files into
 * samples/, so people can try SeatWise with real files. All names are random.
 *
 *   npm run sample-files
 */
import fs from 'node:fs'
import { roomsTemplate, roomsToWorkbook, studentsTemplate, studentsToWorkbook } from '../src/lib/io/sheet'
import { generateSample, SAMPLE_PRESETS } from '../src/lib/sample/generate'

fs.mkdirSync('samples', { recursive: true })
fs.writeFileSync('samples/students-template.xlsx', Buffer.from(studentsTemplate()))
fs.writeFileSync('samples/rooms-template.xlsx', Buffer.from(roomsTemplate()))
for (const p of SAMPLE_PRESETS) {
  const { students, rooms } = generateSample({ students: p.students, rooms: p.rooms })
  fs.writeFileSync(`samples/students-${p.students}.xlsx`, Buffer.from(studentsToWorkbook(students)))
  fs.writeFileSync(`samples/rooms-for-${p.students}.xlsx`, Buffer.from(roomsToWorkbook(rooms)))
  console.log(`${p.label}: ${students.length} students, ${rooms.length} rooms`)
}
