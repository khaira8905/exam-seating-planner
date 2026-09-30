import { FileDown, FileSpreadsheet, Loader2, UserCheck } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useStore } from '../app/store'
import { saveFile, XLSX_MIME } from '../lib/download'
import { assignDuties, DEFAULT_STUDENTS_PER_INVIGILATOR, parseNames } from '../lib/export/duty'
import { fileStem } from '../lib/format'
import type { PlanView } from '../lib/planView'

/** Type invigilator names; SeatWise assigns them to rooms and prints a duty list. */
export function DutyCard({ view }: { view: PlanView }) {
  const { dispatch } = useStore()
  const id = useId()
  const plan = view.plan
  const [text, setText] = useState((plan.invigilators ?? []).join('\n'))
  const [per, setPer] = useState(plan.studentsPerInvigilator ?? DEFAULT_STUDENTS_PER_INVIGILATOR)
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null)
  const names = useMemo(() => parseNames(text), [text])
  const duty = useMemo(() => assignDuties(view, names, per), [view, names, per])
  const short = duty.rows.reduce((a, r) => a + r.missing, 0)
  const stem = fileStem(plan.session)

  // Keep the names in the plan (autosave, plan file and ZIP include them).
  const save = () => dispatch({ type: 'invigilators', names, perInvigilator: per })

  async function download(kind: 'pdf' | 'xlsx') {
    save()
    setBusy(kind)
    try {
      if (kind === 'pdf') {
        const { dutyDoc, renderPdf } = await import('../lib/export/pdf')
        saveFile(`${stem}-invigilator-duties.pdf`, await renderPdf(dutyDoc(view, duty, per)), 'application/pdf')
      } else {
        const { dutyXlsx } = await import('../lib/export/excel')
        saveFile(`${stem}-invigilator-duties.xlsx`, dutyXlsx(view, duty, per), XLSX_MIME)
      }
    } finally {
      setBusy(null)
    }
  }

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:border-teal-500 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-50 dark:border-slate-700 dark:hover:text-teal-300'

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-labelledby={`${id}-title`}>
      <div className="flex items-start gap-3">
        <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} className="font-semibold">
            Invigilator duty list
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Paste invigilator names, one per line. SeatWise assigns them to rooms in order and prints a duty sheet with signature boxes.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem]">
            <label className="text-sm font-medium" htmlFor={`${id}-names`}>
              Invigilators
              <textarea
                id={`${id}-names`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={save}
                rows={5}
                placeholder={'Dr. Anita Sharma\nProf. Rahul Verma\nMs. Kavya Iyer'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <div className="space-y-3">
              <label className="block text-sm font-medium" htmlFor={`${id}-per`}>
                Students per invigilator
                <input
                  id={`${id}-per`}
                  type="number"
                  min={5}
                  max={200}
                  value={per}
                  onChange={(e) => setPer(Math.min(200, Math.max(5, Number(e.target.value) || DEFAULT_STUDENTS_PER_INVIGILATOR)))}
                  onBlur={save}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <p className="text-sm" aria-live="polite">
                Needed: <strong>{duty.needed}</strong> · entered: <strong>{names.length}</strong>
                <br />
                {names.length === 0 ? (
                  <span className="text-slate-500">Add names to create the list.</span>
                ) : short ? (
                  <span className="text-amber-700 dark:text-amber-300">{short} more needed</span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Every room covered{duty.reserves.length ? ` · ${duty.reserves.length} reserve${duty.reserves.length === 1 ? '' : 's'}` : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={btn} disabled={!names.length || busy !== null} onClick={() => download('pdf')} aria-label="Invigilator duty list as PDF">
              {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}
              PDF
            </button>
            <button type="button" className={btn} disabled={!names.length || busy !== null} onClick={() => download('xlsx')} aria-label="Invigilator duty list as Excel">
              {busy === 'xlsx' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
              Excel
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
