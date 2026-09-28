import { AlertTriangle, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { Issue } from '../lib/io/parse'

export function IssueList({ errors, warnings }: { errors: Issue[]; warnings: Issue[] }) {
  const [showAll, setShowAll] = useState(false)
  const all = [
    ...errors.map((e) => ({ ...e, level: 'error' as const })),
    ...warnings.map((w) => ({ ...w, level: 'warning' as const })),
  ]
  if (!all.length) return null
  const shown = showAll ? all : all.slice(0, 6)
  return (
    <div className="mt-3 space-y-1.5" role={errors.length ? 'alert' : 'status'}>
      {shown.map((issue, i) => (
        <p
          key={i}
          className={`flex items-start gap-2 rounded-md px-2.5 py-1.5 text-sm ${
            issue.level === 'error'
              ? 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200'
              : 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
          }`}
        >
          {issue.level === 'error' ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-label="Error" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-label="Warning" />
          )}
          <span>{issue.message}</span>
        </p>
      ))}
      {all.length > shown.length && (
        <button type="button" className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400" onClick={() => setShowAll(true)}>
          Show all {all.length} messages
        </button>
      )}
    </div>
  )
}
