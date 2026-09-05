import type { CharacterCard } from '@/domain/types'
import type { FlashCardDatabase, PersistedReviewState } from './database'

export async function initializeDatabase(db: FlashCardDatabase, seed: CharacterCard[]): Promise<void> {
  await db.open()
  const seedVersion = Math.max(...seed.map((card) => card.seedVersion ?? 0))
  const installed = await db.metadata.get('seedVersion')
  if (installed && Number(installed.value) >= seedVersion) return

  if (installed) {
    await db.transaction('rw', db.cards, db.metadata, async () => {
      const updates: CharacterCard[] = []
      for (const incoming of seed) {
        const current = await db.cards.get(incoming.id)
        if (!current || (current.seedVersion ?? 0) >= (incoming.seedVersion ?? 0)) continue
        const edited = new Set(current.userEditedFields)
        updates.push({
          ...incoming,
          id: current.id,
          character: edited.has('character') ? current.character : incoming.character,
          readings: edited.has('readings') ? current.readings : incoming.readings,
          englishMeaning: edited.has('englishMeaning') ? current.englishMeaning : incoming.englishMeaning,
          contentType: edited.has('contentType') ? current.contentType : incoming.contentType,
          compounds: edited.has('compounds') ? current.compounds : incoming.compounds,
          examples: edited.has('examples') ? current.examples : incoming.examples,
          contentStatus: edited.has('contentStatus') ? current.contentStatus : incoming.contentStatus,
          userEditedFields: current.userEditedFields,
          createdAt: current.createdAt,
          updatedAt: current.userEditedFields.length ? current.updatedAt : incoming.updatedAt,
        })
      }
      if (updates.length) await db.cards.bulkPut(updates)
      await db.metadata.put({ key: 'seedVersion', value: seedVersion })
    })
    return
  }

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
    await db.metadata.put({ key: 'seedVersion', value: seedVersion })
  })
}
