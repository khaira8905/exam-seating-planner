/**
 * Column definitions for the two input files. Headers are matched loosely
 * ("Roll No.", "roll_number", "Enrollment No" all work) so that exam cells can
 * upload the spreadsheets they already have.
 */

export interface ColumnDef<K extends string> {
  key: K
  header: string
  aliases: string[]
  required: boolean
  description: string
  example: string
}

export type StudentKey = 'roll' | 'name' | 'course' | 'paper' | 'paperName' | 'specialNeeds'
export type RoomKey = 'room' | 'rows' | 'seatsPerRow' | 'benchesPerRow' | 'seatsPerBench' | 'blocked' | 'floor'

export const STUDENT_COLUMNS: ColumnDef<StudentKey>[] = [
  {
    key: 'roll',
    header: 'Roll No',
    aliases: ['rollno', 'rollnumber', 'roll', 'rollnum', 'enrollmentno', 'enrolmentno', 'enrollmentnumber', 'regno', 'registrationno', 'registrationnumber', 'studentid', 'id'],
    required: true,
    description: 'Unique roll / enrolment number. Used to sort students and on every printout.',
    example: 'CSE301',
  },
  {
    key: 'name',
    header: 'Name',
    aliases: ['name', 'studentname', 'fullname', 'candidatename', 'nameofstudent'],
    required: true,
    description: 'Student name, printed on the attendance sheet.',
    example: 'Priya Sharma',
  },
  {
    key: 'course',
    header: 'Course',
    aliases: ['course', 'programme', 'program', 'branch', 'class', 'coursesemester', 'batch', 'department'],
    required: false,
    description: 'Course / branch and semester, e.g. "CSE Sem 3". Optional.',
    example: 'CSE Sem 3',
  },
  {
    key: 'paper',
    header: 'Paper Code',
    aliases: ['papercode', 'paper', 'subjectcode', 'subject', 'coursecode', 'examcode', 'paperid'],
    required: true,
    description: 'Code of the paper the student writes in this session. Students with the same code are never seated next to each other.',
    example: 'CS301',
  },
  {
    key: 'paperName',
    header: 'Paper Name',
    aliases: ['papername', 'subjectname', 'papertitle', 'subjecttitle', 'coursename', 'title'],
    required: false,
    description: 'Optional paper title, shown on door lists.',
    example: 'Data Structures',
  },
  {
    key: 'specialNeeds',
    header: 'Special Needs',
    aliases: ['specialneeds', 'specialneed', 'pwd', 'pwbd', 'accessibility', 'needs', 'disability', 'remarks'],
    required: false,
    description: 'Leave blank if none. Anything else (e.g. "Wheelchair", "Scribe") gets a front-row seat, on the ground floor when possible.',
    example: '',
  },
]

export const ROOM_COLUMNS: ColumnDef<RoomKey>[] = [
  {
    key: 'room',
    header: 'Room',
    aliases: ['room', 'roomno', 'roomnumber', 'roomname', 'hall', 'hallno', 'venue', 'classroom'],
    required: true,
    description: 'Room number or name, unique.',
    example: 'A-204',
  },
  {
    key: 'rows',
    header: 'Rows',
    aliases: ['rows', 'norows', 'numberofrows', 'rowcount', 'benchrows'],
    required: true,
    description: 'Number of rows, counted from the front (board) to the back.',
    example: '6',
  },
  {
    key: 'seatsPerRow',
    header: 'Seats Per Row',
    aliases: ['seatsperrow', 'seatsinrow', 'columns', 'cols', 'seats', 'seatsrow'],
    required: false,
    description: 'Seats in each row. Give either this, or Benches Per Row × Seats Per Bench.',
    example: '8',
  },
  {
    key: 'benchesPerRow',
    header: 'Benches Per Row',
    aliases: ['benchesperrow', 'benches', 'benchesinrow'],
    required: false,
    description: 'Optional: benches in each row (use with Seats Per Bench).',
    example: '',
  },
  {
    key: 'seatsPerBench',
    header: 'Seats Per Bench',
    aliases: ['seatsperbench', 'perbench', 'benchsize', 'seatsonbench'],
    required: false,
    description: 'Optional: students per bench (e.g. 2). Leave blank for individual seats.',
    example: '',
  },
  {
    key: 'blocked',
    header: 'Blocked Seats',
    aliases: ['blockedseats', 'blocked', 'unusableseats', 'unusable', 'brokenseats', 'excludedseats'],
    required: false,
    description: 'Seats that cannot be used, e.g. "A1, C4" or a range "B1-B3". Row A is the front row, seat 1 is on the left facing the board.',
    example: 'D4',
  },
  {
    key: 'floor',
    header: 'Floor',
    aliases: ['floor', 'level', 'floorno'],
    required: false,
    description: 'Optional. 0 or "G" = ground floor. Used to seat special-needs students on the ground floor.',
    example: '2',
  },
]

/** "Roll No." → "rollno", "Seats/Row" → "seatsrow". */
export function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}
