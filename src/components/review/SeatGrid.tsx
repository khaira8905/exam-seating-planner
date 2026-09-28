import { Accessibility } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { RoomView } from '../../app/planView'
import { seatLabel } from '../../lib/seatLabel'
import type { Student } from '../../lib/types'
import { paperStyle } from './paperStyle'

interface Props {
  view: RoomView
  paperColour: Map<string, number>
  /** Seat to highlight (e.g. a search result). */
  highlight?: number | null
  /** Students that moved in the last re-plan (pulse). */
  moved?: Set<string>
  onActive: (seat: number | null) => void
  active: number | null
}

/**
 * The seat chart of one room: front (board) at the top, row A first. Every
 * seat is a focusable cell; arrow keys move between seats. Hovering or
 * focusing a seat highlights its neighbours under the current rule.
 */
export function SeatGrid({ view, paperColour, highlight, moved, onActive, active }: Props) {
  const { room, grid, bySeat } = view
  const reduce = useReducedMotion()
  const [focusIndex, setFocusIndex] = useState(0)
  const cells = useRef<(HTMLButtonElement | null)[]>([])
  const bench = room.seatsPerBench ?? 1
  const neighbours = useMemo(() => new Set(active === null ? [] : grid.neighbours[active]), [active, grid])
  const waveStep = Math.min(0.03, 0.55 / Math.max(1, room.rows + room.cols))
  const compact = room.cols > 8

  function move(e: KeyboardEvent, i: number) {
    const r = Math.floor(i / room.cols)
    const c = i % room.cols
    const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    let next: number | null = null
    if (d[e.key]) {
      const [dr, dc] = d[e.key]
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < room.rows && nc >= 0 && nc < room.cols) next = nr * room.cols + nc
    } else if (e.key === 'Home') next = r * room.cols
    else if (e.key === 'End') next = r * room.cols + room.cols - 1
    else if (e.key === 'Escape') onActive(null)
    if (next !== null) {
      e.preventDefault()
      setFocusIndex(next)
      cells.current[next]?.focus()
    }
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="mx-auto w-max min-w-full">
        <div className="mb-3 rounded-md bg-slate-800 py-1.5 text-center text-[11px] font-semibold tracking-[0.2em] text-slate-100 uppercase dark:bg-slate-700">
          Front · Board
        </div>
        <table className="border-separate border-spacing-1.5">
          <caption className="sr-only">
            Seating chart for room {room.name}, front row first. Use arrow keys to move between seats.
          </caption>
          <tbody>
          {Array.from({ length: room.rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: room.cols }, (_, c) => {
                const i = r * room.cols + c
                const st = bySeat.get(i)
                const usable = grid.usable[i]
                const benchEnd = bench > 1 && (c + 1) % bench === 0 && c < room.cols - 1
                const isActive = active === i
                const isNeighbour = neighbours.has(i)
                const label = seatLabel(r, c)
                return (
                  <motion.td
                    key={i}
                    className={`p-0 ${benchEnd ? 'pr-3' : ''}`}
                    initial={reduce ? false : { opacity: 0, scale: 0.5, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={reduce ? { duration: 0 } : { delay: (r + c) * waveStep, type: 'spring', stiffness: 380, damping: 26 }}
                  >
                    <button
                      ref={(el) => {
                        cells.current[i] = el
                      }}
                      type="button"
                      tabIndex={i === focusIndex ? 0 : -1}
                      aria-label={cellLabel(label, st, usable)}
                      aria-disabled={!usable || undefined}
                      onFocus={() => {
                        setFocusIndex(i)
                        onActive(i)
                      }}
                      onMouseEnter={() => onActive(i)}
                      onMouseLeave={() => onActive(null)}
                      onClick={() => onActive(i)}
                      onKeyDown={(e) => move(e, i)}
                      className={`relative flex ${compact ? 'h-12 w-[3.6rem]' : 'h-14 w-[4.4rem]'} flex-col items-center justify-center rounded-lg border text-center transition-[box-shadow,opacity] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                        !usable
                          ? 'blocked-hatch border-slate-300 dark:border-slate-700'
                          : st
                            ? 'paper-fill text-slate-900 dark:text-white'
                            : 'border-dashed border-slate-300 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40'
                      } ${isActive ? 'z-10 ring-2 ring-slate-900 dark:ring-white' : ''} ${
                        isNeighbour ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-emerald-400 dark:ring-offset-slate-900' : ''
                      } ${highlight === i ? 'animate-pulse ring-4 ring-amber-400' : ''} ${
                        active !== null && !isActive && !isNeighbour ? 'opacity-55' : ''
                      }`}
                      style={st ? paperStyle(paperColour.get(st.paper)) : undefined}
                    >
                      <span className="absolute top-0.5 left-1 text-[9px] leading-none text-slate-500 dark:text-slate-400">{label}</span>
                      {st ? (
                        <motion.span layoutId={`student-${st.roll}`} layout="position" className="flex flex-col items-center leading-tight">
                          <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-medium tracking-wide opacity-80`}>{st.paper}</span>
                          <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold`}>{st.roll}</span>
                          {moved?.has(st.roll) && <span className="absolute inset-0 animate-ping rounded-lg ring-2 ring-amber-400" aria-hidden="true" />}
                        </motion.span>
                      ) : usable ? (
                        <span className="text-[10px] text-slate-400">empty</span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500">blocked</span>
                      )}
                      {st?.specialNeeds && (
                        <Accessibility className="absolute top-0.5 right-0.5 h-3 w-3 text-slate-700 dark:text-slate-200" aria-hidden="true" />
                      )}
                    </button>
                  </motion.td>
                )
              })}
            </tr>
          ))}
          </tbody>
        </table>
        <div className="mt-3 text-center text-[11px] tracking-[0.2em] text-slate-400 uppercase">Back</div>
      </div>
    </div>
  )
}

function cellLabel(label: string, st: Student | undefined, usable: boolean) {
  if (!usable) return `Seat ${label}, blocked`
  if (!st) return `Seat ${label}, empty`
  return `Seat ${label}: ${st.roll}, ${st.name}, paper ${st.paper}${st.specialNeeds ? `, special needs: ${st.specialNeeds}` : ''}`
}
