import highsLoader from 'highs'
import type { HighsLike } from './milp'

let cached: Promise<HighsLike> | null = null

/** Loads HiGHS once per test file (Node finds the .wasm next to the package). */
export function loadHighs(): Promise<HighsLike> {
  cached ??= highsLoader().then((h) => h as unknown as HighsLike)
  return cached
}
