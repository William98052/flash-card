import { describe, expect, it } from 'vitest'
import { validateSeed } from './validate-seed'
import type { CharacterCard } from '@/domain/types'

const makeCard = (index: number): CharacterCard => ({
  id: `seed-${String(index + 1).padStart(4, '0')}`,
  character: String.fromCodePoint(0x4e00 + index),
  readings: [{ pinyin: 'hàn', meaning: 'Chinese', acceptedForms: ['han'] }],
  englishMeaning: 'sample meaning',
  contentType: 'compounds',
  compounds: [{ text: '汉字', pinyin: 'hàn zì', english: 'Chinese character' }],
  examples: [],
  contentStatus: 'complete',
  seedVersion: 1,
  userEditedFields: [],
  createdAt: '2026-09-05T00:00:00.000Z',
  updatedAt: '2026-09-05T00:00:00.000Z',
})

describe('validateSeed', () => {
  const validCards = Array.from({ length: 1000 }, (_, index) => makeCard(index))

  it('accepts exactly 1000 unique complete cards', () => {
    expect(validateSeed(validCards)).toHaveLength(1000)
  })

  it('rejects the wrong collection size and duplicate characters', () => {
    expect(() => validateSeed(validCards.slice(0, 999))).toThrow(/exactly 1000/i)
    expect(() => validateSeed([...validCards.slice(0, 999), makeCard(0)])).toThrow(/unique character/i)
  })

  it('rejects invalid learning content', () => {
    const invalid = structuredClone(validCards)
    invalid[0].compounds = Array.from({ length: 7 }, () => invalid[0].compounds[0])
    expect(() => validateSeed(invalid)).toThrow(/at most 6/i)

    invalid[0] = { ...makeCard(0), readings: [{ pinyin: 'han4', meaning: 'Chinese', acceptedForms: [] }] }
    expect(() => validateSeed(invalid)).toThrow(/tone-marked/i)
  })
})
