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

/**
 * Builds the ZIP for one plan, or for several sessions (one folder each,
 * e.g. morning/ and evening/) when one students file covered both sessions.
 */
export async function buildZip(views: PlanView | PlanView[], onProgress?: (done: number, total: number) => void): Promise<Uint8Array> {
  const list = Array.isArray(views) ? views : [views]
  const zip = new JSZip()
  const total = list.length * (REPORTS.length * 2 + 1)
  let done = 0
  const tick = () => onProgress?.(++done, total)
  for (const view of list) {
    const folder = list.length > 1 ? `${view.plan.session.slot}/` : ''
    await addPlanFiles(zip, view, folder, tick)
  }
  zip.file(
    'README.txt',
    [
      'SeatWise — exam seating plan',
      '',
      list.length > 1 ? 'One folder per session (morning/, evening/).' : '',
      'PDF files are ready to print. The excel/ folder has the same information as spreadsheets.',
      'The .seatwise.json file can be opened in SeatWise ("Open a saved plan file") to view or re-plan later.',
      '',
      'Generated in the browser: no student data was uploaded to any server.',
    ]
      .filter((line, i) => line || i !== 2)
      .join('\r\n'),
  )
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

async function addPlanFiles(zip: JSZip, view: PlanView, folder: string, tick: () => void) {
  const stem = fileStem(view.plan.session)
  for (const r of REPORTS) {
    zip.file(`${folder}${stem}-${r.kind}.pdf`, await renderPdf(PDF_BUILDERS[r.kind](view)))
    tick()
    zip.file(`${folder}excel/${stem}-${r.kind}.xlsx`, XLSX_BUILDERS[r.kind](view))
    tick()
  }
  const names = view.plan.invigilators ?? []
  if (names.length) {
    const per = view.plan.studentsPerInvigilator ?? DEFAULT_STUDENTS_PER_INVIGILATOR
    const duty = assignDuties(view, names, per)
    zip.file(`${folder}${stem}-invigilator-duties.pdf`, await renderPdf(dutyDoc(view, duty, per)))
    zip.file(`${folder}excel/${stem}-invigilator-duties.xlsx`, dutyXlsx(view, duty, per))
  }
  zip.file(`${folder}${stem}.seatwise.json`, serialisePlan(view.plan))
  tick()
}
