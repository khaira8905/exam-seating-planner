import { CheckCircle2, Clock, DoorOpen, Loader2, Users, XCircle, Armchair } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import type { PlanView } from '../../app/planView'
import { fmt, formatMs } from '../../lib/format'
import { RULE_BY_ID } from '../../lib/rules'

/** Top-of-page numbers for the plan, with the animated clash check. */
export function SummaryCards({ view, checkDelayMs }: { view: PlanView; checkDelayMs: number }) {
  const { plan, check } = view
  const s = plan.stats
  const methodNote =
    plan.method === 'optimised'
      ? s.roomsByMethod.pattern
        ? `HiGHS: ${s.roomsByMethod.optimised} rooms, pattern: ${s.roomsByMethod.pattern}`
        : `all ${s.roomsByMethod.optimised} rooms optimised with HiGHS`
      : 'pattern method'
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Card icon={<Users className="h-4 w-4" />} label="Students" value={fmt(s.students)} note={`${fmt(new Set(plan.students.map((x) => x.paper)).size)} papers`} />
      <Card icon={<DoorOpen className="h-4 w-4" />} label="Rooms used" value={fmt(s.roomsUsed)} note={`of ${fmt(plan.rooms.length)} available`} />
      <Card icon={<Armchair className="h-4 w-4" />} label="Empty seats" value={fmt(s.emptySeats)} note={`${fmt(s.usableSeats)} usable in rooms used`} />
      <ClashCard key={`${plan.id}-${plan.revision ?? 0}`} clashes={check.clashes.length + check.problems.length} pairs={check.checkedPairs} ruleLabel={RULE_BY_ID[plan.rule].label} delayMs={checkDelayMs} />
      <Card icon={<Clock className="h-4 w-4" />} label="Time taken" value={formatMs(s.timeMs)} note={methodNote} />
    </dl>
  )
}

function Card({ icon, label, value, note }: { icon: ReactNode; label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight">{value}</dd>
      {note && <dd className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{note}</dd>}
    </div>
  )
}

function ClashCard({ clashes, pairs, ruleLabel, delayMs }: { clashes: number; pairs: number; ruleLabel: string; delayMs: number }) {
  const reduce = useReducedMotion()
  const [done, setDone] = useState(!!reduce)
  useEffect(() => {
    if (reduce) return
    const t = setTimeout(() => setDone(true), delayMs + 700)
    return () => clearTimeout(t)
  }, [reduce, delayMs])
  const ok = clashes === 0
  return (
    <div
      className={`relative col-span-2 overflow-hidden rounded-xl border p-3.5 shadow-sm lg:col-span-1 ${
        done ? (ok ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50' : 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/50') : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
      aria-live="polite"
    >
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Independent clash check</dt>
      <dd className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.span
              key="done"
              className={`flex items-center gap-2 ${ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              {ok ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" /> : <XCircle className="h-6 w-6" aria-hidden="true" />}
              {clashes} clash{clashes === 1 ? '' : 'es'}
            </motion.span>
          ) : (
            <motion.span key="checking" className="flex items-center gap-2 text-slate-500" exit={{ opacity: 0 }}>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Checking…
            </motion.span>
          )}
        </AnimatePresence>
      </dd>
      <dd className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
        {ruleLabel} mode · {fmt(pairs)} student pairs re-checked
      </dd>
      {!done && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent dark:via-emerald-500/20"
          initial={{ left: '-35%' }}
          animate={{ left: '105%' }}
          transition={{ delay: delayMs / 1000, duration: 0.7, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}
