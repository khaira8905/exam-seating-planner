import { useMemo } from 'react'
import { buildPlanView, type PlanView } from '../lib/planView'
import type { Plan } from '../lib/types'

export type { PlanView, RoomView } from '../lib/planView'

export function usePlanView(plan: Plan | null): PlanView | null {
  return useMemo(() => (plan ? buildPlanView(plan) : null), [plan])
}
