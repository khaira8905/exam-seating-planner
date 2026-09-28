import { useMemo, useState } from 'react'
import { useStore } from '../app/store'
import { checkPlan } from '../lib/engine/checker'
import { fmt, formatMs } from '../lib/format'
import { RULE_BY_ID } from '../lib/rules'
import { seatLabel } from '../lib/seatLabel'

export function ReviewStep() {
  const { state } = useStore()
  const plan = state.plan!
  const [roomId, setRoomId] = useState(plan.roomOrder[0])
  const check = useMemo(() => checkPlan(plan), [plan])
  const room = plan.rooms.find((r) => r.id === roomId)!
  const byRoll = useMemo(() => new Map(plan.students.map((s) => [s.roll, s])), [plan])
  const seats = plan.seats.filter((s) => s.roomId === roomId)
  const at = new Map(seats.map((s) => [s.row * room.cols + s.col, s]))
  const blocked = new Set(room.blocked)

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Students', fmt(plan.stats.students)],
          ['Rooms used', fmt(plan.stats.roomsUsed)],
          ['Empty seats', fmt(plan.stats.emptySeats)],
          ['Clash check', `${check.clashes.length + check.problems.length} clashes (${RULE_BY_ID[plan.rule].label})`],
          ['Time taken', formatMs(plan.stats.timeMs)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <dt className="text-xs text-slate-500">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <label className="block text-sm font-medium">
        Room
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="ml-2 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
          {plan.roomOrder.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <div className="overflow-x-auto">
        <p className="mb-2 text-center text-xs font-semibold tracking-widest text-slate-500 uppercase">Front · board</p>
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${room.cols}, minmax(4.5rem, 1fr))` }}>
          {Array.from({ length: room.rows * room.cols }, (_, i) => {
            const a = at.get(i)
            const label = seatLabel(Math.floor(i / room.cols), i % room.cols)
            const st = a && byRoll.get(a.roll)
            return (
              <div key={i} className={`rounded border px-1 py-1 text-center text-xs ${blocked.has(label) ? 'bg-slate-300 dark:bg-slate-700' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="text-[10px] text-slate-400">{label}</div>
                <div className="font-semibold">{st?.paper ?? ''}</div>
                <div>{st?.roll ?? ''}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
