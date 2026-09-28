import { Moon, ShieldCheck, Sun } from 'lucide-react'
import { useTheme } from '../app/theme'

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="7" className="fill-teal-700 dark:fill-teal-500" />
      <g className="fill-white dark:fill-slate-950">
        <rect x="6" y="7" width="8" height="8" rx="2" />
        <rect x="18" y="7" width="8" height="8" rx="2" opacity=".55" />
        <rect x="6" y="17" width="8" height="8" rx="2" opacity=".55" />
        <rect x="18" y="17" width="8" height="8" rx="2" />
      </g>
    </svg>
  )
}

export function Header() {
  const { theme, toggle } = useTheme()
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Logo />
        <div className="min-w-0">
          <p className="text-lg leading-tight font-semibold tracking-tight">SeatWise</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">Exam Seating Planner</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 md:inline-flex dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            title="Files are read and processed inside this browser tab. Nothing is uploaded to any server."
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Runs in your browser — data never leaves your computer
          </span>
          <button
            type="button"
            onClick={toggle}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  )
}
