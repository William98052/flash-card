export interface ExtractionPreview {
  toAdd: string[]
  existing: string[]
  ignoredCount: number
}

const isHan = (value: string) => /^\p{Script=Han}$/u.test(value)

export function extractUniqueHan(input: string, existingCharacters: ReadonlySet<string>): ExtractionPreview {
  const seen = new Set<string>()
  const toAdd: string[] = []
  const existing: string[] = []
  let ignoredCount = 0

  for (const value of input) {
    if (!isHan(value)) {
      ignoredCount += 1
      continue
    }
    if (seen.has(value)) continue
    seen.add(value)
    if (existingCharacters.has(value)) existing.push(value)
    else toAdd.push(value)
  }

  return { toAdd, existing, ignoredCount }
}
