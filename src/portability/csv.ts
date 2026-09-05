import Papa from 'papaparse'
import type { CharacterCard, Compound, Example } from '@/domain/types'

interface CsvRow { character: string; pinyin: string; englishMeaning: string; contentType: string; content: string }

export function exportCardsCsv(cards: CharacterCard[]): string {
  return Papa.unparse(cards.map((card): CsvRow => ({
    character: card.character,
    pinyin: card.readings.map((reading) => reading.pinyin).join(' | '),
    englishMeaning: card.englishMeaning,
    contentType: card.contentType,
    content: JSON.stringify(card.contentType === 'compounds' ? card.compounds : card.examples),
  })), { quotes: true })
}

export function parseCardsCsv(csv: string): { cards: CharacterCard[]; errors: string[] } {
  if (new Blob([csv]).size > 2_000_000) return { cards: [], errors: ['CSV file is too large (maximum 2 MB).'] }
  const parsed = Papa.parse<CsvRow>(csv, { header: true, skipEmptyLines: true })
  const cards: CharacterCard[] = []
  const errors = parsed.errors.map((error) => `Row ${(error.row ?? 0) + 2}: ${error.message}`)
  parsed.data.forEach((row, index) => {
    if (!/^\p{Script=Han}$/u.test(row.character || '') || !row.pinyin?.trim() || !row.englishMeaning?.trim() || !['compounds', 'examples'].includes(row.contentType)) {
      errors.push(`Row ${index + 2}: character, pinyin, English meaning, and valid content type are required.`)
      return
    }
    try {
      const content = JSON.parse(row.content || '[]') as Compound[] | Example[]
      const now = new Date().toISOString()
      cards.push({
        id: `user-${crypto.randomUUID()}`,
        character: row.character,
        readings: row.pinyin.split('|').map((value) => ({ pinyin: value.trim(), meaning: row.englishMeaning.trim(), acceptedForms: [] })),
        englishMeaning: row.englishMeaning.trim(),
        contentType: row.contentType as 'compounds' | 'examples',
        compounds: row.contentType === 'compounds' ? content as Compound[] : [],
        examples: row.contentType === 'examples' ? content as Example[] : [],
        contentStatus: content.length > 0 ? 'complete' : 'needs_content',
        seedVersion: null,
        userEditedFields: ['readings', 'englishMeaning', 'contentType'],
        createdAt: now,
        updatedAt: now,
      })
    } catch {
      errors.push(`Row ${index + 2}: content must be valid JSON.`)
    }
  })
  return { cards, errors }
}
