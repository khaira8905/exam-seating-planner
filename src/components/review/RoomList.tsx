import { LayoutGrid } from 'lucide-react'
import type { RoomView } from '../../app/planView'
import { paperStyle } from './paperStyle'

interface Props {
  rooms: RoomView[]
  selected: string | null
  onSelect: (id: string | null) => void
  paperColour: Map<string, number>
}

const floorName = (f?: number) => (f === undefined ? '' : f === 0 ? 'Ground floor' : `Floor ${f}`)

/** Room navigator: "All rooms" overview plus one entry per room with its fill level. */
export function RoomList({ rooms, selected, onSelect, paperColour }: Props) {
  return (
    <nav aria-label="Rooms" className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto pr-1">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-current={selected === null ? 'page' : undefined}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-teal-600 ${
          selected === null ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" /> All rooms
      </button>
      {rooms.map((r) => {
        const active = selected === r.room.id
        return (
          <button
            key={r.room.id}
            type="button"
            onClick={() => onSelect(r.room.id)}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-teal-600 ${
              active ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{r.room.name}</span>
              <span className={`text-xs ${active ? 'opacity-80' : 'text-slate-500'}`}>
                {r.used}/{r.usable}
              </span>
            </span>
            <span className={`mt-1 flex items-center gap-1 text-[11px] ${active ? 'opacity-80' : 'text-slate-500'}`}>
              {r.papers.slice(0, 6).map((p) => (
                <span key={p.paper} className="paper-dot h-2 w-2 rounded-full" style={paperStyle(paperColour.get(p.paper))} aria-hidden="true" />
              ))}
              <span className="ml-1 truncate">
                {r.papers.length} paper{r.papers.length === 1 ? '' : 's'}
                {r.room.floor !== undefined && ` · ${floorName(r.room.floor)}`}
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
