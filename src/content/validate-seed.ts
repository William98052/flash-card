import { z } from 'zod'
import { characterCardSchema } from './seed-schema'
import type { CharacterCard } from '@/domain/types'

const numericTone = /[a-züv]+[1-5]/i

export function validateSeed(input: unknown): CharacterCard[] {
  if (!Array.isArray(input) || input.length !== 1000) throw new Error('Seed must contain exactly 1000 cards')
  const cards = z.array(characterCardSchema).parse(input) as CharacterCard[]
  if (new Set(cards.map((card) => card.character)).size !== cards.length) throw new Error('Each seed card must have a unique character')
  for (const card of cards) {
    if (card.readings.some((reading) => numericTone.test(reading.pinyin))) throw new Error(`${card.character}: pinyin must be tone-marked, not numbered`)
    if (card.contentType === 'compounds' && (card.compounds.length < 1 || card.compounds.length > 6 || card.examples.length !== 0)) {
      throw new Error(`${card.character}: compounds mode requires 1 to at most 6 compounds`)
    }
    if (card.contentType === 'examples' && (card.examples.length !== 2 || card.compounds.length !== 0)) {
      throw new Error(`${card.character}: examples mode requires exactly 2 examples`)
    }
  }
  return cards
}
