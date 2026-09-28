import { useEffect } from 'react'
import { saveLatestPlan } from '../lib/storage'
import { useStore } from './store'

/** Saves every new plan to this browser's IndexedDB (nothing leaves the computer). */
export function Autosave() {
  const { state } = useStore()
  useEffect(() => {
    if (state.plan) void saveLatestPlan(state.plan)
  }, [state.plan])
  return null
}
