import Dexie, { type EntityTable, type Transaction } from 'dexie'
import type { AppSettings, CharacterCard, LibraryMembership, ReviewState, SessionSummary, StudySession } from '@/domain/types'

export type PersistedReviewState = Omit<ReviewState, 'isUnreviewed'> & { isUnreviewed: 0 | 1 }
export interface MetadataRecord { key: string; value: string | number }

export class FlashCardDatabase extends Dexie {
  cards!: EntityTable<CharacterCard, 'id'>
  memberships!: EntityTable<LibraryMembership, 'id'>
  reviews!: EntityTable<PersistedReviewState, 'characterId'>
  sessions!: EntityTable<StudySession, 'id'>
  summaries!: EntityTable<SessionSummary, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  metadata!: EntityTable<MetadataRecord, 'key'>

  constructor(name = 'hanzi-flash-practice') {
    super(name)
    this.version(1).stores({
      cards: 'id,&character,contentStatus,updatedAt',
      memberships: 'id,[libraryId+characterId],libraryId,characterId',
      reviews: 'characterId,isUnreviewed,lastReviewedAt',
      sessions: 'id,status,sourceLibraryId,startedAt',
      summaries: 'id,sourceLibraryId,endedAt',
      settings: 'id',
      metadata: 'key',
    })
  }

  allTables() {
    return [this.cards, this.memberships, this.reviews, this.sessions, this.summaries, this.settings, this.metadata]
  }
}

export type DatabaseTransaction = Transaction
