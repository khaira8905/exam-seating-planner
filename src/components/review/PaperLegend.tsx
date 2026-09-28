import type { RoomView } from '../../app/planView'
import { paperStyle } from './paperStyle'

/** Papers in this room: colour, code, name, count and roll-number ranges (as on the door list). */
export function PaperLegend({ view, paperColour }: { view: RoomView; paperColour: Map<string, number> }) {
  return (
    <ul className="space-y-2 text-sm">
      {view.papers.map((p) => (
        <li key={p.paper} className="flex items-start gap-2">
          <span className="paper-fill mt-0.5 h-4 w-4 shrink-0 rounded border" style={paperStyle(paperColour.get(p.paper))} aria-hidden="true" />
          <div className="min-w-0">
            <p>
              <span className="font-semibold">{p.paper}</span>
              {p.paperName && <span className="text-slate-600 dark:text-slate-400"> · {p.paperName}</span>}
              <span className="text-slate-500"> · {p.count}</span>
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={p.ranges.join(', ')}>
              {p.ranges.join(', ')}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
