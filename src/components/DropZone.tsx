import { CheckCircle2, FileSpreadsheet, Upload, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useRef, useState, type ReactNode } from 'react'
import type { InputFile } from '../app/store'
import { fmt } from '../lib/format'
import { IssueList } from './IssueList'

interface Props {
  title: string
  hint: ReactNode
  unit: string
  file: InputFile | null
  busy?: boolean
  onFile: (file: File) => void
  footer?: ReactNode
}

export function DropZone({ title, hint, unit, file, busy, onFile, footer }: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const ok = file && !file.errors.length

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 id={`${inputId}-title`} className="text-base font-semibold">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{hint}</p>
      {/* Drag-and-drop is a mouse shortcut; keyboard users use the file input inside the label. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const f = e.dataTransfer.files[0]
          if (f) onFile(f)
        }}
        className={`mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:outline-2 focus-within:outline-teal-600 ${
          over
            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40'
            : ok
              ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
              : file
                ? 'border-red-300 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20'
                : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />
        <AnimatePresence mode="wait" initial={false}>
          {busy ? (
            <motion.p key="busy" className="text-sm text-slate-600 dark:text-slate-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Reading file…
            </motion.p>
          ) : file ? (
            // New file "drops in" with a subtle scale + fade.
            <motion.div
              key={file.fileName + file.count + file.errors.length}
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, scale: 0.9, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              {ok ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden="true" />
              )}
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                {file.fileName}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {ok ? `${fmt(file.count)} ${unit} ready` : `${file.errors.length} problem${file.errors.length === 1 ? '' : 's'} to fix`}
                {' · '}
                <span className="text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">replace</span>
              </p>
            </motion.div>
          ) : (
            <motion.div key="empty" className="flex flex-col items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Upload className="h-7 w-7 text-slate-400" aria-hidden="true" />
              <p className="text-sm">
                <span className="font-medium text-teal-700 dark:text-teal-400">Choose a file</span> or drag it here
              </p>
              <p className="text-xs text-slate-500">Excel (.xlsx) or CSV</p>
            </motion.div>
          )}
        </AnimatePresence>
      </label>
      {file && <IssueList errors={file.errors} warnings={file.warnings} />}
      {footer && <div className="mt-auto pt-4">{footer}</div>}
    </section>
  )
}
