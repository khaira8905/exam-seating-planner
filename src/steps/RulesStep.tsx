import { ArrowLeft, Cpu, Play, Zap } from 'lucide-react'
import { useStore } from '../app/store'
import { useSolver } from '../app/useSolver'
import { fmt } from '../lib/format'
import { RULES } from '../lib/rules'
import type { Strictness } from '../lib/types'
import { FeasibilityPreview } from '../components/FeasibilityPreview'

/** 3×3 neighbourhood picture: centre = the student, red = must be a different paper. */
function RuleDiagram({ rule }: { rule: Strictness }) {
  if (rule === 'bench') {
    return (
      <div className="flex gap-2" aria-hidden="true">
        {[0, 1].map((b) => (
          <div key={b} className="flex gap-0.5 rounded-md border border-slate-300 p-0.5 dark:border-slate-600">
            {[0, 1].map((s) => {
              const me = b === 0 && s === 0
              const bad = b === 0 && s === 1
              return (
                <span
                  key={s}
                  className={`h-4 w-4 rounded-sm ${me ? 'bg-slate-800 dark:bg-slate-200' : bad ? 'bg-red-400 dark:bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                />
              )
            })}
          </div>
        ))}
      </div>
    )
  }
  const forbidden = (r: number, c: number) => {
    if (r === 1 && c === 1) return false
    const side = r === 1
    const fb = c === 1
    if (rule === 'basic') return side
    if (rule === 'strict') return side || fb
    return true
  }
  return (
    <div className="grid grid-cols-3 gap-0.5" aria-hidden="true">
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => (
          <span
            key={`${r}${c}`}
            className={`h-4 w-4 rounded-sm ${
              r === 1 && c === 1 ? 'bg-slate-800 dark:bg-slate-200' : forbidden(r, c) ? 'bg-red-400 dark:bg-red-500' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        )),
      )}
    </div>
  )
}

export function RulesStep() {
  const { state, dispatch } = useStore()
  const { run } = useSolver()
  const { session } = state
  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950'

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Exam session</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Date
            <input
              type="date"
              value={session.date}
              onChange={(e) => dispatch({ type: 'session', session: { date: e.target.value } })}
              className={inputClass}
            />
          </label>
          <fieldset>
            <legend className="text-sm font-medium">Session</legend>
            <div className="mt-1 flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700" role="radiogroup">
              {(['morning', 'evening'] as const).map((slot) => (
                <label
                  key={slot}
                  className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-medium capitalize has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal-600 ${
                    session.slot === slot ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="slot"
                    value={slot}
                    checked={session.slot === slot}
                    onChange={() => dispatch({ type: 'session', session: { slot } })}
                    className="sr-only"
                  />
                  {slot}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-medium">
            Exam name (printed on sheets)
            <input
              type="text"
              value={session.title ?? ''}
              onChange={(e) => dispatch({ type: 'session', session: { title: e.target.value } })}
              className={inputClass}
              placeholder="End-Semester Examination"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">How strict should the seating be?</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Red squares show neighbours who must be writing a <em>different</em> paper.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Rule strictness">
          {RULES.map((r) => {
            const active = state.rule === r.id
            return (
              <label
                key={r.id}
                className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal-600 ${
                  active
                    ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600 dark:border-teal-500 dark:bg-teal-950/40 dark:ring-teal-500'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                }`}
              >
                <input type="radio" name="rule" value={r.id} checked={active} onChange={() => dispatch({ type: 'rule', rule: r.id })} className="sr-only" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{r.label}</span>
                  <RuleDiagram rule={r.id} />
                </div>
                <span className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">{r.short}</span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{r.description}</span>
              </label>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Seating method</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Seating method">
          {(
            [
              ['optimised', Cpu, 'Optimised (recommended)', 'An optimisation model solved with HiGHS: special-needs students in the front row, empty seats spread evenly.'],
              ['pattern', Zap, 'Quick pattern', 'A fast chessboard-style pattern. Always clash-free, but less polished.'],
            ] as const
          ).map(([id, Icon, label, desc]) => (
            <label
              key={id}
              className={`flex cursor-pointer gap-3 rounded-xl border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal-600 ${
                state.method === id ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600 dark:border-teal-500 dark:bg-teal-950/40 dark:ring-teal-500' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <input type="radio" name="method" checked={state.method === id} onChange={() => dispatch({ type: 'method', method: id })} className="sr-only" />
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-slate-600 dark:text-slate-300">{desc}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <FeasibilityPreview />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => dispatch({ type: 'goto', step: 'upload' })}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200/60 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
        <button
          type="button"
          onClick={() =>
            run({ students: state.students!, rooms: state.rooms!, rule: state.rule, method: state.method, session: state.session })
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          Generate plan for {fmt(state.students?.length ?? 0)} students
        </button>
      </div>
    </div>
  )
}
