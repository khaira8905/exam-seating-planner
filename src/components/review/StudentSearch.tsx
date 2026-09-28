import { Search } from 'lucide-react'
import { useId, useState } from 'react'
import type { PlanView } from '../../app/planView'
import { seatLabel } from '../../lib/seatLabel'

/** Find a student by roll number or name and jump to their seat. */
export function StudentSearch({ view, onFound }: { view: PlanView; onFound: (roomId: string, seat: number) => void }) {
  const id = useId()
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  function find() {
    const term = q.trim().toLowerCase()
    if (!term) return
    const st =
      view.studentByRoll.get(q.trim()) ??
      view.plan.students.find((s) => s.roll.toLowerCase() === term) ??
      view.plan.students.find((s) => s.name.toLowerCase().includes(term) || s.roll.toLowerCase().includes(term))
    const seat = st && view.seatByRoll.get(st.roll)
    if (!st || !seat) {
      setMsg(`No student matches "${q.trim()}".`)
      return
    }
    const room = view.roomById.get(seat.roomId)!
    setMsg(`${st.roll} · ${st.name} → Room ${room.room.name}, seat ${seatLabel(seat.row, seat.col)}`)
    onFound(seat.roomId, seat.row * room.room.cols + seat.col)
  }

  return (
    <form
      aria-label="Find a student"
      onSubmit={(e) => {
        e.preventDefault()
        find()
      }}
      className="flex flex-col gap-1"
    >
      <label htmlFor={id} className="sr-only">
        Find a student by roll number or name
      </label>
      <div className="flex">
        <input
          id={id}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find roll no. or name"
          className="w-full min-w-0 rounded-l-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="submit"
          className="rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
      {msg && (
        <output className="text-xs text-slate-600 dark:text-slate-400">{msg}</output>
      )}
    </form>
  )
}
