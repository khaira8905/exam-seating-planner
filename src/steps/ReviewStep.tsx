import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { usePlanView } from '../app/planView'
import { useStore } from '../app/store'
import { PaperLegend } from '../components/review/PaperLegend'
import { ChangesPanel, ReplanPanel } from '../components/review/ReplanPanel'
import { RoomList } from '../components/review/RoomList'
import { RoomsOverview } from '../components/review/RoomsOverview'
import { SeatDetails } from '../components/review/SeatDetails'
import { SeatGrid } from '../components/review/SeatGrid'
import { StudentSearch } from '../components/review/StudentSearch'
import { SummaryCards } from '../components/review/SummaryCards'
import { sessionLabel } from '../lib/format'
import { RULE_BY_ID } from '../lib/rules'

export function ReviewStep() {
  const { state, dispatch } = useStore()
  const view = usePlanView(state.plan)
  const reduce = useReducedMotion()
  const [roomId, setRoomIdRaw] = useState<string | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const [highlight, setHighlight] = useState<number | null>(null)
  const [changing, setChanging] = useState(false)
  const moved = useMemo(
    () => new Set([...(state.lastDiff?.moved ?? []), ...(state.lastDiff?.added ?? [])].map((m) => m.roll)),
    [state.lastDiff],
  )
  const setRoomId = (id: string | null) => {
    setRoomIdRaw(id)
    setActive(null)
  }

  if (!view) return null
  const { plan } = view
  const index = roomId ? view.rooms.findIndex((r) => r.room.id === roomId) : -1
  const room = index >= 0 ? view.rooms[index] : null
  // The overview fill-in wave takes up to ~1.8 s; the clash check "sweeps" right after it.
  const waveMs = reduce ? 0 : Math.min(1800, view.rooms.length * Math.min(90, 1800 / Math.max(1, view.rooms.length))) + 300

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Seating plan</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {plan.session.title ? `${plan.session.title} · ` : ''}
            {sessionLabel(plan.session)} · {RULE_BY_ID[plan.rule].label} rule ({RULE_BY_ID[plan.rule].short})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setChanging((v) => !v)}
          aria-expanded={changing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:border-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-900"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Make a change
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'goto', step: 'download' })}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
        >
          Download printouts <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        </div>
      </div>

      <AnimatePresence initial={false}>{changing && <ReplanPanel plan={plan} onClose={() => setChanging(false)} />}</AnimatePresence>
      <ChangesPanel
        key={plan.revision ?? 0}
        onShow={(name) => setRoomId(view.rooms.find((r) => r.room.name === name)?.room.id ?? null)}
      />

      <SummaryCards view={view} checkDelayMs={waveMs} />

      {plan.warnings.map((w) => (
        <p key={w} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {w}
        </p>
      ))}

      <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
        <aside className="space-y-3">
          <StudentSearch
            view={view}
            onFound={(id, seat) => {
              setRoomId(id)
              setHighlight(seat)
              setTimeout(() => setHighlight(null), 2500)
            }}
          />
          <div className="hidden lg:block">
            <RoomList rooms={view.rooms} selected={roomId} onSelect={setRoomId} paperColour={view.paperColour} />
          </div>
          <label className="block text-sm font-medium lg:hidden">
            Room
            <select
              value={roomId ?? ''}
              onChange={(e) => setRoomId(e.target.value || null)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">All rooms</option>
              {view.rooms.map((r) => (
                <option key={r.room.id} value={r.room.id}>
                  {r.room.name} ({r.used}/{r.usable})
                </option>
              ))}
            </select>
          </label>
        </aside>

        <section className="min-w-0" aria-label={room ? `Room ${room.room.name}` : 'All rooms'}>
          {!room ? (
            <div className="relative overflow-hidden">
              <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
                Click a room to open its seating chart. Colours are papers — every room mixes papers so neighbours never share one.
              </p>
              <RoomsOverview rooms={view.rooms} paperColour={view.paperColour} onOpen={setRoomId} waveKey={plan.id} />
              {!reduce && (
                <motion.div
                  key={plan.id}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-40 bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent dark:via-emerald-400/15"
                  initial={{ left: '-12rem' }}
                  animate={{ left: '110%' }}
                  transition={{ delay: waveMs / 1000, duration: 0.7, ease: 'easeInOut' }}
                />
              )}
            </div>
          ) : (
            <motion.div
              key={room.room.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Room {room.room.name}</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {room.used} students · {room.usable - room.used} empty · {room.room.rows} rows × {room.room.cols} seats
                    {room.room.seatsPerBench ? ` (benches of ${room.room.seatsPerBench})` : ''}
                    {room.room.floor !== undefined && ` · ${room.room.floor === 0 ? 'ground floor' : `floor ${room.room.floor}`}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={index <= 0}
                    onClick={() => setRoomId(view.rooms[index - 1].room.id)}
                    className="rounded-lg border border-slate-300 p-2 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                    aria-label="Previous room"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index >= view.rooms.length - 1}
                    onClick={() => setRoomId(view.rooms[index + 1].room.id)}
                    className="rounded-lg border border-slate-300 p-2 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                    aria-label="Next room"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className={`grid gap-5 ${room.room.cols > 8 ? '' : 'xl:grid-cols-[1fr_17rem]'}`}>
                <SeatGrid view={room} paperColour={view.paperColour} active={active} onActive={setActive} highlight={highlight} moved={moved} />
                <div className={room.room.cols > 8 ? 'grid gap-4 md:grid-cols-2' : 'space-y-4'}>
                  <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                    <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">Papers in this room</h3>
                    <PaperLegend view={room} paperColour={view.paperColour} />
                  </div>
                  <div className="min-h-40 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                    <SeatDetails view={room} seat={active} rule={plan.rule} paperColour={view.paperColour} paperNames={view.paperNames} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  )
}
