import { createContext, useContext, type Dispatch } from 'react'
import type { PlanDiff } from '../lib/engine/replan'
import type { Progress, Infeasible } from '../lib/engine/solve'
import type { Issue } from '../lib/io/parse'
import { SLOTS } from '../lib/sessions'
import type { Method, Plan, Room, Session, Slot, Strictness, Student } from '../lib/types'

export const STEPS = ['upload', 'rules', 'generate', 'review', 'download'] as const
export type Step = (typeof STEPS)[number]

export const STEP_LABELS: Record<Step, string> = {
  upload: 'Upload',
  rules: 'Rules',
  generate: 'Generate',
  review: 'Review',
  download: 'Download',
}

export interface InputFile {
  fileName: string
  count: number
  errors: Issue[]
  warnings: Issue[]
}

export interface AppState {
  step: Step
  students: Student[] | null
  studentsFile: InputFile | null
  rooms: Room[] | null
  roomsFile: InputFile | null
  session: Session
  rule: Strictness
  method: Method
  status: 'idle' | 'solving' | 'done' | 'failed'
  progress: Progress | null
  plan: Plan | null
  problem: Infeasible | null
  /** What the last re-plan changed (for the "What changed" panel and seat animations). */
  lastDiff: PlanDiff | null
  /** When the students file covers both sessions: one plan per session (`plan` is the one on screen). */
  sessionPlans: Partial<Record<Slot, Plan>>
}

export type Action =
  | { type: 'students'; students: Student[] | null; file: InputFile | null }
  | { type: 'rooms'; rooms: Room[] | null; file: InputFile | null }
  | { type: 'session'; session: Partial<Session> }
  | { type: 'rule'; rule: Strictness }
  | { type: 'method'; method: Method }
  | { type: 'goto'; step: Step }
  | { type: 'solve-start' }
  | { type: 'solve-progress'; progress: Progress }
  | { type: 'solve-done'; plan: Plan }
  | { type: 'sessions-done'; plans: Plan[] }
  | { type: 'switch-session'; slot: Slot }
  | { type: 'solve-failed'; problem: Infeasible }
  | { type: 'plan'; plan: Plan }
  | { type: 'replanned'; plan: Plan; diff: PlanDiff }
  | { type: 'invigilators'; names: string[]; perInvigilator: number }
  | { type: 'reset' }

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const initialState: AppState = {
  step: 'upload',
  students: null,
  studentsFile: null,
  rooms: null,
  roomsFile: null,
  session: { date: today(), slot: 'morning', title: 'End-Semester Examination' },
  rule: 'strict',
  method: 'optimised',
  status: 'idle',
  progress: null,
  plan: null,
  problem: null,
  lastDiff: null,
  sessionPlans: {},
}

const isMulti = (s: AppState) => Object.keys(s.sessionPlans).length > 1

/**
 * Puts a changed plan (re-plan, invigilators) on screen. With two sessions it
 * also updates that session's entry and keeps the full student list intact.
 */
function withPlan(state: AppState, plan: Plan): AppState {
  if (!isMulti(state)) return { ...state, plan, students: plan.students, rooms: plan.rooms }
  const sessionPlans = { ...state.sessionPlans, [plan.session.slot]: plan }
  return { ...state, plan, sessionPlans, students: SLOTS.flatMap((slot) => sessionPlans[slot]?.students ?? []) }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'students':
      return { ...state, students: action.students, studentsFile: action.file, problem: null }
    case 'rooms':
      return { ...state, rooms: action.rooms, roomsFile: action.file, problem: null }
    case 'session':
      return { ...state, session: { ...state.session, ...action.session } }
    case 'rule':
      return { ...state, rule: action.rule, problem: null }
    case 'method':
      return { ...state, method: action.method }
    case 'goto':
      return { ...state, step: action.step }
    case 'solve-start':
      return { ...state, step: 'generate', status: 'solving', progress: null, problem: null }
    case 'solve-progress':
      return { ...state, progress: action.progress }
    case 'solve-done':
      return { ...state, status: 'done', plan: action.plan, step: 'review', progress: null, lastDiff: null, sessionPlans: {} }
    case 'sessions-done':
      return {
        ...state,
        status: 'done',
        plan: action.plans[0],
        sessionPlans: Object.fromEntries(action.plans.map((p) => [p.session.slot, p])),
        step: 'review',
        progress: null,
        lastDiff: null,
      }
    case 'switch-session': {
      const plan = state.sessionPlans[action.slot]
      return plan ? { ...state, plan, lastDiff: null } : state
    }
    case 'invigilators':
      return state.plan ? withPlan(state, { ...state.plan, invigilators: action.names, studentsPerInvigilator: action.perInvigilator }) : state
    case 'replanned':
      return { ...withPlan(state, action.plan), lastDiff: action.diff }
    case 'solve-failed':
      return { ...state, status: 'failed', problem: action.problem, progress: null }
    case 'plan':
      return {
        ...state,
        plan: action.plan,
        students: action.plan.students,
        rooms: action.plan.rooms,
        session: action.plan.session,
        rule: action.plan.rule,
        method: action.plan.method,
        studentsFile: { fileName: 'from plan file', count: action.plan.students.length, errors: [], warnings: [] },
        roomsFile: { fileName: 'from plan file', count: action.plan.rooms.length, errors: [], warnings: [] },
        status: 'done',
        problem: null,
        lastDiff: null,
        sessionPlans: {},
        step: 'review',
      }
    case 'reset':
      return { ...initialState, session: state.session }
  }
}

export const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null)

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

/** Which steps can be opened right now. */
export function reachableSteps(s: AppState): Set<Step> {
  const ok = new Set<Step>(['upload'])
  const inputsReady = !!s.students?.length && !!s.rooms?.length
  if (inputsReady) {
    ok.add('rules')
    ok.add('generate')
  }
  if (s.plan) {
    ok.add('review')
    ok.add('download')
  }
  return ok
}
