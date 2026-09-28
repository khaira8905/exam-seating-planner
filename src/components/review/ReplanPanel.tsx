import { ArrowRight, Loader2, RefreshCw, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { solverClient } from '../../app/solverClient'
import { useStore } from '../../app/store'
import { validateChange, type Change } from '../../lib/engine/replan'
import type { Infeasible } from '../../lib/engine/explain'
import type { Plan } from '../../lib/types'

type Kind = Change['type']

const TABS: { kind: Kind; label: string }[] = [
  { kind: 'add-student', label: 'Add student' },
  { kind: 'remove-student', label: 'Remove student' },
  { kind: 'room-unavailable', label: 'Room unavailable' },
  { kind: 'block-seat', label: 'Broken seat' },
]

const input =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950'

/** Last-minute changes: re-plans in the worker, moving as few students as possible. */
export function ReplanPanel({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { dispatch } = useStore()
  const [kind, setKind] = useState<Kind>('add-student')
  const [form, setForm] = useState({ roll: '', name: '', course: '', paper: '', needs: '', room: plan.roomOrder[0] ?? '', seat: '' })
  const [error, setError] = useState<string | null>(null)
  const [problem, setProblem] = useState<Infeasible | null>(null)
  const [busy, setBusy] = useState(false)
  const papers = [...new Set(plan.students.map((s) => s.paper))].sort()
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  function change(): Change {
    switch (kind) {
      case 'add-student':
        return {
          type: 'add-student',
          student: {
            roll: form.roll.trim(),
            name: form.name.trim() || form.roll.trim(),
            course: form.course.trim(),
            paper: form.paper.trim().toUpperCase(),
            ...(form.needs.trim() ? { specialNeeds: form.needs.trim() } : {}),
          },
        }
      case 'remove-student':
        return { type: 'remove-student', roll: form.roll.trim() }
      case 'room-unavailable':
        return { type: 'room-unavailable', roomId: form.room }
      case 'block-seat':
        return { type: 'block-seat', roomId: form.room, seat: form.seat.trim().toUpperCase() }
    }
  }

  async function apply() {
    const c = change()
    const invalid = validateChange(c, plan)
    setProblem(null)
    setError(invalid)
    if (invalid) return
    setBusy(true)
    try {
      const res = await solverClient.replan(plan, [c])
      if (res.ok) {
        dispatch({ type: 'replanned', plan: res.plan, diff: res.diff })
        setForm({ ...form, roll: '', name: '', seat: '' })
      } else setProblem(res.problem)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      aria-labelledby="replan-title"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="replan-title" className="font-semibold">
              Make a last-minute change
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">SeatWise re-plans and moves as few students as possible.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 dark:hover:bg-slate-800" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Kind of change">
          {TABS.map((t) => (
            <button
              key={t.kind}
              type="button"
              role="tab"
              aria-selected={kind === t.kind}
              onClick={() => {
                setKind(t.kind)
                setError(null)
                setProblem(null)
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-teal-600 ${
                kind === t.kind ? 'bg-white shadow-sm dark:bg-slate-950' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault()
            void apply()
          }}
        >
          {(kind === 'add-student' || kind === 'remove-student') && (
            <label className="text-sm font-medium">
              Roll no.
              <input value={form.roll} onChange={set('roll')} className={input} placeholder="CSE399" required />
            </label>
          )}
          {kind === 'add-student' && (
            <>
              <label className="text-sm font-medium">
                Name
                <input value={form.name} onChange={set('name')} className={input} />
              </label>
              <label className="text-sm font-medium">
                Paper code
                <input value={form.paper} onChange={set('paper')} className={input} list="replan-papers" required />
                <datalist id="replan-papers">
                  {papers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="text-sm font-medium">
                Course
                <input value={form.course} onChange={set('course')} className={input} />
              </label>
              <label className="text-sm font-medium">
                Special needs
                <input value={form.needs} onChange={set('needs')} className={input} placeholder="optional" />
              </label>
            </>
          )}
          {(kind === 'room-unavailable' || kind === 'block-seat') && (
            <label className="text-sm font-medium">
              Room
              <select value={form.room} onChange={set('room')} className={input} aria-label="Room to change">
                {plan.roomOrder.map((id) => (
                  <option key={id} value={id}>
                    {plan.rooms.find((r) => r.id === id)?.name ?? id}
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === 'block-seat' && (
            <label className="text-sm font-medium">
              Seat
              <input value={form.seat} onChange={set('seat')} className={input} placeholder="C4" required />
            </label>
          )}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Re-plan
            </button>
          </div>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {problem && (
          <div role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">{problem.title}</p>
            <ul className="mt-1 list-disc pl-5">
              {[...problem.reasons, ...problem.suggestions].map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.section>
  )
}

/** "What changed" after a re-plan. */
export function ChangesPanel({ onShow }: { onShow: (roomName: string) => void }) {
  const { state } = useStore()
  const diff = state.lastDiff
  const [open, setOpen] = useState(true)
  if (!diff) return null
  const rows = [
    ...diff.added.map((a) => ({ key: `a${a.roll}`, text: `${a.roll} added`, to: a.to, from: null })),
    ...diff.moved.map((m) => ({ key: `m${m.roll}`, text: `${m.roll} moved`, to: m.to, from: m.from })),
    ...diff.removed.map((r) => ({ key: `r${r.roll}`, text: `${r.roll} removed`, to: null, from: r.from })),
  ]
  return (
    <AnimatePresence>
      {open && (
        <motion.section
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">
              Re-planned: {diff.moved.length} moved · {diff.added.length} added · {diff.removed.length} removed · {diff.unchanged.toLocaleString('en-IN')} unchanged
            </p>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40" aria-label="Hide changes">
              <X className="h-4 w-4" />
            </button>
          </div>
          {state.plan?.changes?.length ? <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Changes so far: {state.plan.changes.join(' · ')}</p> : null}
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {rows.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{r.text}</span>
                {r.from && (
                  <span className="text-slate-600 dark:text-slate-400">
                    from {r.from.room} {r.from.seat}
                  </span>
                )}
                {r.to && (
                  <>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    <button type="button" onClick={() => onShow(r.to!.room)} className="font-medium text-teal-700 hover:underline dark:text-teal-400">
                      {r.to.room} {r.to.seat}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
