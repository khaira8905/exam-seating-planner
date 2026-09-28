import { Check } from 'lucide-react'
import { reachableSteps, STEP_LABELS, STEPS, useStore } from '../app/store'

export function Stepper() {
  const { state, dispatch } = useStore()
  const reachable = reachableSteps(state)
  const currentIndex = STEPS.indexOf(state.step)
  return (
    <nav aria-label="Progress" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <ol className="flex items-center gap-1 overflow-x-auto sm:gap-2">
        {STEPS.map((step, i) => {
          const active = step === state.step
          const done = i < currentIndex && reachable.has(step)
          const enabled = reachable.has(step) && !(step === 'generate' && state.status === 'solving')
          return (
            <li key={step} className="flex items-center gap-1 sm:gap-2">
              {i > 0 && <span className="h-px w-3 bg-slate-300 sm:w-8 dark:bg-slate-700" aria-hidden="true" />}
              <button
                type="button"
                disabled={!enabled}
                onClick={() => dispatch({ type: 'goto', step })}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 sm:px-3 ${
                  active
                    ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950'
                    : enabled
                      ? 'text-slate-700 hover:bg-slate-200/70 dark:text-slate-200 dark:hover:bg-slate-800'
                      : 'cursor-not-allowed text-slate-400 dark:text-slate-600'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    active ? 'bg-white/20' : done ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                  aria-hidden="true"
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {STEP_LABELS[step]}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
