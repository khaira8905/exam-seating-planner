/**
 * Keeps the latest plan in this browser's IndexedDB so a refresh doesn't lose
 * work. Data stays on this computer; "Forget" deletes it. Every call fails
 * soft (private windows can block storage).
 */
import type { Plan } from './types'

const DB = 'seatwise'
const STORE = 'kv'
const KEY = 'latest-plan'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

export interface SavedPlan {
  plan: Plan
  savedAt: string
}

export async function saveLatestPlan(plan: Plan): Promise<void> {
  try {
    await run('readwrite', (s) => s.put({ plan, savedAt: new Date().toISOString() } satisfies SavedPlan, KEY))
  } catch {
    /* storage unavailable — autosave is a convenience only */
  }
}

export async function loadLatestPlan(): Promise<SavedPlan | null> {
  try {
    const v = await run<SavedPlan | undefined>('readonly', (s) => s.get(KEY))
    return v?.plan?.version === 1 ? v : null
  } catch {
    return null
  }
}

export async function forgetSavedPlan(): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(KEY))
  } catch {
    /* nothing to forget */
  }
}
