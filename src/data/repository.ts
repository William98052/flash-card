import type { CharacterCard, LibraryId } from '@/domain/types'
import type { FlashCardDatabase } from './database'

export class FlashCardRepository {
  constructor(readonly db: FlashCardDatabase) {}

  runTransaction<T>(operation: () => Promise<T>): Promise<T> {
    return this.db.transaction('rw', this.db.allTables(), operation)
  }

  async addCard(card: CharacterCard): Promise<void> {
    await this.runTransaction(async () => {
      await this.db.cards.add(card)
      await this.db.memberships.bulkAdd([
        { id: `all:${card.id}`, libraryId: 'all', characterId: card.id },
        { id: `unreviewed:${card.id}`, libraryId: 'unreviewed', characterId: card.id },
      ])
      await this.db.reviews.add({ characterId: card.id, isUnreviewed: 1, reviewCount: 0, correctCount: 0, incorrectCount: 0, lastReviewedAt: null })
    })
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.runTransaction(async () => {
      await this.db.cards.delete(cardId)
      await this.db.reviews.delete(cardId)
      await this.db.memberships.where('characterId').equals(cardId).delete()
    })
  }

  async setMembership(libraryId: LibraryId, cardId: string, enabled: boolean): Promise<void> {
    const id = `${libraryId}:${cardId}`
    if (enabled) await this.db.memberships.put({ id, libraryId, characterId: cardId })
    else await this.db.memberships.delete(id)
  }

  async libraryCardIds(libraryId: LibraryId): Promise<string[]> {
    return (await this.db.memberships.where('libraryId').equals(libraryId).toArray()).map((item) => item.characterId)
  }

  async libraryCounts(): Promise<Record<LibraryId, number>> {
    const ids: LibraryId[] = ['all', 'unreviewed', 'wrong', 'new-1', 'new-2', 'new-3', 'familiar']
    return Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await this.db.memberships.where('libraryId').equals(id).count()]))) as Record<LibraryId, number>
  }
}
