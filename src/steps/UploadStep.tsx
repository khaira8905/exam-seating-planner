import { ArrowRight, Download, FolderOpen, History, Lock, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from '../app/store'
import { useSolver } from '../app/useSolver'
import { DropZone } from '../components/DropZone'
import { saveFile, XLSX_MIME } from '../lib/download'
import { fmt } from '../lib/format'
import { generateEngineeringSample } from '../lib/sample/engineering'
import { generateSample, SAMPLE_PRESETS } from '../lib/sample/generate'
import type { Room, Student } from '../lib/types'
import { readPlanFile } from '../lib/io/planFile'
import { forgetSavedPlan, loadLatestPlan, type SavedPlan } from '../lib/storage'
import { sessionLabel } from '../lib/format'

export function UploadStep() {
  const { state, dispatch } = useStore()
  const { run } = useSolver()
  const [busy, setBusy] = useState<'students' | 'rooms' | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedPlan | null>(null)

  useEffect(() => {
    let alive = true
    void loadLatestPlan().then((p) => alive && setSaved(p))
    return () => {
      alive = false
    }
  }, [])

  async function readFile(kind: 'students' | 'rooms', file: File) {
    setBusy(kind)
    try {
      const sheet = await import('../lib/io/sheet')
      const data = await file.arrayBuffer()
      const grid = sheet.readGrid(data, file.name, kind === 'students' ? /student/i : /room/i)
      const guessed = sheet.guessKind(grid)
      if (guessed !== 'unknown' && guessed !== kind) {
        const msg = `This looks like a ${guessed} file. Please drop it in the "${guessed === 'students' ? 'Students' : 'Rooms'}" box.`
        const f = { fileName: file.name, count: 0, errors: [{ message: msg }], warnings: [] }
        if (kind === 'students') dispatch({ type: 'students', students: null, file: f })
        else dispatch({ type: 'rooms', rooms: null, file: f })
        return
      }
      const { parseRooms, parseStudents } = await import('../lib/io/parse')
      if (kind === 'students') {
        const r = parseStudents(grid)
        const f = { fileName: file.name, count: r.items.length, errors: r.errors, warnings: r.warnings }
        dispatch({ type: 'students', students: r.errors.length ? null : r.items, file: f })
      } else {
        const r = parseRooms(grid)
        const f = { fileName: file.name, count: r.items.length, errors: r.errors, warnings: r.warnings }
        dispatch({ type: 'rooms', rooms: r.errors.length ? null : r.items, file: f })
      }
    } catch (err) {
      const f = {
        fileName: file.name,
        count: 0,
        errors: [{ message: `Couldn't read this file (${err instanceof Error ? err.message : 'unknown error'}). Is it an Excel or CSV file?` }],
        warnings: [],
      }
      if (kind === 'students') dispatch({ type: 'students', students: null, file: f })
      else dispatch({ type: 'rooms', rooms: null, file: f })
    } finally {
      setBusy(null)
    }
  }

  function loadSample(students: number, rooms?: number): { students: Student[]; rooms: Room[] } {
    return showSample(generateSample({ students, rooms }), `Sample: ${fmt(students)} students`)
  }

  function showSample(data: { students: Student[]; rooms: Room[] }, label: string) {
    dispatch({ type: 'students', students: data.students, file: { fileName: `${label}.xlsx`, count: data.students.length, errors: [], warnings: [] } })
    dispatch({ type: 'rooms', rooms: data.rooms, file: { fileName: `Sample: ${data.rooms.length} rooms.xlsx`, count: data.rooms.length, errors: [], warnings: [] } })
    return data
  }

  async function trySample() {
    const data = loadSample(1200, 30)
    run({ ...data, rule: state.rule, method: state.method, session: state.session })
  }

  async function downloadTemplate(kind: 'students' | 'rooms') {
    const sheet = await import('../lib/io/sheet')
    const bytes = kind === 'students' ? sheet.studentsTemplate() : sheet.roomsTemplate()
    saveFile(`seatwise-${kind}-template.xlsx`, bytes, XLSX_MIME)
  }

  async function openPlan(file: File) {
    setOpenError(null)
    try {
      const plan = readPlanFile(await file.text())
      dispatch({ type: 'plan', plan })
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Could not open this plan file.')
    }
  }

  const ready = !!state.students?.length && !!state.rooms?.length

  return (
    <div className="space-y-8">
      {saved && !state.plan && (
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-start gap-2 text-sm">
            <History className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Continue where you left off?</strong> Your last plan ({fmt(saved.plan.stats.students)} students,{' '}
              {sessionLabel(saved.plan.session)}) is saved in this browser only.
            </span>
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'plan', plan: saved.plan })}
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-500 dark:text-slate-950"
            >
              Open it
            </button>
            <button
              type="button"
              onClick={() => {
                void forgetSavedPlan()
                setSaved(null)
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Forget it
            </button>
          </div>
        </section>
      )}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-teal-50/60 p-6 sm:p-8 dark:border-slate-800 dark:from-slate-900 dark:to-teal-950/30">
        <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Clash-free exam seating plans in seconds, not days.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          Upload your students and rooms, pick how strict the seating should be, and SeatWise builds a plan where no two
          students writing the same paper sit together — with seating charts, door lists and attendance sheets ready to print.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={trySample}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Try with sample data
            <span className="font-normal opacity-80">· 1,200 students, 30 rooms</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>or load a sample:</span>
            {SAMPLE_PRESETS.map((p) => (
              <button
                key={p.students}
                type="button"
                onClick={() => loadSample(p.students, p.rooms)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:border-teal-500 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-teal-300"
                title={p.label}
              >
                {fmt(p.students)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => showSample(generateEngineeringSample(), 'Sample: engineering, 1,200 students')}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:border-teal-500 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-teal-300"
              title="1,200 B.Tech students (CSE, ECE, ME, CE) writing 4 subjects, 30 rooms"
            >
              Engineering · 4 subjects
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <DropZone
          title="1 · Students"
          unit="students"
          hint="Roll number, name, course, paper code, special needs (optional)."
          file={state.studentsFile}
          busy={busy === 'students'}
          onFile={(f) => readFile('students', f)}
          footer={<TemplateLink onClick={() => downloadTemplate('students')} label="Students template (.xlsx)" />}
        />
        <DropZone
          title="2 · Rooms"
          unit="rooms"
          hint="Room, rows × seats per row (or benches × seats per bench), blocked seats, floor."
          file={state.roomsFile}
          busy={busy === 'rooms'}
          onFile={(f) => readFile('rooms', f)}
          footer={<TemplateLink onClick={() => downloadTemplate('rooms')} label="Rooms template (.xlsx)" />}
        />
      </div>

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 hover:text-teal-800 dark:text-slate-300 dark:hover:text-teal-300">
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
            Open a saved plan file (.json)
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) openPlan(f)
                e.target.value = ''
              }}
            />
          </label>
          {openError && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {openError}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={!ready}
          onClick={() => dispatch({ type: 'goto', step: 'rules' })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Continue to rules
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <aside className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <p>
          <strong className="font-semibold text-slate-800 dark:text-slate-200">Your data stays on this computer.</strong>{' '}
          Files are read and processed inside this browser tab; SeatWise has no server and sends nothing over the
          network. This keeps personal data of students under your control, in line with India&apos;s Digital
          Personal Data Protection (DPDP) Act, 2023.
        </p>
      </aside>
    </div>
  )
}

function TemplateLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-teal-400"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  )
}
