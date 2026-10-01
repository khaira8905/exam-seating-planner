import { AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react'
import { useMemo } from 'react'
import { useStore } from '../app/store'
import { allocate } from '../lib/engine/allocate'
import { buildGrid } from '../lib/engine/grid'
import { groupByPaper } from '../lib/engine/solve'
import { fmt } from '../lib/format'
import { RULE_BY_ID } from '../lib/rules'
import { slotLabel, SLOTS, splitBySession } from '../lib/sessions'

/** Live check of the inputs under the chosen rule, shown before generating. */
export function FeasibilityPreview() {
  const { state } = useStore()
  const { students, rooms, rule } = state
  const result = useMemo(() => {
    if (!students || !rooms) return null
    const grids = rooms.map((r) => buildGrid(r, rule))
    const seats = grids.reduce((a, g) => a + g.seats.length, 0)
    const papers = [...groupByPaper(students).entries()].sort((a, b) => b[1].length - a[1].length)
    // With two sessions in one file, each session is checked on its own (same rooms).
    const split = splitBySession(students)
    const groups =
      split && split.size > 1
        ? SLOTS.filter((x) => split.has(x)).map((x) => ({ label: `${slotLabel(x)} session`, students: split.get(x)! }))
        : [{ label: '', students }]
    return { seats, papers, checks: groups.map((g) => ({ ...g, allocation: allocate(grids, g.students) })) }
  }, [students, rooms, rule])
  if (!result || !students || !rooms) return null
  const anyProblem = result.checks.some((c) => !c.allocation.ok)

  return (
    <section
      aria-live="polite"
      className={`rounded-2xl border bg-white p-5 text-sm shadow-sm dark:bg-slate-900 ${
        anyProblem ? 'border-amber-300 dark:border-amber-800' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Students" value={fmt(students.length)} />
        <Stat label="Papers" value={fmt(result.papers.length)} />
        <Stat label="Usable seats" value={`${fmt(result.seats)} in ${fmt(rooms.length)} rooms`} />
        <Stat label="Largest paper" value={result.papers[0] ? `${result.papers[0][0]} · ${fmt(result.papers[0][1].length)}` : '—'} />
      </dl>
      {result.checks.map(({ label, students: group, allocation }) => {
        const usedSeats = allocation.ok ? allocation.rooms.reduce((a, r) => a + r.grid.seats.length, 0) : 0
        const prefix = label ? `${label}: ` : ''
        return allocation.ok ? (
          <p key={label} className="mt-4 flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {prefix}
              {label ? `${fmt(group.length)} students fit` : 'Fits'} in <strong>{fmt(allocation.rooms.length)}</strong> of {fmt(rooms.length)} rooms under the{' '}
              {RULE_BY_ID[rule].label} rule (about {Math.round((group.length / Math.max(1, usedSeats)) * 100)}% of their seats used).
              {allocation.warnings.map((w) => (
                <span key={w} className="mt-1 block text-amber-800 dark:text-amber-300">
                  {w}
                </span>
              ))}
            </span>
          </p>
        ) : (
          <div key={label} className="mt-4">
            <p className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {prefix}
              {allocation.problem.title}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-700 dark:text-slate-300">
              {allocation.problem.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
              <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden="true" /> How to fix it
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-6 text-slate-700 dark:text-slate-300">
              {allocation.problem.suggestions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  )
}
