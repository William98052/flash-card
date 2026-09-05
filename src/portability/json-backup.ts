import type { FlashCardDatabase } from '@/data/database'
import { backupSchema, type BackupV1 } from './backup-schema'

const MAX_BACKUP_BYTES = 5_000_000
type Snapshot = BackupV1['data']

export function exportBackup(snapshot: Snapshot): BackupV1 {
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), data: structuredClone(snapshot) }
}

export function previewBackup(input: string) {
  if (new Blob([input]).size > MAX_BACKUP_BYTES) return { valid: false as const, error: 'Backup file is too large (maximum 5 MB).' }
  try {
    const backup = backupSchema.parse(JSON.parse(input))
    return {
      valid: true as const,
      backup,
      counts: {
        cards: backup.data.cards.length,
        memberships: backup.data.memberships.length,
        reviews: backup.data.reviews.length,
        sessions: backup.data.sessions.length,
        summaries: backup.data.summaries.length,
      },
    }
  } catch (error) {
    return { valid: false as const, error: `Invalid backup: ${error instanceof Error ? error.message : 'unknown format'}` }
  }
}

export async function commitBackup(db: FlashCardDatabase, backup: BackupV1): Promise<void> {
  await db.transaction('rw', db.allTables(), async () => {
    await Promise.all(db.allTables().map((table) => table.clear()))
    await db.cards.bulkAdd(backup.data.cards as never[])
    await db.memberships.bulkAdd(backup.data.memberships as never[])
    await db.reviews.bulkAdd(backup.data.reviews as never[])
    await db.sessions.bulkAdd(backup.data.sessions as never[])
    await db.summaries.bulkAdd(backup.data.summaries as never[])
    await db.settings.bulkAdd(backup.data.settings as never[])
    await db.metadata.bulkAdd(backup.data.metadata as never[])
  })
}

export async function snapshotDatabase(db: FlashCardDatabase): Promise<Snapshot> {
  const [cards, memberships, reviews, sessions, summaries, settings, metadata] = await Promise.all([
    db.cards.toArray(), db.memberships.toArray(), db.reviews.toArray(), db.sessions.toArray(), db.summaries.toArray(), db.settings.toArray(), db.metadata.toArray(),
  ])
  return { cards, memberships, reviews, sessions, summaries, settings, metadata } as unknown as Snapshot
}
