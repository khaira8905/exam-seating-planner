import { AlertOctagon, ArrowLeft, Lightbulb } from 'lucide-react'
import { useStore } from '../app/store'

export function GenerateStep() {
  const { state, dispatch } = useStore()
  const { progress, problem, status } = state

  if (status === 'failed' && problem) {
    return (
      <section role="alert" className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <AlertOctagon className="mt-0.5 h-6 w-6 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{problem.title}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-700 dark:text-slate-300">
              {problem.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            {problem.suggestions.length > 0 && (
              <div className="mt-5 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/40">
                <p className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
                  <Lightbulb className="h-4 w-4" aria-hidden="true" /> How to fix it
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900 dark:text-amber-100">
                  {problem.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => dispatch({ type: 'goto', step: 'rules' })}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-teal-600 dark:bg-slate-100 dark:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to rules
            </button>
          </div>
        </div>
      </section>
    )
  }

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const stepLabel =
    progress?.phase === 'seating'
      ? `Seating room ${progress.room ?? ''} (${progress.done + 1} of ${progress.total})`
      : progress?.phase === 'checking'
        ? 'Double-checking every seat…'
        : 'Allocating students to rooms…'
  const label = progress?.session ? `${progress.session} session · ${stepLabel}` : stepLabel
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-live="polite">
      <h2 className="text-lg font-semibold">Generating your plan</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{label}</p>
      <progress
        value={pct}
        max={100}
        aria-label="Progress"
        className="mx-auto mt-6 block h-2 w-full max-w-md appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-teal-600 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-teal-600 [&::-webkit-progress-value]:transition-[width] dark:[&::-webkit-progress-bar]:bg-slate-800 dark:[&::-webkit-progress-value]:bg-teal-400"
      />
    </section>
  )
}
