/** Small, fast, seeded PRNG (mulberry32) so sample data and tests are reproducible. */
export function createRng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    /** Integer in [min, max] (inclusive). */
    int(min: number, max: number) {
      return min + Math.floor(next() * (max - min + 1))
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)]
    },
    chance(p: number) {
      return next() < p
    },
    shuffle<T>(items: T[]): T[] {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[items[i], items[j]] = [items[j], items[i]]
      }
      return items
    },
  }
}

export type Rng = ReturnType<typeof createRng>
