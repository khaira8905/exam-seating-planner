import { CalendarClock } from 'lucide-react'
import { useMemo } from 'react'
import { useStore } from '../../app/store'
import { fmt } from '../../lib/format'
import { slotLabel, SLOTS, studentsInBothSessions } from '../../lib/sessions'

/** Morning / Evening switch, shown when one students file covered both sessions. */
export function SessionTabs() {
  const { state, dispatch } = useStore()
  const plans = state.sessionPlans
  const slots = SLOTS.filter((s) => plans[s])
  const both = useMemo(
    () => (plans.morning && plans.evening ? studentsInBothSessions(plans.morning.students, plans.evening.students) : []),
    [plans.morning, plans.evening],
  )
  if (slots.length < 2 || !state.plan) return null
  const active = state.plan.session.slot

  return (
    <section className="space-y-3">
      <div role="tablist" aria-label="Exam session" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {slots.map((slot) => {
          const p = plans[slot]!
          const selected = slot === active
          return (
            <button
              key={slot}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => dispatch({ type: 'switch-session', slot })}
              className={`rounded-lg px-4 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-teal-600 ${
                selected ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <span className="block font-semibold">{slotLabel(slot)} session</span>
              <span className={`block text-xs ${selected ? 'opacity-90' : 'text-slate-500'}`}>
                {fmt(p.stats.students)} students · {p.stats.roomsUsed} rooms · {p.stats.clashes} clashes
              </span>
            </button>
          )
        })}
      </div>
      <details className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
        <summary className="flex cursor-pointer items-center gap-2 font-medium">
          <CalendarClock className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          {both.length === 0
            ? 'No student writes in both sessions.'
            : `${fmt(both.length)} student${both.length === 1 ? ' writes' : 's write'} in both sessions — check this is intended`}
        </summary>
        {both.length > 0 && (
          <div className="mt-3 max-h-64 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-1 pr-3 font-medium">Roll no.</th>
                  <th className="py-1 pr-3 font-medium">Name</th>
                  <th className="py-1 pr-3 font-medium">Morning</th>
                  <th className="py-1 font-medium">Evening</th>
                </tr>
              </thead>
              <tbody>
                {both.slice(0, 200).map((b) => (
                  <tr key={b.roll} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1 pr-3 font-medium">{b.roll}</td>
                    <td className="py-1 pr-3">{b.name}</td>
                    <td className="py-1 pr-3">{b.morningPaper}</td>
                    <td className="py-1">{b.eveningPaper}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {both.length > 200 && <p className="mt-2 text-xs text-slate-500">Showing the first 200 of {fmt(both.length)}.</p>}
          </div>
        )}
      </details>
    </section>
  )
}
