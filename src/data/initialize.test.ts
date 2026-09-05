import { afterEach, describe, expect, it } from 'vitest'
import seed from '@/content/ap-1000.json'
import { FlashCardDatabase } from './database'
import { initializeDatabase } from './initialize'
import type { CharacterCard } from '@/domain/types'

const databases: FlashCardDatabase[] = []
const createDb = () => {
  const name = `flash-card-test-${crypto.randomUUID()}`
  const db = new FlashCardDatabase(name)
  databases.push(db)
  return db
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map(async (db) => { db.close(); await db.delete() }))
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
    databases.push(reopened)
    await initializeDatabase(reopened, seed as CharacterCard[])
    expect((await reopened.cards.get('seed-0001'))?.englishMeaning).toBe('my edit')
    expect((await reopened.reviews.get('seed-0001'))?.reviewCount).toBe(7)
  })

  it('applies newer built-in content without overwriting user-edited fields or statistics', async () => {
    const originalSeed = structuredClone(seed) as CharacterCard[]
    const originalHeavy = originalSeed.find(({ character }) => character === '重')!
    originalHeavy.seedVersion = 1
    originalHeavy.readings = [{ pinyin: 'zhòng', meaning: 'to repeat', acceptedForms: ['重', 'zhong'] }]
    originalHeavy.englishMeaning = 'my preferred definition'
    originalHeavy.compounds = [{ text: '重样', pinyin: 'zhòng yàng', english: 'same' }]

    const db = createDb()
    await initializeDatabase(db, originalSeed)
    await db.cards.update(originalHeavy.id, { userEditedFields: ['englishMeaning'] })
    await db.reviews.update(originalHeavy.id, { reviewCount: 7 })

    const upgradedSeed = structuredClone(seed) as CharacterCard[]
    upgradedSeed.find(({ character }) => character === '重')!.seedVersion = 2
    await initializeDatabase(db, upgradedSeed)

    const upgradedHeavy = (await db.cards.get(originalHeavy.id))!
    expect(upgradedHeavy.readings.map(({ pinyin }) => pinyin)).toEqual(['zhòng', 'chóng'])
    expect(upgradedHeavy.englishMeaning).toBe('my preferred definition')
    expect(upgradedHeavy.compounds.map(({ text, pinyin }) => [text, pinyin])).toEqual([
      ['重要', 'zhòng yào'],
      ['重量', 'zhòng liàng'],
      ['严重', 'yán zhòng'],
      ['重新', 'chóng xīn'],
      ['重复', 'chóng fù'],
    ])
    expect(upgradedHeavy.seedVersion).toBe(2)
    expect((await db.reviews.get(originalHeavy.id))?.reviewCount).toBe(7)
    expect((await db.metadata.get('seedVersion'))?.value).toBe(2)
  })
})
