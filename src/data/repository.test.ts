import { afterEach, beforeEach, expect, it } from 'vitest'
import { FlashCardDatabase } from './database'
import { FlashCardRepository } from './repository'
import type { CharacterCard } from '@/domain/types'

let db: FlashCardDatabase
let repository: FlashCardRepository
beforeEach(() => {
  db = new FlashCardDatabase(`repo-test-${crypto.randomUUID()}`)
  repository = new FlashCardRepository(db)
})
afterEach(async () => db.delete())

it('writes a new card, all membership, and unreviewed state atomically', async () => {
  const card = {
    id: 'user-1', character: '𠮷', readings: [], englishMeaning: '', contentType: 'compounds', compounds: [], examples: [],
    contentStatus: 'needs_content', seedVersion: null, userEditedFields: [], createdAt: 'now', updatedAt: 'now',
  } satisfies CharacterCard
  await repository.addCard(card)
  expect(await db.cards.get(card.id)).toEqual(card)
  expect(await db.memberships.get('all:user-1')).toBeTruthy()
  expect(await db.reviews.get(card.id)).toMatchObject({ isUnreviewed: 1, reviewCount: 0 })
})

it('rolls back every table when a transaction fails', async () => {
  await expect(repository.runTransaction(async () => {
    await db.cards.add({ id: 'broken', character: '坏' } as CharacterCard)
    await db.memberships.add({ id: 'all:broken', libraryId: 'all', characterId: 'broken' })
    throw new Error('forced failure')
  })).rejects.toThrow('forced failure')
  expect(await db.cards.get('broken')).toBeUndefined()
  expect(await db.memberships.get('all:broken')).toBeUndefined()
})
