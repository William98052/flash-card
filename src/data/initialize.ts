import type { CharacterCard } from '@/domain/types'
import type { FlashCardDatabase, PersistedReviewState } from './database'

export async function initializeDatabase(db: FlashCardDatabase, seed: CharacterCard[]): Promise<void> {
  await db.open()
  const installed = await db.metadata.get('seedVersion')
  if (installed) return

  await db.transaction('rw', db.allTables(), async () => {
    if (await db.cards.count()) return
    await db.cards.bulkAdd(seed)
    await db.memberships.bulkAdd(seed.flatMap((card) => [
      { id: `all:${card.id}`, libraryId: 'all' as const, characterId: card.id },
      { id: `unreviewed:${card.id}`, libraryId: 'unreviewed' as const, characterId: card.id },
    ]))
    await db.reviews.bulkAdd(seed.map((card): PersistedReviewState => ({
      characterId: card.id, isUnreviewed: 1, reviewCount: 0, correctCount: 0, incorrectCount: 0, lastReviewedAt: null,
    })))
    await db.settings.put({ id: 'settings', continuousFlipListening: false, backupReminderDismissedAt: null, appVersion: 1, schemaVersion: 1 })
    await db.metadata.put({ key: 'seedVersion', value: 1 })
  })
}
