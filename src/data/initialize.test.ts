import { afterEach, describe, expect, it } from 'vitest'
import seed from '@/content/ap-1000.json'
import { FlashCardDatabase } from './database'
import { initializeDatabase } from './initialize'
import type { CharacterCard } from '@/domain/types'

const names: string[] = []
const createDb = () => {
  const name = `flash-card-test-${crypto.randomUUID()}`
  names.push(name)
  return new FlashCardDatabase(name)
}

afterEach(async () => {
  await Promise.all(names.splice(0).map((name) => new FlashCardDatabase(name).delete()))
})

describe('initializeDatabase', () => {
  it('installs 1000 cards and unreviewed records on first run', async () => {
    const db = createDb()
    await initializeDatabase(db, seed as CharacterCard[])
    expect(await db.cards.count()).toBe(1000)
    expect(await db.reviews.where('isUnreviewed').equals(1).count()).toBe(1000)
    expect(await db.memberships.where('libraryId').equals('all').count()).toBe(1000)
  })

  it('preserves user edits and statistics when reopened', async () => {
    const db = createDb()
    await initializeDatabase(db, seed as CharacterCard[])
    const card = (await db.cards.get('seed-0001'))!
    await db.cards.put({ ...card, englishMeaning: 'my edit', userEditedFields: ['englishMeaning'] })
    await db.reviews.update('seed-0001', { reviewCount: 7 })
    db.close()

    const reopened = new FlashCardDatabase(db.name)
    await initializeDatabase(reopened, seed as CharacterCard[])
    expect((await reopened.cards.get('seed-0001'))?.englishMeaning).toBe('my edit')
    expect((await reopened.reviews.get('seed-0001'))?.reviewCount).toBe(7)
  })
})
