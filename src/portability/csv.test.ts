import { expect, it } from 'vitest'
import { exportCardsCsv, parseCardsCsv } from './csv'
import type { CharacterCard } from '@/domain/types'

const card = {
  id: 'a', character: '学', readings: [{ pinyin: 'xué', meaning: 'study', acceptedForms: ['xue'] }], englishMeaning: 'study, learn',
  contentType: 'compounds', compounds: [{ text: '学校', pinyin: 'xué xiào', english: 'school' }], examples: [], contentStatus: 'complete',
  seedVersion: 1, userEditedFields: [], createdAt: 'now', updatedAt: 'now',
} satisfies CharacterCard

it('round-trips quoted card content without learning state', () => {
  const csv = exportCardsCsv([card])
  expect(csv).toContain('"study, learn"')
  const result = parseCardsCsv(csv)
  expect(result.errors).toEqual([])
  expect(result.cards[0]).toMatchObject({ character: '学', englishMeaning: 'study, learn', contentType: 'compounds' })
  expect(JSON.stringify(result.cards[0])).not.toContain('reviewCount')
})

it('reports row-level validation errors', () => {
  const result = parseCardsCsv('character,pinyin,englishMeaning,contentType,content\n学,,,compounds,')
  expect(result.errors[0]).toMatch(/row 2/i)
})
