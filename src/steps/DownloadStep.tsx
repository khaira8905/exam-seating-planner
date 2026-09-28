import { ArrowLeft, FileDown, FileSpreadsheet, FileText, Loader2, PackageOpen, Save } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { usePlanView } from '../app/planView'
import { useStore } from '../app/store'
import { saveFile, XLSX_MIME } from '../lib/download'
import { REPORT_LIST, type ReportKind } from '../lib/export/catalog'
import { fileStem, fmt } from '../lib/format'
import { serialisePlan } from '../lib/io/planFile'

type Busy = `${ReportKind}-pdf` | `${ReportKind}-xlsx` | 'zip' | null

export function DownloadStep() {
  const { state, dispatch } = useStore()
  const view = usePlanView(state.plan)
  const [busy, setBusy] = useState<Busy>(null)
  const [zipProgress, setZipProgress] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!view) return null
  const stem = fileStem(view.plan.session)

  async function guard(key: Busy, fn: () => Promise<void>) {
    setBusy(key)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(`Couldn't create the file: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(null)
      setZipProgress(null)
    }
  }

  const pdf = (kind: ReportKind) =>
    guard(`${kind}-pdf`, async () => {
      const { PDF_BUILDERS, renderPdf } = await import('../lib/export/pdf')
      saveFile(`${stem}-${kind}.pdf`, await renderPdf(PDF_BUILDERS[kind](view)), 'application/pdf')
    })
  const xlsx = (kind: ReportKind) =>
    guard(`${kind}-xlsx`, async () => {
      const { XLSX_BUILDERS } = await import('../lib/export/excel')
      saveFile(`${stem}-${kind}.xlsx`, XLSX_BUILDERS[kind](view), XLSX_MIME)
    })
  const zip = () =>
    guard('zip', async () => {
      const { buildZip } = await import('../lib/export/bundle')
      const bytes = await buildZip(view, (done, total) => setZipProgress([done, total]))
      saveFile(`${stem}-all.zip`, bytes, 'application/zip')
    })

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:border-teal-500 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-50 dark:border-slate-700 dark:hover:text-teal-300'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Download printouts</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fmt(view.plan.stats.students)} students in {fmt(view.plan.stats.roomsUsed)} rooms · every file is created on this computer.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-teal-900 dark:bg-teal-950/40">
        <div>
          <h2 className="font-semibold">Everything in one ZIP</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">All five PDFs, the same as Excel files, and the plan file to reopen later.</p>
        </div>
        <button
          type="button"
          onClick={zip}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-60 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
        >
          {busy === 'zip' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PackageOpen className="h-4 w-4" aria-hidden="true" />}
          {busy === 'zip' && zipProgress ? `Preparing ${zipProgress[0]}/${zipProgress[1]}…` : 'Download all (ZIP)'}
        </button>
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {REPORT_LIST.map((r, i) => (
          <motion.li
            key={r.kind}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">{r.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{r.description}</p>
              </div>
            </div>
            <div className="flex gap-2 pl-8">
              <button type="button" className={btn} disabled={busy !== null} onClick={() => pdf(r.kind)} aria-label={`${r.title} as PDF`}>
                {busy === `${r.kind}-pdf` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}
                PDF
              </button>
              <button type="button" className={btn} disabled={busy !== null} onClick={() => xlsx(r.kind)} aria-label={`${r.title} as Excel`}>
                {busy === `${r.kind}-xlsx` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
                Excel
              </button>
            </div>
          </motion.li>
        ))}
        <li className="flex flex-col justify-between gap-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <Save className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Plan file</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Save the plan as a file on your computer. Open it later (Upload step) to view, re-plan or print again.
              </p>
            </div>
          </div>
          <div className="pl-8">
            <button type="button" className={btn} onClick={() => saveFile(`${stem}.seatwise.json`, serialisePlan(view.plan), 'application/json')}>
              <Save className="h-4 w-4" aria-hidden="true" /> Save plan file
            </button>
          </div>
        </li>
      </ul>

      <button
        type="button"
        onClick={() => dispatch({ type: 'goto', step: 'review' })}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200/60 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the plan
      </button>
    </div>
  )
}
