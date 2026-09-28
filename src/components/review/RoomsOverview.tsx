import type { RoomView } from '../../app/planView'
import { paperStyle } from './paperStyle'

interface Props {
  rooms: RoomView[]
  paperColour: Map<string, number>
  onOpen: (id: string) => void
  /** Changes whenever the plan changes, so the fill-in wave replays. */
  waveKey: string
}

/**
 * Every room as a mini-map. Seats fill in room by room with a staggered wave
 * (plain CSS animation, so thousands of seats stay smooth; disabled for
 * prefers-reduced-motion).
 */
export function RoomsOverview({ rooms, paperColour, onOpen, waveKey }: Props) {
  // Keep the whole wave under ~2.5 s however many rooms there are.
  const perRoom = Math.min(90, 1800 / Math.max(1, rooms.length))
  return (
    <ul key={waveKey} className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
      {rooms.map((r, ri) => {
        const { room, grid, bySeat } = r
        const bench = room.seatsPerBench ?? 1
        return (
          <li key={room.id}>
            <button
              type="button"
              onClick={() => onOpen(room.id)}
              className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-shadow hover:border-teal-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-teal-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-600"
              aria-label={`Room ${room.name}: ${r.used} of ${r.usable} seats, ${r.papers.length} papers. Open seating chart.`}
            >
              <span className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">{room.name}</span>
                <span className="text-xs text-slate-500">
                  {r.used}/{r.usable}
                </span>
              </span>
              <span className="mt-2 block h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                <span className="block h-1 rounded-full bg-teal-600 dark:bg-teal-400" style={{ width: `${(r.used / Math.max(1, r.usable)) * 100}%` }} />
              </span>
              <span
                className="mt-2.5 grid justify-center gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${room.cols}, ${room.cols > 10 ? 7 : 9}px)` }}
                aria-hidden="true"
              >
                {Array.from({ length: room.rows * room.cols }, (_, i) => {
                  const st = bySeat.get(i)
                  const c = i % room.cols
                  const rr = Math.floor(i / room.cols)
                  const gap = bench > 1 && (c + 1) % bench === 0 && c < room.cols - 1
                  return (
                    <span
                      key={i}
                      className={`aspect-square w-full rounded-[2px] ${
                        !grid.usable[i] ? 'bg-slate-300 dark:bg-slate-700' : st ? 'paper-dot animate-seat-in' : 'bg-slate-100 dark:bg-slate-800'
                      } ${gap ? 'mr-[3px]' : ''}`}
                      style={st ? { ...paperStyle(paperColour.get(st.paper)), animationDelay: `${ri * perRoom + (rr + c) * 12}ms` } : undefined}
                    />
                  )
                })}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
