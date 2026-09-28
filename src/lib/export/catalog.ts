/** The five printouts (kept free of heavy imports so the UI can list them instantly). */
export type ReportKind = 'seating-charts' | 'door-lists' | 'master-list' | 'attendance-sheets' | 'summary'

export const REPORT_LIST: { kind: ReportKind; title: string; description: string }[] = [
  { kind: 'seating-charts', title: 'Room seating charts', description: 'One page per room: seat grid with paper and roll number, board at the top.' },
  { kind: 'door-lists', title: 'Door lists', description: 'Big room number and roll-number ranges per paper, to stick on each door.' },
  { kind: 'master-list', title: 'Master list', description: 'Every student → room and seat, sorted by roll number (for the notice board).' },
  { kind: 'attendance-sheets', title: 'Attendance sheets', description: 'Per room, in seat order: roll no., name, paper, answer sheet no., signature.' },
  { kind: 'summary', title: 'Summary', description: 'Students, rooms used, empty seats, clash-check result and time taken.' },
]
