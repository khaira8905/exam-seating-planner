const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/** Natural sort for roll numbers: CSE302 < CSE310 < CSE1001. */
export const compareRoll = (a: string, b: string) => collator.compare(a, b)

export const byRoll = <T extends { roll: string }>(a: T, b: T) => collator.compare(a.roll, b.roll)

export const compareText = (a: string, b: string) => collator.compare(a, b)
