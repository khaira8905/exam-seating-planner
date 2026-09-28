import { useMemo } from 'react'
import { useStore } from '../app/store'
import { buildGrid, paperCapacity } from '../lib/engine/grid'
import { groupByPaper } from '../lib/engine/solve'
import { fmt } from '../lib/format'

/** Live summary of the inputs under the chosen rule, shown before generating. */
export function FeasibilityPreview() {
  const { state } = useStore()
  const { students, rooms, rule } = state
  const summary = useMemo(() => {
    if (!students || !rooms) return null
    const grids = rooms.map((r) => buildGrid(r, rule))
    const seats = grids.reduce((a, g) => a + g.seats.length, 0)
    const perPaper = grids.reduce((a, g) => a + paperCapacity(g), 0)
    const papers = [...groupByPaper(students).entries()].sort((a, b) => b[1].length - a[1].length)
    return { seats, perPaper, papers: papers.length, biggest: papers[0] }
  }, [students, rooms, rule])
  if (!summary) return null
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold">At a glance</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Students" value={fmt(students!.length)} />
        <Stat label="Papers" value={fmt(summary.papers)} />
        <Stat label="Usable seats" value={`${fmt(summary.seats)} in ${fmt(rooms!.length)} rooms`} />
        <Stat
          label="Largest paper"
          value={summary.biggest ? `${summary.biggest[0]} · ${fmt(summary.biggest[1].length)}` : '—'}
        />
      </dl>
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
