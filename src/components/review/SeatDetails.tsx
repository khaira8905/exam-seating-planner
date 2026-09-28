import { Accessibility, CheckCircle2, MousePointerClick } from 'lucide-react'
import type { RoomView } from '../../app/planView'
import { RULE_BY_ID } from '../../lib/rules'
import { seatLabel } from '../../lib/seatLabel'
import type { Strictness } from '../../lib/types'
import { paperStyle } from './paperStyle'

interface Props {
  view: RoomView
  seat: number | null
  rule: Strictness
  paperColour: Map<string, number>
  paperNames: Map<string, string>
}

/** Details of the hovered/focused seat, with its neighbours under the rule. */
export function SeatDetails({ view, seat, rule, paperColour, paperNames }: Props) {
  if (seat === null) {
    return (
      <div className="flex h-full items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
        <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Hover over or tab to a seat to see the student and the neighbours that must be writing a different paper.</p>
      </div>
    )
  }
  const { room, grid, bySeat } = view
  const r = Math.floor(seat / room.cols)
  const c = seat % room.cols
  const st = bySeat.get(seat)
  const neighbours = grid.neighbours[seat].map((n) => ({ n, st: bySeat.get(n) })).filter((x) => x.st)
  return (
    <div className="text-sm" aria-live="polite">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
        Room {room.name} · Seat {seatLabel(r, c)}
      </p>
      {!grid.usable[seat] ? (
        <p className="mt-2">This seat is blocked and not used.</p>
      ) : !st ? (
        <p className="mt-2">Empty seat.</p>
      ) : (
        <>
          <p className="mt-1 text-base font-semibold">{st.name}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-slate-500 dark:text-slate-400">Roll no.</dt>
            <dd className="font-medium">{st.roll}</dd>
            {st.course && (
              <>
                <dt className="text-slate-500 dark:text-slate-400">Course</dt>
                <dd>{st.course}</dd>
              </>
            )}
            <dt className="text-slate-500 dark:text-slate-400">Paper</dt>
            <dd>
              <span className="paper-fill mr-1 inline-block rounded border px-1.5 text-xs font-semibold" style={paperStyle(paperColour.get(st.paper))}>
                {st.paper}
              </span>
              {paperNames.get(st.paper)}
            </dd>
            {st.specialNeeds && (
              <>
                <dt className="text-slate-500 dark:text-slate-400">Needs</dt>
                <dd className="flex items-center gap-1">
                  <Accessibility className="h-3.5 w-3.5" aria-hidden="true" /> {st.specialNeeds}
                </dd>
              </>
            )}
          </dl>
          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Neighbours under the {RULE_BY_ID[rule].label} rule ({RULE_BY_ID[rule].short}):
            </p>
            {neighbours.length === 0 ? (
              <p className="mt-1">No one sits in a neighbouring seat.</p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {neighbours.map(({ n, st: other }) => (
                  <li
                    key={n}
                    className="paper-fill rounded border px-1.5 py-0.5 text-xs"
                    style={paperStyle(paperColour.get(other!.paper))}
                  >
                    {seatLabel(Math.floor(n / room.cols), n % room.cols)} · {other!.paper}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {neighbours.every((x) => x.st!.paper !== st.paper) ? 'All neighbours write a different paper.' : 'Clash!'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
