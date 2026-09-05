export function cleanDefinition(definitions: string[]): string {
  const clean = (value: string) => value.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
  const preferred = definitions.find((value) => !/^\s*\(/.test(value) && !/^(surname|variant of|old variant|see |also written)/i.test(value))
  const cleaned = preferred ? clean(preferred) : definitions.map(clean).find(Boolean)
  if (cleaned) return cleaned.slice(0, 100)
  const annotation = definitions[0]?.replace(/^\s*\(|\)\s*$/g, '').trim()
  return (annotation || 'Chinese character').slice(0, 100)
}
