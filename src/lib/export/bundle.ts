/** "Download all": every PDF and Excel file plus the plan file, in one ZIP. */
import JSZip from 'jszip'
import { fileStem } from '../format'
import { serialisePlan } from '../io/planFile'
import type { PlanView } from '../planView'
import { assignDuties, DEFAULT_STUDENTS_PER_INVIGILATOR } from './duty'
import { dutyXlsx, XLSX_BUILDERS } from './excel'
import { REPORT_LIST } from './catalog'
import { dutyDoc, PDF_BUILDERS, renderPdf } from './pdf'

export const REPORTS = REPORT_LIST

export async function buildZip(view: PlanView, onProgress?: (done: number, total: number) => void): Promise<Uint8Array> {
  const zip = new JSZip()
  const stem = fileStem(view.plan.session)
  const total = REPORTS.length * 2 + 1
  let done = 0
  const tick = () => onProgress?.(++done, total)
  for (const r of REPORTS) {
    zip.file(`${stem}-${r.kind}.pdf`, await renderPdf(PDF_BUILDERS[r.kind](view)))
    tick()
    zip.file(`excel/${stem}-${r.kind}.xlsx`, XLSX_BUILDERS[r.kind](view))
    tick()
  }
  const names = view.plan.invigilators ?? []
  if (names.length) {
    const per = view.plan.studentsPerInvigilator ?? DEFAULT_STUDENTS_PER_INVIGILATOR
    const duty = assignDuties(view, names, per)
    zip.file(`${stem}-invigilator-duties.pdf`, await renderPdf(dutyDoc(view, duty, per)))
    zip.file(`excel/${stem}-invigilator-duties.xlsx`, dutyXlsx(view, duty, per))
  }
  zip.file(`${stem}.seatwise.json`, serialisePlan(view.plan))
  tick()
  zip.file(
    'README.txt',
    [
      'SeatWise — exam seating plan',
      '',
      'PDF files are ready to print. The excel/ folder has the same information as spreadsheets.',
      `${stem}.seatwise.json can be opened in SeatWise ("Open a saved plan file") to view or re-plan later.`,
      '',
      'Generated in the browser: no student data was uploaded to any server.',
    ].join('\r\n'),
  )
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}
